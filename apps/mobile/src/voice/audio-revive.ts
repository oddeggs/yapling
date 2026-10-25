/*
 * The last resort for a call's audio: when the engine dies under the call (the graph stuck
 * suspended after the app was away, mic restarts that still hear nothing), the session, the graph
 * and the mic are built again from scratch, a few times at most per call.
 */

/** Whole-audio rebuilds tried in one call. */
const REBUILDS_MAX = 3;

export interface ReviveSteps {
  readonly stop: () => Promise<void>;
  readonly start: () => Promise<unknown>;
  /** The call is over: nothing is rebuilt. */
  readonly disposed: () => boolean;
  readonly done: (ok: boolean, detail: string) => void;
}

export class AudioReviver {
  private tries = 0;
  private running: Promise<void> | null = null;

  constructor(private readonly steps: ReviveSteps) {}

  get count(): number {
    return this.tries;
  }

  /** Rebuilds the audio once (a rebuild already under way is shared). */
  revive(why: string): Promise<void> {
    if (this.running || this.steps.disposed() || this.tries >= REBUILDS_MAX)
      return this.running ?? Promise.resolve();
    this.tries += 1;
    this.running = (async () => {
      try {
        await this.steps.stop();
        if (this.steps.disposed()) return;
        await this.steps.start();
        this.steps.done(true, why);
      } catch (e) {
        this.steps.done(false, String(e).slice(0, 80));
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }
}
