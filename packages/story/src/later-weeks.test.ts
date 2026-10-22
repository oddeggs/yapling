import { RESIDENCY_STAGES, type Stage } from '@yapling/contracts';
import { ringSceneOf, storyWeekPlan, type SeasonWeeks } from '@yapling/domain';
import { describe, expect, it } from 'vitest';

import { EPISODES, getScene } from './catalogue';
import { checkSceneLevel } from './level-check';
import { findLine } from './lines';
import { PENDING_LINES } from './lines.generated';
import { activeBeats, reduceScene, startScene, type SceneEvent, type Step } from './runner';
import { SEASON_1 } from './season-1';
import { listeningSceneProblems, seasonProblems, weekProblems } from './season-checks';
import { seasonWeeks, type Answer, type Beat, type Scene } from './types';
import { validateScene, visitorLineProblems, VISITOR_MAX_WORDS, wordCount } from './validate';

/*
 * The weeks after the first: Episodes 2–6 with their real-week and practice calls, stories,
 * postcards and voicemails, and the festival week. Every scene ends for every kind of answer at
 * Visitor, Newcomer and Regular, and the weeks read the way the learning model reads them.
 */

const LATER = EPISODES.slice(1);
const LATER_SCENES: readonly Scene[] = [
  ...LATER.flatMap((e) => e.scenes),
  ...(SEASON_1.festival?.scenes ?? []),
];
const STAGES_UNDER_TEST: readonly Stage[] = ['visitor', 'newcomer', 'regular'];

const answerOf = (beat: Beat): Answer | null =>
  beat.kind === 'learner' || beat.kind === 'gen' ? beat.answer : null;

type Kind = SceneEvent['type'];

/**
 * Plays a scene, answering every turn the same way: `first` once, then `then` for as long as the
 * turn lasts. The kinds that never move a turn on (a quiet, Vietnamese, "again") go first.
 */
const play = (scene: Scene, stage: Stage, first: Kind, then: Kind = first) => {
  let step: Step = startScene(scene, stage);
  let turn: string | null = null;
  const bound = scene.beats.length * 24 + 8;
  for (let n = 0; n < bound && step.state.phase !== 'ended'; n++) {
    const { phase, beatId } = step.state;
    let type: Kind;
    if (phase === 'playing') type = 'rec_played';
    else if (phase === 'listening') {
      type = beatId === turn ? then : first;
      turn = beatId;
    } else type = 'gen_done';
    step = reduceScene(scene, JSON.parse(JSON.stringify(step.state)) as typeof step.state, {
      type,
    });
  }
  return step.state.phase === 'ended';
};

/** Every kind of answer, as `[name, first, then]`. */
const ANSWER_KINDS: readonly (readonly [string, Kind, Kind])[] = [
  ['fine', 'fine', 'fine'],
  ['target errors', 'target_error', 'target_error'],
  ['unclear tries', 'unclear', 'unclear'],
  ['skips', 'skip', 'skip'],
  ['hint requests', 'hint_request', 'hint_request'],
  ['meaning requests', 'meaning_request', 'meaning_request'],
  ['a quiet, then fine', 'silent', 'fine'],
  ['Vietnamese, then unclear', 'not_english', 'unclear'],
  ['"again", then fine', 'repeat_request', 'fine'],
  ['"slowly", then unclear', 'slower_request', 'unclear'],
  ['the timer, then fine', 'timer_end', 'fine'],
];

describe.each(LATER_SCENES.map((s) => [s.id, s] as const))('scene %s', (_id, scene) => {
  it('is valid and written in full', () => {
    expect(validateScene(scene)).toEqual([]);
    expect(scene.draft).toBe(false);
    expect(scene.beats.filter((b) => b.draft === true)).toEqual([]);
  });

  for (const stage of STAGES_UNDER_TEST) {
    it.each(ANSWER_KINDS)(`ends at ${stage} with %s`, (_name, first, then) => {
      expect(play(scene, stage, first, then)).toBe(true);
    });
  }

  it('keeps the level guide’s hard rules', () => {
    expect(checkSceneLevel(scene).filter((p) => p.severity === 'error')).toEqual([]);
  });
});

describe('Episodes 2–6', () => {
  it.each(LATER.map((e) => [e.id, e] as const))('%s is final, with its week', (_id, episode) => {
    expect(episode.draft).toBe(false);
    expect(weekProblems(episode, { ring: true })).toEqual([]);
    const day = (kind: Scene['kind']) =>
      episode.week.filter((s) => getScene(s.scene).kind === kind).map((s) => s.day);
    expect(day('episode')).toEqual([1]);
    expect(day('real_week')).toEqual([3]);
    expect(day('practice')).toEqual([4]);
    expect(day('story')).toEqual([2]);
    expect(day('voicemail')).toEqual([5]);
    expect(episode.lines).toContain(episode.cliffhanger);
    for (const id of episode.lines) expect(findLine(id), id).toBeDefined();
  });

  it('keeps the whole season sound: weeks, listening scenes, Pip’s minute lines', () => {
    expect(seasonProblems(SEASON_1)).toEqual([]);
  });

  it('plays listening scenes from written lines only, the same at every stage', () => {
    for (const scene of LATER_SCENES.filter((s) =>
      ['story', 'postcard', 'voicemail'].includes(s.kind),
    )) {
      expect(listeningSceneProblems(scene), scene.id).toEqual([]);
      expect(
        scene.beats.every((b) => b.kind === 'rec' || b.kind === 'ui'),
        scene.id,
      ).toBe(true);
      expect(scene.beats.every((b) => b.minStage === undefined && b.maxStage === undefined)).toBe(
        true,
      );
    }
  });

  it('flags a week without its three ring scenes', () => {
    const e2 = LATER[0]!;
    const without = { ...e2, week: e2.week.filter((s) => s.scene !== 's1-e2-practice') };
    expect(weekProblems(without, { ring: true })).toEqual([
      's1-e2: 0 practice scenes in its week (one wanted)',
    ]);
  });

  it('flags a generated line in a story', () => {
    const story = getScene('s1-e1-real-week');
    expect(listeningSceneProblems({ ...story, kind: 'story' })[0]).toMatch(/a gen beat in a story/);
  });
});

describe('Visitor and Newcomer beats', () => {
  const calls = LATER_SCENES.filter((s) => !['story', 'postcard', 'voicemail'].includes(s.kind));

  it.each(calls.map((s) => [s.id, s] as const))(
    '%s splits cleanly by stage: Visitor beats are named so, and only Visitors play them',
    (_id, scene) => {
      for (const beat of scene.beats) {
        expect(beat.maxStage === 'visitor', `${scene.id}/${beat.id}`).toBe(
          beat.id.endsWith('-visitor'),
        );
      }
      for (const stage of RESIDENCY_STAGES) {
        expect(activeBeats(scene, stage).filter((b) => b.id.endsWith('-visitor'))).toEqual([]);
      }
      const visitor = activeBeats(scene, 'visitor');
      expect(visitor.some((b) => b.maxStage === 'visitor')).toBe(true);
      expect(visitor.filter((b) => b.minStage === 'newcomer')).toEqual([]);
    },
  );

  it('gives every Visitor turn cards from the start, at most two, with Vietnamese', () => {
    for (const scene of calls) {
      for (const beat of activeBeats(scene, 'visitor')) {
        const answer = answerOf(beat);
        if (!answer) continue;
        const where = `${scene.id}/${beat.id}`;
        const hint = answer.exits.silent.hint;
        expect(hint, where).not.toBeNull();
        if (answer.timer !== null && answer.accept.length === 0) {
          // Pass it on: the frame in English only, and the timer ends the round.
          expect(hint?.glosses, where).toEqual({});
          continue;
        }
        expect(answer.accept.length, where).toBeGreaterThan(0);
        expect(answer.showHint, where).toBe('always');
        expect(answer.choices.length, where).toBeGreaterThan(0);
        expect(answer.choices.length, where).toBeLessThanOrEqual(2);
        for (const c of answer.choices)
          expect(c.glosses.vi?.text.length ?? 0, where).toBeGreaterThan(0);
      }
    }
  });

  it(`keeps every Visitor character line to ${VISITOR_MAX_WORDS} words`, () => {
    for (const scene of calls) {
      for (const beat of scene.beats.filter((b) => b.maxStage === 'visitor')) {
        if (beat.kind === 'rec') expect(visitorLineProblems(beat.line), beat.id).toEqual([]);
        if (beat.kind === 'gen' && beat.example !== null) {
          expect(wordCount(beat.example), `${scene.id}/${beat.id}`).toBeLessThanOrEqual(
            VISITOR_MAX_WORDS,
          );
        }
      }
    }
  });

  it('gives every Newcomer turn a hint, with Vietnamese except in timed rounds and checks', () => {
    for (const scene of calls) {
      for (const beat of activeBeats(scene, 'newcomer')) {
        const answer = answerOf(beat);
        if (!answer) continue;
        const hint = answer.exits.silent.hint;
        expect(hint, `${scene.id}/${beat.id}`).not.toBeNull();
        const englishOnly = answer.timer !== null || answer.accept.length > 0;
        if (!englishOnly)
          expect(hint?.glosses.vi?.text.length ?? 0, `${scene.id}/${beat.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("plays Hank's opener in the take for each stage", () => {
    const opener = (stage: Stage) =>
      activeBeats(getScene('s1-e3'), stage).find((b) => b.kind === 'rec');
    const line = (stage: Stage) => {
      const beat = opener(stage);
      return beat?.kind === 'rec' ? beat.line : null;
    };
    expect(line('visitor')).toBe('s1-e3-visitor-hank');
    expect(line('newcomer')).toBe('s1-e3-01');
    expect(line('neighbour')).toBe('s1-e3-10');
    expect(line('regular')).toBe('s1-e3-11');
    expect(line('local')).toBe('s1-e3-02');
    const twist = (stage: Stage) =>
      activeBeats(getScene('s1-e3'), stage).flatMap((b) =>
        b.kind === 'rec' && b.id.startsWith('twist') ? [b.line] : [],
      );
    expect(twist('neighbour')).toEqual(['s1-e3-09']);
    expect(twist('regular')).toEqual(['s1-e3-06']);
  });

  it('runs the petition stops in 20, 20 and 15 seconds at Visitor, and 90/60/45 at Newcomer', () => {
    const rings = (stage: Stage) => {
      const out: number[] = [];
      const scene = getScene('s1-e5');
      let step = startScene(scene, stage);
      for (let n = 0; n < 400 && step.state.phase !== 'ended'; n++) {
        for (const e of step.effects)
          if (e.type === 'show_ui' && e.ui.type === 'timer') out.push(e.ui.seconds);
        const { phase, beatId } = step.state;
        const beat = scene.beats.find((b) => b.id === beatId);
        const timed = beat !== undefined && answerOf(beat)?.timer != null;
        step = reduceScene(scene, step.state, {
          type:
            phase === 'listening'
              ? timed
                ? 'timer_end'
                : 'fine'
              : phase === 'playing'
                ? 'rec_played'
                : 'gen_done',
        });
      }
      return out;
    };
    expect(rings('visitor')).toEqual([20, 20, 15]);
    expect(rings('newcomer')).toEqual([90, 60, 45]);
    expect(rings('regular')).toEqual([60, 45, 30]);
  });
});

describe('the weeks as the learning model reads them', () => {
  const weeks: SeasonWeeks = seasonWeeks(SEASON_1);

  it('lists seven weeks: six episodes, then the festival', () => {
    expect(weeks.map((w) => w.id)).toEqual([
      's1-e1',
      's1-e2',
      's1-e3',
      's1-e4',
      's1-e5',
      's1-e6',
      's1-festival',
    ]);
  });

  it('names each episode week’s three ring scenes, and none in the festival', () => {
    for (const [i, week] of weeks.entries()) {
      const festival = i === 6;
      for (const kind of ['episode', 'real_week', 'practice'] as const) {
        const scene = ringSceneOf(week, kind);
        if (festival) expect(scene).toBeNull();
        else expect(getScene(scene ?? '').kind).toBe(kind);
      }
    }
  });

  it('opens week 2 day by day as the script lays it out', () => {
    const plan = storyWeekPlan(weeks[1], 2).map((d) => d.opens.map((o) => o.scene));
    expect(plan).toEqual([
      ['s1-e2', 's1-e2-postcard'],
      ['s1-e2-story'],
      ['s1-e2-real-week'],
      ['s1-e2-practice'],
      ['s1-e2-voicemail'],
      [],
      [],
    ]);
  });

  it('opens the festival’s story, postcard and voicemail, and takes any call in its ring', () => {
    const plan = storyWeekPlan(weeks[6], 7);
    expect(
      plan.flatMap((d) => d.opens.filter((o) => o.ring === null).map((o) => [d.day, o.scene])),
    ).toEqual([
      [2, 's1-fest-story'],
      [3, 's1-fest-postcard'],
      [5, 's1-fest-voicemail'],
    ]);
    expect(plan.flatMap((d) => d.opens.filter((o) => o.ring !== null).map((o) => o.scene))).toEqual(
      [null, null, null],
    );
  });

  it('sends each week’s knocks from the right face: the episode’s first cast member', () => {
    const faces = weeks.slice(1, 6).map((w) => getScene(ringSceneOf(w, 'episode') ?? '').cast[0]);
    expect(faces).toEqual(['pip', 'mei', 'nell', 'bea', 'mei']);
  });
});

describe('recorded lines of the new weeks', () => {
  it('gloss every pending English line in Vietnamese, from the script', () => {
    for (const line of PENDING_LINES) {
      if (line.language !== 'en') continue;
      expect(findLine(line.id)?.glosses.vi?.text.length ?? 0, line.id).toBeGreaterThan(0);
    }
  });

  it('take the gloss written beside the line', () => {
    expect(findLine('s1-e2-visitor-sol-hi')?.glosses.vi).toEqual({
      text: 'Chào! Mình là Sol. Chào mừng đến Hollowbrook!',
      reviewed: false,
    });
  });

  it('use the re-takes, and only the kept twist of the lines they replace', () => {
    const played = new Set(
      LATER_SCENES.flatMap((s) => s.beats.flatMap((b) => (b.kind === 'rec' ? [b.line] : []))),
    );
    for (const id of [
      's1-e2-11',
      's1-e2-12',
      's1-e2-13',
      's1-e3-09',
      's1-e5-09',
      's1-e5-10',
      's1-e5-11',
      's1-e6-10',
      's1-e6-11',
      's1-e6-12',
    ]) {
      expect(played.has(id), id).toBe(true);
    }
    for (const id of [
      's1-e2-04',
      's1-e2-05',
      's1-e2-07',
      's1-e5-01',
      's1-e5-02',
      's1-e5-05',
      's1-e6-01',
      's1-e6-02',
      's1-e6-04',
    ]) {
      expect(played.has(id), id).toBe(false);
    }
    expect(played.has('s1-e3-06')).toBe(true);
    expect(EPISODES.map((e) => e.recap)).toEqual([
      's1-e1-11',
      's1-e2-08',
      's1-e3-12',
      's1-e4-09',
      's1-e5-12',
      's1-e6-06',
    ]);
  });
});
