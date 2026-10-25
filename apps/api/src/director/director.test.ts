import type { Arrival } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import { parseControl } from '../call/control';
import { COMPANIONS, matchCompanions, stanceFor } from '../curriculum/companion';
import { afterStory, dueChunks, nextUnit, START } from '../curriculum/progress';
import { UNITS } from '../curriculum/units';
import { pickLane, turnDirection, wantsGloss, type MomentLearner } from './actor';
import { firstMoment, freeMoment } from './fixed';
import { isNameFact } from './judge';
import { MomentPlan } from './moment';
import { checkPlan, stageFor } from './plan';
import { repeatsStories, type StoryOutline } from './story';
import type { Learner } from './store';

const at = (hour: number) => ({ year: 2026, month: 10, day: 26, hour });
const visitor: MomentLearner = { name: null, firstLanguage: 'vi', stage: 'visitor', country: 'VN' };

const arrival = (a: Partial<Arrival>): Arrival => ({
  name: 'Lan',
  why: ['work'],
  doing: 'work',
  field: null,
  interests: [],
  hard: [],
  level: 3,
  adult: true,
  firstLanguage: 'vi',
  country: 'VN',
  timezone: 'Asia/Ho_Chi_Minh',
  ...a,
});

describe('the syllabus', () => {
  it('has 44 units across six stages, each with chunks and a strategy', () => {
    expect(UNITS).toHaveLength(44);
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(44);
    for (const u of UNITS) {
      expect(u.chunks.length).toBeGreaterThanOrEqual(2);
      expect(u.strategy).not.toBe('');
    }
  });

  it('pulls a learner’s goal units forward, never repeats a recent one, and moves up on evidence', () => {
    const work = arrival({ why: ['work'], hard: ['meetings'] });
    expect(nextUnit(START, 'neighbour', work).id).toBe('B5');
    expect(nextUnit(START, 'neighbour', work, ['B5']).id).not.toBe('B5');
    const travel = arrival({ why: ['travel'], level: 1 });
    expect(nextUnit(START, 'visitor', travel).id).toBe('V2');
    // The conversations place them higher than their progress: they're taught there.
    expect(nextUnit(START, 'regular', null).stage).toBe('regular');
    let p = START;
    for (const id of ['V1', 'V2', 'V3', 'V4']) p = afterStory(p, id, true, 'visitor');
    expect(p.stage).toBe('newcomer');
    expect(dueChunks(p).length).toBeGreaterThan(0);
  });
});

describe('the companion', () => {
  it('is matched on the learner’s goal, then confidence', () => {
    expect(matchCompanions(arrival({ why: ['work'], hard: ['meetings'] }))[0]).toBe('sol');
    expect(matchCompanions(arrival({ why: ['travel'], hard: ['phone'] }))[0]).toBe('nell');
    expect(matchCompanions(arrival({ why: ['friends'], hard: ['small_talk'] }))[0]).toBe('mei');
    expect(matchCompanions(arrival({ why: ['exam'], hard: ['nerves'] }))[0]).toBe('linh');
    // Pip can't model the language for someone who knows a few words.
    expect(matchCompanions(arrival({ why: ['family', 'me'], level: 1 }))).not.toContain('pip');
    expect(stanceFor(arrival({ level: 1 }), 'visitor')).toBe('peer');
    expect(stanceFor(arrival({ level: 5 }), 'local')).toBe('challenger');
  });
});

describe('the hand-written moments', () => {
  it('pass the director’s own checks at every hour, for every companion', () => {
    for (const c of COMPANIONS) {
      for (let h = 0; h < 24; h += 1) {
        for (const plan of [
          firstMoment(c, 'Lan', 'visitor', 'vi', h),
          freeMoment(c, 'Lan', 'newcomer', 'vi', h, ['How much is …?', 'It’s …']),
        ]) {
          expect(MomentPlan.safeParse(plan).success).toBe(true);
          expect(checkPlan(plan, at(h)).hard).toEqual([]);
        }
      }
    }
  });

  it('greets the learner by name, and glosses for a Vietnamese learner', () => {
    expect(firstMoment('sol', 'Khanh', 'neighbour', 'vi', 15).opening_line).toContain('Khanh');
    expect(firstMoment('sol', 'Khanh', 'neighbour', 'vi', 15).brief_gloss).not.toBe('');
    expect(firstMoment('sol', 'Ana', 'local', 'pt', 15).brief_gloss).toBe('');
  });
});

describe('the scene checks', () => {
  it('refuse a closed place, a guest at Visitor, a brief without tasks, and seeing things', () => {
    const plan = firstMoment('linh', 'Lan', 'visitor', 'vi', 12);
    const bad: MomentPlan = {
      ...plan,
      place: 'noodles',
      guest: 'hank',
      guest_intro: '',
      brief: { ...plan.brief, tasks: [] },
      opening_line: 'Look at this board! What does the board say?',
    };
    const { hard } = checkPlan(bad, at(12), 'visitor');
    expect(hard.some((p) => p.includes('closed'))).toBe(true);
    expect(hard.some((p) => p.includes('No guest'))).toBe(true);
    expect(hard.some((p) => p.includes('tasks'))).toBe(true);
    expect(hard.some((p) => p.includes('Visual-only'))).toBe(true);
  });
});

const outline = (o: Partial<StoryOutline>): StoryOutline => ({
  title: 'Tea Table After Dark',
  unit_id: 'V2',
  kind: 'first_time',
  grows: '',
  logline: '',
  why_this_learner: '',
  emotional_core: '',
  companion_arc: '',
  scenes: [],
  twist: '',
  finale_payoff: '',
  epilogue: '',
  ...o,
});

describe('a new story', () => {
  it('is not the same kind or title as the last ones', () => {
    const past = [outline({}), outline({ title: 'Sixty Buns', kind: 'mix_up' })];
    expect(
      repeatsStories(outline({ kind: 'mix_up', title: 'A Phone That Rings' }), past),
    ).toHaveLength(1);
    expect(
      repeatsStories(outline({ kind: 'favour', title: 'Another Tea Table After Dark' }), past),
    ).toHaveLength(1);
    expect(repeatsStories(outline({ kind: 'favour', title: 'A Phone That Rings' }), past)).toEqual(
      [],
    );
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
      companion: null,
      progress: START,
    } satisfies Learner;
    expect(stageFor(base)).toBe('visitor');
    expect(stageFor({ ...base, arrival: arrival({ level: 4 }) })).toBe('regular');
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
    expect(stageFor({ ...base, arrival: arrival({ level: 4 }), model })).toBe('regular');
    expect(
      stageFor({
        ...base,
        arrival: arrival({ level: 4 }),
        model: { ...model, confidence: 'high' },
      }),
    ).toBe('newcomer');
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
  it('gives a struggling newcomer the rescues and a fluent one the follow-ups', () => {
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
    expect(pickLane(['My name is Lan', 'Coffee please'], 'newcomer')).toBe('planned');
    expect(pickLane(["It's good.", 'Yes.'], 'newcomer')).toBe('planned');
    expect(pickLane(['Sorry, again?', 'I... coffee'], 'newcomer')).toBe('simple');
  });

  it('tells the actor the beat, its feedback, when to move on, the limit and the control line', () => {
    const plan = firstMoment('linh', 'Lan', 'visitor', 'vi', 15);
    const s = { beat: 0, beatTurns: 0, lane: 'planned' as const, laneSwitched: false };
    const first = turnDirection(plan, visitor, { ...s, landNow: false, wrapUp: false });
    expect(first.maxWords).toBe(8);
    expect(first.direction).toContain('beat 1 of 4');
    expect(first.direction).toContain('go on to the next beat');
    expect(first.direction).toContain('"gloss"');
    const task = turnDirection(plan, visitor, { ...s, beat: 2, landNow: false, wrapUp: false });
    expect(task.direction).toContain('do not correct anything now');
    const stuck = turnDirection(plan, visitor, {
      ...s,
      beatTurns: 2,
      landNow: false,
      wrapUp: false,
    });
    expect(stuck.direction).toContain('rescue');
    const last = turnDirection(plan, visitor, { ...s, beat: 4, landNow: false, wrapUp: false });
    expect(last.direction).toContain('The beats are done');
    const wrap = turnDirection(plan, visitor, { ...s, beat: 1, landNow: false, wrapUp: true });
    expect(wrap.direction).toContain('Time is nearly up');
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
