import type { ChargeResult, TalkKind } from '../user';

/*
 * Live minutes: learner talk (voiced speech) and character talk (audio played) are charged to the
 * learner's object in whole seconds as they add up, a few seconds at a time, so the `minutes`
 * frame stays current and the wrap-up starts on time. Fractions carry over; the rest is charged
 * when the call ends.
 */

/** Charge once this much unbilled talk has built up. */
const CHARGE_EVERY_MS = 5_000;

export interface MeterState {
  readonly learnerMs: number;
  readonly characterMs: number;
  readonly billedLearner: number;
  readonly billedCharacter: number;
}

export type Charger = (seconds: number, kind: TalkKind) => Promise<ChargeResult>;

export class Meter {
  learnerMs = 0;
  characterMs = 0;
  private billed: Record<TalkKind, number> = { learner: 0, character: 0 };
  private chain: Promise<ChargeResult | null> = Promise.resolve(null);

  constructor(private readonly charge: Charger) {}

  state(): MeterState {
    return {
      learnerMs: this.learnerMs,
      characterMs: this.characterMs,
      billedLearner: this.billed.learner,
      billedCharacter: this.billed.character,
    };
  }

  restore(state: MeterState): void {
    this.learnerMs = state.learnerMs;
    this.characterMs = state.characterMs;
    this.billed = { learner: state.billedLearner, character: state.billedCharacter };
  }

  get learnerSeconds(): number {
    return Math.round(this.learnerMs / 1_000);
  }

  get characterSeconds(): number {
    return Math.round(this.characterMs / 1_000);
  }

  addLearner(ms: number): void {
    this.learnerMs += Math.max(0, ms);
  }

  addCharacter(ms: number): void {
    this.characterMs += Math.max(0, ms);
  }

  /** Charges what is due (everything when `all`); null when nothing was charged. */
  flush(all = false): Promise<ChargeResult | null> {
    this.chain = this.chain.then(async () => {
      let last: ChargeResult | null = null;
      for (const kind of ['learner', 'character'] as const) {
        const totalMs = kind === 'learner' ? this.learnerMs : this.characterMs;
        const unbilledMs = totalMs - this.billed[kind] * 1_000;
        if (unbilledMs < (all ? 500 : CHARGE_EVERY_MS)) continue;
        const seconds = Math.min(3_600, Math.round(unbilledMs / 1_000));
        if (seconds <= 0) continue;
        this.billed[kind] += seconds;
        try {
          last = await this.charge(seconds, kind);
        } catch (error) {
          // Charged again with the next flush.
          this.billed[kind] -= seconds;
          console.error('live minute charge failed', { error: String(error) });
        }
      }
      return last;
    });
    return this.chain;
  }
}
