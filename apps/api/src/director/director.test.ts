import { describe, expect, it } from 'vitest';

import { parseControl } from '../call/control';
import { pickLane, turnDirection, wantsGloss, type MomentLearner } from './actor';
import { firstMoment, freeMoment } from './fixed';
import { MomentPlan } from './moment';
import { isNameFact } from './judge';
import { checkPlan, stageFor } from './plan';
import { repeatsStories, type StoryOutline } from './story';
import type { Learner } from './store';

const at = (hour: number) => ({ year: 2026, month: 10, day: 24, hour });
const visitor: MomentLearner = { name: null, firstLanguage: 'vi', stage: 'visitor', country: 'VN' };

describe('the fixed moments', () => {
  it('pass the director’s own checks at every hour', () => {
    for (let h = 0; h < 24; h += 1) {
      for (let n = 0; n < 6; n += 1) {
        for (const plan of [firstMoment(h, 'vi', 'Lan'), freeMoment(h, 'Lan', 'vi', n)]) {
          expect(MomentPlan.safeParse(plan).success).toBe(true);
          expect(checkPlan(plan, at(h)).hard).toEqual([]);
        }
      }
    }
  });

  it('greets the learner by the name they typed and glosses for a Vietnamese learner', () => {
    expect(firstMoment(15, 'vi', 'Khanh', 'neighbour').opening_line).toContain('Khanh');
    expect(firstMoment(15, 'vi').opening_gloss).not.toBe('');
    expect(firstMoment(15, 'pt').opening_gloss).toBe('');
  });

  it('gives Pip a different small story each time, never "How was your day?"', () => {
    const openings = new Set(
      [0, 1, 2, 3, 4].map((n) => freeMoment(15, null, 'en', n).opening_line),
    );
    expect(openings.size).toBe(5);
    for (const o of openings) expect(o).not.toMatch(/how was your day/i);
  });
});

describe('the plan checks', () => {
  it('refuse a place whose resident is out; flag long lines', () => {
    const plan = {
      ...firstMoment(12, 'vi'),
      place: 'noodles' as const,
      beats: firstMoment(12, 'vi').beats.map((b) => ({
        ...b,
        example_line: 'This line is far too long for a visitor to follow at all',
      })),
    };
    const { hard, soft } = checkPlan(plan, at(12));
    expect(hard.some((p) => p.includes('nobody in'))).toBe(true);
    expect(soft.some((p) => p.includes('over the 8-word limit'))).toBe(true);
  });

  it('keep "love" for Bea and "I" for Pip on the way in', () => {
    const plan = {
      ...firstMoment(12, 'vi'),
      opening_line: 'Hello love!',
      bridge_line: 'Pip is here.',
    };
    const { soft } = checkPlan(plan, at(12));
    expect(soft.some((p) => p.includes('Bea'))).toBe(true);
    expect(soft.some((p) => p.includes('never its own name'))).toBe(true);
  });
});

const outline = (o: Partial<StoryOutline>): StoryOutline => ({
  title: 'The Espresso Emergency',
  kind: 'rescue',
  grows: '',
  logline: '',
  why_this_learner: '',
  emotional_core: '',
  pip_arc: '',
  learning_spine: '',
  central: 'mei',
  scenes: [],
  plants: [],
  twist: '',
  finale_payoff: '',
  epilogue: '',
  town_now: [],
  ...o,
});

describe('a new story', () => {
  it('is not the same kind, centre or title as the last ones', () => {
    const past = [
      outline({}),
      outline({ title: 'Hank Wants A Discount', kind: 'mix_up', central: 'hank' }),
    ];
    expect(
      repeatsStories(outline({ kind: 'rescue', central: 'sol', title: 'Sol Speaks' }), past),
    ).toHaveLength(1);
    expect(
      repeatsStories(outline({ kind: 'mystery', central: 'hank', title: 'Fog' }), past),
    ).toHaveLength(1);
    expect(
      repeatsStories(
        outline({ kind: 'mystery', central: 'sol', title: 'Another Espresso Emergency' }),
        past,
      ),
    ).toHaveLength(1);
    expect(
      repeatsStories(outline({ kind: 'mystery', central: 'sol', title: 'Sol Speaks' }), past),
    ).toEqual([]);
  });

  it('aims at the learner’s own level until the conversations are sure', () => {
    const base = {
      userId: 'u',
      name: 'Lan',
      firstLanguage: 'vi',
      country: 'VN',
      timezone: 'Asia/Ho_Chi_Minh',
      openThreads: [],
      createdAt: 0,
      model: null,
      arrival: null,
      arrivedAt: null,
    } satisfies Learner;
    const arrival = {
      name: 'Lan',
      why: ['work' as const],
      doing: 'work' as const,
      field: null,
      interests: [],
      hard: [],
      level: 4,
      adult: true as const,
      firstLanguage: 'vi' as const,
      country: 'VN',
      timezone: 'Asia/Ho_Chi_Minh',
    };
    expect(stageFor(base)).toBe('visitor');
    expect(stageFor({ ...base, arrival })).toBe('regular');
    const model = {
      cefr: 'A2',
      stage: 'newcomer',
      confidence: 'low',
      level_evidence: [],
      errors: [],
      interests: [],
      life_context: '',
      culture: '',
      personality: '',
      what_engages: '',
    };
    expect(stageFor({ ...base, arrival, model })).toBe('regular');
    expect(stageFor({ ...base, arrival, model: { ...model, confidence: 'high' } })).toBe(
      'newcomer',
    );
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
    // Short but fluent answers to closed questions stay on the plan.
    expect(pickLane(['My name is Lan', 'Coffee please'], 'newcomer')).toBe('planned');
    expect(pickLane(["It's good.", 'Yes.'], 'newcomer')).toBe('planned');
    expect(pickLane(['Sorry, again?', 'I... coffee'], 'newcomer')).toBe('simple');
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
