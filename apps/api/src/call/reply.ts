import type { CallEndReason, CharacterId } from '@yapling/contracts';
import { speechSettings } from '@yapling/domain';
import { SAFE_REPLY, type Scene, type SceneEffect } from '@yapling/story';

import { NO_CONTROL, type Control } from './control';
import { addSample } from './costs';
import { replyDirection, type Director, type ReplyPlan } from './director';
import type { CallData } from './finalize';
import type { FrameSender } from './frames';
import type { LearnerTurn } from './learner-turn';
import { SpokenLine, type LineHost, type LineResult } from './line';
import { HEDGE, messagesFor, systemFor, turnParams } from './llm';
import type { TtsVoice } from './tts';
import { isLearnerLine, type LearnerLine } from './transcript';
import { pickReaction } from './voices';

/*
 * The answer to one learner turn: the listener's line, started speculatively and held (see
 * `LearnerTurn`), committed when its first audio reaches the phone. Only then is the learner's
 * turn final (`heard`), and the outcome the model chose is applied to the scene: the next beat,
 * a correction prompt, a hint, a fallback, or the crisis hand-over.
 */

/** A hold-to-talk reply with no audio yet after this long shows the thinking head tilt. */
export const SLOW_REPLY_MS = 600;

/** The line now playing, waiting for the phone's `played`. */
export interface Active {
  readonly streamId: number;
  after: 'rec_played' | 'gen_done' | null;
  durationMs: number;
  ready: boolean;
  played: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  /** Ends the call when done (the wrap-up). */
  endAfter: CallEndReason | null;
}

export interface ReplyHost {
  readonly data: CallData;
  readonly director: Director;
  readonly scene: Scene;
  frames(): FrameSender;
  learner(): LearnerTurn | null;
  active(): Active | null;
  accepting(): boolean;
  lineHost(): LineHost;
  voice(character: CharacterId): TtsVoice;
  thinking(on: boolean): void;
  newActive(streamId: number, after: Active['after']): Active;
  ready(active: Active, silent: boolean): void;
  run(effects: readonly SceneEffect[]): void;
  enqueue(effects: readonly SceneEffect[]): void;
  pump(): void;
  crisis(): void;
  end(reason: CallEndReason): void;
  addUsage(line: SpokenLine): void;
  pushCharacterLine(speaker: CharacterId, text: string, beatId: string | null): void;
  nextStreamId(): number;
}

interface Reply {
  readonly line: SpokenLine;
  readonly plan: ReplyPlan;
  readonly speechEndAt: number;
  committed: boolean;
  control: Control | null;
  applied: boolean;
  learnerLine: number;
}

export class Replies {
  private reply: Reply | null = null;
  /** A correction prompt waiting for the second try. */
  private correction: { targetId: string; original: string } | null = null;
  /** This turn's recorded reaction and reply streams, to file the phone's lag under each. */
  private turnStreams: { reaction: number | null; reply: number | null } = {
    reaction: null,
    reply: null,
  };

  constructor(private readonly host: ReplyHost) {}

  get busy(): boolean {
    return this.reply !== null;
  }

  /** The phone went away: drop the answer in progress. */
  drop(): void {
    this.reply?.line.abort();
    this.reply = null;
  }

  /** Starts the answer to a turn; null when the scene can't take one now. */
  answer(text: string, speechEndAt: number, gated: boolean): SpokenLine | null {
    const { host } = this;
    if (!host.accepting()) return null;
    const plan = host.director.plan();
    if (plan === null) return null;
    const { data } = host;
    const stage = data.learner.stage;
    const reaction = pickReaction(plan.speaker, text, data.turns);
    const direction = replyDirection(plan, stage, data.learner.targets, reaction?.text ?? null);
    const pending = this.learnerLine(text, [], plan.beatId);
    const system = systemFor(plan.speaker, host.scene, data.learner);
    const messages = messagesFor(plan.speaker, [...data.transcript, pending], direction);
    let reply: Reply | null = null;
    const line = new SpokenLine(host.lineHost(), {
      speaker: plan.speaker,
      voice: host.voice(plan.speaker),
      source: { kind: 'model', params: turnParams(system, messages), hedge: HEDGE },
      gated,
      maxWords: speechSettings(stage).maxWordsPerTurn,
      afterReaction: reaction !== null,
      safeLine: SAFE_REPLY,
      onFirstAudio: () => reply && this.committed(reply),
      onControl: (control) => {
        if (!reply) return;
        reply.control = control;
        if (reply.committed) this.apply(reply);
      },
    });
    reply = {
      line,
      plan,
      speechEndAt,
      committed: false,
      control: null,
      applied: false,
      learnerLine: -1,
    };
    this.reply = reply;
    this.turnStreams = { reaction: null, reply: line.streamId };
    data.awaitingLag = true;
    host.learner()?.closeWindow();
    line.start();
    // Hold-to-talk answers at once: the recorded reaction plays now, while the reply streams in
    // (hands-free plays it when the reply is released).
    if (!gated && reaction) this.sendReaction(reply.plan.speaker, reaction.lineId);
    if (!gated) {
      // Hold-to-talk answers at once: a slow reply tilts the head instead of leaving dead air.
      const slow = setTimeout(() => {
        if (this.reply === reply && !reply.committed && !line.isAborted) host.thinking(true);
      }, SLOW_REPLY_MS);
      void line.done.finally(() => clearTimeout(slow));
    }
    const current = reply;
    void line.done.then((result) => this.done(current, result));
    return line;
  }

  /** The hold ended: the recorded reaction plays, and the head tilts if no audio is ready. */
  released(line: SpokenLine): void {
    const reply = this.reply;
    if (reply?.line !== line) return;
    const reaction = pickReaction(reply.plan.speaker, line.text, this.host.data.turns);
    if (reaction) this.sendReaction(reply.plan.speaker, reaction.lineId);
    if (!line.committed) this.host.thinking(true);
  }

  private sendReaction(character: CharacterId, lineId: string): void {
    const streamId = this.host.nextStreamId();
    this.turnStreams = { ...this.turnStreams, reaction: streamId };
    this.host.frames().send({ type: 'play_rec', streamId, lineId, character });
  }

  /**
   * The phone's lag for a line of this turn: end of the learner's speech → the line heard. Filed
   * as the reaction's or the reply's, and the turn's first character audio is the first of them.
   */
  lag(streamId: number, lagMs: number): void {
    const { data } = this.host;
    const { reaction, reply } = this.turnStreams;
    if (streamId !== reaction && streamId !== reply) return;
    addSample(data.samples, streamId === reaction ? 'phoneReaction' : 'phoneReply', lagMs);
    if (data.awaitingLag) {
      addSample(data.samples, 'phoneLag', lagMs);
      data.awaitingLag = false;
    }
  }

  private learnerLine(
    text: string,
    words: LearnerLine['words'],
    beatId: string | null,
  ): LearnerLine {
    return {
      speaker: 'learner',
      text,
      at: Date.now(),
      turn: this.host.data.turns + 1,
      words,
      beatId,
      outcome: null,
      phrasesUsed: [],
      canDo: null,
      targetId: null,
      correctionFixed: null,
    };
  }

  /** The answer reached the phone: the learner's turn is final. */
  private committed(reply: Reply): void {
    if (reply.committed || this.reply !== reply) return;
    const { host } = this;
    const { data } = host;
    reply.committed = true;
    host.thinking(false);
    const turn = host.learner()?.takeTurn() ?? { text: '', words: [] };
    data.turns += 1;
    host.frames().send({
      type: 'heard',
      turn: data.turns,
      text: turn.text.slice(0, 2_000),
      words: turn.words.slice(0, 1_000),
    });
    reply.learnerLine = data.transcript.length;
    data.transcript.push(this.learnerLine(turn.text, turn.words, reply.plan.beatId));
    const t = reply.line.timings;
    const s = data.samples;
    if (reply.speechEndAt > 0) s.replyOut.push(Date.now() - reply.speechEndAt);
    if (t.llmFirstToken) s.llmFirstToken.push(t.llmFirstToken - t.start);
    if (t.ttsFirstAudio && t.ttsFirstText) s.ttsFirstAudio.push(t.ttsFirstAudio - t.ttsFirstText);
    host.newActive(reply.line.streamId, null);
    if (reply.control) this.apply(reply);
  }

  private apply(reply: Reply): void {
    if (reply.applied) return;
    reply.applied = true;
    const { host } = this;
    const { data, scene } = host;
    const control = reply.control ?? NO_CONTROL;
    const index = reply.learnerLine;
    const learnerLine = data.transcript[index];
    if (control.crisis) {
      host.crisis();
      return;
    }
    const { plan } = reply;
    const targets = data.learner.targets.map((t) => t.id);
    const targetId =
      control.targetId !== null && targets.includes(control.targetId)
        ? control.targetId
        : (targets[0] ?? null);
    if (plan.correcting && this.correction) {
      host.frames().send({
        type: 'correction_resolved',
        targetId: this.correction.targetId,
        fixed: control.outcome === 'fine',
      });
    }
    // A line that came out as narration said only a safe word: the runner's own next line follows.
    const applied = host.director.apply(plan, control.outcome, { merge: !reply.line.replaced });
    const valid = new Set([...plan.answer.phrases, ...scene.phrases]);
    const canDo =
      control.canDo !== null &&
      (control.canDo === plan.answer.canDo || scene.canDos.includes(control.canDo))
        ? control.canDo
        : null;
    if (learnerLine && isLearnerLine(learnerLine)) {
      data.transcript[index] = {
        ...learnerLine,
        outcome: control.outcome,
        phrasesUsed: control.phrasesUsed.filter((id) => valid.has(id)),
        canDo,
        targetId: applied.event === 'target_error' ? targetId : null,
        correctionFixed: plan.correcting ? control.outcome === 'fine' : null,
      };
    }
    this.correction =
      applied.correction && targetId !== null
        ? { targetId, original: learnerLine?.text ?? '' }
        : null;
    const active = host.active();
    if (active?.streamId === reply.line.streamId) {
      active.after = applied.fulfilled ? 'gen_done' : null;
    }
    host.run(applied.effects.filter((e) => e.type === 'hint'));
    host.enqueue(applied.effects.filter((e) => e.type !== 'hint'));
  }

  private done(reply: Reply, result: LineResult): void {
    const { host } = this;
    host.learner()?.replyDone(reply.line);
    host.addUsage(reply.line);
    if (this.reply !== reply) return;
    if (result.aborted) {
      this.reply = null;
      host.thinking(false);
      return;
    }
    if (!reply.committed) {
      if (result.failed !== null) {
        host.frames().send({
          type: 'error',
          code: result.failed === 'llm' ? 'llm_failed' : 'tts_failed',
          fatal: false,
        });
        this.reply = null;
        host.thinking(false);
        host.pump();
        return;
      }
      this.committed(reply);
    }
    if (!reply.applied) {
      reply.control ??= result.control;
      this.apply(reply);
    }
    this.reply = null;
    if (result.text) host.pushCharacterLine(reply.plan.speaker, result.text, reply.plan.beatId);
    if (this.correction && result.text) {
      host.frames().send({
        type: 'correction',
        targetId: this.correction.targetId,
        original: this.correction.original || result.text,
        prompt: result.text,
      });
    }
    if (host.data.crisis) {
      host.end('safety');
      return;
    }
    const active = host.active();
    if (active?.streamId === reply.line.streamId) {
      active.durationMs = result.audioMs;
      host.ready(active, result.text === '');
    } else {
      host.pump();
    }
  }
}
