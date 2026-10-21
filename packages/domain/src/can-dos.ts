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

export interface CanDoDefinition {
  readonly id: Id;
  readonly stage: Stage;
  readonly track: CanDoTrack;
  /** The episode whose call gives the learner the chance to show it. */
  readonly episode: Season1EpisodeId;
  readonly titleKey: string;
  /** Shown on the residency card after placement: "aim for these first". */
  readonly placement: boolean;
}

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

export const canDoById = (id: Id): CanDoDefinition | undefined =>
  SEASON_1_CAN_DOS.find((c) => c.id === id);

/**
 * The can-dos a learner's track shows. Life and Work share stages; "both" shows every one. The
 * placement can-dos show on every track.
 */
export const canDosForTrack = (track: Track): readonly CanDoDefinition[] =>
  SEASON_1_CAN_DOS.filter((c) => track === 'both' || c.track === track || c.placement);

/** A can-do not yet started. */
export const newCanDo = (definition: CanDoDefinition): CanDoProgress => ({
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
