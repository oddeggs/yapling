import { describe, expect, it } from '@jest/globals';
import { fillRingSlot } from '@yapling/domain';
import { translator } from '@yapling/i18n';
import { SEASON_1 } from '@yapling/story';

import { logShown, previousCardOf } from '../../src/features/burrow/card-log';
import { render } from '../../src/features/burrow/copy';
import { CARD_IDS } from '../../src/features/burrow/later-days';
import { burrowHomeModel, burrowVariant, type BurrowInput } from '../../src/features/burrow/model';
import { previewModel, type PreviewOptions } from '../../src/features/burrow/preview';
import { ringSceneFor } from '../../src/features/burrow/ring-scenes';
import { backModel } from '../../src/features/burrow/scenes';
import { weekModel } from '../../src/features/week/model';

const NOW = Date.UTC(2026, 9, 22, 5, 0);
const vi = translator('vi');
const en = translator('en');
const DUE = 's1-pm.1.whats-wrong';

const input = (day: number, options: PreviewOptions = {}): BurrowInput =>
  previewModel(day, options, NOW).input;

const DAYS = Array.from({ length: 42 }, (_, i) => i + 8);

/**
 * The burrow day after day for a learner, each day's card kept as the next day's "yesterday",
 * as the phone keeps it. The day's latest card (after its thing is done) is the one kept.
 */
function walk(options: PreviewOptions = {}, pips: (day: number) => string | null = () => null) {
  let previousCard: string | null = null;
  return DAYS.map((day) => {
    const at = (after: boolean) =>
      burrowHomeModel({
        ...input(day, { ...options, after }),
        previousCard,
        pipsMinute: pips(day),
      });
    const before = at(false);
    const afterwards = at(true);
    const entry = { day, previousCard, before, after: afterwards };
    previousCard = afterwards.delta.id;
    return entry;
  });
}

const words = (m: ReturnType<typeof burrowHomeModel>) =>
  [m.delta.kicker, m.delta.title, m.delta.sub, m.action?.label, m.chip?.label]
    .flatMap((c) => (c ? [render(vi, c), render(en, c)] : []))
    .join(' | ');

describe('one thing a day, after the first week', () => {
  it('gives every day from 8 to 49 one top card and one thing to do', () => {
    for (const { before, after } of walk()) {
      for (const m of [before, after]) {
        expect(m.delta.id).not.toBe('');
        expect(m.action).not.toBeNull();
      }
    }
    // After day 8's welcome, every later open is the burrow home.
    for (const day of DAYS.slice(1)) expect(burrowVariant(input(day))).toBe('home');
  });

  it('never shows the same top card two days running', () => {
    for (const options of [{}, { missed: [3] }, { missed: [2, 3, 4] }, { missed: [5, 6, 7] }]) {
      for (const { day, previousCard, before, after } of walk(options, (d) =>
        d % 2 === 0 ? DUE : null,
      )) {
        expect({ day, card: before.delta.id }).not.toEqual({ day, card: previousCard });
        expect({ day, card: after.delta.id }).not.toEqual({ day, card: previousCard });
      }
    }
  });

  it('follows the week: episode, story, real week, practice, voicemail, Pip’s minute, wrap', () => {
    const card = (day: number) => burrowHomeModel({ ...input(day), pipsMinute: DUE }).delta;
    expect([15, 16, 17, 18, 19, 20, 21].map((d) => card(d).id)).toEqual([
      's1-e3',
      's1-e3-story',
      's1-e3-real-week',
      's1-e3-practice',
      's1-e3-voicemail',
      CARD_IDS.pipsMinute,
      'wrap-3',
    ]);
    expect(card(15).target).toBe('/(call)/s1-e3');
    expect(card(16).target).toBe('/listen/s1-e3-story');
    expect(card(19).target).toBe('/listen/s1-e3-voicemail');
    expect(card(20).target).toBe(`/(call)/${DUE}`);
    expect(card(21).target).toBe('/(home)/wrap?week=3');
    expect(render(vi, card(15).title)).toBe('Tập 3 đã sẵn sàng');
    expect(render(vi, card(17).title)).toBe('Cuộc gọi tuần thật với Dex');
    expect(render(vi, card(20).title)).toBe('Một phút với Pip');
  });

  it('opens Episode 2 on day 8, the first day of week 2', () => {
    const day8 = burrowHomeModel(input(8, { after: true }));
    expect(day8.delta.id).toBe('s1-e2');
    expect(day8.action?.target).toBe('/(call)/s1-e2');
    expect(day8.ring).toEqual({ done: 0, total: 3 });
  });
});

describe('the day’s thing, then the oldest call still waiting', () => {
  it('offers the episode once the real-week call of the day is done', () => {
    // Week 2, day 3: the real-week call taken, the episode never played.
    const base = input(10);
    const filled = fillRingSlot(
      base.progress.weeks,
      { kind: 'real_week', callRecordId: 'r', doneAt: NOW, sceneId: 's1-e2-real-week' },
      'Asia/Ho_Chi_Minh',
    );
    const weeks = filled.weeks.map((w) =>
      w.week === 2
        ? {
            ...w,
            slots: w.slots.map((s) =>
              s.kind === 'episode'
                ? { ...s, status: 'open' as const, callRecordId: null, doneAt: null }
                : s,
            ),
          }
        : w,
    );
    const m = burrowHomeModel({ ...base, progress: { ...base.progress, weeks } });
    expect(m.delta.id).toBe('s1-e2-real-week');
    expect(m.action?.target).toBe('/(call)/s1-e2');
  });

  it('waits with the missed week’s episode, and alternates it with something else', () => {
    // Away all of week 3: on day 22 the story week is still week 3, its episode waiting.
    const back = burrowHomeModel(input(22, { missed: [3] }));
    expect(back.action?.target).toBe('/(call)/s1-e3');
    expect(back.delta.id).toBe('waiting-s1-e3');
    expect(render(vi, back.delta.kicker)).toBe('ĐANG ĐỢI BẠN');
    const next = burrowHomeModel({ ...input(22, { missed: [3] }), previousCard: back.delta.id });
    expect(next.delta.id).not.toBe('waiting-s1-e3');
    expect(next.action?.target).toBe('/(call)/s1-e3');
  });
});

describe('Pip’s minute', () => {
  it('is a chip on a day it isn’t the card or the button', () => {
    const m = burrowHomeModel({ ...input(16), pipsMinute: DUE });
    expect(m.chip?.target).toBe(`/(call)/${DUE}`);
    expect(m.chip && render(vi, m.chip.label)).toBe('Một phút với Pip');
  });

  it('is the card on day 6 of the week, with no chip', () => {
    const m = burrowHomeModel({ ...input(13), pipsMinute: DUE });
    expect(m.delta.id).toBe(CARD_IDS.pipsMinute);
    expect(m.chip).toBeNull();
  });

  it('isn’t there when no phrase is due', () => {
    const m = burrowHomeModel({ ...input(16), pipsMinute: null });
    expect(m.chip).toBeNull();
    expect(burrowHomeModel({ ...input(13), pipsMinute: null }).delta.id).not.toBe(
      CARD_IDS.pipsMinute,
    );
  });

  it('is chosen from the learner’s due phrases, the same all day', () => {
    const days = DAYS.filter((d) => input(d).pipsMinute != null);
    expect(days.length).toBeGreaterThan(0);
    for (const d of days) {
      expect(input(d).pipsMinute).toMatch(/^s1-pm\.[123]\./);
      expect(input(d, { hour: 20 }).pipsMinute).toBe(input(d).pipsMinute);
    }
  });
});

describe('the festival and the weeks after the season', () => {
  it('rings the festival week with replays and its own story and post', () => {
    expect(burrowHomeModel(input(43)).delta.id).toBe('replay-7-s1-e1');
    expect(burrowHomeModel(input(44)).delta.id).toBe('s1-fest-story');
    expect(burrowHomeModel(input(47)).delta.id).toBe('s1-fest-voicemail');
  });

  it('makes weeks 8 on rings of replays, a different episode each week', () => {
    const day = (d: number) => burrowHomeModel(input(d));
    expect(day(50).delta.id).toBe('replay-8-s1-e2');
    expect(day(50).action?.target).toBe('/(call)/s1-e2');
    expect(day(57).delta.id).toBe('replay-9-s1-e3');
    expect(day(52).action?.target).toBe('/(call)/s1-e2-real-week');
    expect(ringSceneFor(13, 'episode', null)).toBe('s1-e1');
    expect(ringSceneFor(3, 'episode', 's1-e3')).toBe('s1-e3');
  });
});

describe('the week view after the first week', () => {
  const week = (day: number, options: PreviewOptions = {}) => {
    const p = previewModel(day, options, NOW);
    return weekModel({
      day,
      startedOn: p.installedOn,
      roommate: p.input.roommate,
      firstLanguage: 'vi',
      progress: p.progress,
    });
  };

  it('shows the story week’s three calls from their scenes, all three tappable', () => {
    const w = week(18);
    expect(w.rows.map((r) => r.target)).toEqual([
      '/(call)/s1-e3',
      '/(call)/s1-e3-real-week',
      '/(call)/s1-e3-practice',
    ]);
    expect(w.rows.map((r) => render(vi, r.title))).toEqual([
      'S1 · E3 · Cheaper Beans',
      'A real no',
      'Pass it on',
    ]);
    expect(w.rows.map((r) => r.face.character)).toEqual(['mei', 'dex', 'linh']);
    expect(w.phrases).toHaveLength(SEASON_1.episodes[2]?.phrases.length ?? 0);
  });

  it('names a call whose day hasn’t come by its own week’s scene, not as a replay', () => {
    const w = week(22);
    expect(w.rows.map((r) => render(vi, r.tag))).toEqual(['Tập truyện', 'Tuần thật', 'Luyện tập']);
    expect(w.rows.map((r) => render(vi, r.title))).toEqual([
      'S1 · E4 · The Plan',
      'Speak up in your meeting',
      "Nell's time, then two words",
    ]);
    expect(w.rows.map((r) => r.target)).toEqual(['/(call)/s1-e4', null, null]);
  });

  it('keeps a call from an earlier week waiting in its own row', () => {
    // Away in week 3; back on day 22 the learner plays Episode 3 only.
    const p = previewModel(22, { missed: [3] }, NOW);
    const filled = fillRingSlot(
      p.progress.weeks,
      { kind: 'episode', callRecordId: 'e3', doneAt: NOW, sceneId: 's1-e3' },
      'Asia/Ho_Chi_Minh',
    ).weeks;
    const w = weekModel({
      day: 22,
      startedOn: p.installedOn,
      roommate: p.input.roommate,
      firstLanguage: 'vi',
      progress: { ...p.progress, weeks: filled },
    });
    expect(w.rows[0]?.target).toBe('/(call)/s1-e4');
    expect(w.waiting?.target).toBe('/(call)/s1-e3-real-week');
    expect(w.waiting && render(vi, w.waiting.tag)).toBe('Tuần 3 · đang đợi bạn');
    const m = burrowHomeModel({ ...p.input, progress: { ...p.progress, weeks: filled } });
    expect(m.delta.id).toBe('s1-e4');
  });

  it('shows the replay ring and the learner’s own phrases after the season', () => {
    const w = week(52);
    expect(w.rows.map((r) => render(vi, r.tag))).toEqual(['Chơi lại', 'Chơi lại', 'Chơi lại']);
    expect(w.rows[0]?.target).toBe('/(call)/s1-e2');
    expect(w.phrases.length).toBeGreaterThan(0);
  });
});

describe('back after days away', () => {
  it('tells the recap of the last episode finished, Episodes 2 to 5', () => {
    for (const [day, finished] of [
      [16, 3],
      [23, 4],
      [9, 2],
    ] as const) {
      const back = backModel(input(day, { away: true }));
      expect(back.line.lineId).toBe(SEASON_1.episodes[finished - 1]?.recap);
      expect(back.peek?.episode).toBe(finished + 1);
      expect(back.peekFirst).toBe(true);
    }
  });

  it('keeps the next episode waiting where the learner left it after a missed week', () => {
    const back = backModel(input(22, { away: true, missed: [3] }));
    expect(back.line.lineId).toBe(SEASON_1.episodes[1]?.recap);
    expect(back.peek?.episode).toBe(3);
  });
});

describe('care without guilt, every day', () => {
  it('never mentions a missed day and never shows a sad Pip', () => {
    for (const options of [{}, { missed: [3] }, { missed: [2, 3, 4, 5] }, { away: true }]) {
      for (const { before, after } of walk(options, () => DUE)) {
        for (const m of [before, after]) {
          expect(words(m)).not.toMatch(/miss|lose|lost|late|streak|bỏ lỡ|đã lỡ|trễ|mất/i);
          expect(['worried', 'sleepy', 'confused', 'sad']).not.toContain(m.pipMood);
        }
      }
    }
  });
});

describe('yesterday’s card, as the phone keeps it', () => {
  it('is the last card of the last day opened before today', () => {
    const one = logShown(null, '2026-10-01', 'a');
    expect(previousCardOf(one, '2026-10-01')).toBeNull();
    const later = logShown(one, '2026-10-01', 'b');
    expect(previousCardOf(later, '2026-10-02')).toBe('b');
    const next = logShown(later, '2026-10-04', 'c');
    expect(previousCardOf(next, '2026-10-04')).toBe('b');
    expect(previousCardOf(next, '2026-10-05')).toBe('c');
  });
});
