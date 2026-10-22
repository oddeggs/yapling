import { describe, expect, it } from '@jest/globals';
import { translator } from '@yapling/i18n';

import { render } from '../../src/features/burrow/copy';
import {
  burrowHomeModel,
  burrowVariant,
  shelvesFor,
  type BurrowInput,
} from '../../src/features/burrow/model';
import { previewModel } from '../../src/features/burrow/preview';
import { backModel, doorModel } from '../../src/features/burrow/scenes';
import { timeOfDayAt } from '../../src/features/burrow/time-of-day';

const NOW = Date.UTC(2026, 9, 22, 5, 0);
const input = (day: number, options: Parameters<typeof previewModel>[1] = {}): BurrowInput =>
  previewModel(day, options, NOW).input;
const vi = translator('vi');

/** Every state of the first week: each day before and after its own moment. */
const WEEK = [1, 2, 3, 4, 5, 6, 7, 8].flatMap((day) => [
  { day, after: false },
  { day, after: true },
]);

describe('the burrow by time of day', () => {
  it('follows the learner’s clock: morning, day, dusk, night', () => {
    expect(timeOfDayAt(7)).toBe('morning');
    expect(timeOfDayAt(13)).toBe('afternoon');
    expect(timeOfDayAt(18)).toBe('evening');
    expect(timeOfDayAt(22)).toBe('night');
    expect(timeOfDayAt(3)).toBe('night');
    expect(burrowHomeModel(input(3, { hour: 18 })).timeOfDay).toBe('evening');
  });
});

describe('which burrow screen opens', () => {
  it('is the day-one burrow before the placement chat', () => {
    const before = { ...input(1), seen: new Set<never>() };
    expect(burrowVariant(before)).toBe('day-one');
  });

  it('lets Linh knock once on the first evening', () => {
    expect(burrowVariant(input(1, { beforeDoor: true }))).toBe('door');
    expect(burrowVariant(input(1))).toBe('home');
  });

  it('welcomes the learner back on day 8, and after days away on any day', () => {
    expect(burrowVariant(input(8))).toBe('back');
    expect(burrowVariant(input(8, { after: true }))).toBe('home');
    expect(burrowVariant(input(4, { away: true }))).toBe('back');
  });
});

describe('the burrow changes day by day', () => {
  it('keeps the last box until the first call unpacks it', () => {
    expect(burrowHomeModel(input(1)).scene).toBe('burrow-day1');
    expect(burrowHomeModel(input(2)).scene).toBe('burrow-day1');
    expect(burrowHomeModel(input(2, { after: true })).scene).toBe('burrow');
    expect(burrowHomeModel(input(5)).scene).toBe('burrow');
  });

  it('starts with empty shelves, then a seed packet for each phrase met', () => {
    const one = burrowHomeModel(input(1));
    expect([...one.shelves.left, ...one.shelves.right]).toHaveLength(0);
    const two = burrowHomeModel(input(2));
    expect(two.shelves.left.map((o) => o.art)).toEqual(['seed', 'seed', 'seed']);
    expect(two.shelves.right.map((o) => o.art)).toEqual(['seed']);
  });

  it('sprouts the phrases the first call used, and grows the fixed one into a leaf', () => {
    const after = burrowHomeModel(input(2, { after: true }));
    const arts = [...after.shelves.left, ...after.shelves.right].map((o) => o.art);
    expect(arts).toEqual(['plant-0', 'seed', 'plant-0', 'plant-0']);
    const six = burrowHomeModel(input(6, { after: true }));
    const helped = [...six.shelves.left, ...six.shelves.right].find((o) => o.id === 'can-i-help');
    expect(helped?.art).toBe('plant-1');
  });

  it('puts the seagull feather on the shelf once Pip has told its story', () => {
    const before = burrowHomeModel(input(3));
    const after = burrowHomeModel(input(3, { after: true }));
    const ids = (m: typeof before) => [...m.shelves.left, ...m.shelves.right].map((o) => o.id);
    expect(ids(before)).not.toContain('gift-seagull-feather');
    expect(ids(after)).toContain('gift-seagull-feather');
  });

  it('never drops a phrase from a full shelf for time passing: the newest six stay', () => {
    const phrases = Array.from({ length: 8 }, (_, i) => ({
      id: `p${i}`,
      text: `phrase ${i}`,
      state: 'seed' as const,
      seedAt: i,
      sproutAt: null,
      leafAt: null,
      bloomAt: null,
      lastUsedAt: null,
      usedOn: [],
      contexts: [],
    }));
    const shelves = shelvesFor(phrases, new Set());
    expect([...shelves.left, ...shelves.right].map((o) => o.id)).toEqual([
      'p2',
      'p3',
      'p4',
      'p5',
      'p6',
      'p7',
    ]);
  });

  it('hangs the keepsake on the wall once the ring is full, signed by its witness', () => {
    expect(burrowHomeModel(input(5)).keepsake).toBeNull();
    const kept = burrowHomeModel(input(5, { after: true })).keepsake;
    expect(kept?.heading).toBe('Lan can now…');
    expect(kept?.canDo).toBe('Introduced myself in 30 seconds');
    expect(kept?.witness).toBe('linh');
    expect(kept?.witnessed).toMatch(/^witnessed by Linh · [A-Z][a-z]{2} \d{1,2}$/);
    expect(burrowHomeModel(input(8)).keepsake).not.toBeNull();
  });

  it('shows the mailbox with post in it until the postcard and the voicemail are opened', () => {
    expect(burrowHomeModel(input(2)).mailbox).toBeNull();
    expect(burrowHomeModel(input(3)).mailbox).toBe('letter');
    expect(burrowHomeModel(input(4)).mailbox).toBe('empty');
    expect(burrowHomeModel(input(6)).mailbox).toBe('letter');
    expect(burrowHomeModel(input(7)).mailbox).toBe('empty');
  });

  it('counts the ring from the day the week view opens', () => {
    expect(burrowHomeModel(input(1)).ring).toBeNull();
    expect(burrowHomeModel(input(2)).ring).toEqual({ done: 0, total: 3 });
    expect(burrowHomeModel(input(4, { after: true })).ring).toEqual({ done: 2, total: 3 });
  });
});

describe('something new every open', () => {
  it('never shows the same top card two days running', () => {
    for (const [i, a] of WEEK.entries()) {
      for (const b of WEEK.slice(i + 1)) {
        if (b.day !== a.day + 1) continue;
        const first = burrowHomeModel(input(a.day, { after: a.after })).delta.id;
        const next = burrowHomeModel(input(b.day, { after: b.after })).delta.id;
        expect({ days: [a, b], next }).not.toEqual({ days: [a, b], next: first });
      }
    }
  });

  it('says what happened while the learner was away, or what is new today', () => {
    expect(render(vi, burrowHomeModel(input(1)).delta.kicker)).toBe('NGÀY 1');
    expect(render(vi, burrowHomeModel(input(3)).delta.kicker)).toBe('TRONG LÚC BẠN ĐI VẮNG');
    expect(render(vi, burrowHomeModel(input(3)).delta.title)).toBe('Pip bị lạc hôm nay');
  });

  it('offers the day’s moment first, then the oldest call still waiting', () => {
    const label = (day: number, after = false) =>
      render(
        vi,
        burrowHomeModel(input(day, { after })).action?.label ?? { kind: 'text', text: '' },
      );
    expect(label(2)).toBe('Đến quán cà phê với Pip');
    expect(label(3)).toBe('Nghe chuyện của Pip');
    expect(label(4)).toBe('Dạy Pip giới thiệu bản thân');
    expect(label(5)).toBe('Ra bến xe buýt 45');
    expect(label(5, true)).toBe('Xem tuần này');
    expect(label(8)).toBe('S1 · E2 · Help Wanted');
    // A learner who skipped the first call still finds it waiting on day 3.
    const skipped = input(3, { after: true });
    const waiting = {
      ...skipped,
      progress: { ...skipped.progress, weeks: previewModel(2, {}, NOW).progress.weeks },
    };
    expect(render(vi, burrowHomeModel(waiting).action?.label ?? { kind: 'text', text: '' })).toBe(
      'Đến quán cà phê với Pip',
    );
  });
});

describe('care without guilt', () => {
  it('never shows a sad, worried or sleepy roommate, whatever the day or absence', () => {
    for (const { day, after } of WEEK) {
      for (const away of [false, true]) {
        const mood = burrowHomeModel(input(day, { after, away })).pipMood;
        expect(['worried', 'sleepy', 'confused']).not.toContain(mood);
      }
    }
  });
});

describe('the knock at the door', () => {
  it('is Linh’s recorded welcome, glossed in the learner’s language', () => {
    const door = doorModel(input(1, { beforeDoor: true }));
    expect(door.guest).toBe('linh');
    expect(door.line.lineId).toBe('s1-pro-03');
    expect(door.line.name).toBe('Linh');
    expect(door.line.text).toMatch(/^Hi! I’m Linh|^Hi! I'm Linh/);
    expect(door.line.gloss).toMatch(/^Chào! Mình là Linh/);
  });
});

describe('coming back', () => {
  it('asks how the week was on day 8, with the next episode after the answer', () => {
    const back = backModel(input(8));
    expect(back.kind).toBe('normal');
    expect(back.line.text).toBe('How was your week?');
    expect(back.peek).toMatchObject({ season: 1, episode: 2, title: 'Help Wanted', face: 'sol' });
    expect(back.peekFirst).toBe(false);
  });

  it('after days away, tells the story so far and keeps the episode exactly where it was', () => {
    const back = backModel(input(8, { away: true }));
    expect(back.kind).toBe('away');
    expect(back.line.lineId).toBe('s1-e1-11');
    expect(back.line.text).toMatch(/^While you were away/);
    expect(back.line.gloss).toMatch(/^Trong lúc bạn đi vắng/);
    expect(back.peek?.episode).toBe(2);
    expect(back.peekFirst).toBe(true);
  });

  it('keeps the seat warm when there is no story yet to recap', () => {
    const back = backModel(input(2, { away: true }));
    expect(back.line.lineId).toBeNull();
    expect(back.line.text).toBe('You’re back? I kept your seat warm.');
    expect(back.peek?.episode).toBe(1);
  });
});

describe('the room after Settling in', () => {
  it('stays unpacked for a learner who settled in with Linh first', () => {
    expect(burrowHomeModel(input(2)).scene).toBe('burrow-day1');
    expect(burrowHomeModel({ ...input(2), settledIn: true }).scene).toBe('burrow');
  });
});
