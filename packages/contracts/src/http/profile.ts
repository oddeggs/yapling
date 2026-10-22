import { z } from 'zod';

import {
  EpochMs,
  FirstLanguage,
  LIMITS,
  LocalDate,
  LocalTime,
  Pace,
  RoommateSpecies,
  Stage,
  TimeZone,
  Track,
} from '../primitives';

/** A display name or a roommate's name: 1–24 characters on one line. */
export const Name = z
  .string()
  .min(LIMITS.nameMin)
  .max(LIMITS.nameMax)
  .regex(/^[^\p{Cc}]+$/u, 'One line, no control characters')
  .refine((n) => n.trim() === n, { message: 'No leading or trailing spaces' });
export type Name = z.infer<typeof Name>;

/** The roommate: species is cosmetic; Pip is the default name. */
export const Roommate = z.object({ species: RoommateSpecies, name: Name });
export type Roommate = z.infer<typeof Roommate>;

/** No knocks between `start` and `end` (may run past midnight, e.g. 22:00–08:00). */
export const QuietHours = z
  .object({ start: LocalTime, end: LocalTime })
  .refine((q) => q.start !== q.end, { message: 'Quiet hours start and end at different times' });
export type QuietHours = z.infer<typeof QuietHours>;

const editable = {
  displayName: Name,
  firstLanguage: FirstLanguage,
  roommate: Roommate,
  track: Track,
  /** Null: no quiet hours. */
  quietHours: QuietHours.nullable(),
  timezone: TimeZone,
  /** Whether the learner allowed notifications on the phone (mirrored for the server's plan). */
  notificationsAllowed: z.boolean(),
  /** The pace the learner asked for; null for the stage's own. */
  pace: Pace.nullable(),
};

// --- The beginner path: how the learner started, and when the story started. ---

/**
 * The onboarding answer to "Tiếng Anh của bạn bây giờ thế nào?": `visitor` ("Mình mới bắt đầu",
 * Settling in with Linh, no placement call) or `placement` ("Mình nói được một chút", the placement
 * call as before).
 */
export const START_PATHS = ['visitor', 'placement'] as const;
export const StartPath = z.enum(START_PATHS);
export type StartPath = z.infer<typeof StartPath>;

const story = {
  /**
   * The learner's local day the story started (the letter under the café door), which week 1's
   * days count from. Null until it is recorded: a Visitor still settling in, or a profile saved
   * before it was kept (whose story started on the install day).
   */
  storyStartedOn: LocalDate.nullable(),
  /** The onboarding path; null for a profile saved before the learner was asked. */
  startPath: StartPath.nullable(),
};

/**
 * `GET /api/me/profile`. `stage` is the server's: placement sets it, and the learning model moves
 * it. `revision` grows on every change; the phone's cached copy loses to a higher one.
 */
export const Profile = z.object({
  revision: z.int().min(1),
  ...editable,
  /** Null for a profile saved before the learner was asked (and a copy cached before then). */
  pace: Pace.nullable().default(null),
  stage: Stage,
  updatedAt: EpochMs,
  /** Null for a profile (or a cached copy) from before these were kept. */
  storyStartedOn: story.storyStartedOn.default(null),
  startPath: story.startPath.default(null),
});
export type Profile = z.infer<typeof Profile>;

/**
 * `PUT /api/me/profile`: the whole profile, at the end of onboarding. `pace` may be left out (the
 * residency card asks for it after the profile is saved): the pace the profile has is kept. So may
 * `storyStartedOn` and `startPath` (older apps never send them): the profile's are kept.
 */
export const ProfileInput = z.object({
  ...editable,
  pace: Pace.nullable().optional(),
  storyStartedOn: story.storyStartedOn.optional(),
  startPath: story.startPath.optional(),
});
export type ProfileInput = z.infer<typeof ProfileInput>;

/** `PATCH /api/me/profile`: any editable fields (or `storyStartedOn`, `startPath`), at least one. */
export const ProfileUpdate = z
  .object({ ...editable, ...story })
  .partial()
  .refine((u) => Object.values(u).some((v) => v !== undefined), {
    message: 'Change at least one field',
  });
export type ProfileUpdate = z.infer<typeof ProfileUpdate>;
