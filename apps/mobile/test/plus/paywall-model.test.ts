import { describe, expect, it } from '@jest/globals';

import { translator } from '@yapling/i18n';
import {
  DEV_SAMPLE_OFFERS,
  initialOffers,
  paywallView,
  purchaseMessage,
  restoreMessage,
  type OffersState,
  type PaywallState,
} from '../../src/features/plus/paywall-model';
import type { PlanOffer } from '../../src/features/plus/store';

const inputs = { roommateName: 'Pip', freeMinutesPerWeek: 10, plusMinutesPerMonth: 150 };
const en = translator('en');
const vi = translator('vi');

const storeOffers: readonly PlanOffer[] = [
  {
    plan: 'yearly',
    price: '799.000 ₫',
    intro: { price: '599.000 ₫', freeTrialDays: null, firstYear: true },
  },
  { plan: 'monthly', price: '149.000 ₫', intro: null },
];

const view = (offers: OffersState, over: Partial<PaywallState> = {}, copy = en) =>
  paywallView({ offers, selected: 'yearly', busy: null, signedIn: true, ...over }, inputs, copy);

describe('the paywall', () => {
  it('without a RevenueCat key shows the design’s prices marked dev-only, and cannot buy', () => {
    const offers = initialOffers(false, true);
    expect(offers).toEqual({ kind: 'dev' });
    const v = view(offers);
    expect(v.notice).toBe(en('plus.devOnly'));
    expect(v.upgrade.disabled).toBe(true);
    expect(v.cards.map((c) => c.price)).toEqual(['599.000 VND', '149.000 VND']);
    expect(v.cards[0]?.detail).toBe('then 799.000 VND/year');
    expect(DEV_SAMPLE_OFFERS).toHaveLength(2);
  });

  it('never shows sample prices in a store build without a store', () => {
    const offers = initialOffers(false, false);
    expect(offers).toEqual({ kind: 'unavailable' });
    const v = view(offers);
    expect(v.notice).toBe(en('plus.storeUnavailable'));
    expect(v.upgrade.disabled).toBe(true);
    expect(v.cards.map((c) => c.price)).toEqual(['…', '…']);
  });

  it('waits for the store before it can buy', () => {
    const v = view(initialOffers(true, true));
    expect(v.notice).toBeNull();
    expect(v.upgrade.disabled).toBe(true);
  });

  it('prices the plans from the store, the first year with what it renews at', () => {
    const v = view({ kind: 'ready', offers: storeOffers });
    expect(v.upgrade.disabled).toBe(false);
    expect(v.cards).toEqual([
      expect.objectContaining({
        plan: 'yearly',
        label: 'First year',
        price: '599.000 ₫',
        detail: 'then 799.000 ₫/year',
        badge: 'Intro',
        selected: true,
      }),
      expect.objectContaining({
        plan: 'monthly',
        label: 'Monthly',
        price: '149.000 ₫',
        detail: 'Cancel any time',
        badge: null,
        selected: false,
      }),
    ]);
  });

  it('makes “Not now” exactly as big as the upgrade button', () => {
    for (const offers of [{ kind: 'dev' }, { kind: 'ready', offers: storeOffers }] as const) {
      const v = view(offers);
      expect(v.notNow.size).toBe(v.upgrade.size);
      expect(v.notNow.style).toEqual(v.upgrade.style);
      expect(v.notNow.style).toEqual({ flex: 1 });
      expect(v.notNow.disabled).toBe(false);
    }
  });

  it('asks to upgrade, and promises a free trial only when the store has one', () => {
    expect(view({ kind: 'ready', offers: storeOffers }).upgrade.label).toBe('Get Plus');
    expect(view({ kind: 'ready', offers: storeOffers }, {}, vi).upgrade.label).toBe(
      'Nâng cấp lên Plus',
    );
    const trial: PlanOffer[] = [
      {
        plan: 'yearly',
        price: '799.000 ₫',
        intro: { price: '799.000 ₫', freeTrialDays: 7, firstYear: false },
      },
      { plan: 'monthly', price: '149.000 ₫', intro: null },
    ];
    const v = view({ kind: 'ready', offers: trial });
    expect(v.upgrade.label).toBe('Try 7 days free');
    expect(v.cards[0]).toMatchObject({
      label: 'Yearly',
      price: '799.000 ₫',
      badge: 'Try 7 days free',
    });
    expect(view({ kind: 'ready', offers: trial }, { selected: 'monthly' }).upgrade.label).toBe(
      'Get Plus',
    );
  });

  it('holds every button while a purchase or restore is in flight, except the way out', () => {
    const v = view({ kind: 'ready', offers: storeOffers }, { busy: 'restore' });
    expect(v.upgrade.disabled).toBe(true);
    expect(v.restore.disabled).toBe(true);
    expect(v.notNow.disabled).toBe(false);
  });

  it('keeps the roommate either way, and tells Free’s minutes honestly', () => {
    const v = view({ kind: 'dev' }, {}, vi);
    expect(v.stayEitherWay).toBe('Pip, hang và câu chuyện vẫn ở đây dù bạn chọn gì.');
    expect(v.table[1]).toEqual({
      feature: 'Phút gọi trực tiếp',
      free: '~10/tuần',
      plus: '~150/tháng*',
      header: false,
    });
    expect(v.restore.label).toBe('Khôi phục giao dịch');
    expect(v.autoRenew).toContain('tự động gia hạn');
  });

  it('buys and restores nothing until the store knows who the learner is', () => {
    const v = view({ kind: 'ready', offers: storeOffers }, { signedIn: false });
    expect(v.upgrade.disabled).toBe(true);
    expect(v.restore.disabled).toBe(true);
    expect(v.notNow.disabled).toBe(false);
  });

  it('closes after a purchase or a restore, and stays for anything else', () => {
    expect(purchaseMessage('purchased')).toEqual({ key: 'plus.welcome', close: true });
    expect(purchaseMessage('cancelled')).toEqual({ key: null, close: false });
    expect(purchaseMessage('unavailable').close).toBe(false);
    expect(restoreMessage('restored')).toEqual({ key: 'plus.restored', close: true });
    expect(restoreMessage('nothing')).toEqual({ key: 'plus.nothingToRestore', close: false });
    expect(restoreMessage('unavailable')).toEqual({ key: 'plus.unavailable', close: false });
  });
});
