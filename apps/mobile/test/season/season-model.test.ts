import { describe, expect, it } from '@jest/globals';
import type { WeekRing } from '@yapling/contracts';
import { SEASON_1 } from '@yapling/story';

import { previewModel } from '../../src/features/burrow/preview';
import {
  episodeDone,
  seasonMapModel,
  seasonPath,
  weekdayOf,
} from '../../src/features/season/season-model';

const NOW = Date.UTC(2026, 9, 22, 5, 0);
const preview = (day: number, after = true) => previewModel(day, { after }, NOW);

const doneWeek = (week: number): WeekRing => ({
  week,
  slots: [
    { kind: 'episode', status: 'done', sceneId: null, callRecordId: `c${week}`, doneAt: 1 },
    { kind: 'real_week', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
    { kind: 'practice', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
  ],
});

describe('the season map', () => {
  it('after the first episode: one pin done, the second glowing, the rest calm', () => {
    const p = preview(6);
    const m = seasonMapModel({
      season: SEASON_1,
      weeks: p.progress.weeks,
      day: 6,
      installedOn: p.installedOn,
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
    // Installed on a Monday: the second episode opens on day 8, the next Monday.
    const m = seasonMapModel({
      season: SEASON_1,
      weeks: [doneWeek(1)],
      day: 6,
      installedOn: '2026-09-21',
    });
    expect(m.next?.opensOn).toBe('mon');
    expect(weekdayOf('2026-09-26')).toBe('sat');
  });

  it('offers the next episode to play once its day has come', () => {
    const m = seasonMapModel({
      season: SEASON_1,
      weeks: [doneWeek(1)],
      day: 8,
      installedOn: '2026-09-21',
    });
    expect(m.next?.open).toBe(true);
    expect(m.next?.opensOn).toBeNull();
  });

  it('starts on the first episode before its call is done, and it waits after a missed week', () => {
    const p = preview(2, false);
    const early = seasonMapModel({
      season: SEASON_1,
      weeks: p.progress.weeks,
      day: 2,
      installedOn: p.installedOn,
    });
    expect(early.pins[0]?.state).toBe('current');
    expect(early.next).toMatchObject({ episode: 1, title: 'The Letter', open: true });
    const late = seasonMapModel({ season: SEASON_1, weeks: [], day: 20, installedOn: null });
    expect(late.next).toMatchObject({ episode: 1, open: true });
  });

  it('has no next episode once the season is done', () => {
    const weeks = [1, 2, 3, 4, 5, 6].map(doneWeek);
    const m = seasonMapModel({ season: SEASON_1, weeks, day: 43, installedOn: '2026-09-21' });
    expect(m.pins.every((pin) => pin.state === 'done')).toBe(true);
    expect(m.next).toBeNull();
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
