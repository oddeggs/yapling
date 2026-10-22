import type { CharacterId, Id, Stage } from '@yapling/contracts';
import { speechSettings } from '@yapling/domain';
import {
  CAST,
  findPhrase,
  reduceScene,
  resumeScene,
  startScene,
  type Answer,
  type ErrorTargetBrief,
  type RunnerState,
  type Scene,
  type SceneEffect,
  type SceneEvent,
} from '@yapling/story';

import { CONTROL_RULE, type Outcome } from './control';

/*
 * The director: holds the scene runner's state and turns the runner's effects into what each
 * generated line must do.
 *
 * A learner turn is answered by one generated line from the beat's listener, started the moment
 * the learner pauses (before the call knows how the turn went). So the line's direction covers
 * every outcome: the runner is asked ahead what `fine`, `target_error` and `silent` would lead to,
 * and when that next step is the listener speaking again (the next beat, a nudge), its intent is
 * folded into this line. The model picks the case and says which in its control line; the
 * director then applies that outcome, and any effect the line already did is skipped.
 */

export type GenEffect = Extract<SceneEffect, { type: 'gen' }>;

/** What one outcome makes the listener's line do. */
export type Branch =
  /** The runner's next step is the listener speaking: this line does it. */
  | { readonly kind: 'merge'; readonly effect: GenEffect }
  /** A target error: ask it back as a question and wait. */
  | { readonly kind: 'correct' }
  /** A hint follows: a kind word only. */
  | { readonly kind: 'encourage' }
  /** A recorded line or another character follows: react briefly. */
  | { readonly kind: 'react' };

export interface ReplyPlan {
  readonly beatId: Id;
  readonly speaker: CharacterId;
  readonly answer: Answer;
  readonly correcting: boolean;
  readonly fine: Branch;
  /** Null when a target error counts as fine on this beat. */
  readonly error: Branch | null;
  readonly offTopic: Branch;
}

export interface Applied {
  /** Effects still to carry out, in order. */
  readonly effects: readonly SceneEffect[];
  /** The line already did the runner's next generated line: `gen_done` follows its playback. */
  readonly fulfilled: boolean;
  /** The line was a correction prompt. */
  readonly correction: boolean;
  /** The event the outcome was applied as. */
  readonly event: SceneEvent['type'];
}

const isSpeech = (e: SceneEffect) =>
  e.type === 'gen' ||
  e.type === 'play_rec' ||
  e.type === 'correction' ||
  e.type === 'hint' ||
  e.type === 'scene_end';

export class Director {
  private current: RunnerState;

  constructor(
    readonly scene: Scene,
    state: RunnerState | null,
    readonly stage: Stage,
  ) {
    this.current = state ?? startScene(scene, stage).state;
  }

  get state(): RunnerState {
    return this.current;
  }

  /** The effects that open the scene (or put a resumed one back on its beat). */
  begin(fresh: boolean): readonly SceneEffect[] {
    const step = fresh ? startScene(this.scene, this.stage) : resumeScene(this.scene, this.current);
    this.current = step.state;
    return step.effects;
  }

  dispatch(event: SceneEvent): readonly SceneEffect[] {
    const step = reduceScene(this.scene, this.current, event);
    this.current = step.state;
    return step.effects;
  }

  /** The beat waiting for the learner, or null when the scene isn't listening. */
  listening(): { readonly beatId: Id; readonly answer: Answer } | null {
    const { phase, beatId } = this.current;
    if (phase !== 'listening' || beatId === null) return null;
    const beat = this.scene.beats.find((b) => b.id === beatId);
    const answer = beat?.kind === 'learner' || beat?.kind === 'gen' ? beat.answer : null;
    return answer ? { beatId, answer } : null;
  }

  /** How the listener's line answers the learner's turn, per outcome. */
  plan(): ReplyPlan | null {
    const now = this.listening();
    if (now === null) return null;
    const { answer } = now;
    const branch = (event: SceneEvent['type']): Branch => {
      const next = reduceScene(this.scene, this.current, { type: event });
      const first = next.effects.find(isSpeech);
      if (first?.type === 'correction') return { kind: 'correct' };
      if (first?.type === 'hint') return { kind: 'encourage' };
      if (
        first?.type === 'gen' &&
        first.speaker === answer.listener &&
        first.purpose !== 'meaning'
      ) {
        return { kind: 'merge', effect: first };
      }
      return { kind: 'react' };
    };
    const correcting = this.current.correcting;
    const fine = branch('fine');
    const mode = answer.exits.targetError.mode;
    return {
      beatId: now.beatId,
      speaker: answer.listener,
      answer,
      correcting,
      fine,
      error: correcting || mode === 'accept' ? null : branch('target_error'),
      offTopic: branch('silent'),
    };
  }

  /**
   * Applies the outcome the line chose. With `merge: false` (the line didn't say what it was
   * asked), the runner's next generated line is kept to be spoken on its own.
   */
  apply(plan: ReplyPlan, outcome: Outcome, options: { readonly merge?: boolean } = {}): Applied {
    const event: SceneEvent['type'] =
      outcome === 'fine' || (outcome === 'target_error' && plan.error === null)
        ? 'fine'
        : outcome === 'target_error'
          ? 'target_error'
          : 'silent';
    const branch =
      event === 'fine' ? plan.fine : event === 'target_error' ? plan.error : plan.offTopic;
    const effects = [...this.dispatch({ type: event })];
    let fulfilled = false;
    let correction = false;
    if (branch?.kind === 'merge' && options.merge !== false) {
      const i = effects.findIndex(
        (e) =>
          e.type === 'gen' &&
          e.beatId === branch.effect.beatId &&
          e.purpose === branch.effect.purpose &&
          e.speaker === branch.effect.speaker,
      );
      if (i >= 0) {
        effects.splice(i, 1);
        fulfilled = true;
      }
    }
    const c = effects.findIndex((e) => e.type === 'correction');
    if (c >= 0) {
      effects.splice(c, 1);
      correction = true;
    }
    return { effects, fulfilled, correction, event };
  }
}

const nameOf = (c: CharacterId) => CAST[c].name;

const phraseList = (ids: readonly Id[]) =>
  ids
    .map((id) => findPhrase(id))
    .filter((p) => p !== undefined)
    .map((p) => `"${p.en}" (${p.id})`)
    .join(', ');

/** What a generated line must do. */
export function genDirection(effect: GenEffect): string {
  const lines = [effect.intent];
  for (const c of effect.constraints) lines.push(c);
  if (effect.example) lines.push(`In this spirit, never word for word: "${effect.example}"`);
  if (effect.resolution) lines.push(`Whatever is said, this stays true: ${effect.resolution}`);
  if (effect.elicits.length > 0) {
    lines.push(`Give the learner a chance to say: ${phraseList(effect.elicits)}.`);
  }
  return lines.join(' ');
}

const BRANCH_TEXT: Readonly<Record<Exclude<Branch['kind'], 'merge'>, string>> = {
  correct:
    'Repeat their words back as a gentle question, keeping the mistake, and wait (for example: "You go to the market… yesterday?"). Do not move the scene on.',
  encourage: 'Say kindly, in a few words, that it is fine to try again. Do not answer for them.',
  react:
    'React warmly in a few words (under eight), with no question: the scene goes on after you.',
};

const branchText = (branch: Branch) =>
  branch.kind === 'merge' ? `Then: ${genDirection(branch.effect)}` : BRANCH_TEXT[branch.kind];

/** What every direction ends with: the reply is the character's own words and nothing else. */
const spokenOnly = (speaker: CharacterId) =>
  `Write only the exact words ${nameOf(speaker)} says out loud, in the first person: no narration, no stage directions, no quotation marks, no notes about the learner or the scene, no reasoning.`;

function rules(
  speaker: CharacterId,
  stage: Stage,
  phrases: readonly Id[],
  canDo: Id | null,
): string {
  const max = speechSettings(stage).maxWordsPerTurn;
  return [
    `Say one or two short sentences, under ${max} words in all. Spell numbers as words.`,
    spokenOnly(speaker),
    CONTROL_RULE,
    phrases.length > 0 ? `Phrase ids you may list: ${phrases.join(', ')}.` : '',
    canDo ? `The can-do this turn can show: ${canDo}.` : '',
  ]
    .filter((l) => l !== '')
    .join(' ');
}

/** The direction for the listener's answer to a learner turn. */
export function replyDirection(
  plan: ReplyPlan,
  stage: Stage,
  targets: readonly ErrorTargetBrief[],
  afterReaction: string | null,
): string {
  const lines = [`Your reply as ${nameOf(plan.speaker)} to what the learner just said.`];
  if (afterReaction) {
    lines.push(
      `You have already said "${afterReaction}" out loud: carry on from it, without another Ooh, Oh, Mm or Hmm.`,
    );
  }
  lines.push(`What we hoped they would do: ${plan.answer.expects}`);
  if (plan.correcting) {
    lines.push(
      'This is their second try after you asked their mistake back. Whatever they say now, accept it warmly and move on.',
      `Then: ${branchText(plan.fine)}`,
      'In the control line, outcome is "fine" if they fixed it, "target_error" if not.',
    );
  } else {
    lines.push('Decide which case fits their turn, then speak only the line for it:');
    lines.push(
      `- fine (it answers, in any words, even with small mistakes): ${branchText(plan.fine)}`,
    );
    if (plan.error !== null && targets.length > 0) {
      const list = targets.map((t) => `${t.id}: ${t.description}`).join('; ');
      lines.push(
        `- target_error (it shows one of their target errors: ${list}): ${branchText(plan.error)}`,
      );
    }
    lines.push(
      `- off_topic (it doesn't answer, is unclear, or is only "um"): ${branchText(plan.offTopic)}`,
    );
  }
  lines.push(rules(plan.speaker, stage, plan.answer.phrases, plan.answer.canDo));
  return lines.join('\n');
}

/** The direction for a line the runner asks for on its own (a beat line, nudge or fallback). */
export function lineDirection(effect: GenEffect, stage: Stage): string {
  return [
    `Your next line as ${nameOf(effect.speaker)}, said straight to the learner. ${genDirection(effect)}`,
    rules(effect.speaker, stage, effect.elicits, null),
  ].join('\n');
}

/** The kind close when the learner's live minutes are nearly used up. */
export function wrapUpDirection(speaker: CharacterId, stage: Stage): string {
  return [
    `Your next line as ${nameOf(speaker)}. Time is nearly up for today. Close the scene kindly: say you will carry on next time, and thank the learner. No question.`,
    rules(speaker, stage, [], null),
  ].join('\n');
}
