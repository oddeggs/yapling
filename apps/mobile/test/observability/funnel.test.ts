import { describe, expect, it } from '@jest/globals';
import { RING_SLOT_KINDS, type RingSlotStatus, type WeekRing } from '@yapling/contracts';

import { Analytics, type AnalyticsSink } from '../../src/observability/analytics';
import { FUNNEL_EVENTS } from '../../src/observability/events';
import { reachedSteps, stepsToSend } from '../../src/observability/funnel';

const week = (n: number, statuses: readonly RingSlotStatus[]): WeekRing => ({
  week: n,
  slots: RING_SLOT_KINDS.map((kind, i) => {
    const status = statuses[i] ?? 'upcoming';
    return status === 'done'
      ? { kind, status, sceneId: null, callRecordId: `call-${n}-${i}`, doneAt: 1_000 }
      : { kind, status, sceneId: null, callRecordId: null, doneAt: null };
  }),
});

describe('the first-week funnel', () => {
  it('counts the install alone on the splash', () => {
    expect(reachedSteps({ onboardingStep: 'language', progress: null, dayIndex: null })).toEqual([
      'install',
    ]);
  });

  it('counts the first language once the splash moves on to the age check', () => {
    expect(reachedSteps({ onboardingStep: 'age', progress: null, dayIndex: null })).toEqual([
      'install',
      'language',
    ]);
    expect(reachedSteps({ onboardingStep: 'unpack', progress: null, dayIndex: 1 })).toEqual([
      'install',
      'language',
    ]);
  });

  it('counts the placement call once onboarding reaches the residency card', () => {
    for (const step of ['card', 'notifications', 'done'] as const) {
      expect(
        reachedSteps({ onboardingStep: step, progress: { weeks: [week(1, [])] }, dayIndex: 1 }),
      ).toEqual(['install', 'language', 'placement']);
    }
  });

  it('counts the first episode from the ring, then the full ring', () => {
    const base = { onboardingStep: 'done', dayIndex: 3 } as const;
    expect(reachedSteps({ ...base, progress: { weeks: [week(1, ['done', 'open'])] } })).toEqual([
      'install',
      'language',
      'placement',
      'firstEpisode',
    ]);
    expect(
      reachedSteps({ ...base, progress: { weeks: [week(1, ['done', 'done', 'done'])] } }),
    ).toEqual(['install', 'language', 'placement', 'firstEpisode', 'ringFull']);
  });

  it('counts day 8 from the app day, whether or not the ring is full', () => {
    const progress = { weeks: [week(1, ['done', 'open', 'open']), week(2, [])] };
    expect(reachedSteps({ onboardingStep: 'done', progress, dayIndex: 7 })).not.toContain('day8');
    expect(reachedSteps({ onboardingStep: 'done', progress, dayIndex: 8 })).toEqual([
      'install',
      'language',
      'placement',
      'firstEpisode',
      'day8',
    ]);
    expect(reachedSteps({ onboardingStep: 'done', progress, dayIndex: 12 })).toContain('day8');
  });

  it('sends only the steps not sent before, in funnel order', () => {
    expect(stepsToSend(['install', 'language', 'placement'], ['install'])).toEqual([
      'language',
      'placement',
    ]);
    expect(stepsToSend(['install'], ['install', 'language'])).toEqual([]);
  });
});

function fakes() {
  const sent: { event: string; properties: Record<string, unknown> }[] = [];
  const people: string[] = [];
  let resets = 0;
  const sink: AnalyticsSink = {
    capture: (event, properties) => void sent.push({ event, properties }),
    identify: (id) => void people.push(id),
    reset: () => void (resets += 1),
  };
  const store = new Map<string, string>();
  const storage = {
    get: (k: string) => store.get(k) ?? null,
    set: (k: string, v: string) => void store.set(k, v),
    remove: (k: string) => void store.delete(k),
  };
  return { sent, people, sink, storage, resets: () => resets };
}

describe('analytics', () => {
  it('sends each funnel step once per install, with its place and the super properties', () => {
    const f = fakes();
    const a = new Analytics({
      sink: f.sink,
      storage: f.storage,
      appVariant: 'dev',
      debugClock: () => false,
    });
    a.reachFunnel(['install']);
    a.reachFunnel(['install', 'language']);
    a.reachFunnel(['install', 'language']);
    expect(f.sent).toEqual([
      {
        event: FUNNEL_EVENTS.install,
        properties: { funnel_step: 1, app_variant: 'dev', test_session: false, debug_clock: false },
      },
      {
        event: FUNNEL_EVENTS.language,
        properties: { funnel_step: 2, app_variant: 'dev', test_session: false, debug_clock: false },
      },
    ]);
    // After a restart the sent steps are still known.
    const again = new Analytics({
      sink: f.sink,
      storage: f.storage,
      appVariant: 'dev',
      debugClock: () => false,
    });
    again.reachFunnel(['install', 'language', 'placement']);
    expect(f.sent.map((s) => s.event)).toEqual([
      FUNNEL_EVENTS.install,
      FUNNEL_EVENTS.language,
      FUNNEL_EVENTS.placement,
    ]);
  });

  it('tags events after the time-travel menu as a test session, and a reset restarts the funnel', () => {
    const f = fakes();
    let moved = false;
    const a = new Analytics({
      sink: f.sink,
      storage: f.storage,
      appVariant: 'dev',
      debugClock: () => moved,
    });
    a.reachFunnel(['install']);
    a.markTestSession();
    moved = true;
    a.track('time_travel_used', { action: 'jump_day', day: 3 });
    expect(f.sent[1]?.properties).toMatchObject({ test_session: true, debug_clock: true, day: 3 });

    a.identify('user-1');
    a.identify('user-1');
    expect(f.people).toEqual(['user-1']);
    a.reset({ testSession: true });
    expect(f.resets()).toBe(1);
    a.reachFunnel(['install']);
    expect(f.sent[2]).toMatchObject({
      event: FUNNEL_EVENTS.install,
      properties: { test_session: true },
    });
    a.identify('user-1');
    expect(f.people).toEqual(['user-1', 'user-1']);
  });

  it('does nothing and stores nothing without a sink', () => {
    const f = fakes();
    const a = new Analytics({
      sink: null,
      storage: f.storage,
      appVariant: 'prd',
      debugClock: () => false,
    });
    a.reachFunnel(['install', 'language']);
    a.markTestSession();
    a.track('paywall_viewed', { store_available: true });
    a.identify('user-1');
    expect(a.enabled).toBe(false);
    expect(f.storage.get('yapling.analytics.funnel')).toBeNull();
    expect(f.storage.get('yapling.analytics.test-session')).toBeNull();
  });
});
