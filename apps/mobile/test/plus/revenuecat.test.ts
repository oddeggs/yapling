/* eslint-disable @typescript-eslint/unbound-method -- asserting on the fake SDK's jest mocks */
import { describe, expect, it, jest } from '@jest/globals';
import type {
  CustomerInfo,
  CustomerInfoUpdateListener,
  PurchasesOfferings,
  PurchasesPackage,
} from 'react-native-purchases';

import { planOfStoreId, storeProductId } from '../../src/features/plus/products';
import {
  createRevenueCatStore,
  introOffer,
  purchaseFailure,
  type RevenueCatSdk,
} from '../../src/features/plus/revenuecat';
import { revenueCatKey } from '../../src/features/plus/setup';
import { unavailableStore } from '../../src/features/plus/unavailable';

const pkg = (identifier: string, priceString: string, introPrice: unknown = null) =>
  ({
    identifier: `$rc_${identifier}`,
    product: { identifier, priceString, introPrice },
  }) as unknown as PurchasesPackage;

const info = (active: string[]) =>
  ({
    entitlements: { active: Object.fromEntries(active.map((a) => [a, {}])) },
  }) as unknown as CustomerInfo;

function fakeSdk(packages: PurchasesPackage[]) {
  const listeners: CustomerInfoUpdateListener[] = [];
  const sdk = {
    configure: jest.fn(),
    logIn: jest.fn(() => Promise.resolve({ customerInfo: info([]), created: false })),
    getOfferings: jest.fn(() =>
      Promise.resolve({
        current: { availablePackages: packages },
        all: {},
      } as unknown as PurchasesOfferings),
    ),
    purchasePackage: jest.fn(() => Promise.resolve({ customerInfo: info(['plus']) })),
    restorePurchases: jest.fn(() => Promise.resolve(info(['plus']))),
    getCustomerInfo: jest.fn(() => Promise.resolve(info([]))),
    addCustomerInfoUpdateListener: jest.fn(
      (l: CustomerInfoUpdateListener) => void listeners.push(l),
    ),
    removeCustomerInfoUpdateListener: jest.fn(() => true),
  };
  return { sdk: sdk as unknown as RevenueCatSdk & typeof sdk, listeners };
}

const yearlyIntro = {
  price: 599000,
  priceString: '599.000 ₫',
  cycles: 1,
  period: 'P1Y',
  periodUnit: 'YEAR',
  periodNumberOfUnits: 1,
};

describe('the RevenueCat store', () => {
  it('is only configured with a key', () => {
    expect(revenueCatKey(undefined)).toBeNull();
    expect(revenueCatKey('  ')).toBeNull();
    expect(revenueCatKey('appl_abc')).toBe('appl_abc');
    expect(unavailableStore.available).toBe(false);
  });

  it('sells the dev app’s products under their own ids', () => {
    expect(storeProductId('monthly', 'prd')).toBe('yapling_plus_monthly');
    expect(storeProductId('yearly', 'dev')).toBe('yapling_plus_yearly.dev');
    expect(planOfStoreId('yapling_plus_yearly.dev')).toBe('yearly');
    expect(planOfStoreId('something')).toBeNull();
  });

  it('prices the plans from the offering, with the first-year intro', async () => {
    const { sdk } = fakeSdk([
      pkg('yapling_plus_monthly.dev', '149.000 ₫'),
      pkg('yapling_plus_yearly.dev', '799.000 ₫', yearlyIntro),
    ]);
    const store = createRevenueCatStore(sdk, 'appl_key', 'dev');
    expect(sdk.configure).toHaveBeenCalledWith({ apiKey: 'appl_key' });
    expect(await store.offers()).toEqual([
      {
        plan: 'yearly',
        price: '799.000 ₫',
        intro: { price: '599.000 ₫', freeTrialDays: null, firstYear: true },
      },
      { plan: 'monthly', price: '149.000 ₫', intro: null },
    ]);
  });

  it('says nothing when a plan is missing from the offering', async () => {
    const { sdk } = fakeSdk([pkg('yapling_plus_monthly', '149.000 ₫')]);
    expect(await createRevenueCatStore(sdk, 'k', 'prd').offers()).toBeNull();
  });

  it('logs in as the Yapling user before buying', async () => {
    const { sdk } = fakeSdk([pkg('yapling_plus_monthly', '1'), pkg('yapling_plus_yearly', '2')]);
    const store = createRevenueCatStore(sdk, 'k', 'prd');
    await store.identify('user-1');
    expect(sdk.logIn).toHaveBeenCalledWith('user-1');
    expect(await store.purchase('monthly')).toBe('purchased');
    const bought = (sdk.purchasePackage.mock.calls as unknown as PurchasesPackage[][])[0]?.[0];
    expect(bought?.product.identifier).toBe('yapling_plus_monthly');
  });

  it('reads the store’s errors as outcomes', () => {
    expect(purchaseFailure({ code: '1' })).toBe('cancelled');
    expect(purchaseFailure({ userCancelled: true })).toBe('cancelled');
    expect(purchaseFailure({ code: '20' })).toBe('pending');
    expect(purchaseFailure({ code: '6' })).toBe('purchased');
    expect(purchaseFailure(new Error('boom'))).toBe('failed');
  });

  it('restores, and tells a restore that found Plus from one that found nothing', async () => {
    const { sdk } = fakeSdk([]);
    const store = createRevenueCatStore(sdk, 'k', 'prd');
    expect(await store.restore()).toBe('restored');
    sdk.restorePurchases.mockResolvedValueOnce(info([]));
    expect(await store.restore()).toBe('nothing');
    sdk.restorePurchases.mockRejectedValueOnce(new Error('offline'));
    expect(await store.restore()).toBe('failed');
  });

  it('relays whether Plus is active, and stops when asked', async () => {
    const { sdk, listeners } = fakeSdk([]);
    const store = createRevenueCatStore(sdk, 'k', 'prd');
    const seen: boolean[] = [];
    const stop = store.onEntitlement((plus) => seen.push(plus));
    await Promise.resolve();
    await Promise.resolve();
    listeners[0]?.(info(['plus']));
    expect(seen).toEqual([false, true]);
    stop();
    expect(sdk.removeCustomerInfoUpdateListener).toHaveBeenCalledWith(listeners[0]);
  });

  it('reads a free trial’s length in days, and no length it can’t say exactly', () => {
    const trial = {
      ...yearlyIntro,
      price: 0,
      priceString: '0 ₫',
      periodUnit: 'WEEK',
      period: 'P1W',
    };
    expect(introOffer(trial, '799.000 ₫')).toEqual({
      price: '799.000 ₫',
      freeTrialDays: 7,
      firstYear: false,
    });
    expect(introOffer({ ...trial, periodUnit: 'MONTH' }, 'x')?.freeTrialDays).toBeNull();
    expect(introOffer(null, 'x')).toBeNull();
  });
});
