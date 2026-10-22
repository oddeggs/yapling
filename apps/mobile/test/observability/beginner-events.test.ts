import { describe, expect, it } from '@jest/globals';

import { Analytics, type AnalyticsSink } from '../../src/observability/analytics';
import {
  callPropertiesOf,
  chapterEndedOf,
  chapterOfScene,
  chapterStartedOf,
  pathChosenOf,
  placementResultOf,
} from '../../src/observability/beginner-events';
import { callEventsBetween, type CallSnapshot } from '../../src/observability/call-events';

class Sink implements AnalyticsSink {
  readonly events: { event: string; properties: Record<string, unknown> }[] = [];
  capture(event: string, properties: Record<string, unknown>) {
    this.events.push({ event, properties });
  }
  identify() {}
  reset() {}
}

const memory = () => {
  const values = new Map<string, string>();
  return {
    get: (k: string) => values.get(k) ?? null,
    set: (k: string, v: string) => void values.set(k, v),
    remove: (k: string) => void values.delete(k),
  };
};

const analyticsWith = (sink: Sink | null) =>
  new Analytics({ sink, storage: memory(), appVariant: 'dev', debugClock: () => false });

describe('the beginner path’s events', () => {
  it('names the chapter a Settling-in scene plays, and none for any other scene', () => {
    expect(chapterOfScene('s1-set1')).toBe(1);
    expect(chapterOfScene('s1-set6')).toBe(6);
    expect(chapterOfScene('s1-e1')).toBeNull();
  });

  it('puts the chapter and the turn mode on every call event', () => {
    expect(callPropertiesOf('settling', 's1-set3', 'hands_free')).toEqual({
      kind: 'settling',
      scene_id: 's1-set3',
      chapter: 3,
      turn_mode: 'hands_free',
    });
    expect(callPropertiesOf('episode', 's1-e1', undefined)).toEqual({
      kind: 'episode',
      scene_id: 's1-e1',
      chapter: null,
      turn_mode: null,
    });
  });

  it('reads the path chosen from the profile, once it has one', () => {
    expect(pathChosenOf(null)).toBeNull();
    expect(pathChosenOf({ startPath: null })).toBeNull();
    expect(pathChosenOf({ startPath: 'visitor' })).toEqual({ path: 'visitor' });
  });

  it('reports the stage the placement call left', () => {
    expect(placementResultOf({ stage: 'visitor', startPath: 'placement' })).toEqual({
      stage: 'visitor',
      path: 'placement',
    });
  });

  it('starts a chapter only for a Settling-in call, and tells a replay from a first time', () => {
    const call = callPropertiesOf('settling', 's1-set2', 'hold_to_talk');
    expect(chapterStartedOf(call, [{ chapter: 1 }])).toEqual({
      chapter: 2,
      scene_id: 's1-set2',
      replay: false,
      turn_mode: 'hold_to_talk',
    });
    expect(chapterStartedOf(call, [{ chapter: 1 }, { chapter: 2 }])?.replay).toBe(true);
    expect(chapterStartedOf(callPropertiesOf('episode', 's1-e1', undefined), [])).toBeNull();
  });

  it('ends a chapter with how it ended and how long it took, from the record when read', () => {
    const started = chapterStartedOf(callPropertiesOf('settling', 's1-set1', undefined), [])!;
    expect(
      chapterEndedOf(started, {
        reason: 'scene_complete',
        measuredSeconds: 130,
        record: { startedAt: 1_000, endedAt: 151_400, learnerSeconds: 22 },
      }),
    ).toEqual({
      chapter: 1,
      scene_id: 's1-set1',
      replay: false,
      turn_mode: null,
      ended_reason: 'scene_complete',
      complete: true,
      duration_seconds: 150,
      learner_seconds: 22,
    });
    const left = chapterEndedOf(started, { reason: 'too_hard', measuredSeconds: 40, record: null });
    expect(left).toMatchObject({ complete: false, duration_seconds: 40, learner_seconds: null });
  });

  it('hears the learner switch turn mode during a call, not before it answers', () => {
    const live: CallSnapshot = {
      mode: 'live',
      connected: true,
      error: null,
      warning: null,
      endReason: null,
      learnerFinal: false,
      learnerText: '',
      latency: [],
      turnMode: 'hold_to_talk',
    };
    const hands = { ...live, turnMode: 'hands_free' } as const;
    expect(callEventsBetween(live, hands, true)).toEqual([{ type: 'turn_mode', to: 'hands_free' }]);
    expect(callEventsBetween(live, live, true)).toEqual([]);
    // The answer itself carries the mode it started in.
    expect(callEventsBetween(live, hands, false)).toEqual([{ type: 'started' }]);
    const { turnMode: _, ...unknown } = live;
    expect(callEventsBetween(unknown, hands, true)).toEqual([]);
  });
});

describe('events sent once per install', () => {
  it('sends the first time only, with the super properties, until a reset', () => {
    const sink = new Sink();
    const a = analyticsWith(sink);
    a.trackOnce('path_chosen', { path: 'visitor' });
    a.trackOnce('path_chosen', { path: 'placement' });
    a.trackOnce('placement_result', { stage: 'newcomer', path: 'placement' });
    expect(sink.events.map((e) => e.event)).toEqual(['path_chosen', 'placement_result']);
    expect(sink.events[0]?.properties).toEqual({
      app_variant: 'dev',
      test_session: false,
      debug_clock: false,
      path: 'visitor',
    });
    a.reset({ testSession: true });
    a.trackOnce('path_chosen', { path: 'placement' });
    expect(sink.events.at(-1)).toEqual({
      event: 'path_chosen',
      properties: { app_variant: 'dev', test_session: true, debug_clock: false, path: 'placement' },
    });
  });

  it('does nothing without a PostHog key', () => {
    const a = analyticsWith(null);
    expect(() => a.trackOnce('path_chosen', { path: 'visitor' })).not.toThrow();
    expect(a.enabled).toBe(false);
  });
});
