import { describe, expect, it } from '@jest/globals';
import type { CallServerFrame } from '@yapling/contracts';
import { getScene } from '@yapling/story';

import { layoutFor, stageCast, type CastSpot } from '../../src/features/call/scene-layout';
import {
  cueOf,
  heldCue,
  shotFor,
  SHOT_MS,
  towardCentre,
  type StageMoment,
  type StageSignals,
} from '../../src/features/call/stage-acts';
import {
  initialTracker,
  reduceTracker,
  type TrackerEvent,
  type TrackerState,
} from '../../src/features/call/tracker';
import { callView } from '../../src/features/call/view-model';
import { initialCallState, update } from '../../src/voice/call-state';

const episode = getScene('s1-e1');
const cafe = stageCast(layoutFor(episode));
const spotOf = (cast: readonly CastSpot[], c: string) => {
  const s = cast.find((x) => x.character === c);
  if (!s) throw new Error(`no ${c} on the stage`);
  return s;
};
const mei = spotOf(cafe, 'mei');
const pip = spotOf(cafe, 'pip');

const quiet: StageMoment = { learnerTalking: false, thinker: null, talking: null };
const start: StageSignals = { passes: 0, greeter: null, done: false };

describe('acts from the call', () => {
  it('listens toward the middle while the learner talks, whoever is on the stage', () => {
    const talking = { ...quiet, learnerTalking: true };
    // Mei stands on the left half, the roommate on the right.
    expect(heldCue(mei, talking, cafe)).toEqual({ act: 'listen', lookAt: 'right' });
    expect(heldCue(pip, talking, cafe)).toEqual({ act: 'listen', lookAt: 'left' });
    expect(towardCentre(mei)).toBe('right');
    expect(towardCentre(pip)).toBe('left');
  });

  it('thinks while the reply is on its way, the others at rest', () => {
    const thinking = { ...quiet, thinker: 'mei' as const };
    expect(heldCue(mei, thinking, cafe).act).toBe('think');
    expect(heldCue(pip, thinking, cafe).act).toBe('idle');
  });

  it('rests while its own line plays, and the others listen toward the one speaking', () => {
    const meiTalks = { ...quiet, talking: 'mei' as const };
    expect(heldCue(mei, meiTalks, cafe).act).toBe('idle');
    expect(heldCue(pip, meiTalks, cafe)).toEqual({ act: 'listen', lookAt: 'left' });
    const pipTalks = { ...quiet, talking: 'pip' as const };
    expect(heldCue(mei, pipTalks, cafe)).toEqual({ act: 'listen', lookAt: 'right' });
  });

  it('a voice off the stage is heard, not watched', () => {
    const office = { ...quiet, talking: 'office' as const };
    expect(heldCue(mei, office, cafe).act).toBe('idle');
    expect(heldCue(pip, office, cafe).act).toBe('idle');
  });

  it('rests when nothing is happening', () => {
    expect(heldCue(mei, quiet, cafe).act).toBe('idle');
  });
});

describe('one-shots', () => {
  const ctx = { listener: 'mei' as const, host: 'mei' as const, cast: cafe, now: 1_000 };

  it('hops the one answered and the roommate when a turn passes', () => {
    const shot = shotFor(start, { ...start, passes: 1 }, ctx);
    expect(shot).toEqual({ act: 'hop', cast: ['mei', 'pip'], at: 1_000 });
    // The office answered on the phone: only the roommate is on the stage to hop.
    expect(shotFor(start, { ...start, passes: 1 }, { ...ctx, listener: 'office' })?.cast).toEqual([
      'pip',
    ]);
    expect(shotFor({ ...start, passes: 1 }, { ...start, passes: 1 }, ctx)).toBeNull();
  });

  it('waves once for the first hello, and from the host and roommate at the goodbye', () => {
    const hello = shotFor(start, { ...start, greeter: 'mei' }, ctx);
    expect(hello).toEqual({ act: 'wave', cast: ['mei'], at: 1_000 });
    const later = { ...start, greeter: 'mei' as const };
    expect(shotFor(later, { ...later, greeter: 'mei' }, ctx)).toBeNull();
    expect(shotFor(later, { ...later, done: true }, ctx)?.cast).toEqual(['mei', 'pip']);
    // No hop after the scene is over.
    expect(shotFor({ ...later, done: true }, { ...later, done: true, passes: 3 }, ctx)).toBeNull();
  });

  it('plays the one-shot for its length, then the call has the stage again', () => {
    const shot = { act: 'hop' as const, cast: ['mei', 'pip'] as const, at: 1_000 };
    expect(cueOf(mei, quiet, cafe, shot, 2, 1_500)).toEqual({
      act: 'hop',
      play: 2,
      lookAt: 'right',
    });
    expect(cueOf(mei, { ...quiet, talking: 'mei' }, cafe, shot, 2, 1_000 + SHOT_MS.hop)).toEqual({
      act: 'idle',
      play: 2,
      lookAt: 'right',
    });
    // The learner starting to talk takes the stage back at once.
    expect(cueOf(pip, { ...quiet, learnerTalking: true }, cafe, shot, 1, 1_500).act).toBe('listen');
  });
});

let seq = 0;
const frame = (body: Record<string, unknown>): TrackerEvent => ({
  type: 'frame',
  frame: { ...body, seq: ++seq } as unknown as CallServerFrame,
  now: 0,
});
const track = (events: TrackerEvent[], from: TrackerState = initialTracker) =>
  events.reduce((s, e) => reduceTracker(s, e, { scene: episode, stage: 'newcomer' }), from);
const onTurn = track([
  frame({ type: 'beat', beatId: 'notice', progress: 0 }),
  frame({ type: 'beat', beatId: 'ask-whats-wrong', progress: 0.1 }),
]);

describe('passed turns', () => {
  it('counts a turn answered with words once the scene moves on', () => {
    expect(onTurn.passes).toBe(0);
    const passed = track(
      [
        frame({ type: 'heard', turn: 1, text: "What's wrong?", words: [] }),
        frame({ type: 'beat', beatId: 'letter', progress: 0.2 }),
      ],
      onTurn,
    );
    expect(passed.passes).toBe(1);
  });

  it('counts a skipped turn, never a turn with no words', () => {
    const skipped = track(
      [{ type: 'skip_requested' }, frame({ type: 'beat', beatId: 'letter', progress: 0.2 })],
      onTurn,
    );
    expect(skipped.passes).toBe(1);
    const silent = track(
      [
        frame({ type: 'heard', turn: 1, text: '', words: [] }),
        frame({ type: 'beat', beatId: 'letter', progress: 0.2 }),
      ],
      onTurn,
    );
    expect(silent.passes).toBe(0);
  });
});

describe('the stage in the call view', () => {
  const view = (patch: Parameters<typeof update>[1]) =>
    callView({
      call: update(update(initialCallState('hold_to_talk'), { phase: 'connecting' }), {
        connected: true,
        ...patch,
      }),
      tracker: onTurn,
      scene: episode,
      layout: layoutFor(episode),
      stage: 'newcomer',
      firstLanguage: 'vi',
      now: 0,
      micDenied: false,
      connectFailed: false,
    });

  it('hears the learner talking while the talk button is held', () => {
    expect(view({ phase: 'listening', talkHeld: true }).learnerTalking).toBe(true);
    expect(view({ phase: 'your_turn' }).learnerTalking).toBe(false);
    expect(view({ phase: 'your_turn' }).listener).toBe('mei');
  });
});
