import type { PlusPlan } from './products';

/*
 * The phone's side of Plus: the App Store (StoreKit 2) through RevenueCat. The phone never tells
 * the server it bought anything: RevenueCat's webhook does, and the server's ledger is what counts
 * (the minutes summary's `plan`). The RevenueCat app user id is the Yapling user id.
 */

/** A paid introductory offer or a free trial, as the store prices it. */
export interface IntroOffer {
  /** The store's formatted intro price (`599.000 ₫`); for a free trial, the price after it. */
  readonly price: string;
  /** Days free, when the intro is a free trial; null for a paid intro. */
  readonly freeTrialDays: number | null;
  /** A paid intro that lasts exactly one year (the "first year" price). */
  readonly firstYear: boolean;
}

/** One plan as the store sells it, in the reader's own currency. */
export interface PlanOffer {
  readonly plan: PlusPlan;
  /** The store's formatted price per period. */
  readonly price: string;
  readonly intro: IntroOffer | null;
}

export type PurchaseOutcome =
  /** The store took the payment; the server learns of it from RevenueCat. */
  | 'purchased'
  /** The reader closed the store's sheet. */
  | 'cancelled'
  /** Ask to Buy or a slow payment method: it may clear later. */
  | 'pending'
  /** No store in this build (no RevenueCat key, or no native module). */
  | 'unavailable'
  | 'failed';

export type RestoreOutcome = 'restored' | 'nothing' | 'unavailable' | 'failed';

export interface PlusStore {
  /** Whether this build talks to the App Store at all. */
  readonly available: boolean;
  /** Ties RevenueCat's customer to the Yapling user; called after every sign-in. */
  identify(userId: string): Promise<void>;
  /** The plans with their store prices, or null when the store can't say. */
  offers(): Promise<readonly PlanOffer[] | null>;
  purchase(plan: PlusPlan): Promise<PurchaseOutcome>;
  /** Asks the store for past purchases (a new phone, a reinstall). */
  restore(): Promise<RestoreOutcome>;
  /** Called with whether the store says Plus is active, now and on every change. */
  onEntitlement(listener: (plus: boolean) => void): () => void;
}
