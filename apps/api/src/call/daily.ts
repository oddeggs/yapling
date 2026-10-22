import type { Id } from '@yapling/contracts';
import type { TurnPass } from '@yapling/domain';
import { isCardTurn, type Answer, type Beat, type Scene } from '@yapling/story';

/*
 * Pip's minute as a call (`daily`): about a minute in the burrow, two card turns built from
 * recorded lines. Turn one: Pip sets up a moment where a due phrase fits and the learner says it.
 * Turn two, when there is one: Pip says another phrase slightly wrong and the learner fixes it.
 *
 * It runs no model: every turn is a card turn decided by its words (Jev's card question for a
 * misheard read), no line is generated, and no summary is written. It costs no live minutes and
 * fills no ring slot. When it ends, the phrase uses come from how each turn passed: a turn that
 * passed on its words is a prompted use of its phrase (so it sprouts or leafs, never blooms), and
 * a fix turn that was played marks the phrase as reused by Pip, whether or not it was fixed.
 *
 * The app chooses the phrases (the learning model's `pipsMinuteFor`) and builds the scene from
 * the story; the scene id names that choice, so the call rebuilds the same scene from it.
 */

/** A Pip's-minute scene, rebuilt from its id, and the phrases it plays. */
export interface PipsMinuteScene {
  readonly scene: Scene;
  /** The phrase Pip sets up. */
  readonly due: Id;
  /** The phrase Pip says slightly wrong; null when the minute has one turn. */
  readonly reuse: Id | null;
}

/** Where the call finds Pip's-minute scenes. */
export interface PipsMinuteScenes {
  /** The scene a hello's scene id names, or null when it names none. */
  find(sceneId: Id): PipsMinuteScene | null;
}

/** The story's Pip's-minute scenes: none until the story builds them. */
const storyPipsMinutes: PipsMinuteScenes = { find: () => null };

/** The one place the call reads Pip's-minute scenes from; tests put their own here. */
export const pipsMinuteScenes: { current: PipsMinuteScenes } = { current: storyPipsMinutes };

/** A card turn of the minute, and the phrase it plays. */
export interface PipsMinuteTurn {
  readonly beatId: Id;
  readonly phrase: Id;
}

/** What a daily call keeps about its minute, so its end can write the phrase uses. */
export interface PipsMinuteMeta {
  readonly due: Id;
  readonly reuse: Id | null;
  readonly turns: readonly PipsMinuteTurn[];
}

const answerOf = (beat: Beat): Answer | null =>
  beat.kind === 'learner' ? beat.answer : beat.kind === 'gen' ? beat.answer : null;

/**
 * The minute as the call keeps it, or null when the scene isn't one a daily call can play: a
 * generated line anywhere, a turn that isn't a card turn, or no turn for the due phrase (or for
 * the reused one, when there is one).
 */
export function pipsMinuteMeta(minute: PipsMinuteScene): PipsMinuteMeta | null {
  const { scene, due, reuse } = minute;
  if (scene.beats.some((b) => b.kind === 'gen')) return null;
  const turns: PipsMinuteTurn[] = [];
  for (const beat of scene.beats) {
    const answer = answerOf(beat);
    if (answer === null) continue;
    if (!isCardTurn(answer)) return null;
    const phrase = answer.phrases.includes(due)
      ? due
      : reuse !== null && answer.phrases.includes(reuse)
        ? reuse
        : null;
    if (phrase !== null) turns.push({ beatId: beat.id, phrase });
  }
  if (!turns.some((t) => t.phrase === due)) return null;
  if (reuse !== null && !turns.some((t) => t.phrase === reuse)) return null;
  return { due, reuse, turns };
}

/** How the minute went, from how its turns passed. */
export interface PipsMinuteOutcome {
  readonly due: Id;
  readonly reuse: Id | null;
  /** The learner said the due phrase: its turn passed on its words. */
  readonly dueSaid: boolean;
  /** The learner fixed Pip's version; null when the fix turn wasn't played (or there is none). */
  readonly reuseFixed: boolean | null;
  /** At least one turn was played: the minute has something to write. */
  readonly played: boolean;
}

/**
 * The minute's outcome from the turn log's passes: a turn counts when it passed on its words
 * (`match`); the generous pass, a skip or a fallback don't, and a turn never reached isn't played.
 */
export function pipsMinuteOutcome(
  meta: PipsMinuteMeta,
  passes: readonly { readonly beatId: Id; readonly pass: TurnPass }[],
): PipsMinuteOutcome {
  const passOf = (beatId: Id) => passes.find((p) => p.beatId === beatId)?.pass ?? null;
  const played = (phrase: Id) =>
    meta.turns.filter((t) => t.phrase === phrase).map((t) => passOf(t.beatId));
  const due = played(meta.due);
  const reuse = meta.reuse === null ? [] : played(meta.reuse).filter((p) => p !== null);
  return {
    due: meta.due,
    reuse: meta.reuse,
    dueSaid: due.includes('match'),
    reuseFixed: reuse.length === 0 ? null : reuse.includes('match'),
    played: meta.turns.some((t) => passOf(t.beatId) !== null),
  };
}
