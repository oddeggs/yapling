import type { ButtonSize, ButtonTone } from '../../ui';
import type { StringKey, Translate } from '@yapling/i18n';

import { PLUS_PLANS, type PlusPlan } from './products';
import type { PlanOffer, PurchaseOutcome, RestoreOutcome } from './store';

/*
 * The paywall as data: what it shows and what can be pressed, from what the store said. Honest by
 * construction: "Not now" is the same size as the upgrade button, prices only ever come from the
 * store (or, in a development build without a store, from the design, marked dev-only and not
 * purchasable), and the upgrade promises a free trial only when the store offers one.
 */

/** What the store has said about the plans. */
export type OffersState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly offers: readonly PlanOffer[] }
  /** A store build whose store didn't answer, or a store build without a RevenueCat key. */
  | { readonly kind: 'unavailable' }
  /** A development build without a RevenueCat key: the design's prices, purchases off. */
  | { readonly kind: 'dev' };

/**
 * The design's prices, for development builds with no RevenueCat key only. Never shown where a
 * store exists, and never purchasable.
 */
export const DEV_SAMPLE_OFFERS: readonly PlanOffer[] = [
  {
    plan: 'yearly',
    price: '799.000 VND',
    intro: { price: '599.000 VND', freeTrialDays: null, firstYear: true },
  },
  { plan: 'monthly', price: '149.000 VND', intro: null },
];

export interface PaywallState {
  readonly offers: OffersState;
  readonly selected: PlusPlan;
  /** A purchase or a restore in flight: every button waits. */
  readonly busy: 'purchase' | 'restore' | null;
  /**
   * The store knows who is buying (RevenueCat logged in as the Yapling user). Until then nothing
   * is bought or restored, so a purchase never lands on an anonymous customer the server can't name.
   */
  readonly signedIn: boolean;
}

export interface PaywallInputs {
  /** The roommate's name, for "Pip, the burrow and the story stay either way". */
  readonly roommateName: string;
  /** The free plan's weekly live minutes and Plus's monthly fair-use minutes. */
  readonly freeMinutesPerWeek: number;
  readonly plusMinutesPerMonth: number;
}

export interface ButtonSpec {
  readonly label: string;
  readonly tone: ButtonTone;
  readonly size: ButtonSize;
  readonly disabled: boolean;
  /** Both buttons share one row equally. */
  readonly style: { readonly flex: 1 };
}

export interface PlanCard {
  readonly plan: PlusPlan;
  readonly label: string;
  readonly price: string;
  readonly detail: string;
  /** The green tag on the card ("Intro"), or null. */
  readonly badge: string | null;
  readonly selected: boolean;
  readonly accessibilityLabel: string;
}

export interface TableRow {
  readonly feature: string;
  readonly free: string;
  readonly plus: string;
  readonly header: boolean;
}

export interface PaywallView {
  readonly kicker: string;
  readonly title: string;
  readonly body: string;
  readonly table: readonly TableRow[];
  readonly cards: readonly PlanCard[];
  /** Over the cards: the dev-only label, or that the store isn't answering. */
  readonly notice: string | null;
  readonly students: string;
  readonly studentsLink: string;
  readonly fairUse: string;
  readonly autoRenew: string;
  readonly restore: { readonly label: string; readonly disabled: boolean };
  readonly terms: string;
  readonly privacy: string;
  readonly notNow: ButtonSpec;
  readonly upgrade: ButtonSpec;
  readonly stayEitherWay: string;
}

/** The two buttons: an equal pair, so declining is as easy as buying. */
const pair = (label: string, tone: ButtonTone, disabled: boolean): ButtonSpec => ({
  label,
  tone,
  size: 'pair',
  disabled,
  style: { flex: 1 },
});

const offersOf = (state: OffersState): readonly PlanOffer[] | null =>
  state.kind === 'ready' ? state.offers : state.kind === 'dev' ? DEV_SAMPLE_OFFERS : null;

function card(
  plan: PlusPlan,
  offer: PlanOffer | undefined,
  selected: boolean,
  copy: Translate,
): PlanCard {
  const loading = copy('plus.priceLoading');
  let label: string;
  let price: string;
  let detail: string;
  let badge: string | null = null;
  if (plan === 'monthly') {
    label = copy('plus.plan.monthly');
    price = offer?.price ?? loading;
    detail = copy('plus.plan.cancelAnyTime');
  } else if (offer?.intro && offer.intro.freeTrialDays === null) {
    // A paid introductory price: shown with what it renews at.
    label = offer.intro.firstYear ? copy('plus.plan.firstYear') : copy('plus.plan.yearly');
    price = offer.intro.price;
    detail = copy('plus.plan.thenYearly', { price: offer.price });
    badge = copy('plus.plan.intro');
  } else {
    label = copy('plus.plan.yearly');
    price = offer?.price ?? loading;
    detail = copy('plus.plan.cancelAnyTime');
    const days = offer?.intro?.freeTrialDays;
    if (days) badge = copy('plus.ctaTrial', { count: days });
  }
  return {
    plan,
    label,
    price,
    detail,
    badge,
    selected,
    accessibilityLabel: copy('plus.a11y.plan', { plan: label, price, detail }),
  };
}

export function paywallView(
  state: PaywallState,
  inputs: PaywallInputs,
  copy: Translate,
): PaywallView {
  const offers = offersOf(state.offers);
  const chosen = offers?.find((o) => o.plan === state.selected);
  const busy = state.busy !== null;
  const trialDays = chosen?.intro?.freeTrialDays ?? null;
  const notice: Extract<StringKey, 'plus.devOnly' | 'plus.storeUnavailable'> | null =
    state.offers.kind === 'dev'
      ? 'plus.devOnly'
      : state.offers.kind === 'unavailable'
        ? 'plus.storeUnavailable'
        : null;
  const minutes = { minutes: inputs.freeMinutesPerWeek };
  return {
    kicker: copy('plus.kicker'),
    title: copy('plus.title'),
    body: copy('plus.body', minutes),
    table: [
      { feature: '', free: copy('plus.table.free'), plus: copy('plus.table.plus'), header: true },
      {
        feature: copy('plus.table.liveMinutes'),
        free: copy('plus.table.freeMinutes', minutes),
        plus: copy('plus.table.plusMinutes', { minutes: inputs.plusMinutesPerMonth }),
        header: false,
      },
      { feature: copy('plus.table.stories'), free: '✓', plus: '✓', header: false },
      { feature: copy('plus.table.homework'), free: '–', plus: '✓', header: false },
      { feature: copy('plus.table.feedback'), free: '–', plus: '✓', header: false },
      { feature: copy('plus.table.camera'), free: '–', plus: '✓', header: false },
    ],
    cards: PLUS_PLANS.map((plan) =>
      card(
        plan,
        offers?.find((o) => o.plan === plan),
        plan === state.selected,
        copy,
      ),
    ),
    notice: notice === null ? null : copy(notice),
    students: copy('plus.students'),
    studentsLink: copy('plus.studentsLink'),
    fairUse: copy('plus.fairUse'),
    autoRenew: copy('plus.autoRenew'),
    restore: {
      label: copy('plus.restore'),
      disabled: busy || !state.signedIn,
    },
    terms: copy('plus.terms'),
    privacy: copy('plus.privacy'),
    notNow: pair(copy('plus.notNow'), 'secondary', false),
    upgrade: pair(
      trialDays ? copy('plus.ctaTrial', { count: trialDays }) : copy('plus.cta'),
      'primary',
      busy || !state.signedIn || state.offers.kind !== 'ready' || chosen === undefined,
    ),
    stayEitherWay: copy('plus.stayEitherWay', { name: inputs.roommateName }),
  };
}

/** What the learner is told after buying or restoring. */
type OutcomeKey = Extract<
  StringKey,
  | 'plus.welcome'
  | 'plus.pending'
  | 'plus.failed'
  | 'plus.unavailable'
  | 'plus.restored'
  | 'plus.nothingToRestore'
  | 'plus.storeUnavailable'
>;

/** What a purchase's outcome tells the learner, and whether the paywall closes. */
export function purchaseMessage(outcome: PurchaseOutcome): {
  readonly key: OutcomeKey | null;
  readonly close: boolean;
} {
  switch (outcome) {
    case 'purchased':
      return { key: 'plus.welcome', close: true };
    case 'pending':
      return { key: 'plus.pending', close: true };
    case 'cancelled':
      return { key: null, close: false };
    case 'unavailable':
      return { key: 'plus.unavailable', close: false };
    case 'failed':
      return { key: 'plus.failed', close: false };
  }
}

/** What a restore's outcome tells the learner, and whether the paywall closes. */
export function restoreMessage(outcome: RestoreOutcome): {
  readonly key: OutcomeKey;
  readonly close: boolean;
} {
  switch (outcome) {
    case 'restored':
      return { key: 'plus.restored', close: true };
    case 'nothing':
      return { key: 'plus.nothingToRestore', close: false };
    case 'unavailable':
      return { key: 'plus.unavailable', close: false };
    case 'failed':
      return { key: 'plus.storeUnavailable', close: false };
  }
}

/** How the paywall starts: the store's answer still to come, or no store at all. */
export function initialOffers(storeAvailable: boolean, devFallback: boolean): OffersState {
  if (storeAvailable) return { kind: 'loading' };
  return devFallback ? { kind: 'dev' } : { kind: 'unavailable' };
}
