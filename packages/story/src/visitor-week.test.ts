import { RESIDENCY_STAGES, type Stage } from '@yapling/contracts';
import { placementStage } from '@yapling/domain';
import { describe, expect, it } from 'vitest';

import { getScene, sceneIdForStage } from './catalogue';
import { activeBeats, reduceScene, startScene, type SceneEvent, type Step } from './runner';
import type { Scene } from './types';

/** Plays a scene, answering each turn with `answer(beatId)`; returns the beats it entered. */
const path = (scene: Scene, stage: Stage, answer: (beatId: string) => SceneEvent['type']) => {
  let step: Step = startScene(scene, stage);
  const entered: string[] = [];
  const note = (s: Step) => {
    for (const e of s.effects) if (e.type === 'beat_changed') entered.push(e.beatId);
  };
  note(step);
  for (let n = 0; n < 300 && step.state.phase !== 'ended'; n++) {
    const { phase, beatId } = step.state;
    const type =
      phase === 'playing'
        ? 'rec_played'
        : phase === 'listening'
          ? answer(beatId ?? '')
          : 'gen_done';
    step = reduceScene(scene, step.state, { type });
    note(step);
  }
  expect(step.state.phase).toBe('ended');
  return entered;
};

const ids = (scene: Scene, stage: Stage) => activeBeats(scene, stage).map((b) => b.id);

describe('week 1 for Newcomers and up', () => {
  // The beats each scene played before the Visitor turns were added, stage by stage.
  const before: Record<string, readonly string[]> = {
    's1-e1': [
      'open',
      'notice',
      'ask-whats-wrong',
      'mei-deflects',
      'mei-shows-letter',
      'letter',
      'double',
      'rent-question',
      'teach-rent',
      'notebook',
      'pip-writes',
      'ask-call',
      'agree-to-call',
      'dial',
      'office-answers',
      'office-resolves',
      'hang-up',
      'what-now',
      'advice',
      'mei-warm',
      'pip-job',
      'close',
    ],
    's1-e1-postcard': ['postcard', 'tip'],
    's1-e1-real-week': ['pip-asks', 'intro-1', 'pip-tries', 'pip-again', 'intro-2', 'pip-notes'],
    's1-e1-practice': [
      'pip-asks',
      'round-1',
      'mirror-1',
      'linh-asks',
      'round-2',
      'mirror-2',
      'bea-asks',
      'round-3',
      'mirror-3',
      'bea-thanks',
    ],
    's1-e1-voicemail': ['voicemail', 'news', 'oops', 'fix-pip', 'leaf', 'thanks'],
  };

  it.each(Object.entries(before))('plays %s at Newcomer exactly as before', (id, beats) => {
    expect(ids(getScene(id), 'newcomer')).toEqual(beats);
  });

  it('plays no Visitor beat at any residency stage', () => {
    for (const id of Object.keys(before)) {
      for (const stage of RESIDENCY_STAGES) {
        expect(ids(getScene(id), stage).filter((b) => b.endsWith('-visitor'))).toEqual([]);
      }
    }
  });
});

describe('week 1 for Visitors', () => {
  it('runs the café call on cards: no deflection, the shorter lines, a goodbye to the office', () => {
    expect(ids(getScene('s1-e1'), 'visitor')).toEqual([
      'open',
      'notice',
      'ask-whats-wrong-visitor',
      'mei-shows-letter',
      'letter',
      'double',
      'rent-question-visitor',
      'teach-rent-visitor',
      'notebook',
      'pip-writes',
      'ask-call-visitor',
      'agree-to-call-visitor',
      'dial',
      'office-answers-visitor',
      'office-resolves',
      'office-bye-visitor',
      'hang-up',
      'what-now',
      'advice-visitor',
      'mei-warm',
      'pip-job',
      'close',
    ]);
  });

  it("sends Linh's again postcard, and the fix as a card, as scenes of their own", () => {
    expect(sceneIdForStage('s1-e1-postcard', 'visitor')).toBe('s1-e1-postcard-visitor');
    expect(sceneIdForStage('s1-e1-postcard', 'newcomer')).toBe('s1-e1-postcard');
    expect(sceneIdForStage('s1-e1', 'visitor')).toBe('s1-e1');
    const postcard = getScene(sceneIdForStage('s1-e1-postcard', 'visitor'));
    expect(postcard.beats.map((b) => (b.kind === 'rec' ? b.line : b.kind))).toEqual([
      'ui',
      's1-e1-visitor-postcard',
    ]);
    const voicemail = getScene(sceneIdForStage('s1-e1-voicemail', 'visitor'));
    const fix = voicemail.beats.find((b) => b.id === 'fix-pip');
    expect(fix?.kind === 'learner' ? fix.answer.choices.map((c) => c.en) : null).toEqual([
      'Can I help you?',
    ]);
    // The same shape as the Newcomer voicemail, so the phone plays it the same way.
    expect(voicemail.beats.map((b) => b.id)).toEqual(
      getScene('s1-e1-voicemail').beats.map((b) => b.id),
    );
  });

  it('introduces yourself one untimed line at a time, then all three together', () => {
    const scene = getScene('s1-e1-real-week');
    expect(ids(scene, 'visitor')).toEqual([
      'pip-asks-visitor',
      'intro-hi-visitor',
      'intro-job-visitor',
      'intro-nice-visitor',
      'intro-all-visitor',
      'pip-tries',
      'pip-notes-visitor',
    ]);
    const timers = startScene(scene, 'visitor').effects.filter((e) => e.type === 'show_ui');
    expect(timers).toEqual([]);
  });

  it('runs Pass it on in 30, 25 and 20 seconds, with English cards and no Vietnamese', () => {
    const scene = getScene('s1-e1-practice');
    const rings: number[] = [];
    let step = startScene(scene, 'visitor');
    for (let n = 0; n < 100 && step.state.phase !== 'ended'; n++) {
      for (const e of step.effects) {
        if (e.type === 'show_ui' && e.ui.type === 'timer') rings.push(e.ui.seconds);
        if (e.type === 'hint') {
          expect(e.persistent).toBe(true);
          for (const c of e.choices ?? []) expect(c.glosses).toEqual({});
        }
      }
      const { phase } = step.state;
      step = reduceScene(scene, step.state, {
        type: phase === 'listening' ? 'timer_end' : phase === 'playing' ? 'rec_played' : 'gen_done',
      });
    }
    expect(rings).toEqual([30, 25, 20]);
  });
});

describe('the placement call', () => {
  const unpack = getScene('s1-pro-unpack');
  const OPEN = ['ask-work', 'ask-free-time', 'ask-free-time-after-miss', 'ask-goal'];

  /** Plays it with `fine` or a miss (two unclear tries) per open box, in order. */
  const ladder = (results: readonly boolean[]) => {
    let box = -1;
    let last = '';
    return path(unpack, 'newcomer', (beatId) => {
      if (beatId === 'warm-up') return 'fine';
      if (beatId !== last) {
        last = beatId;
        box++;
      }
      return results[box] === true ? 'fine' : 'unclear';
    });
  };

  it('opens with a warm-up box on Yes / No cards that the placement rule never counts', () => {
    const warmUp = unpack.beats.find((b) => b.id === 'warm-up');
    const answer = warmUp?.kind === 'gen' ? warmUp.answer : null;
    expect(answer?.choices.map((c) => c.en)).toEqual(['Yes.', 'No.']);
    expect(answer?.showHint).toBe('always');
    expect(answer?.scored).toBe(false);
    const open = unpack.beats.flatMap((b) =>
      b.kind === 'gen' && b.answer?.scored === true ? [b.id] : [],
    );
    expect(open).toEqual(OPEN);
  });

  it('asks three open boxes when the first goes well', () => {
    const played = ladder([true, false, false]);
    expect(played.filter((b) => OPEN.includes(b))).toEqual([
      'ask-work',
      'ask-free-time',
      'ask-goal',
    ]);
    expect(played).not.toContain('rest');
    expect(placementStage([true, false, false])).toBe('visitor');
  });

  it('rests after two missed boxes, so nobody misses three in a row', () => {
    const played = ladder([false, false]);
    expect(played.filter((b) => OPEN.includes(b))).toEqual([
      'ask-work',
      'ask-free-time-after-miss',
    ]);
    expect(played.slice(-2)).toEqual(['rest', 'outro']);
  });

  it('still asks the last box when only the first one missed', () => {
    const played = ladder([false, true, true]);
    expect(played.filter((b) => OPEN.includes(b))).toEqual([
      'ask-work',
      'ask-free-time-after-miss',
      'ask-goal',
    ]);
    expect(played).not.toContain('rest');
    expect(placementStage([false, true, true])).toBe('newcomer');
  });

  it('treats a skipped box as a miss', () => {
    let skips = 0;
    const played = path(unpack, 'newcomer', (beatId) =>
      beatId === 'warm-up' ? 'fine' : (skips++, 'skip'),
    );
    expect(played.slice(-2)).toEqual(['rest', 'outro']);
    expect(skips).toBe(2);
  });
});
