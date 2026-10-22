import { describe, expect, it } from '@jest/globals';
import type { RingSlot, RingSlotKind, WeekRing } from '@yapling/contracts';
import { SEASON_1 } from '@yapling/story';

import { currentWeek } from '../../src/data/week';
import { previewModel } from '../../src/features/burrow/preview';
import {
  episodeDone,
  pinAction,
  replayOf,
  seasonMapModel,
  seasonPath,
  weekdayOf,
} from '../../src/features/season/season-model';
import { laterWeekPreview } from '../../src/features/story/learner';
import { emptyProgress } from '../data/fake-api';

const NOW = Date.UTC(2026, 9, 22, 5, 0);
const TZ = 'Asia/Ho_Chi_Minh';
const preview = (day: number, after = true) => previewModel(day, { after }, NOW);
/** Story day N is N October at 10:00 in Ho Chi Minh City. */
const STARTED = '2026-10-01';
const dayAt = (day: number): number => Date.UTC(2026, 9, day, 3, 0, 0);

const slot = (kind: RingSlotKind, status: 'open' | 'done', sceneId: string | null): RingSlot => ({
  kind,
  status,
  sceneId,
  callRecordId: status === 'done' ? `c-${sceneId ?? kind}` : null,
  doneAt: status === 'done' ? 1 : null,
});

const doneWeek = (week: number): WeekRing => ({
  week,
  slots: [
    slot('episode', 'done', `s1-e${week}`),
    slot('real_week', 'open', null),
    slot('practice', 'open', null),
  ],
});

describe('the season map', () => {
  it('after the first episode: one pin done, the second glowing, the rest calm', () => {
    const p = preview(6);
    const m = seasonMapModel({
      season: SEASON_1,
      weeks: p.progress.weeks,
      dayIndex: 6,
      startedOn: p.installedOn,
    });
    expect(m.pins.map((pin) => pin.state)).toEqual([
      'done',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(m.onEpisode).toBe(2);
    expect(m.title).toBe('The Café Might Close');
    expect(m.next).toMatchObject({
      episode: 2,
      title: 'Help Wanted',
      place: 'hollowbrook-office',
      face: 'sol',
      open: false,
    });
  });

  it('names the weekday the next episode opens, the first day of its week', () => {
    // The story started on a Monday: the second episode opens on day 8, the next Monday.
    const m = seasonMapModel({
      season: SEASON_1,
      weeks: [doneWeek(1)],
      dayIndex: 6,
      startedOn: '2026-09-21',
    });
    expect(m.next?.opensOn).toBe('mon');
    expect(m.next?.opensOnDate).toBe('2026-09-28');
    expect(weekdayOf('2026-09-26')).toBe('sat');
  });

  it('counts the days from the story’s start, not the install day', () => {
    // A Visitor installed on 17 Sep and settled in; the story started on Monday 21 Sep. Counted
    // from the install day, Episode 2 would open on 24 Sep.
    const m = seasonMapModel({
      season: SEASON_1,
      weeks: [doneWeek(1)],
      dayIndex: 3,
      startedOn: '2026-09-21',
    });
    expect(m.next).toMatchObject({ episode: 2, open: false, opensOnDate: '2026-09-28' });
  });

  it('offers the next episode to play once its day has come', () => {
    const m = seasonMapModel({
      season: SEASON_1,
      weeks: [doneWeek(1)],
      dayIndex: 8,
      startedOn: '2026-09-21',
    });
    expect(m.next?.open).toBe(true);
    expect(m.next?.opensOn).toBeNull();
    expect(m.next?.sceneId).toBe('s1-e2');
  });

  it('starts on the first episode before its call is done, and it waits after a missed week', () => {
    const p = preview(2, false);
    const early = seasonMapModel({
      season: SEASON_1,
      weeks: p.progress.weeks,
      dayIndex: 2,
      startedOn: p.installedOn,
    });
    expect(early.pins[0]?.state).toBe('current');
    expect(early.next).toMatchObject({ episode: 1, title: 'The Letter', open: true });
    const late = seasonMapModel({
      season: SEASON_1,
      weeks: [],
      dayIndex: 20,
      startedOn: '2026-09-21',
    });
    expect(late.next).toMatchObject({ episode: 1, open: true });
  });

  it('has no next episode once the season is done, and offers the festival week', () => {
    const weeks = [1, 2, 3, 4, 5, 6].map(doneWeek);
    const m = seasonMapModel({ season: SEASON_1, weeks, dayIndex: 43, startedOn: '2026-09-21' });
    expect(m.pins.every((pin) => pin.state === 'done')).toBe(true);
    expect(m.next).toBeNull();
    expect(m.festival).toEqual({ title: 'Bunting Week' });
    expect(m.onEpisode).toBe(6);
    expect(m.path.rest).toBe('');
  });

  it('reads an episode as done from its week', () => {
    expect(episodeDone([doneWeek(1)], 1)).toBe(true);
    expect(episodeDone([doneWeek(1)], 2)).toBe(false);
  });

  it("draws the prototype's route: walked to the current pin, then ahead, then to the boat", () => {
    expect(seasonPath(2)).toEqual({
      done: 'M56 462 Q90 401 158 384',
      rest: 'M158 384 Q113 445 128 520 Q144 322 300 200 Q281 279 326 346 Q307 500 180 590',
      tail: 'M180 590 Q211 671 292 702',
    });
    expect(seasonPath(3).done).toBe('M56 462 Q90 401 158 384 Q113 445 128 520');
    expect(seasonPath(1).done).toBe('');
  });
});

describe('a learner who missed week 3: the map and the week view agree', () => {
  // Episodes 1 and 2 played; week 3 went by. Today is story day 23, in week 4 by the calendar.
  const weeks: readonly WeekRing[] = [doneWeek(1), doneWeek(2)];
  const progress = { ...emptyProgress(), weeks: [...weeks], dayIndex: 23 };
  const week = currentWeek(progress, dayAt(23), TZ, STARTED);
  const map = seasonMapModel({
    season: SEASON_1,
    weeks: week.weeks,
    dayIndex: week.dayIndex,
    startedOn: week.startedOn,
  });

  it('both are on Episode 3, which waits and is ready now', () => {
    expect(week.week).toBe(3);
    expect(week.behind).toBe(true);
    expect(map.next).toMatchObject({ episode: 3, sceneId: 's1-e3', open: true, opensOn: null });
    expect(map.pins.map((p) => p.state)).toEqual([
      'done',
      'done',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
  });

  it('dates Episode 3 on the day the week view opens its slot', () => {
    const episodeSlot = week.slots.find((s) => s.kind === 'episode');
    expect(episodeSlot?.opensOn).toBe('2026-10-15');
    expect(map.next?.opensOnDate).toBe(episodeSlot?.opensOn);
  });

  it('dates the episodes after it from the story’s start, as their weeks open', () => {
    const later = seasonMapModel({
      season: SEASON_1,
      weeks: week.weeks,
      dayIndex: 9,
      startedOn: STARTED,
    });
    expect(later.next).toMatchObject({ episode: 3, open: false, opensOnDate: '2026-10-15' });
  });

  it('reads the same from the development preview of that learner', () => {
    const learner = laterWeekPreview(4, 2, 3, 'newcomer', NOW);
    const m = seasonMapModel({
      season: SEASON_1,
      weeks: learner.weeks,
      dayIndex: learner.day,
      startedOn: learner.startedOn,
    });
    expect(learner.day).toBe(23);
    expect(m.next).toMatchObject({ episode: 3, open: true });
    expect(m.pins.filter((p) => p.state === 'done').map((p) => p.episode)).toEqual([1, 2]);
  });
});

describe('playing an episode again', () => {
  const weeks = [1, 2, 3].map(doneWeek);
  const map = seasonMapModel({ season: SEASON_1, weeks, dayIndex: 24, startedOn: STARTED });

  it('offers every finished episode again, the next one to play, and nothing ahead of it', () => {
    expect(map.pins.map((p) => p.action)).toEqual([
      'replay',
      'replay',
      'replay',
      'play',
      null,
      null,
    ]);
  });

  it('plays the next episode only once its day has come', () => {
    expect(pinAction({ state: 'current', open: false })).toBeNull();
    expect(pinAction({ state: 'current', open: true })).toBe('play');
    expect(pinAction({ state: 'upcoming', open: true })).toBeNull();
    expect(pinAction({ state: 'done', open: true })).toBe('replay');
  });

  it("replays the episode's own call at the learner's stage today", () => {
    const pin = map.pins[1];
    if (!pin) throw new Error('no pin');
    expect(replayOf(pin, 'visitor')).toEqual({
      episode: 2,
      title: 'Help Wanted',
      sceneId: 's1-e2',
      stage: 'visitor',
    });
    expect(replayOf(pin, 'neighbour')?.stage).toBe('neighbour');
  });

  it('has no replay for an episode not finished yet', () => {
    const next = map.pins[3];
    const ahead = map.pins[5];
    if (!next || !ahead) throw new Error('no pin');
    expect(replayOf(next, 'newcomer')).toBeNull();
    expect(replayOf(ahead, 'newcomer')).toBeNull();
  });

  it('keeps every episode replayable after the season, in the festival week', () => {
    const all = seasonMapModel({
      season: SEASON_1,
      weeks: [1, 2, 3, 4, 5, 6].map(doneWeek),
      dayIndex: 45,
      startedOn: STARTED,
    });
    expect(all.pins.every((p) => p.action === 'replay')).toBe(true);
  });
});
