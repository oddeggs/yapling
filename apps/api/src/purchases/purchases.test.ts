import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { deleteAccount } from '../account';
import { createApp } from '../app';
import { expectError, expectJson, newGuest } from '../auth/testing/client';
import { userObject } from '../user';
import { readEntitlement } from './entitlements';
import { logicalProduct } from './products';

const SECRET = 'Bearer test-webhook-secret';
const DAY = 24 * 60 * 60_000;
const app = createApp();
const withSecret = { ...env, REVENUECAT_WEBHOOK_AUTH: SECRET };

let eventCounter = 0;

/** A RevenueCat event about Plus, as its webhook sends it. */
function plusEvent(userId: string, fields: Record<string, unknown> = {}) {
  eventCounter += 1;
  const now = Date.now();
  return {
    id: `evt-${crypto.randomUUID()}-${eventCounter}`,
    type: 'INITIAL_PURCHASE',
    app_user_id: userId,
    product_id: 'yapling_plus_monthly',
    entitlement_ids: ['plus'],
    period_type: 'NORMAL',
    purchased_at_ms: now - DAY,
    expiration_at_ms: now + 29 * DAY,
    event_timestamp_ms: now,
    store: 'APP_STORE',
    environment: 'SANDBOX',
    ...fields,
  };
}

async function deliver(event: unknown, authorization: string = SECRET): Promise<Response> {
  return app.request(
    '/api/purchases/webhook',
    {
      method: 'POST',
      headers: { authorization, 'content-type': 'application/json' },
      body: JSON.stringify({ api_version: '1.0', event }),
    },
    withSecret,
  );
}

async function outcomeOf(event: unknown): Promise<string> {
  return (await expectJson<{ outcome: string }>(await deliver(event))).outcome;
}

const balance = (userId: string) => userObject(env, userId).balance();

describe('the RevenueCat webhook', () => {
  it('is unavailable until its secret is set', async () => {
    for (const unset of [undefined, '']) {
      const response = await app.request(
        '/api/purchases/webhook',
        { method: 'POST', headers: { authorization: '' }, body: '{}' },
        { ...env, REVENUECAT_WEBHOOK_AUTH: unset },
      );
      await expectError(response, 503, 'not_configured');
    }
  });

  it('refuses a request without the shared secret', async () => {
    const { userId } = await newGuest();
    await expectError(await deliver(plusEvent(userId), 'Bearer wrong'), 401, 'unauthorized');
    await expectError(await deliver(plusEvent(userId), ''), 401, 'unauthorized');
    expect((await balance(userId)).plan).toBe('free');
  });

  it('refuses a body that is not an event', async () => {
    await expectError(await deliver({ type: 'INITIAL_PURCHASE' }), 400, 'bad_request');
  });

  it('moves the learner to Plus from the purchase period', async () => {
    const { userId } = await newGuest();
    const event = plusEvent(userId);
    expect(await outcomeOf(event)).toBe('applied');
    const summary = await balance(userId);
    expect(summary).toMatchObject({
      plan: 'plus',
      periodStart: event.purchased_at_ms,
      allowanceSeconds: 150 * 60,
      firstWeek: false,
    });
    expect(await readEntitlement(env.DB, userId)).toMatchObject({
      state: 'active',
      product: 'yapling_plus_monthly',
      environment: 'SANDBOX',
      willRenew: true,
    });
  });

  it('applies each event once', async () => {
    const { userId } = await newGuest();
    const event = plusEvent(userId);
    expect(await outcomeOf(event)).toBe('applied');
    await userObject(env, userId).charge(600, 'learner');
    expect(await outcomeOf(event)).toBe('duplicate');
    expect(await balance(userId)).toMatchObject({ plan: 'plus', usedSeconds: 600 });
  });

  it('starts a new month of minutes on renewal', async () => {
    const { userId } = await newGuest();
    const now = Date.now();
    await outcomeOf(
      plusEvent(userId, { purchased_at_ms: now - 31 * DAY, event_timestamp_ms: now - 31 * DAY }),
    );
    const renewal = plusEvent(userId, { type: 'RENEWAL', purchased_at_ms: now - DAY });
    expect(await outcomeOf(renewal)).toBe('applied');
    expect(await balance(userId)).toMatchObject({ plan: 'plus', periodStart: now - DAY });
  });

  it('keeps Plus to the end of the period after a cancellation, then expires to free', async () => {
    const { userId } = await newGuest();
    await outcomeOf(plusEvent(userId));
    expect(
      await outcomeOf(plusEvent(userId, { type: 'CANCELLATION', cancel_reason: 'UNSUBSCRIBE' })),
    ).toBe('applied');
    expect((await balance(userId)).plan).toBe('plus');
    expect(await readEntitlement(env.DB, userId)).toMatchObject({
      state: 'active',
      willRenew: false,
    });

    const now = Date.now();
    const expiry = plusEvent(userId, {
      type: 'EXPIRATION',
      expiration_at_ms: now,
      event_timestamp_ms: now + 1,
    });
    expect(await outcomeOf(expiry)).toBe('applied');
    expect(await balance(userId)).toMatchObject({ plan: 'free', allowanceSeconds: 3_600 });
    expect((await readEntitlement(env.DB, userId))?.state).toBe('expired');
  });

  it('ends Plus at once on a refund', async () => {
    const { userId } = await newGuest();
    await outcomeOf(plusEvent(userId));
    const now = Date.now();
    const refund = plusEvent(userId, {
      type: 'CANCELLATION',
      cancel_reason: 'CUSTOMER_SUPPORT',
      expiration_at_ms: now,
      event_timestamp_ms: now + 1,
    });
    expect(await outcomeOf(refund)).toBe('applied');
    expect((await balance(userId)).plan).toBe('free');
  });

  it('lets no late, older event undo a newer one', async () => {
    const { userId } = await newGuest();
    const now = Date.now();
    await outcomeOf(
      plusEvent(userId, { type: 'EXPIRATION', expiration_at_ms: now, event_timestamp_ms: now }),
    );
    const late = plusEvent(userId, {
      event_timestamp_ms: now - DAY,
      purchased_at_ms: now - 2 * DAY,
    });
    expect(await outcomeOf(late)).toBe('applied');
    expect((await balance(userId)).plan).toBe('free');
  });

  it('acknowledges events about other things without changing the plan', async () => {
    const { userId } = await newGuest();
    expect(await outcomeOf(plusEvent(userId, { type: 'TEST' }))).toBe('ignored');
    expect(await outcomeOf(plusEvent(userId, { type: 'BILLING_ISSUE' }))).toBe('ignored');
    expect(
      await outcomeOf(plusEvent(userId, { product_id: 'something_else', entitlement_ids: [] })),
    ).toBe('ignored');
    expect(await outcomeOf(plusEvent('no-such-learner'))).toBe('ignored');
    expect((await balance(userId)).plan).toBe('free');
  });

  it('reads the dev app’s product ids in the dev environment', async () => {
    const { userId } = await newGuest();
    const event = plusEvent(userId, {
      product_id: 'yapling_plus_yearly.dev',
      entitlement_ids: null,
    });
    expect(await outcomeOf(event)).toBe('applied');
    expect((await readEntitlement(env.DB, userId))?.product).toBe('yapling_plus_yearly');
    expect(logicalProduct('yapling_plus_yearly.dev', 'prd')).toBeNull();
    expect(logicalProduct('yapling_plus_yearly', 'prd')).toBe('yapling_plus_yearly');
  });

  it('moves Plus to the account a restore transferred it to', async () => {
    const from = await newGuest();
    const into = await newGuest();
    await outcomeOf(plusEvent(from.userId));
    const transfer = {
      id: `evt-${crypto.randomUUID()}`,
      type: 'TRANSFER',
      transferred_from: [from.userId],
      transferred_to: [into.userId],
      event_timestamp_ms: Date.now(),
    };
    expect(await outcomeOf(transfer)).toBe('applied');
    expect((await balance(from.userId)).plan).toBe('free');
    expect((await balance(into.userId)).plan).toBe('plus');
    expect(await readEntitlement(env.DB, from.userId)).toBeNull();
  });

  it('forgets the purchase with the account', async () => {
    const { userId } = await newGuest();
    await outcomeOf(plusEvent(userId));
    await deleteAccount(env, userId, Date.now());
    expect(await readEntitlement(env.DB, userId)).toBeNull();
  });
});
