import { describe, expect, it } from '@jest/globals';
import { translator } from '@yapling/i18n';

import { render } from '../../src/features/burrow/copy';
import { previewModel } from '../../src/features/burrow/preview';
import {
  formatWeekDates,
  weekDates,
  weekModel,
  type WeekInput,
} from '../../src/features/week/model';

const NOW = Date.UTC(2026, 8, 22, 5, 0);
const vi = translator('vi');
const en = translator('en');

const weekOn = (day: number, after = false): WeekInput => {
  const preview = previewModel(day, { after }, NOW);
  return {
    day,
    installedOn: preview.installedOn,
    roommate: preview.input.roommate,
    firstLanguage: 'vi',
    progress: preview.progress,
  };
};

describe('the week’s dates', () => {
  it('reads as the design writes it, in both languages', () => {
    const dates = weekDates('2026-09-21', 1);
    expect(formatWeekDates(vi, 'vi', dates)).toBe('21 – 27 tháng 9');
    expect(formatWeekDates(en, 'en', dates)).toBe('Sep 21 – 27');
  });

  it('names both months when the week runs across them', () => {
    const dates = weekDates('2026-09-28', 1);
    expect(formatWeekDates(vi, 'vi', dates)).toBe('28 tháng 9 – 4 tháng 10');
    expect(formatWeekDates(en, 'en', dates)).toBe('Sep 28 – Oct 4');
  });

  it('counts later weeks from the install day', () => {
    expect(weekDates('2026-09-21', 2)).toEqual({ from: 28, to: 4, fromMonth: 9, month: 10 });
  });
});

describe('the three calls of the week', () => {
  it('shows the episode, the real week and the practice call with who is in each', () => {
    const week = weekModel(weekOn(2));
    expect(week.rows.map((r) => render(vi, r.tag))).toEqual([
      'Tập truyện',
      'Tuần thật',
      'Luyện tập',
    ]);
    expect(week.rows.map((r) => render(vi, r.title))).toEqual([
      'S1 · E1 · The Letter',
      'Dạy Pip giới thiệu bản thân',
      'Pass it on · Bus 45',
    ]);
    expect(week.rows.map((r) => r.face.character)).toEqual(['mei', 'pip', 'bea']);
  });

  it('says which day each call opens, "today" for today’s', () => {
    const week = weekModel(weekOn(2));
    const install = new Date(`${weekOn(2).installedOn}T00:00:00Z`).getUTCDay();
    const weekday = (offset: number) =>
      vi(
        `common.weekdayShort.${['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][(install + offset) % 7]}` as 'common.weekdayShort.mon',
      );
    expect(week.rows.map((r) => render(vi, r.when))).toEqual(['Hôm nay', weekday(3), weekday(4)]);
  });

  it('opens a call on its day and keeps it open after: nothing expires', () => {
    expect(weekModel(weekOn(2)).rows.map((r) => r.status)).toEqual([
      'open',
      'upcoming',
      'upcoming',
    ]);
    expect(weekModel(weekOn(4)).rows.map((r) => r.status)).toEqual(['done', 'open', 'upcoming']);
    expect(weekModel(weekOn(5, true)).rows.map((r) => r.status)).toEqual(['done', 'done', 'done']);
    // A call not taken on its day is still there, open, two days later.
    const skipped = weekOn(4);
    const late = weekModel({
      ...skipped,
      day: 6,
      progress: { ...skipped.progress, weeks: weekOn(2).progress.weeks },
    });
    expect(late.rows.map((r) => r.status)).toEqual(['open', 'open', 'open']);
  });

  it('starts only open calls, and the button takes the first one', () => {
    const week = weekModel(weekOn(2));
    expect(week.rows.map((r) => r.target)).toEqual(['/(call)/s1-e1', null, null]);
    expect(week.cta && render(vi, week.cta.label)).toBe('Đến quán cà phê với Pip');
    expect(weekModel(weekOn(5, true)).cta).toBeNull();
  });

  it('fills the ring as calls are done', () => {
    expect(weekModel(weekOn(2)).ring).toEqual({ done: 0, total: 3 });
    expect(weekModel(weekOn(4, true)).ring).toEqual({ done: 2, total: 3 });
  });
});

describe('the week’s phrases', () => {
  it('are the episode’s four phrases with their Vietnamese glosses', () => {
    const week = weekModel(weekOn(2));
    expect(week.phrases.map((p) => [p.phrase, p.gloss])).toEqual([
      ["What's wrong?", 'Có chuyện gì vậy?'],
      ['I need a plan', 'Mình cần một kế hoạch'],
      ['Can I help?', 'Mình giúp được không?'],
      ['I think you should…', 'Mình nghĩ bạn nên…'],
    ]);
    expect(week.phrases.every((p) => p.art === 'seed')).toBe(true);
  });

  it('show each phrase as the object it has grown into', () => {
    const week = weekModel(weekOn(6, true));
    expect(week.phrases.map((p) => p.art)).toEqual(['plant-0', 'seed', 'plant-1', 'plant-0']);
  });

  it('leave the gloss out for a learner whose first language has none', () => {
    const week = weekModel({ ...weekOn(2), firstLanguage: 'other' });
    expect(week.phrases.every((p) => p.gloss === '')).toBe(true);
  });
});
