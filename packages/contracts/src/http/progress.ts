import { z } from 'zod';

import {
  CharacterId,
  EpochMs,
  Id,
  LIMITS,
  LocalDate,
  OpaqueId,
  Phrase,
  PHRASE_STATES,
  PhraseState,
  RING_SLOT_KINDS,
  RingSlotKind,
  Stage,
} from '../primitives';

/** Distinct local days, oldest first. */
const isAscendingDays = (days: readonly string[]): boolean =>
  days.every((d, i) => i === 0 || (days[i - 1] ?? '') < d);

/**
 * A phrase (chunk) on its way from seed to bloom, with when it reached each state. A state not yet
 * reached has a null time. Phrases never wilt: a phrase not used for a while stays where it is.
 * `usedOn` (the learner's local days with a correct use, oldest first, the most recent 30) and
 * `contexts` (the scenes it was used in correctly, the most recent 20) let the leaf rule (another
 * day) and the bloom rule (a new context) be checked exactly.
 */
export const PhraseProgress = z
  .object({
    id: Id,
    text: Phrase,
    state: PhraseState,
    seedAt: EpochMs,
    sproutAt: EpochMs.nullable(),
    leafAt: EpochMs.nullable(),
    bloomAt: EpochMs.nullable(),
    lastUsedAt: EpochMs.nullable(),
    usedOn: z.array(LocalDate).max(LIMITS.usedDaysMax),
    contexts: z.array(Id).max(LIMITS.phraseContextsMax),
    /**
     * When Pip last said it slightly wrong in Pip's minute for the learner to fix, so it rests a
     * week before Pip tries it again. Left out (an older app's body) or null: never.
     */
    pipReusedAt: EpochMs.nullable().optional(),
  })
  .refine((p) => isAscendingDays(p.usedOn), {
    message: 'Use days are distinct, oldest first',
  })
  .refine((p) => new Set(p.contexts).size === p.contexts.length, {
    message: 'Each context once',
  })
  .refine((p) => (p.lastUsedAt === null) === (p.usedOn.length === 0), {
    message: 'A used phrase has use days; an unused one has none',
  })
  .refine(
    (p) => {
      const reached = PHRASE_STATES.indexOf(p.state);
      const times = [p.seedAt, p.sproutAt, p.leafAt, p.bloomAt];
      return times.every((t, i) => i <= reached === (t !== null));
    },
    { message: 'Each reached state has a time; later states have none' },
  );
export type PhraseProgress = z.infer<typeof PhraseProgress>;

/**
 * A recurring error. Two are `active` at once (prompted in calls); the rest `waiting`. A target
 * graduates after 5 self-corrections across 3 different days.
 */
export const ERROR_TARGET_STATUSES = ['waiting', 'active', 'graduated'] as const;
export const ErrorTargetStatus = z.enum(ERROR_TARGET_STATUSES);
export type ErrorTargetStatus = z.infer<typeof ErrorTargetStatus>;

export const ErrorTargetProgress = z
  .object({
    /** `past_ed`, `final_s`, `articles`… */
    id: Id,
    status: ErrorTargetStatus,
    selfCorrections: z.int().min(0),
    /** The learner's local days with a self-correction, distinct, oldest first. */
    selfCorrectionDays: z.array(LocalDate).max(LIMITS.usedDaysMax),
    activatedAt: EpochMs.nullable(),
    graduatedAt: EpochMs.nullable(),
  })
  .refine((t) => isAscendingDays(t.selfCorrectionDays), {
    message: 'Self-correction days are distinct, oldest first',
  })
  .refine((t) => (t.status === 'graduated') === (t.graduatedAt !== null), {
    message: 'Only a graduated target has a graduation time',
  })
  .refine((t) => t.status === 'waiting' || t.activatedAt !== null, {
    message: 'An active or graduated target was activated',
  })
  .refine((t) => t.selfCorrectionDays.length <= t.selfCorrections, {
    message: 'No more correction days than corrections',
  });
export type ErrorTargetProgress = z.infer<typeof ErrorTargetProgress>;

/** A line from a call that counts toward a can-do. */
export const CanDoEvidence = z.object({
  callRecordId: OpaqueId,
  quote: z.string().min(1).max(LIMITS.textMax),
  at: EpochMs,
});
export type CanDoEvidence = z.infer<typeof CanDoEvidence>;

/**
 * A can-do with evidence so far. A ticked one names the neighbour who witnessed it and the day;
 * it becomes a keepsake.
 */
export const CanDoProgress = z
  .object({
    id: Id,
    stage: Stage,
    status: z.enum(['in_progress', 'ticked']),
    evidence: z.array(CanDoEvidence).max(20),
    witness: CharacterId.nullable(),
    tickedOn: LocalDate.nullable(),
  })
  .refine(
    (c) =>
      c.status === 'ticked'
        ? c.witness !== null && c.tickedOn !== null
        : c.witness === null && c.tickedOn === null,
    {
      message: 'A ticked can-do has a witness and a day; one in progress has neither',
    },
  )
  .refine((c) => c.status === 'in_progress' || c.evidence.length > 0, {
    message: 'A ticked can-do has evidence',
  });
export type CanDoProgress = z.infer<typeof CanDoProgress>;

/** Burrow keepsakes: a can-do certificate signed by its witness, a season keepsake, a story gift. */
export const KEEPSAKE_KINDS = ['can_do', 'season', 'story', 'week'] as const;
export const KeepsakeKind = z.enum(KEEPSAKE_KINDS);
export type KeepsakeKind = z.infer<typeof KeepsakeKind>;

export const Keepsake = z
  .object({
    id: Id,
    kind: KeepsakeKind,
    canDoId: Id.nullable(),
    signedBy: CharacterId.nullable(),
    earnedOn: LocalDate,
  })
  .refine((k) => (k.kind === 'can_do') === (k.canDoId !== null), {
    message: 'Only a can-do keepsake names its can-do',
  });
export type Keepsake = z.infer<typeof Keepsake>;

/**
 * One call of the weekly ring. `upcoming`: not offered yet; `open`: ready to take (a missed week's
 * call waits here, never lost); `done`: taken.
 */
export const RING_SLOT_STATUSES = ['upcoming', 'open', 'done'] as const;
export const RingSlotStatus = z.enum(RING_SLOT_STATUSES);
export type RingSlotStatus = z.infer<typeof RingSlotStatus>;

export const RingSlot = z
  .object({
    kind: RingSlotKind,
    status: RingSlotStatus,
    sceneId: Id.nullable(),
    callRecordId: OpaqueId.nullable(),
    doneAt: EpochMs.nullable(),
  })
  .refine(
    (s) =>
      s.status === 'done'
        ? s.callRecordId !== null && s.doneAt !== null
        : s.callRecordId === null && s.doneAt === null,
    { message: 'A done slot has its call and time; others have neither' },
  );
export type RingSlot = z.infer<typeof RingSlot>;

/** One week's ring: an episode, a real-week and a practice call, in that order. */
export const WeekRing = z
  .object({
    week: z.int().min(1),
    slots: z.array(RingSlot).length(RING_SLOT_KINDS.length),
  })
  .refine((w) => w.slots.every((s, i) => s.kind === RING_SLOT_KINDS[i]), {
    message: 'Slots are episode, real_week, practice',
  });
export type WeekRing = z.infer<typeof WeekRing>;

// --- Settling in (beginner path): the six short chapters with Linh before the story. ---

/** Settling in has six chapters, 1 to 6. */
export const SETTLING_CHAPTER_COUNT = 6;

/**
 * A Settling-in chapter finished for the first time, on the learner's local day (replays don't
 * change it). The call record is null for a chapter marked done without its call.
 */
export const SettlingChapterDone = z.object({
  chapter: z.int().min(1).max(SETTLING_CHAPTER_COUNT),
  doneOn: LocalDate,
  callRecordId: OpaqueId.nullable(),
});
export type SettlingChapterDone = z.infer<typeof SettlingChapterDone>;

/** The chapters done, in the order they were finished: each chapter once, days never going back. */
export const SettlingProgress = z
  .array(SettlingChapterDone)
  .max(SETTLING_CHAPTER_COUNT)
  .refine((done) => new Set(done.map((d) => d.chapter)).size === done.length, {
    message: 'Each chapter once',
  })
  .refine((done) => done.every((d, i) => i === 0 || (done[i - 1]?.doneOn ?? '') <= d.doneOn), {
    message: 'Chapters in the order they were done',
  });
export type SettlingProgress = z.infer<typeof SettlingProgress>;

/**
 * `GET /api/me/progress`: everything the burrow, the week view and the Me sheet show. `dayIndex`
 * counts days since install in the learner's timezone (the install day is day 1). `revision` grows
 * on every change; the phone's cached copy loses to a higher one.
 */
export const Progress = z
  .object({
    revision: z.int().min(1),
    installedOn: LocalDate,
    dayIndex: z.int().min(1),
    phrases: z.array(PhraseProgress).max(2_000),
    errorTargets: z.array(ErrorTargetProgress).max(50),
    canDos: z.array(CanDoProgress).max(200),
    keepsakes: z.array(Keepsake).max(500),
    /** Oldest first; the last is the current week. */
    weeks: z.array(WeekRing).max(520),
    /** Settling-in chapters done; empty (and left out by older apps) when none. */
    settlingChaptersDone: SettlingProgress.default([]),
  })
  .refine(
    (p) => p.errorTargets.filter((t) => t.status === 'active').length <= LIMITS.activeTargets,
    { message: 'At most two active error targets' },
  )
  .refine((p) => p.weeks.every((w, i) => w.week === i + 1), {
    message: 'Weeks run 1, 2, 3… with none missing',
  });
export type Progress = z.infer<typeof Progress>;

/**
 * `PUT /api/me/progress`: the phone's whole progress, with `revision` the server revision it was
 * based on. An older revision is refused with 409 `stale_revision` and the server's copy wins.
 * `installedOn` and `dayIndex` belong to the server and are ignored.
 */
export const ProgressPut = Progress;
export type ProgressPut = Progress;

/**
 * `POST /api/me/keepsakes/season`: keep the season keepsake (a `season` keepsake, `season-<n>`) in
 * progress once every episode of season `season` is played, so the burrow wall hangs it on every
 * phone. The server dates it from the last episode's slot. Answers `Progress`; asking again keeps
 * the first one; 409 `season_not_finished` while an episode is still to play.
 */
export const SeasonKeepsakeRequest = z.object({ season: z.int().min(1).max(99) });
export type SeasonKeepsakeRequest = z.infer<typeof SeasonKeepsakeRequest>;
