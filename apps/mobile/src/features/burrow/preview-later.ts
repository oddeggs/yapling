import type { Id, Keepsake, RingSlotKind, WeekRing } from '@yapling/contracts';
import {
  DAY_MS,
  duePhrases,
  fillRingSlot,
  localDateOf,
  pipsMinuteFor,
  recapFor,
  recordPhraseUse,
  recordPipsMinute,
  seasonRingWeeks,
  seededRng,
  seedPhrase,
  SEASON_1_EPISODES,
  toPhraseProgress,
  weekKeepsakeToWire,
  weekOfDay,
  type PhraseRecord,
  type Season1EpisodeId,
  type WeekOneUnlock,
} from '@yapling/domain';
import { findPhrase, PIPS_MINUTE_LINES, pipsMinuteSceneFor } from '@yapling/story';

import { pipsMinuteSceneOf } from './pips-minute';
import type { PreviewData, PreviewOptions } from './preview';
import { episodeOfScene, ringSceneFor, SEASON_WEEKS, storyWeekFor } from './ring-scenes';

/*
 * Development only: a Newcomer after the first week, having done each day what the burrow offered
 * (every call open, every story, postcard and voicemail, Pip's minute when a phrase was due),
 * except in the calendar weeks they were away (`missed`). Built day by day with the learning
 * model's own rules, so the burrow and the week can be looked at on any day up to week 10 without
 * playing the calls (`?day=23&missed=3` on the burrow route). Never used in a release build.
 */

const TIMEZONE = 'Asia/Ho_Chi_Minh';

/** The week-1 moments a learner past day 8 has been through. */
const WEEK_ONE_SEEN: readonly WeekOneUnlock[] = [
  'placement_chat',
  'residency_card',
  'letter_under_door',
  'linh_welcome',
  'week_view',
  'pip_story',
  'linh_postcard',
  'voicemail',
  'season_map',
  'plus_offer',
  'next_episode_peek',
];

export function laterPreview(day: number, options: PreviewOptions, now: number): PreviewData {
  const after = options.after === true;
  const missed = new Set(options.missed ?? []);
  const installedAt = now - (day - 1) * DAY_MS;
  const at = (d: number, hour: number) => installedAt + (d - 1) * DAY_MS + (hour - 12) * 3_600_000;
  const startedOn = localDateOf(installedAt, TIMEZONE);

  let weeks: readonly WeekRing[] = [];
  let phrases: PhraseRecord[] = [];
  const keepsakes: Keepsake[] = [];
  const scenes = new Set<Id>();
  let calls = 0;

  const use = (id: Id, when: number, context: Id, prompted: boolean) => {
    const phrase = phrases.find((p) => p.id === id);
    if (phrase === undefined) return;
    phrases = [
      ...recordPhraseUse(
        phrases,
        phrase,
        { at: when, correct: true, prompted, contextId: context },
        TIMEZONE,
      ).phrases,
    ];
  };

  const call = (week: number, kind: RingSlotKind, own: Id | null, d: number) => {
    const sceneId = ringSceneFor(week, kind, own);
    const when = at(d, 19) + calls++ * 60_000;
    const result = fillRingSlot(
      weeks,
      { kind, callRecordId: `preview-${week}-${kind}`, doneAt: when, sceneId },
      TIMEZONE,
    );
    weeks = result.weeks;
    if (result.ringFull) keepsakes.push(weekKeepsakeToWire(result.ringFull));
    const episode = episodeOfScene(sceneId);
    if (kind === 'episode' && episode !== undefined) {
      for (const id of episode.phrases) {
        if (phrases.some((p) => p.id === id)) continue;
        phrases.push(seedPhrase(id, findPhrase(id)?.en ?? id, when - 3_600_000));
      }
      episode.phrases.slice(0, 3).forEach((id) => use(id, when, sceneId, true));
      return;
    }
    // The real-week call: the first due phrase said unprompted (it can bloom); practice: prompted.
    duePhrases(phrases, when, TIMEZONE, { limit: 2 }).forEach((p, i) =>
      use(p.id, when, sceneId, !(kind === 'real_week' && i === 0)),
    );
  };

  const pipsMinute = (d: number) => {
    const when = at(d, 12);
    const minute = pipsMinuteFor(phrases, when, TIMEZONE, seededRng(d), PIPS_MINUTE_LINES);
    if (minute === null) return;
    const sceneId = pipsMinuteSceneFor(minute, { dayIndex: d })?.id ?? `s1-pm.1.${minute.due.id}`;
    phrases = [
      ...recordPipsMinute(
        phrases,
        minute,
        { at: when, sceneId, dueSaid: true, reuseFixed: minute.reuse === null ? null : true },
        TIMEZONE,
      ).phrases,
    ];
  };

  for (let d = 1; d <= day; d++) {
    weeks = seasonRingWeeks(weeks, d, SEASON_WEEKS);
    if (d === day && !after) break;
    if (missed.has(weekOfDay(d))) continue;
    const week = storyWeekFor(weeks, d, startedOn);
    for (const w of week.waiting) call(w.week, w.kind, w.sceneId, d);
    for (const slot of week.ring) {
      if (slot.status === 'open') call(week.week, slot.kind, slot.sceneId, d);
    }
    for (const o of week.opened) if (o.ring === null && o.scene !== null) scenes.add(o.scene);
    if (d >= 8) pipsMinute(d);
  }

  const done = weeks.flatMap((w) =>
    w.slots.flatMap((s) =>
      s.kind === 'episode' && s.status === 'done' && s.sceneId !== null ? [s.sceneId] : [],
    ),
  );
  const completed: Season1EpisodeId[] = SEASON_1_EPISODES.filter((e) => done.includes(e));
  const wire = phrases.map(toPhraseProgress);
  const progress = { phrases: wire, keepsakes, weeks, canDos: [] };
  return {
    installedOn: startedOn,
    progress,
    input: {
      day,
      hour: options.hour ?? 12,
      roommate: { species: 'redpanda', name: 'Pip' },
      learnerName: 'Lan',
      firstLanguage: 'vi',
      progress,
      seen: new Set(WEEK_ONE_SEEN),
      welcome:
        options.away === true
          ? { kind: 'back_after_away', daysAway: 3, recapKey: recapFor(completed) }
          : { kind: 'normal', daysAway: 1 },
      startedOn,
      scenes,
      pipsMinute: pipsMinuteSceneOf({
        phrases: wire,
        now: at(day, 12),
        timezone: TIMEZONE,
        day,
        stage: 'newcomer',
      }),
      previousCard: options.previousCard ?? null,
    },
  };
}
