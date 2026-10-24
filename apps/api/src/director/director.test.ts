import { describe, expect, it } from 'vitest';

import { parseControl } from '../call/control';
import { pickLane, turnDirection, wantsGloss, type MomentLearner } from './actor';
import { firstMoment, freeMoment } from './fixed';
import { MomentPlan } from './moment';
import { isNameFact } from './judge';
import { checkPlan, repeatsRecent, sameQuestion } from './plan';

const at = (hour: number) => ({ year: 2026, month: 10, day: 24, hour });
const visitor: MomentLearner = { name: null, firstLanguage: 'vi', stage: 'visitor', country: 'VN' };

describe('the fixed moments', () => {
  it('pass the director’s own checks at every hour', () => {
    for (let h = 0; h < 24; h += 1) {
      for (const plan of [firstMoment(h, 'vi'), freeMoment(h, 'Lan', 'vi')]) {
        expect(MomentPlan.safeParse(plan).success).toBe(true);
        expect(checkPlan(plan, at(h), true)).toEqual([]);
      }
    }
  });

  it('wake Pip up at night and gloss the opening for a Vietnamese learner', () => {
    expect(firstMoment(23.5, 'vi').opening_line).toContain('sleeping');
    expect(firstMoment(15, 'vi').opening_gloss).not.toBe('');
    expect(firstMoment(15, 'pt').opening_gloss).toBe('');
  });
});

describe('the plan checks', () => {
  it('refuse a place whose resident is out, lines over the limit, and a missing door', () => {
    const plan = {
      ...firstMoment(12, 'vi'),
      place: 'noodles' as const,
      beats: firstMoment(12, 'vi').beats.map((b) => ({
        ...b,
        is_door: false,
        example_line: 'This line is far too long for a visitor to follow at all',
      })),
    };
    const problems = checkPlan(plan, at(12), true);
    expect(problems.some((p) => p.includes('nobody in'))).toBe(true);
    expect(problems.some((p) => p.includes('over the 8-word limit'))).toBe(true);
    expect(problems.some((p) => p.includes('door'))).toBe(true);
  });

  it('keep "love" for Bea and "I" for Pip', () => {
    const plan = { ...firstMoment(12, 'vi'), opening_line: 'Hello love! Pip is here.' };
    const problems = checkPlan(plan, at(12), false);
    expect(problems.some((p) => p.includes('Bea'))).toBe(true);
    expect(problems.some((p) => p.includes('never its own name'))).toBe(true);
  });
});

describe('the rerun check', () => {
  it('refuses the last moments’ opening question and a third visit in a row', () => {
    expect(
      sameQuestion('Hi! I made iced coffee. Milk or no milk?', 'I wrote it. Milk, or no milk?'),
    ).toBe(true);
    expect(sameQuestion('Milk or no milk?', 'Is the bus late again?')).toBe(false);
    expect(sameQuestion('The fog is thick today.', 'The fog is thick today.')).toBe(false);
    const base = firstMoment(15, 'vi');
    const coffee = { ...base, place: 'cafe' as const, opening_line: 'Hi! Milk or no milk?' };
    const again = { ...coffee, opening_line: 'Hello again. Milk, or no milk?' };
    expect(repeatsRecent(again, [coffee]).some((p) => p.includes('same question'))).toBe(true);
    const fresh = { ...coffee, opening_line: 'The sign blew away! Can you help me?' };
    expect(repeatsRecent(fresh, [coffee])).toEqual([]);
    expect(repeatsRecent(fresh, [coffee, coffee]).some((p) => p.includes('last two'))).toBe(true);
  });
});

describe('the judge’s name facts', () => {
  it('knows a fact about what to call the learner', () => {
    expect(isNameFact("You'd like to be called John")).toBe(true);
    expect(isNameFact('You told us your name is Khanh.')).toBe(true);
    expect(isNameFact('You have three cats.')).toBe(false);
  });
});

describe('the live lanes', () => {
  it('drops a struggling newcomer to Visitor lines and lifts a fluent one', () => {
    expect(pickLane(['yes', 'coffee'], 'newcomer')).toBe('simple');
    expect(pickLane(['dạ em không hiểu', 'cà phê sữa đá ạ'], 'newcomer')).toBe('simple');
    expect(
      pickLane(
        [
          'I usually drink coffee in the morning because I start work very early at the hospital',
          'I work as a nurse in a big hospital in the city and the shifts are long but I like it',
        ],
        'newcomer',
      ),
    ).toBe('rich');
    expect(pickLane(['My name is Lan', 'Coffee please'], 'newcomer')).toBe('simple');
    expect(
      pickLane(
        ['I am Lan, nice to meet you', 'I like coffee with milk and a little sugar'],
        'visitor',
      ),
    ).toBe('rich');
  });

  it('tells the actor the beat, when to move on, the limit and the control line', () => {
    const plan = firstMoment(15, 'vi');
    const first = turnDirection(plan, visitor, {
      beat: 0,
      beatTurns: 0,
      lane: 'planned',
      laneSwitched: false,
      landNow: false,
      wrapUp: false,
    });
    expect(first.maxWords).toBe(8);
    expect(first.direction).toContain('beat 1 of 4');
    expect(first.direction).toContain('go on to the next beat');
    expect(first.direction).toContain('"gloss"');
    const pushed = turnDirection(plan, visitor, {
      beat: 1,
      beatTurns: 2,
      lane: 'rich',
      laneSwitched: true,
      landNow: false,
      wrapUp: false,
    });
    expect(pushed.direction).toContain('LANE SWITCH');
    expect(pushed.direction).toContain('Set "beat":"next"');
    expect(pushed.maxWords).toBe(25);
    const last = turnDirection(plan, visitor, {
      beat: 4,
      beatTurns: 0,
      lane: 'planned',
      laneSwitched: false,
      landNow: false,
      wrapUp: false,
    });
    expect(last.direction).toContain('land the ending');
    const wrap = turnDirection(plan, visitor, {
      beat: 1,
      beatTurns: 0,
      lane: 'planned',
      laneSwitched: false,
      landNow: false,
      wrapUp: true,
    });
    expect(wrap.direction).toContain('Time is nearly up');
    expect(wrap.direction).not.toContain('heard your last line twice');
    const lost = turnDirection(plan, visitor, {
      beat: 1,
      beatTurns: 0,
      lane: 'planned',
      laneSwitched: false,
      landNow: false,
      wrapUp: false,
      saidAgain: true,
    });
    expect(lost.direction).toContain('heard your last line twice');
  });

  it('glosses only for beginners in their own language', () => {
    expect(wantsGloss(visitor)).toBe(true);
    expect(wantsGloss({ ...visitor, stage: 'regular' })).toBe(false);
    expect(wantsGloss({ ...visitor, firstLanguage: 'other' })).toBe(false);
  });

  it('reads the beat and the gloss from the control line', () => {
    const c = parseControl('§{"beat":"next","gloss":"Bạn tên gì?"}');
    expect(c.beat).toBe('next');
    expect(c.gloss).toBe('Bạn tên gì?');
    expect(parseControl('§{"outcome":"fine"}').beat).toBeNull();
  });
});
