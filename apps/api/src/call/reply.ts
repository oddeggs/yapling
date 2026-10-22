import type { CallEndReason, CharacterId } from '@yapling/contracts';
import { speechSettings } from '@yapling/domain';
import { CAST, SAFE_REPLY, type Scene, type SceneEffect } from '@yapling/story';

import { NO_CONTROL, type Control, type Outcome } from './control';
import { addSample } from './costs';
import { caseFor, eventFor, replyDirection, type Director, type ReplyPlan } from './director';
import type { CallData } from './finalize';
import type { FrameSender } from './frames';
import { isCrisis, judgeTurn, type AgainAsk, type Judgement } from './judge';
import type { LearnerTurn } from './learner-turn';
import { SpokenLine, type LineHost, type LineResult, type LineSource } from './line';
import { HEDGE, messagesFor, systemFor, turnParams } from './llm';
import { speechKind } from './real-words';
import type { TtsVoice } from './tts';
import {
  isLearnerLine,
  lastCharacterLine,
  type LearnerLine,
  type TranscriptLine,
} from './transcript';
import { logTurn, type JudgeLog } from './turn-log';
import { slowerVoice } from './voice-pool';
import { pickReaction } from './voices';

/*
 * The answer to one learner turn: the listener's line, started speculatively and held (see
 * `LearnerTurn`), committed when its first audio reaches the phone. Only then is the learner's
 * turn final (`heard`), and the outcome is applied to the scene: the next beat, a correction
 * prompt, a hint, a fallback, or the crisis hand-over.
 *
 * Jev judges the turn beside the line (`judge.ts`), in one request started with it. When it
 * answers before the line reaches the phone:
 * - they asked to hear the last line again, or slower: the line is dropped and the last character
 *   line is said again (slower, with longer breaks, for "slowly"). It is not a try.
 * - a crisis: the line is dropped and the crisis hand-over runs.
 * - otherwise its case is compared with the case the line was written for (the line's leading
 *   `[case]` tag). Same runner event: nothing changes. Different, or a line with no tag: a
 *   second line, written for Jev's case only and started as soon as Jev answered, is voiced
 *   instead.
 * When Jev is late or down, the line's own case stands, as before Jev.
 */

/** A hold-to-talk reply with no audio yet after this long shows the thinking head tilt. */
export const SLOW_REPLY_MS = 600;
/** A line said again is the line, not a reply: it may be longer than a reply. */
const REPLAY_MAX_WORDS = 60;

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
  /** Jev's key; the line's own case stands for every turn without it. */
  readonly judgeKey: string | undefined;
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

/** Jev's side of one turn. */
interface TurnJudge {
  readonly startedAt: number;
  readonly abort: AbortController;
  status: 'pending' | 'answered' | 'failed' | 'late';
  /** Jev's answer, when it came before the turn was committed. */
  judgement: Judgement | null;
  /** Jev's outcome, even one too late to count (for the log). */
  outcome: Outcome | null;
  ms: number | null;
  /** The first line's case; undefined until its first word is in. */
  tag: Outcome | null | undefined;
  /** The line written for Jev's case, held until the first line's case is known. */
  alt: SpokenLine | null;
  /** Jev's case was compared with the line's (or the line's case can't be known). */
  settled: boolean;
  /** The voiced line was written for Jev's case: Jev's outcome is applied. */
  decided: boolean;
  /** Whether the line's case and Jev's led to the same runner event. */
  agree: boolean | null;
  /** The line written for Jev's case was voiced in place of the first. */
  switched: boolean;
}

class Reply {
  /** The line answering the turn: the first, or the one that replaced it. */
  line!: SpokenLine;
  committed = false;
  control: Control | null = null;
  applied = false;
  /** The runner event the outcome was applied as, for the turn's log line. */
  event: string | null = null;
  learnerLine = -1;
  /** The line is the last character line said again: no outcome, no try. */
  replay: AgainAsk | null = null;
  /** The hold ended before Jev answered: the recorded reaction waits for its answer. */
  reactionDue = false;
  readonly judge: TurnJudge = {
    startedAt: Date.now(),
    abort: new AbortController(),
    status: 'pending',
    judgement: null,
    outcome: null,
    ms: null,
    tag: undefined,
    alt: null,
    settled: false,
    decided: false,
    agree: null,
    switched: false,
  };

  constructor(
    readonly plan: ReplyPlan,
    /** Who speaks the line: the listener, or for a replay whoever said the last line. */
    public speaker: CharacterId,
    readonly speechEndAt: number,
    readonly said: string,
    /** The recorded reaction's words, when one plays before the line. */
    readonly reaction: string | null,
  ) {}
}

interface LineSpec {
  readonly speaker: CharacterId;
  readonly voice: TtsVoice;
  readonly source: LineSource;
  readonly gated: boolean;
  readonly afterReaction: boolean;
  readonly maxWords?: number;
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
    const reply = this.reply;
    this.reply = null;
    if (reply === null) return;
    this.endJudge(reply);
    reply.line.abort();
  }

  /** Starts the answer to a turn; null when the scene can't take one now. */
  answer(text: string, speechEndAt: number, gated: boolean): SpokenLine | null {
    const { host } = this;
    if (!host.accepting()) return null;
    const plan = host.director.plan();
    if (plan === null) return null;
    const { data } = host;
    const reaction = pickReaction(plan.speaker, text, data.turns);
    const reply = new Reply(plan, plan.speaker, speechEndAt, text, reaction?.text ?? null);
    const direction = replyDirection(
      plan,
      data.learner.stage,
      data.learner.targets,
      reply.reaction,
      promptLine(data.transcript, plan.speaker),
      text,
    );
    const line = this.spoken(reply, {
      speaker: plan.speaker,
      voice: host.voice(plan.speaker),
      source: this.modelSource(reply, direction),
      gated,
      afterReaction: reaction !== null,
    });
    reply.line = line;
    this.reply = reply;
    this.turnStreams = { reaction: null, reply: line.streamId };
    data.awaitingLag = true;
    host.learner()?.closeWindow();
    this.startJudge(reply);
    line.start();
    // Hold-to-talk answers at once: the recorded reaction plays now, while the reply streams in
    // (hands-free plays it when the reply is released).
    if (!gated && reaction) this.sendReaction(plan.speaker, reaction.lineId);
    if (!gated) {
      // Hold-to-talk answers at once: a slow reply tilts the head instead of leaving dead air.
      setTimeout(() => {
        if (this.reply === reply && !reply.committed && !reply.line.isAborted) host.thinking(true);
      }, SLOW_REPLY_MS);
    }
    return line;
  }

  /** The hold ended: the recorded reaction plays, and the head tilts if no audio is ready. */
  released(line: SpokenLine): void {
    const reply = this.reply;
    if (reply?.line !== line) return;
    // An "Ooh" before a replay or the crisis hand-over would be wrong: wait for Jev (≤ 800 ms).
    if (reply.judge.status === 'pending') reply.reactionDue = true;
    else this.react(reply);
    if (!line.committed) this.host.thinking(true);
  }

  /** The recorded reaction to the turn, unless no reply follows or it has started. */
  private react(reply: Reply): void {
    reply.reactionDue = false;
    if (this.reply !== reply || reply.replay !== null || reply.committed) return;
    const reaction = pickReaction(reply.speaker, reply.line.text, this.host.data.turns);
    if (reaction) this.sendReaction(reply.speaker, reaction.lineId);
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

  // ---- lines ----

  /** A line answering `reply`: it counts only while it is the reply's line. */
  private spoken(reply: Reply, spec: LineSpec): SpokenLine {
    const model = spec.source.kind === 'model';
    const line: SpokenLine = new SpokenLine(this.host.lineHost(), {
      speaker: spec.speaker,
      voice: spec.voice,
      source: spec.source,
      gated: spec.gated,
      maxWords: spec.maxWords ?? speechSettings(this.host.data.learner.stage).maxWordsPerTurn,
      afterReaction: spec.afterReaction,
      onFirstAudio: () => {
        if (reply.line === line) this.committed(reply);
      },
      ...(model
        ? {
            safeLine: SAFE_REPLY,
            onControl: (control: Control) => {
              if (reply.line !== line) return;
              reply.control = control;
              if (reply.committed) this.apply(reply);
            },
            onCaseTag: (tag: Outcome | null) => this.caseTagged(reply, line, tag),
          }
        : {}),
    });
    void line.done.then((result) => this.done(reply, line, result));
    return line;
  }

  private modelSource(reply: Reply, direction: string): LineSource {
    const { host } = this;
    const { data } = host;
    const pending = this.learnerLine(reply.said, [], reply.plan.beatId);
    const system = systemFor(reply.plan.speaker, host.scene, data.learner);
    const messages = messagesFor(reply.plan.speaker, [...data.transcript, pending], direction);
    return { kind: 'model', params: turnParams(system, messages), hedge: HEDGE };
  }

  /** The reply's line becomes `next`, held or released as the line it replaces was. */
  private switchTo(reply: Reply, next: SpokenLine): void {
    const previous = reply.line;
    const released = !previous.isGated;
    reply.line = next;
    reply.control = null;
    this.turnStreams = { ...this.turnStreams, reply: next.streamId };
    this.host.learner()?.swapReply(previous, next);
    previous.abort();
    if (released) next.release();
  }

  // ---- the judge ----

  private startJudge(reply: Reply): void {
    const { data } = this.host;
    const last = lastCharacterLine(data.transcript);
    const turn = {
      lastLine: last ? `${CAST[last.speaker].name}: ${last.text}` : null,
      hoped: reply.plan.answer.expects,
      said: reply.said,
      targets: data.learner.targets,
    };
    void judgeTurn(turn, { apiKey: this.host.judgeKey, signal: reply.judge.abort.signal }).then(
      (judgement) => this.judged(reply, judgement),
    );
  }

  private judged(reply: Reply, judgement: Judgement | null): void {
    const { judge } = reply;
    const { data } = this.host;
    judge.ms = Date.now() - judge.startedAt;
    if (judgement !== null) {
      data.jevInputTokens = (data.jevInputTokens ?? 0) + judgement.inputTokens;
      addSample(data.samples, 'judge', judge.ms);
      judge.outcome = judgement.outcome;
    }
    if (this.reply !== reply) return;
    if (judgement === null) {
      judge.status = 'failed';
      if (reply.reactionDue) this.react(reply);
      return;
    }
    if (reply.committed) {
      // Too late to change the line; a crisis still counts.
      judge.status = 'late';
      if (isCrisis(judgement, false)) this.host.crisis();
      return;
    }
    judge.status = 'answered';
    judge.judgement = judgement;
    if (judgement.again !== null && this.replay(reply, judgement.again)) return;
    if (isCrisis(judgement, false)) {
      this.crisisNow(reply);
      return;
    }
    if (reply.reactionDue) this.react(reply);
    // A second try after a correction prompt has one case only: the line's control decides it.
    if (reply.plan.correcting) return;
    if (judge.tag === undefined) judge.alt = this.altLine(reply, judgement);
    else this.settle(reply);
  }

  private caseTagged(reply: Reply, line: SpokenLine, tag: Outcome | null): void {
    if (this.reply !== reply || reply.line !== line || reply.judge.tag !== undefined) return;
    reply.judge.tag = tag;
    if (reply.judge.judgement !== null && reply.replay === null) this.settle(reply);
  }

  /** Jev's case and the line's are both known: keep the line, or voice the one for Jev's case. */
  private settle(reply: Reply): void {
    const { judge, plan } = reply;
    const judgement = judge.judgement;
    if (judgement === null || judge.tag === undefined || judge.settled || reply.committed) return;
    judge.settled = true;
    // A second try after a correction prompt has one case only: the line's control decides it.
    if (plan.correcting) return;
    // A line that didn't say which case it took may fit any: the line for Jev's case is voiced.
    judge.agree =
      judge.tag === null ? null : eventFor(plan, judge.tag) === eventFor(plan, judgement.outcome);
    judge.decided = true;
    if (judge.agree === true) {
      this.dropAlt(reply);
      return;
    }
    const alt = judge.alt ?? this.altLine(reply, judgement);
    judge.alt = null;
    judge.switched = true;
    this.switchTo(reply, alt);
  }

  /** The listener's line written for Jev's case only, held until it is needed. */
  private altLine(reply: Reply, judgement: Judgement): SpokenLine {
    const { host } = this;
    const { data } = host;
    const { plan } = reply;
    const outcome = caseFor(plan, judgement.outcome);
    const target =
      outcome === 'target_error'
        ? (data.learner.targets.find((t) => t.id === judgement.targetId) ?? null)
        : null;
    const direction = replyDirection(
      plan,
      data.learner.stage,
      data.learner.targets,
      reply.reaction,
      promptLine(data.transcript, plan.speaker),
      reply.said,
      { outcome, target },
    );
    const line = this.spoken(reply, {
      speaker: plan.speaker,
      voice: host.voice(plan.speaker),
      source: this.modelSource(reply, direction),
      gated: true,
      afterReaction: reply.reaction !== null,
    });
    line.start();
    return line;
  }

  /** "Again" or "slowly": the last character line is said again instead of a reply. */
  private replay(reply: Reply, ask: AgainAsk): boolean {
    const { host } = this;
    const last = lastCharacterLine(host.data.transcript);
    if (last === null) return false;
    this.dropAlt(reply);
    const voice = host.voice(last.speaker);
    const line = this.spoken(reply, {
      speaker: last.speaker,
      voice: ask === 'slower' ? slowerVoice(voice) : voice,
      source: { kind: 'text', text: last.text },
      gated: true,
      afterReaction: false,
      maxWords: REPLAY_MAX_WORDS,
    });
    reply.replay = ask;
    reply.speaker = last.speaker;
    this.switchTo(reply, line);
    line.start();
    return true;
  }

  /** Jev saw a crisis before any reply was heard: no reply, the hand-over at once. */
  private crisisNow(reply: Reply): void {
    const { host } = this;
    reply.judge.decided = true;
    this.commitTurn(reply);
    this.reply = null;
    this.endJudge(reply);
    reply.line.abort();
    this.log(reply, null);
    host.crisis();
    host.end('safety');
  }

  private dropAlt(reply: Reply): void {
    reply.judge.alt?.abort();
    reply.judge.alt = null;
  }

  private endJudge(reply: Reply): void {
    this.dropAlt(reply);
    if (reply.judge.status === 'pending') reply.judge.abort.abort();
  }

  // ---- the turn ----

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

  /** The learner's turn is final: `heard`, and its line in the transcript. */
  private commitTurn(reply: Reply): void {
    const { host } = this;
    const { data } = host;
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
  }

  /** The answer reached the phone: the learner's turn is final. */
  private committed(reply: Reply): void {
    if (reply.committed || this.reply !== reply) return;
    const { host } = this;
    const { data } = host;
    reply.committed = true;
    this.dropAlt(reply);
    host.thinking(false);
    this.commitTurn(reply);
    const t = reply.line.timings;
    const s = data.samples;
    if (reply.speechEndAt > 0) s.replyOut.push(Date.now() - reply.speechEndAt);
    if (t.llmFirstToken) s.llmFirstToken.push(t.llmFirstToken - t.start);
    if (t.ttsFirstAudio && t.ttsFirstText) s.ttsFirstAudio.push(t.ttsFirstAudio - t.ttsFirstText);
    host.newActive(reply.line.streamId, null);
    if (reply.control !== null || reply.replay !== null) this.apply(reply);
  }

  private apply(reply: Reply): void {
    if (reply.applied) return;
    reply.applied = true;
    const { host } = this;
    const { data, scene } = host;
    const index = reply.learnerLine;
    const learnerLine = data.transcript[index];
    if (reply.replay !== null) {
      // Asking to hear it again is not a try: the scene stays where it was.
      if (learnerLine && isLearnerLine(learnerLine)) {
        data.transcript[index] = { ...learnerLine, outcome: 'unclear' };
      }
      return;
    }
    const control = reply.control ?? NO_CONTROL;
    const judgement = reply.judge.judgement;
    if (judgement ? isCrisis(judgement, control.crisis) : control.crisis) {
      host.crisis();
      return;
    }
    const jev = reply.judge.decided ? judgement : null;
    const outcome = jev ? jev.outcome : control.outcome;
    const { plan } = reply;
    const targets = data.learner.targets.map((t) => t.id);
    const chosen = jev ? jev.targetId : control.targetId;
    const targetId = chosen !== null && targets.includes(chosen) ? chosen : (targets[0] ?? null);
    if (plan.correcting && this.correction) {
      host.frames().send({
        type: 'correction_resolved',
        targetId: this.correction.targetId,
        fixed: outcome === 'fine',
      });
    }
    // A line that came out as narration said only a safe word: the runner's own next line follows.
    const applied = host.director.apply(plan, outcome, { merge: !reply.line.replaced });
    reply.event = applied.event;
    const valid = new Set([...plan.answer.phrases, ...scene.phrases]);
    const canDo =
      control.canDo !== null &&
      (control.canDo === plan.answer.canDo || scene.canDos.includes(control.canDo))
        ? control.canDo
        : null;
    if (learnerLine && isLearnerLine(learnerLine)) {
      data.transcript[index] = {
        ...learnerLine,
        outcome,
        phrasesUsed: control.phrasesUsed.filter((id) => valid.has(id)),
        canDo,
        targetId: applied.event === 'target_error' ? targetId : null,
        correctionFixed: plan.correcting ? outcome === 'fine' : null,
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

  private done(reply: Reply, line: SpokenLine, result: LineResult): void {
    const { host } = this;
    host.learner()?.replyDone(line);
    host.addUsage(line);
    if (this.reply !== reply || reply.line !== line) return;
    if (result.aborted) {
      // The learner went on: the joined turn is answered, and judged, again.
      this.reply = null;
      this.endJudge(reply);
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
        this.endJudge(reply);
        host.thinking(false);
        host.pump();
        return;
      }
      this.committed(reply);
    }
    if (!reply.applied) {
      if (reply.replay === null) reply.control ??= result.control;
      this.apply(reply);
    }
    this.reply = null;
    this.endJudge(reply);
    this.log(reply, result);
    if (result.text) host.pushCharacterLine(reply.speaker, result.text, reply.plan.beatId);
    if (this.correction && result.text && reply.replay === null) {
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

  private log(reply: Reply, result: LineResult | null): void {
    const { judge } = reply;
    const judgeLog: JudgeLog = {
      by: reply.replay !== null || judge.decided ? 'jev' : 'haiku',
      status: judge.status,
      ms: judge.ms,
      outcome: judge.outcome,
      lineCase: judge.tag ?? null,
      agree: judge.agree,
      switched: judge.switched,
      replay: reply.replay,
    };
    logTurn({
      callId: this.host.data.meta.callId,
      turn: this.host.data.turns,
      beatId: reply.plan.beatId,
      outcome:
        reply.replay !== null
          ? 'unclear'
          : judge.decided
            ? (judge.judgement?.outcome ?? null)
            : (reply.control ?? result?.control ?? NO_CONTROL).outcome,
      applied: reply.event,
      speech: speechKind(reply.said),
      judge: judgeLog,
      result,
      timings: reply.line.timings,
      speechEndAt: reply.speechEndAt,
    });
  }
}

/** The character line the learner is answering, when the listener said it (their question). */
function promptLine(transcript: readonly TranscriptLine[], speaker: CharacterId): string | null {
  const line = lastCharacterLine(transcript);
  return line?.speaker === speaker ? line.text.slice(0, 300) : null;
}
