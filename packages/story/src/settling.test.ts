import type { Id, Stage } from '@yapling/contracts';
import { SETTLING_PHRASES, SETTLING_SCENES, settlingCanDoFor } from '@yapling/domain';
import { describe, expect, it } from 'vitest';

import { findPhrase, getScene } from './catalogue';
import {
  GENEROUS_AFTER,
  reduceScene,
  resumeScene,
  startScene,
  type RunnerState,
  type SceneEffect,
  type SceneEvent,
  type Step,
} from './runner';
import { SEASON_1 } from './season-1';
import type { Scene } from './types';

type Turn = SceneEvent['type'];

/** Plays a scene: playback events answered, each turn given the next of `perTurn`'s events. */
const play = (scene: Scene, stage: Stage, perTurn: readonly Turn[], bound = 400) => {
  let step: Step = startScene(scene, stage);
  const effects: SceneEffect[] = [...step.effects];
  const passes: string[] = [];
  let turnBeat: Id | null = null;
  let i = 0;
  for (let n = 0; n < bound && step.state.phase !== 'ended'; n++) {
    const { state } = step;
    if (state.phase === 'listening' && state.beatId !== turnBeat) {
      turnBeat = state.beatId;
      i = 0;
    }
    const type: Turn =
      state.phase === 'playing'
        ? 'rec_played'
        : state.phase === 'listening'
          ? (perTurn[Math.min(i++, perTurn.length - 1)] ?? 'fine')
          : 'gen_done';
    // Every state is plain JSON: a resumed call carries on from a copy.
    step = reduceScene(scene, JSON.parse(JSON.stringify(state)) as RunnerState, { type });
    effects.push(...step.effects);
    const last = step.state.lastTurn;
    if (last && JSON.stringify(last) !== JSON.stringify(state.lastTurn)) passes.push(last.pass);
  }
  return { ended: step.state.phase === 'ended', effects, passes, state: step.state };
};

const turnsOf = (scene: Scene) =>
  scene.beats.filter((b) => (b.kind === 'learner' || b.kind === 'gen') && b.answer !== null);

/** Runs until the learner is asked at `beatId`, answering every earlier turn with a match. */
const driveTo = (scene: Scene, beatId: Id, stage: Stage = 'visitor'): Step => {
  let step = startScene(scene, stage);
  for (
    let n = 0;
    n < 200 && !(step.state.beatId === beatId && step.state.phase === 'listening');
    n++
  ) {
    const { phase } = step.state;
    const type: Turn =
      phase === 'playing' ? 'rec_played' : phase === 'listening' ? 'fine' : 'gen_done';
    step = reduceScene(scene, step.state, { type });
  }
  expect(step.state).toMatchObject({ beatId, phase: 'listening' });
  return step;
};

const send = (scene: Scene, step: Step, ...events: Turn[]): Step =>
  events.reduce((s, type) => reduceScene(scene, s.state, { type }), step);

const types = (effects: readonly SceneEffect[]) => effects.map((e) => e.type);

const SET = SEASON_1.settling;

describe('Settling in', () => {
  it('has the six chapters the learning model names, with their can-dos and phrases', () => {
    expect(SET.map((s) => s.id)).toEqual([...SETTLING_SCENES]);
    SET.forEach((scene, i) => {
      const chapter = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6;
      expect(scene.kind).toBe('settling');
      expect(scene.canDos).toEqual([settlingCanDoFor(chapter)?.id]);
      const seeded = SETTLING_PHRASES.filter((p) => p.chapter === chapter).map((p) => p.id);
      for (const id of seeded) expect(scene.phrases).toContain(id);
    });
    for (const { id } of SETTLING_PHRASES) {
      expect(findPhrase(id)?.glosses.vi?.text.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('keeps every chapter to 3–5 turns, each with one or two cards and words to match', () => {
    for (const scene of SET) {
      const turns = turnsOf(scene);
      expect(turns.length, scene.id).toBeGreaterThanOrEqual(3);
      expect(turns.length, scene.id).toBeLessThanOrEqual(5);
      for (const beat of turns) {
        const answer = beat.kind === 'learner' ? beat.answer : null;
        expect(answer?.choices.length).toBeGreaterThanOrEqual(1);
        expect(answer?.accept.length).toBeGreaterThan(0);
        expect(answer?.showHint).toBe('always');
      }
    }
  });

  const kinds: Record<string, readonly Turn[]> = {
    'a word match': ['fine'],
    'two English misses': ['unclear', 'unclear'],
    'Vietnamese, then the card': ['not_english', 'not_english', 'fine'],
    'again, then the card': ['repeat_request', 'fine'],
    'slowly, then the card': ['slower_request', 'fine'],
    'a skip after a try': ['unclear', 'skip'],
    'a skip straight away': ['skip'],
    'asking for help, then the card': ['hint_request', 'fine'],
  };

  describe.each(SET.map((s) => [s.id, s] as const))('%s', (_id, scene) => {
    for (const [name, perTurn] of Object.entries(kinds)) {
      it(`ends with ${name} on every turn`, () => {
        const run = play(scene, 'visitor', perTurn);
        expect(run.ended).toBe(true);
        expect(run.effects.filter((e) => e.type === 'scene_end')).toHaveLength(1);
        // Nothing the learner does brings the model's fallback or a nudge.
        expect(
          run.effects.filter((e) => e.type === 'gen' && e.purpose !== 'line').map((e) => e.type),
        ).toEqual([]);
      });
    }

    it('passes every turn on two English misses, generously', () => {
      const run = play(scene, 'visitor', ['unclear', 'unclear']);
      expect(run.passes).toEqual(turnsOf(scene).map(() => 'generous'));
    });

    it('passes every turn on a match, and counts a skip as a skip', () => {
      expect(play(scene, 'visitor', ['fine']).passes.every((p) => p === 'match')).toBe(true);
      expect(play(scene, 'visitor', ['skip']).passes.every((p) => p === 'skip')).toBe(true);
    });

    it('waits through a long silence on its first turn: no try, no fallback, no extra card', () => {
      const first = turnsOf(scene)[0];
      if (!first) throw new Error('no turn');
      const asking = driveTo(scene, first.id);
      const quiet = send(scene, asking, ...Array<Turn>(60).fill('silent'));
      expect(quiet.state).toMatchObject({ beatId: first.id, phase: 'listening', tries: 0 });
      let step = asking;
      for (let n = 0; n < 60; n++) {
        step = send(scene, step, 'silent');
        expect(step.effects).toEqual([]);
      }
    });

    it('never counts Vietnamese, again or slowly as a try', () => {
      const first = turnsOf(scene)[0];
      if (!first) throw new Error('no turn');
      const asking = driveTo(scene, first.id);
      const after = send(scene, asking, 'not_english', 'not_english', 'not_english');
      expect(after.state).toMatchObject({ beatId: first.id, phase: 'listening', tries: 0 });
    });
  });

  it('shows the cards from the start, glossed, staying up, with the line that says them', () => {
    const scene = getScene('s1-set1');
    const asking = driveTo(scene, 'say-name');
    const card = asking.effects.find((e) => e.type === 'hint');
    expect(card).toEqual({
      type: 'hint',
      beatId: 'say-name',
      hint: { en: "I'm {name}.", glosses: { vi: { text: 'Mình là {name}.', reviewed: false } } },
      choices: [
        { en: "I'm {name}.", glosses: { vi: { text: 'Mình là {name}.', reviewed: false } } },
      ],
      modelLineId: 's1-set1-04',
      persistent: true,
    });
    expect(asking.state.hinted).toBe(true);
    // A resumed call puts the card back up.
    expect(types(resumeScene(scene, asking.state).effects)).toEqual(['beat_changed', 'hint']);
  });

  it('plays the recorded lines, in Vietnamese for Linh’s', () => {
    const scene = getScene('s1-set1');
    const hi = startScene(scene, 'visitor');
    expect(hi.effects.at(-1)).toMatchObject({
      type: 'play_rec',
      lineId: 's1-set1-01',
      caption: "Hi! I'm Linh.",
      recorded: true,
    });
    const vi = send(scene, hi, 'rec_played');
    expect(vi.effects.at(-1)).toMatchObject({
      lineId: 's1-set1-02',
      language: 'vi',
      recorded: true,
    });
  });

  it('asks again after an English miss, then passes on the second one with the right words', () => {
    const scene = getScene('s1-set4');
    const asking = driveTo(scene, 'which-bus-answer');
    const miss = send(scene, asking, 'unclear');
    expect(miss.state).toMatchObject({ beatId: 'which-bus-answer', tries: 1, phase: 'listening' });
    expect(miss.effects).toEqual([
      expect.objectContaining({ type: 'say', speaker: 'linh', lineId: 's1-set-linh-again' }),
      expect.objectContaining({ type: 'play_rec', lineId: 's1-set4-03' }),
    ]);
    const pass = send(scene, miss, 'unclear');
    expect(pass.effects[0]).toMatchObject({
      type: 'say',
      speaker: 'linh',
      text: 'Forty-five.',
      lineId: null,
    });
    expect(pass.state).toMatchObject({
      beatId: 'bea-nine',
      lastTurn: { beatId: 'which-bus-answer', pass: 'generous' },
    });
    expect(GENEROUS_AFTER).toBe(2);
  });

  it('has someone without a recorded “Again?” say it with the live voice', () => {
    const scene = getScene('s1-set5');
    const miss = send(scene, driveTo(scene, 'say-hi'), 'unclear');
    expect(miss.effects[0]).toMatchObject({
      type: 'say',
      speaker: 'mei',
      text: 'Again?',
      lineId: null,
      glosses: { vi: { text: 'Nói lại nhé?' } },
    });
  });

  it('praises a match from the listener’s pool, then goes on', () => {
    const scene = getScene('s1-set1');
    const passed = send(scene, driveTo(scene, 'say-name'), 'fine');
    expect(passed.effects[0]).toMatchObject({ type: 'say', speaker: 'linh' });
    expect(['s1-set-linh-great', 's1-set-linh-yes']).toContain(
      passed.effects[0]?.type === 'say' ? passed.effects[0].lineId : null,
    );
    expect(passed.state.beatId).toBe('nice-to-meet');
  });

  it('asks for English once a chapter after a Vietnamese answer, where Linh is there', () => {
    const scene = getScene('s1-set2');
    const asking = driveTo(scene, 'yes-or-no');
    const once = send(scene, asking, 'not_english');
    expect(once.effects).toEqual([
      expect.objectContaining({ type: 'say', lineId: 's1-set-linh-english', language: 'vi' }),
    ]);
    expect(send(scene, once, 'not_english').effects).toEqual([]);
    // Still asked for in this chapter at the next turn.
    const later = send(scene, once, 'fine', 'rec_played', 'rec_played', 'not_english');
    expect(later.state.beatId).toBe('books-or-clothes-answer');
    expect(later.effects).toEqual([]);
    // No Linh at Mei's café: nothing at all.
    const cafe = getScene('s1-set5');
    expect(send(cafe, driveTo(cafe, 'say-hi'), 'not_english').effects).toEqual([]);
  });

  it('replays the last line for again, and slower after "Sure. Slowly." for slowly', () => {
    const scene = getScene('s1-set4');
    const asking = driveTo(scene, 'what-time-answer');
    const again = send(scene, asking, 'repeat_request');
    expect(again.effects).toEqual([
      expect.objectContaining({ type: 'play_rec', lineId: 's1-set4-05' }),
    ]);
    expect(again.effects[0]).not.toHaveProperty('slower');
    const slowly = send(scene, asking, 'slower_request');
    expect(slowly.effects).toEqual([
      expect.objectContaining({ type: 'say', lineId: 's1-set-linh-slowly' }),
      expect.objectContaining({ type: 'play_rec', lineId: 's1-set4-05', slower: true }),
    ]);
    for (const s of [again, slowly]) {
      expect(s.state).toMatchObject({ beatId: 'what-time-answer', tries: 0, phase: 'listening' });
      // The replay finishing changes nothing: the learner answers when ready.
      expect(send(scene, s, 'rec_played').state).toEqual(s.state);
    }
  });

  it('takes "Sorry? Again, please." as the answer where it is the lesson', () => {
    const scene = getScene('s1-set3');
    const passed = send(scene, driveTo(scene, 'say-again'), 'repeat_request');
    expect(passed.state.beatId).toBe('model-slowly');
    expect(passed.state.lastTurn).toEqual({ beatId: 'say-again', pass: 'match' });
  });

  it('has Pip say its fast line again, slower, when asked, and that is the turn', () => {
    const scene = getScene('s1-set3');
    const asking = driveTo(scene, 'use-a-lifesaver');
    const slower = send(scene, asking, 'slower_request');
    expect(slower.effects).toEqual([
      expect.objectContaining({ type: 'say', lineId: 's1-set-pip-slowly' }),
      expect.objectContaining({ type: 'play_rec', lineId: 's1-set3-04', slower: true }),
    ]);
    expect(slower.state).toMatchObject({ beatId: 'use-a-lifesaver', phase: 'playing' });
    const next = send(scene, slower, 'rec_played');
    expect(next.state).toMatchObject({ beatId: 'pip-slow', phase: 'playing' });
    // Dropped mid-replay: the turn had passed, so the call goes on.
    expect(resumeScene(scene, slower.state).state.beatId).toBe('pip-slow');
  });

  it('has Bea say the price again, slower, after “Of course, love.”', () => {
    const scene = getScene('s1-set4');
    const asked = send(scene, driveTo(scene, 'tickets-price'), 'repeat_request');
    expect(asked.effects).toEqual([
      expect.objectContaining({ type: 'say', lineId: 's1-set-bea-slowly' }),
      expect.objectContaining({ type: 'play_rec', lineId: 's1-set4-06', slower: true }),
    ]);
    expect(send(scene, asked, 'rec_played').state.beatId).toBe('how-many');
  });

  it("moves on from a skip with “That's okay!”", () => {
    const scene = getScene('s1-set1');
    const skipped = send(scene, driveTo(scene, 'say-name'), 'unclear', 'skip');
    expect(skipped.effects[0]).toMatchObject({ type: 'say', lineId: 's1-set-linh-skip' });
    expect(skipped.state).toMatchObject({
      beatId: 'nice-to-meet',
      lastTurn: { beatId: 'say-name', pass: 'skip' },
    });
    const cafe = getScene('s1-set5');
    expect(send(cafe, driveTo(cafe, 'say-hi'), 'skip').effects[0]).toMatchObject({
      type: 'say',
      speaker: 'mei',
      text: "That's okay!",
      lineId: null,
    });
  });

  it('has Linh offer to say it together when the learner asks for help', () => {
    const scene = getScene('s1-set1');
    const helped = send(scene, driveTo(scene, 'say-nice'), 'hint_request');
    expect(helped.effects).toEqual([
      expect.objectContaining({ type: 'say', lineId: 's1-set-linh-together' }),
      expect.objectContaining({ type: 'play_rec', lineId: 's1-set1-05' }),
    ]);
    expect(helped.state.tries).toBe(0);
  });

  it('ends Chapter 6 with the letter under the café door', () => {
    const run = play(getScene('s1-set6'), 'visitor', ['fine']);
    const ui = run.effects.flatMap((e) => (e.type === 'show_ui' ? [e.ui.type] : []));
    expect(ui).toEqual(['dusk_letter']);
    expect(run.effects.filter((e) => e.type === 'gen').map((e) => e.type)).toHaveLength(3);
  });
});
