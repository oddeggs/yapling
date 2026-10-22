import type { AnalyticsEvent, AnalyticsEvents, FunnelStep, SuperProperties } from './events';
import { funnelEventOf, stepsToSend } from './funnel';

/*
 * The app's analytics, behind one small interface. Without a sink (no PostHog key in the build)
 * every call is a no-op, and nothing is stored or sent. The funnel's sent steps and the "test
 * session" flag are kept on the phone so each funnel step goes out once per install.
 */

/** Where events go: PostHog in the app, a fake in tests. */
export interface AnalyticsSink {
  capture(event: string, properties: Record<string, unknown>): void;
  identify(userId: string): void;
  /** A new anonymous person (a fresh install, or a deleted account). */
  reset(): void;
}

/** Synchronous key-value storage on the phone. */
export interface AnalyticsStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const KEYS = {
  funnel: 'yapling.analytics.funnel',
  testSession: 'yapling.analytics.test-session',
  once: 'yapling.analytics.once',
} as const;

export interface AnalyticsOptions {
  readonly sink: AnalyticsSink | null;
  readonly storage: AnalyticsStorage;
  readonly appVariant: SuperProperties['app_variant'];
  /** Whether the app's clock is moved right now (the time-travel menu). */
  readonly debugClock: () => boolean;
}

export class Analytics {
  private readonly sink: AnalyticsSink | null;
  private readonly storage: AnalyticsStorage;
  private readonly appVariant: SuperProperties['app_variant'];
  private readonly debugClock: () => boolean;
  private identified: string | null = null;

  constructor(options: AnalyticsOptions) {
    this.sink = options.sink;
    this.storage = options.storage;
    this.appVariant = options.appVariant;
    this.debugClock = options.debugClock;
  }

  /** Whether events go anywhere. */
  get enabled(): boolean {
    return this.sink !== null;
  }

  track<E extends AnalyticsEvent>(event: E, properties: AnalyticsEvents[E]): void {
    if (this.sink === null) return;
    this.sink.capture(event, { ...this.superProperties(), ...properties });
  }

  /** Sends an event the first time only, per install (until a reset). */
  trackOnce<E extends AnalyticsEvent>(event: E, properties: AnalyticsEvents[E]): void {
    if (this.sink === null) return;
    const sent = this.readList(KEYS.once);
    if (sent.includes(event)) return;
    this.storage.set(KEYS.once, JSON.stringify([...sent, event]));
    this.track(event, properties);
  }

  /** Events from now on (and the anonymous ones before) belong to this learner. */
  identify(userId: string): void {
    if (this.sink === null || this.identified === userId) return;
    this.identified = userId;
    this.sink.identify(userId);
  }

  /** Sends the funnel steps reached and not yet sent, in order. */
  reachFunnel(reached: readonly FunnelStep[]): void {
    if (this.sink === null) return;
    const sent = this.sentSteps();
    const next = stepsToSend(reached, sent);
    if (next.length === 0) return;
    this.storage.set(KEYS.funnel, JSON.stringify([...sent, ...next]));
    for (const step of next) {
      const { event, funnelStep } = funnelEventOf(step);
      this.track(event, { funnel_step: funnelStep });
    }
  }

  /** The time-travel menu was used: this install is a test session from now on. */
  markTestSession(): void {
    if (this.sink === null) return;
    this.storage.set(KEYS.testSession, '1');
  }

  /**
   * A fresh start on this phone (the test menu's reset, a deleted account): a new anonymous
   * person and the funnel from the top. A reset from the test menu stays a test session.
   */
  reset({ testSession }: { readonly testSession: boolean }): void {
    if (this.sink === null) return;
    this.storage.remove(KEYS.funnel);
    this.storage.remove(KEYS.once);
    if (testSession) this.storage.set(KEYS.testSession, '1');
    else this.storage.remove(KEYS.testSession);
    this.identified = null;
    this.sink.reset();
  }

  private superProperties(): SuperProperties {
    return {
      app_variant: this.appVariant,
      test_session: this.storage.get(KEYS.testSession) === '1',
      debug_clock: this.debugClock(),
    };
  }

  private sentSteps(): FunnelStep[] {
    return this.readList(KEYS.funnel) as FunnelStep[];
  }

  private readList(key: string): string[] {
    const raw = this.storage.get(key);
    if (raw === null) return [];
    try {
      const value: unknown = JSON.parse(raw);
      return Array.isArray(value) ? value.filter((s): s is string => typeof s === 'string') : [];
    } catch {
      return [];
    }
  }
}
