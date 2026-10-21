import {
  LIMITS,
  type EpochMs,
  type ErrorTargetProgress,
  type ErrorTargetStatus,
  type Id,
  type LocalDate,
  type TimeZone,
} from '@yapling/contracts';

import { localDateOf } from './time';

/*
 * Errors: two targets at a time. Recurring errors found in transcripts queue up as `waiting`; at
 * most two are `active`. When an active target comes up in a call, the character asks it back as a
 * question (the correction prompt) and waits; every other error is recast silently. A target
 * graduates after the learner self-corrects it 5 times across 3 different days, and the next one
 * in the queue becomes active.
 */

export const MAX_ACTIVE_TARGETS = LIMITS.activeTargets;
export const GRADUATION_SELF_CORRECTIONS = 5;
export const GRADUATION_DISTINCT_DAYS = 3;

export interface ErrorTargetRecord {
  /** `past_ed`, `final_s`, `articles`… */
  readonly id: Id;
  readonly status: ErrorTargetStatus;
  readonly selfCorrections: number;
  /** The distinct days (learner's timezone) with a self-correction, oldest first. */
  readonly correctionDays: readonly LocalDate[];
  readonly activatedAt: EpochMs | null;
  readonly graduatedAt: EpochMs | null;
}

/** All of a learner's targets. Waiting targets activate in the order they appear. */
export type ErrorTargets = readonly ErrorTargetRecord[];

const activeCount = (targets: ErrorTargets): number =>
  targets.filter((t) => t.status === 'active').length;

/** Activates waiting targets, in queue order, until two are active. */
const fillActive = (
  targets: ErrorTargets,
  at: EpochMs,
): { readonly targets: ErrorTargets; readonly activated: readonly Id[] } => {
  let free = MAX_ACTIVE_TARGETS - activeCount(targets);
  const activated: Id[] = [];
  const next = targets.map((t) => {
    if (free <= 0 || t.status !== 'waiting') return t;
    free--;
    activated.push(t.id);
    return { ...t, status: 'active' as const, activatedAt: at };
  });
  return { targets: next, activated };
};

/**
 * A recurring error found in a transcript. A new one joins the end of the queue and activates
 * straight away if fewer than two are active. A known (or graduated) one changes nothing.
 */
export const noteRecurringError = (
  targets: ErrorTargets,
  id: Id,
  at: EpochMs,
): { readonly targets: ErrorTargets; readonly activated: readonly Id[] } => {
  if (targets.some((t) => t.id === id)) return { targets, activated: [] };
  const queued: ErrorTargetRecord = {
    id,
    status: 'waiting',
    selfCorrections: 0,
    correctionDays: [],
    activatedAt: null,
    graduatedAt: null,
  };
  return fillActive([...targets, queued], at);
};

/**
 * What a character does when an error comes up in a call: `prompt` (ask it back as a question and
 * wait for a second try) for an active target, `recast` (say it right in passing) for anything else.
 */
export const errorResponse = (targets: ErrorTargets, errorId: Id): 'prompt' | 'recast' =>
  targets.some((t) => t.id === errorId && t.status === 'active') ? 'prompt' : 'recast';

/** The targets the call prompts, in activation order. */
export const activeTargets = (targets: ErrorTargets): ErrorTargets =>
  targets.filter((t) => t.status === 'active');

export interface SelfCorrectionResult {
  readonly targets: ErrorTargets;
  /** False when the target wasn't active, so nothing was counted. */
  readonly counted: boolean;
  /** The target that graduated with this self-correction ("It's yours now"). */
  readonly graduated: Id | null;
  /** The next target that became active in its place. */
  readonly activated: readonly Id[];
}

/**
 * The learner corrected an active target themselves (on the second try after a prompt, or on their
 * own). A failed second try is not recorded at all: it is never a failure.
 */
export const recordSelfCorrection = (
  targets: ErrorTargets,
  id: Id,
  at: EpochMs,
  timezone: TimeZone,
): SelfCorrectionResult => {
  const target = targets.find((t) => t.id === id);
  if (target?.status !== 'active') {
    return { targets, counted: false, graduated: null, activated: [] };
  }
  const day = localDateOf(at, timezone);
  const selfCorrections = target.selfCorrections + 1;
  const correctionDays = target.correctionDays.includes(day)
    ? target.correctionDays
    : [...target.correctionDays, day].sort();
  const graduates =
    selfCorrections >= GRADUATION_SELF_CORRECTIONS &&
    correctionDays.length >= GRADUATION_DISTINCT_DAYS;
  const updated: ErrorTargetRecord = {
    ...target,
    selfCorrections,
    correctionDays,
    ...(graduates ? { status: 'graduated' as const, graduatedAt: at } : {}),
  };
  const replaced = targets.map((t) => (t.id === id ? updated : t));
  if (!graduates) return { targets: replaced, counted: true, graduated: null, activated: [] };
  const filled = fillActive(replaced, at);
  return { targets: filled.targets, counted: true, graduated: id, activated: filled.activated };
};

/** Graduated targets, oldest first: the "Fixes" the learner owns ("You own -ed now"). */
export const graduatedTargets = (targets: ErrorTargets): ErrorTargets =>
  targets
    .filter((t) => t.status === 'graduated')
    .sort((a, b) => (a.graduatedAt ?? 0) - (b.graduatedAt ?? 0));

/** The target as the progress body carries it. */
export const toErrorTargetProgress = (target: ErrorTargetRecord): ErrorTargetProgress => ({
  id: target.id,
  status: target.status,
  selfCorrections: target.selfCorrections,
  selfCorrectionDays: target.correctionDays.slice(-LIMITS.usedDaysMax),
  activatedAt: target.activatedAt,
  graduatedAt: target.graduatedAt,
});

/** The target from the progress body. */
export const fromErrorTargetProgress = (target: ErrorTargetProgress): ErrorTargetRecord => ({
  id: target.id,
  status: target.status,
  selfCorrections: target.selfCorrections,
  correctionDays: target.selfCorrectionDays,
  activatedAt: target.activatedAt,
  graduatedAt: target.graduatedAt,
});
