import { describe, expect, it } from '@jest/globals';
import type { SettlingChapterDone } from '@yapling/contracts';
import { translator } from '@yapling/i18n';

import { render } from '../../src/features/burrow/copy';
import {
  callDayOnAppClock,
  chapterOfScene,
  chaptersFromCalls,
  letterDayOf,
  mergeChapters,
  nextChapter,
  settlingPhase,
  settlingPlan,
  storyClockOf,
  type SettlingDay,
} from '../../src/features/burrow/settling';
import {
  settlingHomeModel,
  settlingListModel,
  type SettlingInput,
} from '../../src/features/burrow/settling-model';

const vi = translator('vi');
const en = translator('en');

const done = (chapter: number, doneOn: string, callRecordId: string | null = null) =>
  ({ chapter, doneOn, callRecordId }) satisfies SettlingChapterDone;

/** Chapters 1…n, finished on the days given (one day per chapter). */
const chaptersOn = (...days: string[]) => days.map((day, i) => done(i + 1, day));

const day = (over: Partial<SettlingDay> = {}): SettlingDay => ({
  chapters: [],
  today: '2026-10-23',
  letterOn: null,
  restedOn: null,
  goodnightOn: null,
  ...over,
});

const input = (over: Partial<SettlingDay> = {}, hour = 15): SettlingInput => ({
  roommate: { species: 'redpanda', name: 'Pip' },
  firstLanguage: 'vi',
  hour,
  installDay: 2,
  day: day(over),
});

describe('the chapters', () => {
  it('are the six Settling-in scenes, in order', () => {
    expect(chapterOfScene('s1-set1')).toBe(1);
    expect(chapterOfScene('s1-set6')).toBe(6);
    expect(chapterOfScene('s1-e1')).toBeNull();
  });

  it('open one after another, the lowest not done first', () => {
    expect(nextChapter([])).toBe(1);
    expect(chapterOfScene('s1-set3')).toBe(3);
    expect(nextChapter(chaptersOn('2026-10-22', '2026-10-23'))).toBe(3);
    expect(nextChapter([done(2, '2026-10-22')])).toBe(1);
    const six = ['20', '21', '21', '22', '23', '23'].map((d) => `2026-10-${d}`);
    expect(nextChapter(chaptersOn(...six))).toBeNull();
  });

  it('are done when their call ends complete, on the first such day; replays never move it', () => {
    const dayOf = (at: number) => new Date(at).toISOString().slice(0, 10);
    const at = (d: number) => Date.UTC(2026, 9, d, 10);
    const calls = [
      { id: 'replay', sceneId: 's1-set1', endReason: 'scene_complete' as const, endedAt: at(23) },
      { id: 'first', sceneId: 's1-set1', endReason: 'scene_complete' as const, endedAt: at(21) },
      { id: 'hung-up', sceneId: 's1-set2', endReason: 'hangup' as const, endedAt: at(22) },
      { id: 'too-hard', sceneId: 's1-set3', endReason: 'too_hard' as const, endedAt: at(22) },
      { id: 'episode', sceneId: 's1-e1', endReason: 'scene_complete' as const, endedAt: at(22) },
      { id: 'two', sceneId: 's1-set2', endReason: 'scene_complete' as const, endedAt: at(22) },
    ];
    expect(chaptersFromCalls(calls, dayOf)).toEqual([
      done(1, '2026-10-21', 'first'),
      done(2, '2026-10-22', 'two'),
    ]);
  });

  it('merge the server’s, the phone’s and the calls’ records, the first source winning', () => {
    const server = [done(1, '2026-10-20', 'a')];
    const phone = [done(1, '2026-10-21', 'b'), done(2, '2026-10-22', 'c')];
    const calls = [done(2, '2026-10-19', 'd'), done(3, '2026-10-22', 'e')];
    expect(mergeChapters(server, phone, calls)).toEqual([
      done(1, '2026-10-20', 'a'),
      done(2, '2026-10-22', 'c'),
      done(3, '2026-10-22', 'e'),
    ]);
  });
});

describe('the day plan', () => {
  it('offers Chapter 1 to a Visitor who hasn’t started', () => {
    expect(settlingPlan(day())).toEqual({ kind: 'chapter', chapter: 1, done: 0 });
  });

  it('opens the next chapter as soon as one is done', () => {
    expect(settlingPlan(day({ chapters: chaptersOn('2026-10-23') }))).toEqual({
      kind: 'chapter',
      chapter: 2,
      done: 1,
    });
  });

  it('suggests a rest after two chapters in a day, with the next one still there', () => {
    const two = chaptersOn('2026-10-22', '2026-10-23', '2026-10-23');
    expect(settlingPlan(day({ chapters: two }))).toEqual({
      kind: 'rest',
      chapter: 4,
      done: 3,
      rested: false,
    });
    expect(settlingPlan(day({ chapters: two, restedOn: '2026-10-23' }))).toMatchObject({
      kind: 'rest',
      rested: true,
    });
    // Keeping going is allowed: a third chapter today still suggests the rest.
    const three = [...two, done(4, '2026-10-23')];
    expect(settlingPlan(day({ chapters: three }))).toMatchObject({ kind: 'rest', chapter: 5 });
  });

  it('starts fresh the next morning', () => {
    const yesterday = chaptersOn('2026-10-22', '2026-10-22');
    expect(settlingPlan(day({ chapters: yesterday, restedOn: '2026-10-22' }))).toEqual({
      kind: 'chapter',
      chapter: 3,
      done: 2,
    });
  });

  it('brings the letter after Chapter 6, or after skipping ahead', () => {
    const all = chaptersOn(
      '2026-10-20',
      '2026-10-21',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-23',
    );
    expect(settlingPlan(day({ chapters: all }))).toEqual({
      kind: 'letter',
      done: 6,
      goodnight: false,
    });
    expect(
      settlingPlan(day({ chapters: chaptersOn('2026-10-23'), letterOn: '2026-10-23' })),
    ).toEqual({ kind: 'letter', done: 1, goodnight: false });
    expect(settlingPlan(day({ chapters: all, goodnightOn: '2026-10-23' }))).toMatchObject({
      goodnight: true,
    });
  });
});

describe('the day plan on a moved clock', () => {
  it('counts two chapters played on a moved day as that day, and suggests a rest', () => {
    const real = Date.UTC(2026, 9, 23, 3, 0); // 10:00 in Hồ Chí Minh City, on the 23rd
    const moved = real + 2 * 86_400_000; // the test menu moved the app to the 25th
    // The clock was moved an hour before the second chapter ended; the burrow reads it now.
    const dayOf = callDayOnAppClock(moved + 3_600_000, real + 3_600_000, 'Asia/Ho_Chi_Minh');
    const calls = [
      { id: 'c2', sceneId: 's1-set2', endReason: 'scene_complete', endedAt: real + 600_000 },
      { id: 'c3', sceneId: 's1-set3', endReason: 'scene_complete', endedAt: real + 3_500_000 },
    ] as const;
    const chapters = mergeChapters([done(1, '2026-10-24')], chaptersFromCalls(calls, dayOf));
    expect(chapters.map((c) => c.doneOn)).toEqual(['2026-10-24', '2026-10-25', '2026-10-25']);
    expect(settlingPlan(day({ chapters, today: '2026-10-25' }))).toMatchObject({
      kind: 'rest',
      chapter: 4,
    });
  });
});

describe('the letter and week 1', () => {
  const all = chaptersOn(
    '2026-10-01',
    '2026-10-02',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-04',
  );

  it('comes on Chapter 6’s day, or the story’s recorded start', () => {
    expect(letterDayOf(all.slice(0, 5), null)).toBeNull();
    expect(letterDayOf(all, null)).toBe('2026-10-04');
    expect(letterDayOf(all.slice(0, 2), '2026-10-02')).toBe('2026-10-02');
  });

  it('makes the letter’s day week 1’s day 1, counted from it and not from the install', () => {
    const clock = (today: string) =>
      storyClockOf({ installedOn: '2026-10-01', today, letterOn: '2026-10-04', visitorPath: true });
    expect(clock('2026-10-04')).toMatchObject({
      phase: 'letter',
      installDay: 4,
      startedOn: '2026-10-04',
      storyDay: 1,
    });
    expect(clock('2026-10-05')).toMatchObject({ phase: 'story', storyDay: 2, installDay: 5 });
    expect(clock('2026-10-11')).toMatchObject({ storyDay: 8 });
  });

  it('opens nothing of week 1 while settling in', () => {
    expect(
      storyClockOf({
        installedOn: '2026-10-01',
        today: '2026-10-03',
        letterOn: null,
        visitorPath: true,
      }),
    ).toMatchObject({ phase: 'settling', installDay: 3, storyDay: 1 });
  });

  it('leaves a learner who didn’t settle in on the install day’s count', () => {
    expect(
      storyClockOf({
        installedOn: '2026-10-01',
        today: '2026-10-03',
        letterOn: null,
        visitorPath: false,
      }),
    ).toMatchObject({ phase: 'story', startedOn: '2026-10-01', storyDay: 3 });
    expect(settlingPhase({ visitorPath: false, letterOn: null, today: '2026-10-03' })).toBe(
      'story',
    );
  });
});

describe('the burrow while settling in', () => {
  it('names the next chapter, with Linh and how long it takes', () => {
    const model = settlingHomeModel(input({ chapters: chaptersOn('2026-10-23') }));
    expect(render(vi, model.card.kicker)).toBe('LÀM QUEN · 2/6');
    expect(render(vi, model.card.title)).toBe('Boxes');
    expect(render(vi, model.card.sub)).toBe('Linh mang thùng sang giúp bạn dọn.');
    expect(model.card.actions).toMatchObject({ kind: 'chapter', chapter: 2 });
    if (model.card.actions.kind === 'chapter') {
      expect(render(vi, model.card.actions.label)).toBe('Gặp Linh · 2 phút');
      expect(render(en, model.card.actions.label)).toBe('Meet Linh · 2 min');
    }
    expect(model.card.segments).toEqual(['done', 'next', 'todo', 'todo', 'todo', 'todo']);
  });

  it('sends the learner to Mei’s for Chapter 5', () => {
    const four = chaptersOn('2026-10-20', '2026-10-21', '2026-10-21', '2026-10-22');
    const model = settlingHomeModel(input({ chapters: four }));
    expect(model.card.actions.kind === 'chapter' && render(vi, model.card.actions.label)).toBe(
      'Đến quán Mei · 3 phút',
    );
  });

  it('unpacks one box per chapter onto a shelf, the newest popping on', () => {
    const three = chaptersOn('2026-10-22', '2026-10-23', '2026-10-23');
    const model = settlingHomeModel(input({ chapters: three }));
    expect(model.items).toHaveLength(3);
    expect(model.boxes.map((b) => b.label)).toEqual(['Bus 45', "Mei's café", 'About me']);
    expect(model.items.map((i) => i.fresh)).toEqual([false, false, true]);
    const none = settlingHomeModel(input());
    expect(none.items).toHaveLength(0);
    expect(none.boxes).toHaveLength(6);
  });

  it('suggests tomorrow after two today, with a sleepy Pip', () => {
    const model = settlingHomeModel(
      input({ chapters: chaptersOn('2026-10-22', '2026-10-23', '2026-10-23') }),
    );
    expect(render(vi, model.card.kicker)).toBe('LÀM QUEN · 4/6 · NGÀY MAI?');
    expect(render(vi, model.card.sub)).toBe('Hôm nay bạn xong hai chương rồi. Nghỉ chút nhé?');
    expect(model.card.actions).toEqual({ kind: 'rest', chapter: 4 });
    expect(model.pipMood).toBe('sleepy');
  });

  it('is at dusk on the letter’s day, Pip at the window', () => {
    const all = chaptersOn(
      '2026-10-20',
      '2026-10-21',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-23',
    );
    const model = settlingHomeModel(input({ chapters: all }));
    expect(model.dusk).toBe(true);
    expect(model.boxes).toHaveLength(0);
    expect(render(vi, model.card.kicker)).toBe('LÀM QUEN · XONG 6/6');
    expect(render(vi, model.card.sub)).toBe('Hang đã đầy đồ. Ngày mai, truyện bắt đầu.');
    expect(model.card.actions).toEqual({ kind: 'goodnight' });
    expect(model.when.time).toBe('dusk');
    expect(model.line?.speaker).toBe('pip');
    expect(model.line?.lineId).toBe('s1-set6-06');
  });
});

describe('the Settling-in list', () => {
  it('replays what’s done, offers the next, and skips to the story until the letter', () => {
    const list = settlingListModel({
      chapters: chaptersOn('2026-10-22', '2026-10-23', '2026-10-23'),
      letterOn: null,
    });
    expect(list.rows.map((r) => r.status)).toEqual([
      'done',
      'done',
      'done',
      'next',
      'later',
      'later',
    ]);
    expect(list.rows.map((r) => r.face)).toEqual(['linh', 'linh', 'linh', 'bea', 'mei', 'linh']);
    expect(list.rows.map((r) => render(vi, r.about))[3]).toBe('Xe buýt 45 · với Bea');
    expect(list.canSkip).toBe(true);
    expect(settlingListModel({ chapters: [], letterOn: '2026-10-23' }).canSkip).toBe(false);
  });
});
