import type { Id } from '@yapling/contracts';
import type { PipsMinuteLines } from '@yapling/domain';

import { answer, learner, rec, scene, ui } from './build';
import {
  S1_PIPS_MINUTE,
  S1_PIPS_MINUTE_CLOSES,
  S1_PIPS_MINUTE_OPENS,
} from './season-1/pips-minute';
import { praiseFor } from './season-1/shared-lines';
import { task } from './season-1/visitor';
import type { Answer, Beat, Scene } from './types';
import type { PipsMinutePhrase, PipsMinuteTurn } from './season-1/pips-minute';

/*
 * Pip's minute as a scene: a phrase, its set-up line and its slightly-wrong line become a
 * two-turn card scene in the burrow. Turn one: Pip sets up a moment and the learner says the due
 * phrase. Turn two, when the learning model picks a phrase to reuse: Pip says it slightly wrong
 * and the learner fixes it. Both are say-this cards passed by their words (no model, no generated
 * line), shown at once at Visitor, after the stage's pause at Newcomer and Neighbour, and only when
 * asked from Regular. Then Pip closes and the phrases grow.
 *
 * The scene is built, not stored: its id names what it is made of (`s1-pm.2.whats-wrong.deal`),
 * so the call and the app rebuild the same scene from the id alone (`findScene`, a resumed call).
 */

export const PIPS_MINUTE_PREFIX = 's1-pm';

/** Which of Pip's three openers and closers plays. */
export type PipsMinuteOpening = 1 | 2 | 3;

export interface PipsMinuteSpec {
  /** The due phrase Pip sets up (`duePhrases`). */
  readonly due: Id;
  /** The phrase Pip says slightly wrong (`pickPipReuse`); null for one turn only. */
  readonly reuse: Id | null;
  readonly opening: PipsMinuteOpening;
  /** The learner's first Pip's minute: task cards open the two kinds of turn (for a Visitor). */
  readonly intro: boolean;
}

const phraseOf = (id: Id): PipsMinutePhrase | undefined =>
  (S1_PIPS_MINUTE as Readonly<Record<Id, PipsMinutePhrase>>)[id];

/** The story lines Pip's minute has, as the learning model's choice reads them. */
export const PIPS_MINUTE_LINES: Required<PipsMinuteLines> = {
  hasSetUp: (id) => phraseOf(id) !== undefined,
  hasWrongLine: (id) => (phraseOf(id)?.wrong ?? null) !== null,
};

/** The opener for a story day: the three in turn, so never the same one two days running. */
export const pipsMinuteOpeningFor = (dayIndex: number): PipsMinuteOpening =>
  (((((Math.round(dayIndex) - 1) % 3) + 3) % 3) + 1) as PipsMinuteOpening;

export const pipsMinuteSceneId = (spec: PipsMinuteSpec): Id =>
  [
    PIPS_MINUTE_PREFIX,
    `${spec.opening}${spec.intro ? 'i' : ''}`,
    spec.due,
    ...(spec.reuse === null ? [] : [spec.reuse]),
  ].join('.');

const ID = /^s1-pm\.([123])(i?)\.([a-z0-9-]+)(?:\.([a-z0-9-]+))?$/;

/** The spec a Pip's-minute scene id names; null for any other id or an unknown phrase. */
export const parsePipsMinuteSceneId = (id: Id): PipsMinuteSpec | null => {
  const m = ID.exec(id);
  if (!m) return null;
  const [, opening, intro, due, reuse] = m;
  if (due === undefined || !PIPS_MINUTE_LINES.hasSetUp(due)) return null;
  if (reuse !== undefined && (reuse === due || !PIPS_MINUTE_LINES.hasWrongLine(reuse))) {
    return null;
  }
  return {
    due,
    reuse: reuse ?? null,
    opening: Number(opening) as PipsMinuteOpening,
    intro: intro === 'i',
  };
};

const cardTurn = (
  turn: PipsMinuteTurn,
  phrase: Id,
  options: Pick<Answer, 'praise' | 'onReplay'> & { readonly task?: Answer['task'] },
): Answer =>
  answer({
    listener: 'pip',
    expects: `Says "${turn.card.en}".`,
    phrases: [phrase],
    choices: [turn.card],
    accept: turn.accept,
    // Up from the start at Visitor; after the stage's pause, or when asked, above it.
    showHint: 'stage',
    onTargetError: 'accept',
    onReplay: options.onReplay,
    praise: options.praise,
    ...(options.task === null || options.task === undefined ? {} : { task: options.task }),
    fallback: {
      speaker: 'pip',
      intent: 'Say the words on the card warmly, as if together, and go on.',
    },
  });

const INTRO_TASK = task(
  "Pip's minute: read the card for Pip.",
  'Một phút với Pip: đọc thẻ giúp Pip nhé.',
);
const FIX_TASK = task(
  'Pip said it wrong. Read Pip the right words.',
  'Pip nói sai. Đọc câu đúng cho Pip nhé.',
);

/** Pip's minute for a spec; null when the due phrase has no set-up line. */
export const pipsMinuteScene = (spec: PipsMinuteSpec): Scene | null => {
  const due = phraseOf(spec.due);
  if (due === undefined) return null;
  const wrong = spec.reuse === null ? null : (phraseOf(spec.reuse)?.wrong ?? null);
  const reuse = wrong === null ? null : spec.reuse;
  const id = pipsMinuteSceneId({ ...spec, reuse });
  const n = spec.opening - 1;
  const beats: Beat[] = [
    rec('open', S1_PIPS_MINUTE_OPENS[n] ?? S1_PIPS_MINUTE_OPENS[0]),
    rec('set-up', due.setUp.line),
    learner(
      'say',
      cardTurn(due.setUp, spec.due, {
        praise: praiseFor('pip'),
        // The fast set-up: asking again is the answer, and the line plays again slower.
        onReplay: due.setUp.lifesaver === true ? 'replay_and_pass' : 'replay',
        ...(spec.intro ? { task: INTRO_TASK } : {}),
      }),
    ),
  ];
  if (wrong !== null && reuse !== null) {
    beats.push(
      rec('wrong', wrong.line),
      learner(
        'fix',
        cardTurn(wrong, reuse, {
          praise: [],
          onReplay: 'replay',
          ...(spec.intro ? { task: FIX_TASK } : {}),
        }),
      ),
      ui('fixed', { type: 'phrase_grows', phrase: reuse }),
    );
  }
  beats.push(
    rec('close', S1_PIPS_MINUTE_CLOSES[n] ?? S1_PIPS_MINUTE_CLOSES[0]),
    ui('grows', { type: 'phrase_grows', phrase: spec.due }),
  );
  return scene({
    id,
    kind: 'daily',
    title: "Pip's minute",
    place: 'burrow',
    cast: ['pip'],
    summary:
      "A minute in the burrow with Pip: Pip sets up a small moment where one of the learner's phrases fits, and the learner says it. Sometimes Pip then says another phrase slightly wrong, and the learner fixes it.",
    goal: 'Say your phrase when it fits, and fix Pip’s version.',
    phrases: reuse === null ? [spec.due] : [spec.due, reuse],
    beats,
  });
};

/**
 * Today's Pip's minute from the learning model's choice (`pipsMinuteFor`): null when nothing is
 * due. The opener follows the story day; `intro` for a Visitor's first one.
 */
export const pipsMinuteSceneFor = (
  minute: { readonly due: { readonly id: Id }; readonly reuse: { readonly id: Id } | null } | null,
  options: { readonly dayIndex: number; readonly intro?: boolean },
): Scene | null =>
  minute === null
    ? null
    : pipsMinuteScene({
        due: minute.due.id,
        reuse: minute.reuse?.id ?? null,
        opening: pipsMinuteOpeningFor(options.dayIndex),
        intro: options.intro === true,
      });

/** Every Pip's minute the season can build: each phrase alone, and with every phrase to fix. */
export const allPipsMinuteScenes = (opening: PipsMinuteOpening = 1): readonly Scene[] => {
  const ids = Object.keys(S1_PIPS_MINUTE);
  return ids.flatMap((due) =>
    [null, ...ids.filter((r) => r !== due && PIPS_MINUTE_LINES.hasWrongLine(r))].flatMap(
      (reuse) => pipsMinuteScene({ due, reuse, opening, intro: false }) ?? [],
    ),
  );
};
