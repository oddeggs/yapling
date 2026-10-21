import { MinutesSummary } from '@yapling/contracts';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { call, expectError, expectJson, newGuest } from '../auth/testing/client';
import { userObject } from './object';

describe('GET /api/me/minutes', () => {
  it('answers the ledger of the learner object', async () => {
    const { token, userId } = await newGuest();
    await userObject(env, userId).charge(240, 'learner');
    const summary = MinutesSummary.parse(
      await expectJson(await call('/api/me/minutes', { token })),
    );
    expect(summary).toMatchObject({
      plan: 'free',
      allowanceSeconds: 3_600,
      usedSeconds: 240,
      leftSeconds: 3_360,
      firstWeek: true,
    });
  });

  it('needs a session', async () => {
    await expectError(await call('/api/me/minutes'), 401, 'unauthorized');
  });
});
