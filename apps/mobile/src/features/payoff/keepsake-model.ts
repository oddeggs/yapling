import type {
  CallRecord,
  CanDoProgress,
  CharacterId,
  Keepsake,
  Progress,
  WeekRing,
} from '@yapling/contracts';
import { SEASON_1_CAN_DOS, canDoById, isRingFull } from '@yapling/domain';
import { translator, type StringKey, type Translate } from '@yapling/i18n';

import { characterName, handDate } from './format';

/*
 * Keepsakes as the roommate draws them: "Lan can now…", the can-do in its handwriting, "witnessed
 * by Linh · Sep 25" with the day it was earned, and the witness's face. A ticked can-do makes one;
 * a full weekly ring makes one too. Everything here is read from progress, so nothing is shown
 * that the server hasn't recorded.
 */

/** The learner as the keepsake names them. */
export interface KeepsakeLearner {
  /** The display name from onboarding ("Lan"). */
  readonly name: string;
  /** The roommate's name (Pip by default). */
  readonly roommateName: string;
}

/** One drawn certificate. The keepsake's own text is English (the roommate's writing). */
export interface Certificate {
  readonly id: string;
  /** "Lan can now…" */
  readonly heading: string;
  /** "Introduce yourself in 30 seconds" */
  readonly canDo: string;
  /** "witnessed by Linh · Sep 25" */
  readonly witnessed: string;
  /** Whose face is on it; null for a voice with no face. */
  readonly witness: CharacterId | null;
  readonly witnessName: string;
  /** The day it was earned. */
  readonly earnedOn: string;
  /** The can-do's track and how many of that track are ticked, for a can-do certificate. */
  readonly track: {
    readonly track: 'life' | 'work';
    readonly done: number;
    readonly total: number;
  } | null;
}

/** What a call earned: a full ring (with its week) and the certificates to draw, in order. */
export interface EarnedKeepsakes {
  readonly ringFull: { readonly week: number } | null;
  readonly certificates: readonly Certificate[];
}

const en = translator('en');

function canDoWording(canDoId: string): string {
  const definition = canDoById(canDoId);
  return definition ? en(definition.titleKey as StringKey as 'cando.ask-whats-wrong') : canDoId;
}

function trackOf(canDoId: string): Certificate['track'] {
  const definition = canDoById(canDoId);
  if (!definition) return null;
  const track = definition.track;
  const total = SEASON_1_CAN_DOS.filter((c) => c.track === track).length;
  return { track, done: 0, total };
}

function certificate(
  keepsake: Keepsake,
  canDo: CanDoProgress | undefined,
  learner: KeepsakeLearner,
  canDos: readonly CanDoProgress[],
): Certificate {
  const witness: CharacterId =
    keepsake.kind === 'can_do'
      ? (keepsake.signedBy ?? canDo?.witness ?? 'pip')
      : (canDo?.witness ?? keepsake.signedBy ?? 'pip');
  const witnessName = characterName(witness, learner.roommateName);
  const track = canDo ? trackOf(canDo.id) : null;
  return {
    id: keepsake.id,
    heading: en('payoff.keepsake.canNow', { learner: learner.name }),
    canDo: canDo ? canDoWording(canDo.id) : en('payoff.keepsake.weekCanDo'),
    witnessed: en('payoff.keepsake.witnessed', {
      witness: witnessName,
      date: handDate(keepsake.earnedOn),
    }),
    witness: witness === 'office' ? null : witness,
    witnessName,
    earnedOn: keepsake.earnedOn,
    track:
      track === null
        ? null
        : {
            ...track,
            done: canDos.filter(
              (c) => c.status === 'ticked' && canDoById(c.id)?.track === track.track,
            ).length,
          },
  };
}

/** The ticked can-do a week keepsake shows: the latest ticked by the day the ring filled. */
function canDoForWeek(keepsake: Keepsake, canDos: readonly CanDoProgress[]) {
  return canDos
    .filter((c) => c.status === 'ticked' && c.tickedOn !== null && c.tickedOn <= keepsake.earnedOn)
    .sort((a, b) => (a.tickedOn ?? '').localeCompare(b.tickedOn ?? ''))
    .at(-1);
}

/** The certificate for any keepsake in progress (the burrow wall shows these). */
export function certificateFor(
  keepsake: Keepsake,
  progress: Pick<Progress, 'canDos'>,
  learner: KeepsakeLearner,
): Certificate {
  const canDo =
    keepsake.canDoId !== null
      ? progress.canDos.find((c) => c.id === keepsake.canDoId)
      : canDoForWeek(keepsake, progress.canDos);
  return certificate(keepsake, canDo, learner, progress.canDos);
}

/**
 * The keepsakes hanging on the burrow wall, oldest first: every keepsake the learner has earned
 * is drawn and hung (hanging it is the payoff, not a choice to keep it).
 */
export function hungKeepsakes(
  progress: Pick<Progress, 'canDos' | 'keepsakes'>,
  learner: KeepsakeLearner,
): readonly Certificate[] {
  return [...progress.keepsakes]
    .filter((k) => k.kind === 'can_do' || k.kind === 'week')
    .sort((a, b) => a.earnedOn.localeCompare(b.earnedOn))
    .map((k) => certificateFor(k, progress, learner));
}

/** The week ring holding this call's slot. */
export function ringOfCall(weeks: readonly WeekRing[], callId: string): WeekRing | undefined {
  return weeks.find((w) => w.slots.some((s) => s.callRecordId === callId));
}

/** Whether this call filled the last open slot of its week. */
function filledRing(weeks: readonly WeekRing[], callId: string): WeekRing | null {
  const ring = ringOfCall(weeks, callId);
  if (!ring || !isRingFull(ring)) return null;
  const last = [...ring.slots].sort((a, b) => (a.doneAt ?? 0) - (b.doneAt ?? 0)).at(-1);
  return last?.callRecordId === callId ? ring : null;
}

/** Whether this call's evidence was what ticked the can-do (the first piece ticks it). */
const tickedBy = (canDo: CanDoProgress, callId: string) =>
  canDo.status === 'ticked' && canDo.evidence[0]?.callRecordId === callId;

/**
 * What this call earned, from progress after the call: a certificate for each can-do it ticked
 * and, when it filled the ring, the ring (with the week's certificate if no can-do was ticked).
 */
export function earnedKeepsakes(
  call: Pick<CallRecord, 'id'>,
  progress: Pick<Progress, 'canDos' | 'keepsakes' | 'weeks'>,
  learner: KeepsakeLearner,
): EarnedKeepsakes | null {
  const certificates: Certificate[] = [];
  for (const keepsake of progress.keepsakes) {
    if (keepsake.kind !== 'can_do' || keepsake.canDoId === null) continue;
    const canDo = progress.canDos.find((c) => c.id === keepsake.canDoId);
    if (canDo && tickedBy(canDo, call.id))
      certificates.push(certificate(keepsake, canDo, learner, progress.canDos));
  }
  const ring = filledRing(progress.weeks, call.id);
  if (ring && certificates.length === 0) {
    const week = progress.keepsakes.find((k) => k.kind === 'week' && k.id === `week-${ring.week}`);
    if (week) certificates.push(certificateFor(week, progress, learner));
  }
  if (certificates.length === 0) return null;
  return { ringFull: ring ? { week: ring.week } : null, certificates };
}

/** The chrome around one certificate on the keepsake screen. */
export interface KeepsakeScreenCopy {
  /** The ring header ("TUẦN 1", "Vòng tuần đã đầy!"), on the first certificate of a full ring. */
  readonly ring: { readonly label: string; readonly week: string; readonly title: string } | null;
  /** "WORK · New can-do ticked · 4 of 6", when the ring isn't the news. */
  readonly ticked: {
    readonly track: string;
    readonly title: string;
    readonly count: string;
  } | null;
  /** "I drew it myself. Linh signed it!" */
  readonly roommateSays: string;
  readonly cta: string;
  readonly hungToast: string;
}

export function keepsakeScreenCopy(
  earned: EarnedKeepsakes,
  index: number,
  t: Translate,
): KeepsakeScreenCopy | null {
  const cert = earned.certificates[index];
  if (!cert) return null;
  const ring =
    index === 0 && earned.ringFull
      ? {
          label: t('week.ring', { done: 3, total: 3 }),
          week: t('payoff.keepsake.week', { week: earned.ringFull.week }),
          title: t('payoff.keepsake.title'),
        }
      : null;
  return {
    ring,
    ticked:
      ring === null && cert.track
        ? {
            track: t(`payoff.keepsake.track.${cert.track.track}`),
            title: t('payoff.keepsake.canDoTicked'),
            count: t('payoff.keepsake.trackCount', {
              done: cert.track.done,
              total: cert.track.total,
            }),
          }
        : null,
    roommateSays: t('payoff.keepsake.roommateSays', { witness: cert.witnessName }),
    cta: t('payoff.keepsake.cta'),
    hungToast: t('payoff.keepsake.hung'),
  };
}
