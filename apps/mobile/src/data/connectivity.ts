import { isDataError } from './errors';
import type { Http } from './http';
import { createStore, type Store } from './store';

/*
 * Whether the API answers, learnt from the requests themselves (no extra native module): any
 * answer, even an error, means online; no answer means offline. While offline a probe retries with
 * backoff, and the first answer after that flushes the offline queue.
 */

export interface ConnectivityState {
  /** Null until the first request settles. */
  readonly online: boolean | null;
}

export type Schedule = (run: () => void, ms: number) => () => void;

export const defaultSchedule: Schedule = (run, ms) => {
  const timer = setTimeout(run, ms);
  return () => clearTimeout(timer);
};

/** Probe delays while offline; the last repeats. */
export const PROBE_DELAYS_MS = [3_000, 10_000, 30_000, 60_000] as const;

export class Connectivity {
  readonly store: Store<ConnectivityState> = createStore<ConnectivityState>({ online: null });
  private readonly backOnline = new Set<() => void>();
  private probe: (() => Promise<void>) | null = null;
  private cancelProbe: (() => void) | null = null;
  private attempt = 0;

  constructor(
    private readonly schedule: Schedule = defaultSchedule,
    private readonly delays: readonly number[] = PROBE_DELAYS_MS,
  ) {}

  get online(): boolean | null {
    return this.store.get().online;
  }

  /** What to run while offline to find out whether the API is back. */
  setProbe(probe: (() => Promise<void>) | null): void {
    this.probe = probe;
  }

  /** Runs when the API answers again after being unreachable. */
  onBackOnline(listener: () => void): () => void {
    this.backOnline.add(listener);
    return () => {
      this.backOnline.delete(listener);
    };
  }

  reportAnswer(): void {
    const was = this.online;
    this.attempt = 0;
    this.cancelProbe?.();
    this.cancelProbe = null;
    if (was === true) return;
    this.store.set({ online: true });
    if (was === false) for (const l of [...this.backOnline]) l();
  }

  reportNoAnswer(): void {
    this.store.set({ online: false });
    this.scheduleProbe();
  }

  /** Stops probing (the provider unmounting). */
  stop(): void {
    this.cancelProbe?.();
    this.cancelProbe = null;
  }

  private scheduleProbe(): void {
    if (this.cancelProbe !== null || this.probe === null) return;
    const delay = this.delays[Math.min(this.attempt, this.delays.length - 1)] ?? 60_000;
    this.attempt += 1;
    this.cancelProbe = this.schedule(() => {
      this.cancelProbe = null;
      void this.probe?.().catch(() => undefined);
    }, delay);
  }
}

/** An `Http` that tells `connectivity` how each request went. */
export function watchedHttp(http: Http, connectivity: Connectivity): Http {
  return {
    origin: http.origin,
    async send(spec) {
      try {
        const result = await http.send(spec);
        connectivity.reportAnswer();
        return result;
      } catch (error) {
        if (isDataError(error, 'network')) connectivity.reportNoAnswer();
        else connectivity.reportAnswer();
        throw error;
      }
    },
  };
}
