import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  LogInResult,
  MakePurchaseResult,
  PurchasesConfiguration,
  PurchasesError,
  PurchasesIntroPrice,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';

import {
  PLUS_ENTITLEMENT,
  PLUS_PLANS,
  storeProductId,
  type AppVariant,
  type PlusPlan,
} from './products';
import type { IntroOffer, PlanOffer, PlusStore, PurchaseOutcome } from './store';

/*
 * The App Store through RevenueCat (StoreKit 2). Configured once with the public iOS SDK key. The
 * app user id is the Yapling user id (`identify` logs in after every sign-in), so the server's
 * webhook finds the same customer. Nothing here decides what the learner has: the server does.
 */

/** RevenueCat's error codes this store tells apart (`PURCHASES_ERROR_CODE`). */
const CANCELLED = '1';
const ALREADY_OWNED = '6';
const PENDING = '20';

/** The part of `react-native-purchases` the store uses, so tests drive it with a fake. */
export interface RevenueCatSdk {
  configure(configuration: PurchasesConfiguration): void;
  logIn(appUserID: string): Promise<LogInResult>;
  getOfferings(): Promise<PurchasesOfferings>;
  purchasePackage(aPackage: PurchasesPackage): Promise<MakePurchaseResult>;
  restorePurchases(): Promise<CustomerInfo>;
  getCustomerInfo(): Promise<CustomerInfo>;
  addCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener): void;
  removeCustomerInfoUpdateListener(listener: CustomerInfoUpdateListener): boolean;
}

const codeOf = (error: unknown): string | null => {
  const code = (error as Partial<PurchasesError> | null)?.code;
  return typeof code === 'string' ? code : null;
};

/** What a failed purchase means for the paywall. */
export function purchaseFailure(error: unknown): PurchaseOutcome {
  const code = codeOf(error);
  if (code === CANCELLED || (error as Partial<PurchasesError> | null)?.userCancelled === true) {
    return 'cancelled';
  }
  if (code === PENDING) return 'pending';
  // The store says it's owned already: the webhook has told (or will tell) the server.
  if (code === ALREADY_OWNED) return 'purchased';
  return 'failed';
}

/** Whether a customer record has Plus active. */
export const hasPlus = (info: CustomerInfo): boolean =>
  info.entitlements.active[PLUS_ENTITLEMENT] !== undefined;

const DAYS_PER_UNIT: Readonly<Record<string, number>> = { DAY: 1, WEEK: 7 };

/** The store's introductory price as the paywall shows it. */
export function introOffer(intro: PurchasesIntroPrice | null, regular: string): IntroOffer | null {
  if (intro === null) return null;
  if (intro.price === 0) {
    const perUnit = DAYS_PER_UNIT[intro.periodUnit];
    return {
      price: regular,
      freeTrialDays:
        perUnit === undefined ? null : perUnit * intro.periodNumberOfUnits * intro.cycles,
      firstYear: false,
    };
  }
  return {
    price: intro.priceString,
    freeTrialDays: null,
    firstYear: intro.periodUnit === 'YEAR' && intro.periodNumberOfUnits === 1 && intro.cycles === 1,
  };
}

/** Every package RevenueCat offers, the current offering's first. */
function packagesOf(offerings: PurchasesOfferings): PurchasesPackage[] {
  const current = offerings.current?.availablePackages ?? [];
  return [...current, ...Object.values(offerings.all).flatMap((o) => o.availablePackages)];
}

export function createRevenueCatStore(
  sdk: RevenueCatSdk,
  apiKey: string,
  variant: AppVariant,
): PlusStore {
  sdk.configure({ apiKey });
  let identified: Promise<void> = Promise.resolve();
  const packages = new Map<PlusPlan, PurchasesPackage>();

  async function load(): Promise<boolean> {
    const all = packagesOf(await sdk.getOfferings());
    for (const plan of PLUS_PLANS) {
      const found = all.find((p) => p.product.identifier === storeProductId(plan, variant));
      if (found) packages.set(plan, found);
    }
    return PLUS_PLANS.every((plan) => packages.has(plan));
  }

  return {
    available: true,
    identify(userId) {
      identified = sdk.logIn(userId).then(
        () => undefined,
        () => undefined,
      );
      return identified;
    },
    async offers() {
      await identified;
      const complete = await load().catch(() => false);
      if (!complete) return null;
      return PLUS_PLANS.map((plan): PlanOffer => {
        const { product } = packages.get(plan) as PurchasesPackage;
        return {
          plan,
          price: product.priceString,
          intro: introOffer(product.introPrice, product.priceString),
        };
      });
    },
    async purchase(plan) {
      await identified;
      if (!packages.has(plan)) await load().catch(() => false);
      const found = packages.get(plan);
      if (!found) return 'unavailable';
      try {
        await sdk.purchasePackage(found);
        return 'purchased';
      } catch (error) {
        return purchaseFailure(error);
      }
    },
    async restore() {
      await identified;
      try {
        return hasPlus(await sdk.restorePurchases()) ? 'restored' : 'nothing';
      } catch {
        return 'failed';
      }
    },
    onEntitlement(listener) {
      const relay: CustomerInfoUpdateListener = (info) => listener(hasPlus(info));
      sdk.addCustomerInfoUpdateListener(relay);
      void sdk.getCustomerInfo().then(relay, () => undefined);
      return () => {
        sdk.removeCustomerInfoUpdateListener(relay);
      };
    },
  };
}
