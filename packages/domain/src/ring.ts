import {
  RING_SLOT_KINDS,
  type EpochMs,
  type Id,
  type Keepsake,
  type LocalDate,
  type OpaqueId,
  type RingSlot,
  type RingSlotKind,
  type TimeZone,
  type WeekRing,
} from '@yapling/contracts';

import { localDateOf } from './time';

/*
 * The weekly ring, not a streak. Each week (seven days from the install day, so week 1 is days
 * 1–7) has three calls: the episode, the real-week call and the practice call. A slot is
 * `upcoming` until its day comes, then `open`, then `done`. There is no "missed": a week that ends
 * with open slots keeps them open, and the next call of that kind fills the oldest open one first,
 * so a missed week simply waits. Filling the third slot of a week fills the ring: a week keepsake.
 */

export const DAYS_PER_WEEK = 7;

/** The week a day falls in: days 1–7 are week 1. */
export const weekOfDay = (dayIndex: number): number =>
  Math.max(1, Math.ceil(dayIndex / DAYS_PER_WEEK));

/** The first day of a week: week 1 starts on day 1 (the install day). */
export const firstDayOfWeek = (week: number): number => (week - 1) * DAYS_PER_WEEK + 1;

/**
 * Which day of the week (1–7) each call opens. Week one follows the first-week plan: the episode
 * on day 2, the real week on day 4, the practice call on day 5.
 */
export const WEEK_ONE_SLOT_OPENS: Readonly<Record<RingSlotKind, number>> = {
  episode: 2,
  real_week: 4,
  practice: 5,
};

/**
 * Later weeks: the new episode is ready on the first day of the week, the real-week call on the
 * third and the practice call on the fourth, so the week has a rhythm without a deadline.
 * Founder-tunable.
 */
export const LATER_WEEK_SLOT_OPENS: Readonly<Record<RingSlotKind, number>> = {
  episode: 1,
  real_week: 3,
  practice: 4,
};

/** The day index a week's call opens on. */
export const slotOpensOnDay = (week: number, kind: RingSlotKind): number =>
  firstDayOfWeek(week) - 1 + (week === 1 ? WEEK_ONE_SLOT_OPENS : LATER_WEEK_SLOT_OPENS)[kind];

/** The scene a slot will play, when the story knows it (null otherwise). */
export type SceneFor = (week: number, kind: RingSlotKind) => Id | null;

const emptySlot = (kind: RingSlotKind): RingSlot => ({
  kind,
  status: 'upcoming',
  sceneId: null,
  callRecordId: null,
  doneAt: null,
});

/**
 * The rings up to the week of `dayIndex`: new weeks are added, slots whose day has come open, and
 * nothing that is open or done ever goes back.
 */
export const ringWeeks = (
  weeks: readonly WeekRing[],
  dayIndex: number,
  sceneFor: SceneFor = () => null,
): readonly WeekRing[] => {
  const count = Math.max(weeks.length, weekOfDay(dayIndex));
  return Array.from({ length: count }, (_, i) => {
    const week = i + 1;
    const previous = weeks[i];
    return {
      week,
      slots: RING_SLOT_KINDS.map((kind, s) => {
        const slot = previous?.slots[s] ?? emptySlot(kind);
        if (slot.status !== 'upcoming' || dayIndex < slotOpensOnDay(week, kind)) return slot;
        return { ...slot, status: 'open' as const, sceneId: slot.sceneId ?? sceneFor(week, kind) };
      }),
    };
  });
};

/** A full ring's keepsake for the burrow. */
export interface WeekKeepsake {
  readonly id: Id;
  readonly week: number;
  readonly earnedOn: LocalDate;
}

export const weekKeepsakeId = (week: number): Id => `week-${week}`;

/** A finished call of the ring's kinds. */
export interface RingCall {
  readonly kind: RingSlotKind;
  readonly callRecordId: OpaqueId;
  readonly doneAt: EpochMs;
}

export interface RingFillResult {
  readonly weeks: readonly WeekRing[];
  /** The slot the call filled; null when no slot of its kind was open (an extra call). */
  readonly filled: { readonly week: number; readonly kind: RingSlotKind } | null;
  /** Set when this call filled the last slot of its week. */
  readonly ringFull: WeekKeepsake | null;
}

export const isRingFull = (ring: WeekRing): boolean => ring.slots.every((s) => s.status === 'done');

/**
 * A finished call fills the oldest open slot of its kind. An upcoming slot can't be filled early;
 * a call with nothing to fill still counts as practice, it just doesn't move the ring.
 */
export const fillRingSlot = (
  weeks: readonly WeekRing[],
  call: RingCall,
  timezone: TimeZone,
): RingFillResult => {
  const index = weeks.findIndex((w) =>
    w.slots.some((s) => s.kind === call.kind && s.status === 'open'),
  );
  const target = weeks[index];
  if (target === undefined) return { weeks, filled: null, ringFull: null };
  const ring: WeekRing = {
    week: target.week,
    slots: target.slots.map((s) =>
      s.kind === call.kind && s.status === 'open'
        ? { ...s, status: 'done', callRecordId: call.callRecordId, doneAt: call.doneAt }
        : s,
    ),
  };
  return {
    weeks: weeks.map((w, i) => (i === index ? ring : w)),
    filled: { week: ring.week, kind: call.kind },
    ringFull: isRingFull(ring)
      ? {
          id: weekKeepsakeId(ring.week),
          week: ring.week,
          earnedOn: localDateOf(call.doneAt, timezone),
        }
      : null,
  };
};

/** Full rings so far: the lifetime count on the town wall. */
export const fullRingCount = (weeks: readonly WeekRing[]): number =>
  weeks.filter(isRingFull).length;

/**
 * The week keepsake as the progress body carries it: a `week` keepsake, drawn and signed by Pip.
 */
export const weekKeepsakeToWire = (keepsake: WeekKeepsake): Keepsake => ({
  id: keepsake.id,
  kind: 'week',
  canDoId: null,
  signedBy: 'pip',
  earnedOn: keepsake.earnedOn,
});
