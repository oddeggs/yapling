import type {
  CanDoProgress,
  CharacterId,
  EpochMs,
  Id,
  Keepsake,
  OpaqueId,
  Stage,
  TimeZone,
  Track,
} from '@yapling/contracts';

import type { SettlingChapter } from './settling';
import { localDateOf } from './time';

/*
 * Can-dos: the progress the learner actually sees. Each is ticked by evidence from a call (never a
 * quiz): a line the learner said, the call it came from, and the neighbour who heard it. A ticked
 * can-do becomes a keepsake in the burrow, drawn by Pip and signed by its witness.
 *
 * Titles are copy and live in `@yapling/i18n` under `titleKey`; the English title from the season
 * script is quoted in a comment beside each entry.
 */

/** The six episodes of Season 1, in story order. */
export const SEASON_1_EPISODES = ['s1-e1', 's1-e2', 's1-e3', 's1-e4', 's1-e5', 's1-e6'] as const;
export type Season1EpisodeId = (typeof SEASON_1_EPISODES)[number];

export type CanDoTrack = Exclude<Track, 'both'>;

interface CanDoBase {
  readonly id: Id;
  readonly stage: Stage;
  readonly track: CanDoTrack;
  readonly titleKey: string;
  /** Shown on the residency card (the stage's own card): "aim for these first". */
  readonly placement: boolean;
}

/** A Season 1 can-do, shown in an episode's call. */
export interface CanDoDefinition extends CanDoBase {
  /** The episode whose call gives the learner the chance to show it. */
  readonly episode: Season1EpisodeId;
}

/** A Visitor's can-do, one per Settling-in chapter. */
export interface SettlingCanDoDefinition extends CanDoBase {
  readonly stage: 'visitor';
  /** The Settling-in chapter whose call gives the learner the chance to show it. */
  readonly chapter: SettlingChapter;
}

/** Any can-do in the catalogue. */
export type AnyCanDoDefinition = CanDoDefinition | SettlingCanDoDefinition;

const canDo = (
  id: Id,
  episode: Season1EpisodeId,
  track: CanDoTrack,
  placement = false,
): CanDoDefinition => ({
  id,
  stage: 'newcomer',
  track,
  episode,
  titleKey: `cando.${id}`,
  placement,
});

/** Season 1's can-dos, one Life and one Work per episode (the season overview table). */
export const SEASON_1_CAN_DOS: readonly CanDoDefinition[] = [
  // "Ask someone what's wrong and offer help"
  canDo('ask-whats-wrong', 's1-e1', 'life', true),
  // "Introduce yourself in 30 seconds"
  canDo('introduce-yourself-30s', 's1-e1', 'work', true),
  // "Say what you're good at"
  canDo('say-what-youre-good-at', 's1-e2', 'life'),
  // "Answer 'Tell me about yourself'"
  canDo('tell-me-about-yourself', 's1-e2', 'work'),
  // "Say no politely"
  canDo('say-no-politely', 's1-e3', 'life'),
  // "Push back once and offer an alternative"
  canDo('push-back-offer-alternative', 's1-e3', 'work'),
  // "Agree and disagree kindly"
  canDo('agree-disagree-kindly', 's1-e4', 'life'),
  // "Keep a meeting moving and give everyone a turn"
  canDo('keep-a-meeting-moving', 's1-e4', 'work'),
  // "Tell a short story with a point"
  canDo('short-story-with-a-point', 's1-e5', 'life'),
  // "Give a 45-second pitch"
  canDo('pitch-45s', 's1-e5', 'work'),
  // "Speak in front of a group"
  canDo('speak-to-a-group', 's1-e6', 'life'),
  // "Make a short case and answer a question"
  canDo('make-a-case-take-a-question', 's1-e6', 'work'),
];

/** The two can-dos the residency card offers after placement, whatever the track. */
export const PLACEMENT_CAN_DOS: readonly CanDoDefinition[] = SEASON_1_CAN_DOS.filter(
  (c) => c.placement,
);

const settlingCanDo = (
  id: Id,
  chapter: SettlingChapter,
  track: CanDoTrack,
  placement = false,
): SettlingCanDoDefinition => ({
  id,
  stage: 'visitor',
  track,
  chapter,
  titleKey: `cando.${id}`,
  placement,
});

/** The Visitor's can-dos, one per Settling-in chapter, in chapter order. */
export const SETTLING_CAN_DOS: readonly SettlingCanDoDefinition[] = [
  // "Say hello and your name"
  settlingCanDo('say-hello-and-your-name', 1, 'life', true),
  // "Answer yes or no politely"
  settlingCanDo('answer-yes-or-no-politely', 2, 'life'),
  // "Ask someone to say it again or slower"
  settlingCanDo('ask-again-or-slower', 3, 'life', true),
  // "Understand a number, a time and a price"
  settlingCanDo('understand-number-time-price', 4, 'work'),
  // "Order one thing"
  settlingCanDo('order-one-thing', 5, 'life'),
  // "Say where you're from and what you do"
  settlingCanDo('say-where-youre-from-and-what-you-do', 6, 'work'),
];

/** The two can-dos the Visitor's residency card shows: hello and your name, and "again". */
export const VISITOR_CARD_CAN_DOS: readonly SettlingCanDoDefinition[] = SETTLING_CAN_DOS.filter(
  (c) => c.placement,
);

/** The can-do a Settling-in chapter gives the chance to show. */
export const settlingCanDoFor = (chapter: SettlingChapter): SettlingCanDoDefinition | undefined =>
  SETTLING_CAN_DOS.find((c) => c.chapter === chapter);

/** Any can-do by id, Visitor or Season 1. */
export const canDoById = (id: Id): AnyCanDoDefinition | undefined =>
  SEASON_1_CAN_DOS.find((c) => c.id === id) ?? SETTLING_CAN_DOS.find((c) => c.id === id);

/**
 * The can-dos a learner's track shows. Life and Work share stages; "both" shows every one. The
 * placement can-dos show on every track.
 */
export const canDosForTrack = (track: Track): readonly CanDoDefinition[] =>
  SEASON_1_CAN_DOS.filter((c) => track === 'both' || c.track === track || c.placement);

/** A can-do not yet started. */
export const newCanDo = (definition: AnyCanDoDefinition): CanDoProgress => ({
  id: definition.id,
  stage: definition.stage,
  status: 'in_progress',
  evidence: [],
  witness: null,
  tickedOn: null,
});

/** The most evidence lines one can-do keeps (the contract's limit); the oldest drop first. */
export const CAN_DO_EVIDENCE_MAX = 20;

export interface CanDoEvidenceInput {
  readonly canDoId: Id;
  readonly callRecordId: OpaqueId;
  readonly quote: string;
  /** The neighbour who heard it and signs the keepsake. */
  readonly witness: CharacterId;
  readonly at: EpochMs;
}

export interface CanDoTickResult {
  readonly canDo: CanDoProgress;
  /** The new keepsake, the first time the can-do is ticked; null after that. */
  readonly keepsake: Keepsake | null;
}

export const canDoKeepsakeId = (canDoId: Id): Id => `cando-${canDoId}`.slice(0, 64);

/**
 * Evidence from a call ticks a can-do: the first piece ticks it, names the witness and the day
 * (in the learner's timezone) and makes its keepsake. Later evidence is kept but never changes the
 * witness, the day or makes a second keepsake.
 */
export const tickCanDo = (
  current: CanDoProgress,
  evidence: CanDoEvidenceInput,
  timezone: TimeZone,
): CanDoTickResult => {
  if (evidence.canDoId !== current.id) {
    throw new Error(`Evidence for ${evidence.canDoId} given to ${current.id}`);
  }
  const line = { callRecordId: evidence.callRecordId, quote: evidence.quote, at: evidence.at };
  const kept = [...current.evidence, line].slice(-CAN_DO_EVIDENCE_MAX);
  if (current.status === 'ticked') {
    return { canDo: { ...current, evidence: kept }, keepsake: null };
  }
  const tickedOn = localDateOf(evidence.at, timezone);
  return {
    canDo: {
      ...current,
      status: 'ticked',
      evidence: kept,
      witness: evidence.witness,
      tickedOn,
    },
    keepsake: {
      id: canDoKeepsakeId(current.id),
      kind: 'can_do',
      canDoId: current.id,
      signedBy: evidence.witness,
      earnedOn: tickedOn,
    },
  };
};
