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
 * every outcome: the runner is asked ahead what `fine`, `target_error` and `unclear` would lead to,
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
  /** Unclear, a question back or off topic: the beat stays (or falls back after its tries). */
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

  /** Whether a long quiet would offer something now (the hint card, once, where the stage does). */
  offersOnQuiet(): boolean {
    if (this.listening() === null) return false;
    return reduceScene(this.scene, this.current, { type: 'silent' }).effects.length > 0;
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
      offTopic: branch('unclear'),
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
          : 'unclear';
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

/**
 * What a generated line must do. Folded into an answer (`withExample: false`), the line's written
 * example is left out: it may hold the very answer the learner is meant to give.
 */
export function genDirection(effect: GenEffect, withExample = true): string {
  const lines = [effect.intent];
  for (const c of effect.constraints) lines.push(c);
  if (effect.example && withExample) {
    lines.push(`In this spirit, never word for word: "${effect.example}"`);
  }
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
  branch.kind === 'merge'
    ? `Then: ${genDirection(branch.effect, false)}`
    : BRANCH_TEXT[branch.kind];

/** The turns that don't do what we hoped: the beat stays (a hint, a nudge) or falls back. */
type NotYet = 'unclear' | 'question' | 'off_topic';

const NOT_YET_WHEN: Readonly<Record<NotYet, string>> = {
  unclear:
    'they don\'t know or don\'t understand, ask you to repeat, answer in another language, only say "um", or their words make no sense as an answer',
  question: 'they ask you something, or talk near the topic, instead of doing what we hoped',
  off_topic: 'they talk about something unrelated to the scene',
};

/** The beat stays: help them try again, never answering for them. */
const STAY: Readonly<Record<NotYet, string>> = {
  unclear:
    'Say it is okay and invite them to try in their own words, asking your question again in fewer, simpler words, and stop there (like "That\'s okay! What do you think, in your words?"). Do not explain it or answer it: you don\'t know the answer, they do.',
  question:
    'Two short sentences: answer it in a few words, then end with your question again, simply.',
  off_topic:
    'Two short sentences: acknowledge it kindly, in character, then end with your question again, simply.',
};

/** The beat stays, but the learner was prompted by someone else: no question of your own. */
const STAY_UNASKED: Readonly<Record<NotYet, string>> = {
  unclear: 'Say kindly, in a few words, that it is okay, with no question.',
  question: 'Answer it in a few words, with no question back.',
  off_topic: 'Acknowledge it kindly, in character, in a few words, with no question.',
};
const UNASKED_TAIL =
  ' Let the moment show, so they can try again; never say their words for them or tell them what to ask.';

/** Someone else speaks next: react, with no question. */
const MOVE_ON: Readonly<Record<NotYet, string>> = {
  unclear: BRANCH_TEXT.react,
  question: 'Answer it in a few words, with no question: the scene goes on after you.',
  off_topic:
    'Acknowledge it in a few words, in character, with no question: the scene goes on after you.',
};

/** Their last try: a short lead-in, then the fallback line. */
const LAST_TRY_LEAD: Readonly<Record<NotYet, string>> = {
  unclear: '',
  question: 'Answer it in a few words. ',
  off_topic: 'Acknowledge it in a few words, kindly. ',
};

const notYetText = (branch: Branch, kind: NotYet, asked: boolean): string => {
  if (branch.kind === 'react') return MOVE_ON[kind];
  if (branch.kind === 'merge' && branch.effect.purpose === 'fallback') {
    return `${LAST_TRY_LEAD[kind]}This was their last try, so then: ${genDirection(branch.effect, false)}`;
  }
  return asked ? STAY[kind] : `${STAY_UNASKED[kind]}${UNASKED_TAIL}`;
};

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
  /** The line the learner is answering, when it was this speaker's. */
  lastLine: string | null = null,
  /** What the learner said (as heard so far). */
  said: string | null = null,
): string {
  const lines = [`Your reply as ${nameOf(plan.speaker)} to what the learner just said.`];
  lines.push(
    lastLine
      ? `Your last line to them, with your question: "${lastLine}"`
      : 'You have asked them nothing yet: the line before theirs was not yours.',
  );
  if (afterReaction) {
    lines.push(
      `You have already said "${afterReaction}" out loud: carry on from it, without another Ooh, Oh, Mm or Hmm.`,
    );
  }
  lines.push(
    `What we hoped they would do: ${plan.answer.expects} Only the learner may give that answer: never say it for them, in any case.`,
  );
  if (plan.correcting) {
    lines.push(
      'This is their second try after you asked their mistake back. Whatever they say now, accept it warmly and move on.',
      `Then: ${branchText(plan.fine)}`,
      'In the control line, outcome is "fine" if they fixed it, "target_error" if not.',
    );
  } else {
    lines.push('The cases, and what your line does in each (two short sentences at most):');
    lines.push(
      `[fine] → Build on what they actually said, never on an answer of your own. ${branchText(plan.fine)}`,
    );
    if (plan.error !== null && targets.length > 0) {
      lines.push(`[target_error] → ${branchText(plan.error)}`);
    }
    for (const kind of ['unclear', 'question', 'off_topic'] as const) {
      lines.push(`[${kind}] → ${notYetText(plan.offTopic, kind, lastLine !== null)}`);
    }
  }
  lines.push(rules(plan.speaker, stage, plan.answer.phrases, plan.answer.canDo));
  if (!plan.correcting) {
    // The decision comes last, nearest the reply, and the reply starts with it.
    const heard = said ? `They said: "${said.replace(/["\n]/g, ' ').slice(0, 300)}". ` : '';
    const errors =
      plan.error !== null && targets.length > 0
        ? ` [target_error] if it shows one of their target errors (${targets.map((t) => `${t.id}: ${t.description}`).join('; ')}).`
        : '';
    lines.push(
      `${heard}Pick the case: [fine] only if their turn does what we hoped (any words, small mistakes are fine); a hello, a question back or another topic is not fine unless that is what we hoped, garbled words are not fine, and when in doubt it is not fine.${errors} [unclear] if ${NOT_YET_WHEN.unclear}. [question] if ${NOT_YET_WHEN.question}. [off_topic] if ${NOT_YET_WHEN.off_topic}. Write the case in square brackets first, then the line; the control line's outcome is that case. Unless the case is [fine], your line never contains the answer we hoped for: they still have to say it.`,
    );
  }
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
