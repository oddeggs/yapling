import type { CanDoProgress, Keepsake, WeekRing } from '@yapling/contracts';
import {
  addDays,
  DAY_MS,
  fillRingSlot,
  localDateOf,
  recapFor,
  ringWeeks,
  seedPhrase,
  toPhraseProgress,
  usePhrase,
  weekKeepsakeToWire,
  type PhraseRecord,
  type WeekOneUnlock,
} from '@yapling/domain';
import { findPhrase, S1_E1 } from '@yapling/story';

import type { BurrowInput, BurrowProgress } from './model';
import { laterPreview } from './preview-later';
import type { SettlingInput } from './settling-model';

/*
 * Development only: a learner who has done everything the first week offered up to a given day,
 * built with the learning model's own rules, so the burrow and the week can be looked at day by
 * day before the app's data layer is wired in (`?day=5&after=1` on the burrow route). Never used
 * in a release build.
 */

export interface PreviewOptions {
  /** The day's own moment is done too (the call taken, the story heard). */
  readonly after?: boolean;
  /** Back after three days away. */
  readonly away?: boolean;
  /** The local hour (the burrow's light); midday by default. */
  readonly hour?: number;
  /** Day 1 before Linh has knocked. */
  readonly beforeDoor?: boolean;
  /** After the first week: the calendar weeks the learner was away and did nothing. */
  readonly missed?: readonly number[];
  /** After the first week: the card shown the day before. */
  readonly previousCard?: string | null;
}

export interface PreviewData {
  readonly input: BurrowInput;
  readonly installedOn: string;
  readonly progress: BurrowProgress;
}

const PREVIEW_TIMEZONE = 'Asia/Ho_Chi_Minh';

/** The last day the preview learner can be on (week 10). */
export const PREVIEW_LAST_DAY = 70;

/**
 * A learner on day `day`, having done everything up to it: the first week as it plays, and after
 * it each day's thing (`laterPreview`).
 */
export function previewModel(
  day: number,
  options: PreviewOptions = {},
  now = Date.now(),
): PreviewData {
  if (day > 8) return laterPreview(day, options, now);
  const after = options.after === true;
  const installedAt = now - (day - 1) * DAY_MS;
  const at = (d: number, hour = 10) => installedAt + (d - 1) * DAY_MS + (hour - 12) * 3_600_000;
  const did = (d: number) => day > d || (day === d && after);

  const seen = new Set<WeekOneUnlock>(['placement_chat', 'residency_card', 'letter_under_door']);
  if (!(day === 1 && options.beforeDoor === true)) seen.add('linh_welcome');
  if (day >= 2) seen.add('week_view');
  if (did(3)) ['pip_story', 'linh_postcard'].forEach((u) => seen.add(u as WeekOneUnlock));
  if (did(6)) ['voicemail', 'season_map'].forEach((u) => seen.add(u as WeekOneUnlock));
  if (did(7)) seen.add('plus_offer');
  if (did(8)) seen.add('next_episode_peek');

  let weeks: readonly WeekRing[] = ringWeeks([], day);
  const keepsakes: Keepsake[] = [];
  const call = (kind: 'episode' | 'real_week' | 'practice', d: number) => {
    const result = fillRingSlot(
      weeks,
      { kind, callRecordId: `preview-${kind}`, doneAt: at(d, 19) },
      PREVIEW_TIMEZONE,
    );
    weeks = result.weeks;
    if (result.ringFull) keepsakes.push(weekKeepsakeToWire(result.ringFull));
  };
  if (did(2)) call('episode', 2);
  if (did(4)) call('real_week', 4);
  if (did(5)) call('practice', 5);

  // The week's phrases are met in the week view on day 2; the first call sprouts three of them,
  // and fixing Pip's voicemail on day 6 grows "Can I help?" into a leaf.
  let phrases: PhraseRecord[] = [];
  if (day >= 2) {
    phrases = S1_E1.phrases.map((id) => seedPhrase(id, findPhrase(id)?.en ?? id, at(2, 9)));
  }
  const use = (id: string, d: number, scene: string) => {
    phrases = phrases.map((p) =>
      p.id === id
        ? usePhrase(
            p,
            { at: at(d, 19), correct: true, prompted: true, contextId: scene },
            PREVIEW_TIMEZONE,
          ).phrase
        : p,
    );
  };
  if (did(2))
    ['whats-wrong', 'can-i-help', 'i-think-you-should'].forEach((id) => use(id, 2, 's1-e1'));
  if (did(6)) use('can-i-help', 6, 's1-e1-voicemail');

  const canDos: CanDoProgress[] = did(4)
    ? [
        {
          id: 'introduce-yourself-30s',
          stage: 'newcomer',
          status: 'ticked',
          evidence: [{ callRecordId: 'preview-real_week', quote: S1_E1.realWeek, at: at(4, 19) }],
          witness: 'linh',
          tickedOn: localDateOf(at(5, 19), PREVIEW_TIMEZONE),
        },
      ]
    : [];

  const progress = { phrases: phrases.map(toPhraseProgress), keepsakes, weeks, canDos };
  const hour = options.hour ?? 12;
  return {
    installedOn: localDateOf(installedAt, PREVIEW_TIMEZONE),
    progress,
    input: {
      day,
      hour,
      roommate: { species: 'redpanda', name: 'Pip' },
      learnerName: 'Lan',
      firstLanguage: 'vi',
      progress,
      seen,
      welcome:
        options.away === true
          ? {
              kind: 'back_after_away',
              daysAway: 3,
              recapKey: recapFor(did(2) || day > 2 ? ['s1-e1'] : []),
            }
          : { kind: 'normal', daysAway: day > 1 ? 1 : 0 },
    },
  };
}

/**
 * The dev params a preview route reads: `?day=5&after=1&away=1&hour=19&door=1`, and after the
 * first week `missed=3,4` (weeks away) and `prev=<card id>` (yesterday's card).
 */
export function previewOptionsFrom(
  params: Readonly<Record<string, string | string[] | undefined>>,
): {
  day: number;
  options: PreviewOptions;
} {
  const one = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const day = Math.max(1, Math.min(PREVIEW_LAST_DAY, Number(one('day') ?? 2) || 2));
  const hour = one('hour');
  const missed = (one('missed') ?? '')
    .split(',')
    .map(Number)
    .filter((n) => n > 0);
  const previous = one('prev');
  return {
    day,
    options: {
      after: one('after') === '1',
      away: one('away') === '1',
      beforeDoor: one('door') === '1',
      ...(hour !== undefined ? { hour: Number(hour) } : {}),
      ...(missed.length > 0 ? { missed } : {}),
      ...(previous !== undefined ? { previousCard: previous } : {}),
    },
  };
}

/**
 * Development only: a Visitor settling in (`?settle=N`: chapters done, `today=K` of them today,
 * `rested=1`, `letter=1` for the letter's evening, `hour=H`), for looking at the burrow during
 * Settling in without playing the chapters.
 */
export function settlingPreviewFrom(
  params: Readonly<Record<string, string | string[] | undefined>>,
  now = Date.now(),
): SettlingInput | null {
  const one = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v;
  };
  const settle = one('settle');
  if (settle === undefined) return null;
  const done = Math.max(0, Math.min(6, Number(settle) || 0));
  const doneToday = Math.min(done, Number(one('today') ?? Math.min(done, 1)) || 0);
  const today = localDateOf(now, PREVIEW_TIMEZONE);
  // One chapter a day before today's, as a learner who started on day 1 would have.
  const earlier = done - doneToday;
  const chapters = Array.from({ length: done }, (_, i) => ({
    chapter: i + 1,
    doneOn: i < earlier ? addDays(today, i - earlier) : today,
    callRecordId: `preview-chapter-${i + 1}`,
  }));
  const letter = one('letter') === '1';
  const hour = one('hour');
  return {
    roommate: { species: 'redpanda', name: 'Pip' },
    firstLanguage: 'vi',
    hour: hour !== undefined ? Number(hour) : new Date(now).getHours(),
    installDay: earlier + 1,
    day: {
      chapters,
      today,
      letterOn: letter ? today : null,
      restedOn: one('rested') === '1' ? today : null,
      goodnightOn: null,
    },
  };
}
