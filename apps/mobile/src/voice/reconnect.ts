/*
 * When the call socket drops, the phone tries again with exponential backoff and the last
 * `resumeToken`, for up to two minutes from the drop; after that the call is lost.
 */

export interface BackoffPolicy {
  /** The first retry's delay. */
  readonly baseMs: number;
  readonly factor: number;
  readonly maxDelayMs: number;
  /** Give up this long after the drop. */
  readonly windowMs: number;
  /** ± fraction of each delay, so phones that dropped together don't retry together. */
  readonly jitter: number;
}

export const DEFAULT_BACKOFF: BackoffPolicy = {
  baseMs: 250,
  factor: 2,
  maxDelayMs: 8_000,
  windowMs: 120_000,
  jitter: 0.2,
};

export class Reconnector {
  private droppedAt: number | null = null;
  private attempt = 0;

  constructor(
    private readonly policy: BackoffPolicy = DEFAULT_BACKOFF,
    private readonly random: () => number = Math.random,
  ) {}

  /** True between a drop and a successful reconnect or giving up. */
  get active(): boolean {
    return this.droppedAt !== null;
  }

  get attempts(): number {
    return this.attempt;
  }

  /** The socket dropped (only the first drop of a run starts the window). */
  dropped(nowMs: number): void {
    if (this.droppedAt === null) {
      this.droppedAt = nowMs;
      this.attempt = 0;
    }
  }

  /**
   * The delay before the next attempt, or null when the window is spent. The last attempt is
   * moved earlier so it still starts inside the window.
   */
  nextDelay(nowMs: number): number | null {
    if (this.droppedAt === null) this.dropped(nowMs);
    const started = this.droppedAt ?? nowMs;
    const left = started + this.policy.windowMs - nowMs;
    if (left <= 0) return null;
    const p = this.policy;
    const raw = Math.min(p.maxDelayMs, p.baseMs * p.factor ** this.attempt);
    const spread = raw * p.jitter * (this.random() * 2 - 1);
    this.attempt += 1;
    return Math.max(0, Math.min(Math.round(raw + spread), left));
  }

  /** The socket is back (a `ready` arrived). */
  succeeded(): void {
    this.droppedAt = null;
    this.attempt = 0;
  }
}
