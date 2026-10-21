import type { Id, Stage } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import { getScene } from './catalogue';
import {
  MAX_ASKS,
  reduceScene,
  resumeScene,
  sceneReducer,
  startScene,
  type SceneEffect,
  type SceneEvent,
  type Step,
} from './runner';
import type { Scene } from './types';

const E1 = getScene('s1-e1');

/** Runs the scene with fine answers until `beatId` is current. */
const driveTo = (scene: Scene, stage: Stage, beatId: Id): Step => {
  let step = startScene(scene, stage);
  for (let n = 0; n < 200 && step.state.beatId !== beatId; n++) {
    const { phase } = step.state;
    const event: SceneEvent =
      phase === 'playing'
        ? { type: 'rec_played' }
        : phase === 'listening'
          ? { type: 'fine' }
          : { type: 'gen_done' };
    step = reduceScene(scene, step.state, event);
  }
  expect(step.state.beatId).toBe(beatId);
  return step;
};

const send = (scene: Scene, step: Step, ...events: SceneEvent['type'][]): Step =>
  events.reduce((s, type) => reduceScene(scene, s.state, { type }), step);

const types = (effects: readonly SceneEffect[]) => effects.map((e) => e.type);

describe('scene runner', () => {
  it("opens the episode with Mei's recorded line", () => {
    const { state, effects } = startScene(E1, 'newcomer');
    expect(state).toMatchObject({ beatId: 'open', phase: 'playing' });
    expect(effects).toEqual([
      { type: 'beat_changed', beatId: 'open', progress: 0 },
      expect.objectContaining({
        type: 'play_rec',
        lineId: 's1-e1-02',
        character: 'mei',
        recorded: true,
        caption: "Oh! Hi, you two. Sorry, I'm a bit… Sit, sit. Kaya toast?",
      }),
    ]);
  });

  it('asks a target error back once, then takes the second try either way', () => {
    const asking = driveTo(E1, 'newcomer', 'ask-whats-wrong');
    const corrected = send(E1, asking, 'target_error');
    expect(corrected.effects).toEqual([
      { type: 'correction', beatId: 'ask-whats-wrong', speaker: 'mei' },
    ]);
    expect(corrected.state).toMatchObject({ phase: 'listening', correcting: true });
    const moved = send(E1, corrected, 'target_error');
    expect(moved.state).toMatchObject({ beatId: 'mei-deflects', phase: 'speaking' });
  });

  it('hints after silence at Newcomer, twice, then moves on with the fallback line', () => {
    const asking = driveTo(E1, 'newcomer', 'ask-whats-wrong');
    const hinted = send(E1, asking, 'silent');
    expect(hinted.effects).toEqual([
      {
        type: 'hint',
        beatId: 'ask-whats-wrong',
        hint: {
          en: "What's wrong?",
          glosses: { vi: { text: 'Có chuyện gì vậy?', reviewed: true } },
        },
      },
    ]);
    const again = send(E1, hinted, 'silent');
    expect(types(again.effects)).toEqual(['hint']);
    const fallback = send(E1, again, 'silent');
    expect(fallback.state.phase).toBe('fallback');
    expect(fallback.effects).toEqual([
      expect.objectContaining({ type: 'gen', purpose: 'fallback', speaker: 'pip' }),
    ]);
    expect(send(E1, fallback, 'gen_done').state.beatId).toBe('mei-deflects');
  });

  it('nudges instead of hinting at Regular, but hints when asked', () => {
    const asking = driveTo(E1, 'regular', 'ask-whats-wrong');
    expect(send(E1, asking, 'silent').effects).toEqual([
      expect.objectContaining({ type: 'gen', purpose: 'nudge', speaker: 'mei' }),
    ]);
    expect(types(send(E1, asking, 'hint_request').effects)).toEqual(['hint']);
  });

  it("shows the letter even when Mei's deflection meets only silence", () => {
    const deflecting = send(E1, driveTo(E1, 'newcomer', 'mei-deflects'), 'gen_done');
    const fallback = send(E1, deflecting, 'silent', 'silent', 'silent');
    expect(fallback.effects).toEqual([
      expect.objectContaining({ type: 'gen', purpose: 'fallback', speaker: 'mei' }),
    ]);
    const letter = send(E1, fallback, 'gen_done');
    expect(types(letter.effects)).toEqual(['beat_changed', 'show_ui', 'beat_changed', 'play_rec']);
    expect(letter.effects[1]).toMatchObject({ ui: { type: 'letter' } });
    expect(letter.state.beatId).toBe('double');
  });

  it('lets Mei deflect twice from Neighbour', () => {
    const after = (stage: Stage) =>
      send(E1, driveTo(E1, stage, 'mei-deflects'), 'gen_done', 'fine').state.beatId;
    expect(after('newcomer')).toBe('mei-shows-letter');
    expect(after('neighbour')).toBe('mei-deflects-again');
  });

  it('always resolves the office call to a Friday meeting', () => {
    for (const stage of ['newcomer', 'neighbour', 'regular', 'local', 'voice'] as const) {
      const resolving = driveTo(E1, stage, 'office-resolves');
      expect(resolving.effects.at(-1)).toMatchObject({
        type: 'gen',
        purpose: 'line',
        speaker: 'office',
        resolution: 'Mei has a meeting at the property office on Friday.',
      });
    }
  });

  it('runs the Pass it on rounds on stage timers, closed by the timer', () => {
    const practice = getScene('s1-e1-practice');
    const ring = (stage: Stage) => {
      const round = send(practice, driveTo(practice, stage, 'pip-asks'), 'gen_done');
      return round.effects.find((e) => e.type === 'show_ui');
    };
    expect(ring('newcomer')).toMatchObject({ ui: { type: 'timer', seconds: 90 } });
    expect(ring('neighbour')).toMatchObject({ ui: { type: 'timer', seconds: 75 } });
    expect(ring('regular')).toMatchObject({ ui: { type: 'timer', seconds: 60 } });

    const round = driveTo(practice, 'newcomer', 'round-1');
    const next = send(practice, round, 'timer_end');
    expect(next.effects[1]).toMatchObject({ ui: { type: 'fluency_mirror', round: 1 } });
    expect(next.state.beatId).toBe('linh-asks');
    // Fluency rounds recast errors silently: no correction.
    expect(send(practice, round, 'target_error').state.beatId).toBe('linh-asks');
  });

  it('explains "goes funny" from the written meaning without leaving the line', () => {
    const playing = driveTo(E1, 'newcomer', 'ask-call');
    const { state, effects } = send(E1, playing, 'meaning_request');
    expect(state).toEqual(playing.state);
    expect(effects).toHaveLength(1);
    expect(effects[0]).toMatchObject({ type: 'gen', purpose: 'meaning', speaker: 'pip' });
    const meaning = effects[0]?.type === 'gen' ? effects[0].meaning : null;
    expect(meaning?.lineId).toBe('s1-e1-06');
    expect(meaning?.known?.simple).toContain('Goes funny');
  });

  it('counts asking more than the limit as a silence', () => {
    const asking = driveTo(E1, 'newcomer', 'teach-rent');
    const asked = send(E1, asking, ...Array<'meaning_request'>(MAX_ASKS).fill('meaning_request'));
    expect(asked.state).toMatchObject({ asks: MAX_ASKS, tries: 0 });
    const over = send(E1, asked, 'meaning_request');
    expect(over.state.tries).toBe(1);
    expect(types(over.effects)).toEqual(['hint']);
  });

  it("speaks Pip's pending lines with TTS until they are recorded, and hints its fix", () => {
    const voicemail = getScene('s1-e1-voicemail');
    const oops = driveTo(voicemail, 'newcomer', 'oops');
    expect(oops.effects.at(-1)).toMatchObject({
      type: 'play_rec',
      lineId: 's1-e1-vm-oops',
      recorded: false,
      caption: 'Oh! And today at the café, a customer came in, and I said: Can I helping you?',
    });
    const fixing = send(voicemail, oops, 'rec_played');
    expect(types(send(voicemail, fixing, 'target_error').effects)).toEqual(['hint']);
    const fallback = send(voicemail, fixing, 'target_error', 'target_error', 'target_error');
    expect(fallback.state.phase).toBe('fallback');
    const leaf = send(voicemail, fallback, 'gen_done');
    expect(leaf.effects[1]).toMatchObject({ ui: { type: 'phrase_grows', phrase: 'can-i-help' } });
    expect(leaf.state.beatId).toBe('thanks');
  });

  it('resumes a dropped call on the same beat', () => {
    const playing = driveTo(E1, 'newcomer', 'rent-question');
    const copy = JSON.parse(JSON.stringify(playing.state)) as typeof playing.state;
    expect(resumeScene(E1, copy).effects).toEqual(playing.effects.slice(-2));

    const practice = getScene('s1-e1-practice');
    const listening = driveTo(practice, 'newcomer', 'round-2');
    expect(resumeScene(practice, listening.state)).toEqual({
      state: listening.state,
      effects: [
        { type: 'beat_changed', beatId: 'round-2', progress: expect.any(Number) as number },
        { type: 'show_ui', beatId: 'round-2', ui: { type: 'timer', seconds: 60 } },
      ],
    });
  });

  it('ignores events that do not fit the phase, and everything after the end', () => {
    const start = startScene(E1, 'newcomer');
    expect(send(E1, start, 'fine', 'silent', 'gen_done', 'timer_end').state).toEqual(start.state);

    const closing = driveTo(E1, 'newcomer', 'close');
    const end = send(E1, closing, 'rec_played');
    expect(end.effects).toEqual([{ type: 'scene_end', reason: 'complete' }]);
    expect(end.state).toMatchObject({ phase: 'ended', beatId: null });
    expect(send(E1, end, 'fine').effects).toEqual([]);
  });

  it('reduces over the catalogue by the scene the state names', () => {
    const start = startScene(E1, 'newcomer');
    expect(sceneReducer(start.state, { type: 'rec_played' })).toEqual(
      reduceScene(E1, start.state, { type: 'rec_played' }),
    );
  });
});
