import {
  CanDoProgress,
  ErrorTargetProgress,
  Keepsake,
  PhraseProgress,
  Progress,
  WeekRing,
} from '@yapling/contracts';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { call, expectError, expectJson, newGuest } from '../auth/testing/client';
import { dayIndex, localDate } from './days';
import { updateProgress } from './store';

const at = 1_792_000_000_000;
const callRecordId = 'call_01';

const lists = z
  .object({
    phrases: z.array(PhraseProgress),
    errorTargets: z.array(ErrorTargetProgress),
    canDos: z.array(CanDoProgress),
    keepsakes: z.array(Keepsake),
    weeks: z.array(WeekRing),
  })
  .parse({
    phrases: [
      {
        id: 'could-i-get',
        text: 'Could I get…?',
        state: 'sprout',
        seedAt: at,
        sproutAt: at + 1,
        leafAt: null,
        bloomAt: null,
        lastUsedAt: at + 1,
        usedOn: ['2026-10-22'],
        contexts: ['s1-e1'],
      },
    ],
    errorTargets: [
      {
        id: 'past_ed',
        status: 'active',
        selfCorrections: 1,
        selfCorrectionDays: ['2026-10-22'],
        activatedAt: at,
        graduatedAt: null,
      },
    ],
    canDos: [
      {
        id: 'order-and-change',
        stage: 'newcomer',
        status: 'ticked',
        evidence: [{ callRecordId, quote: 'Could I get a kaya toast?', at }],
        witness: 'mei',
        tickedOn: '2026-10-23',
      },
    ],
    keepsakes: [
      {
        id: 'kp-order-and-change',
        kind: 'can_do',
        canDoId: 'order-and-change',
        signedBy: 'mei',
        earnedOn: '2026-10-23',
      },
    ],
    weeks: [
      {
        week: 1,
        slots: [
          { kind: 'episode', status: 'done', sceneId: 's1-e1', callRecordId, doneAt: at },
          { kind: 'real_week', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
          { kind: 'practice', status: 'upcoming', sceneId: null, callRecordId: null, doneAt: null },
        ],
      },
    ],
  });

async function read(token: string): Promise<Progress> {
  return Progress.parse(await expectJson(await call('/api/me/progress', { token })));
}

function put(token: string, body: unknown) {
  return call('/api/me/progress', { method: 'PUT', body, token });
}

describe('progress sync', () => {
  it('starts empty at revision 1 on day 1', async () => {
    const { token } = await newGuest();
    const progress = await read(token);
    expect(progress).toEqual({
      revision: 1,
      installedOn: localDate(Date.now(), 'UTC'),
      dayIndex: 1,
      phrases: [],
      errorTargets: [],
      canDos: [],
      keepsakes: [],
      weeks: [],
    });
  });

  it('takes the phone copy over its base revision and answers the next one', async () => {
    const { token } = await newGuest();
    const fresh = await read(token);
    const saved = Progress.parse(await expectJson(await put(token, { ...fresh, ...lists })));
    expect(saved).toEqual({ ...fresh, ...lists, revision: 2 });
    expect(await read(token)).toEqual(saved);
  });

  it('refuses a stale revision with a typed error, and the server copy stands', async () => {
    const { token } = await newGuest();
    const fresh = await read(token);
    const saved = Progress.parse(await expectJson(await put(token, { ...fresh, ...lists })));
    await expectError(await put(token, { ...fresh, phrases: [] }), 409, 'stale_revision');
    await expectError(await put(token, { ...saved, revision: 9 }), 409, 'stale_revision');
    expect(await read(token)).toEqual(saved);
  });

  it('keeps the install day and day index the server counts', async () => {
    const { token, userId } = await newGuest();
    await read(token);
    await env.DB.prepare('UPDATE progress SET installed_on = ? WHERE user_id = ?')
      .bind(localDate(Date.now() - 7 * 86_400_000, 'UTC'), userId)
      .run();
    const progress = await read(token);
    expect(progress.dayIndex).toBe(8);
    const saved = Progress.parse(
      await expectJson(await put(token, { ...progress, installedOn: '2020-01-01', dayIndex: 99 })),
    );
    expect(saved).toMatchObject({ installedOn: progress.installedOn, dayIndex: 8 });
  });

  it('refuses a body that breaks the contracts', async () => {
    const { token } = await newGuest();
    const fresh = await read(token);
    const active = lists.errorTargets[0];
    const threeActive = [active, { ...active, id: 'final_s' }, { ...active, id: 'articles' }];
    await expectError(
      await put(token, { ...fresh, errorTargets: threeActive }),
      400,
      'bad_request',
    );
    await expectError(
      await put(token, { ...fresh, weeks: [{ ...lists.weeks[0], week: 2 }] }),
      400,
      'bad_request',
    );
  });

  it('lets the server change it, retrying over a write that landed between', async () => {
    const { token, userId } = await newGuest();
    const fresh = await read(token);
    let runs = 0;
    const updated = await updateProgress(
      env.DB,
      userId,
      async (current) => {
        runs += 1;
        if (runs === 1) {
          // Another write lands between this read and its write.
          await expectJson(await put(token, { ...current, keepsakes: lists.keepsakes }));
        }
        return { ...current, phrases: lists.phrases };
      },
      Date.now(),
    );
    expect(runs).toBe(2);
    expect(updated).toMatchObject({
      revision: fresh.revision + 2,
      phrases: lists.phrases,
      keepsakes: lists.keepsakes,
    });
  });

  it('needs a session', async () => {
    await expectError(await call('/api/me/progress'), 401, 'unauthorized');
    await expectError(await put('z'.repeat(32), {}), 401, 'unauthorized');
  });
});

describe('days', () => {
  it('counts the install day as day 1 in the learner timezone', () => {
    // 2026-10-22 18:00 UTC is already the 23rd in Ho Chi Minh City.
    const instant = Date.UTC(2026, 9, 22, 18);
    expect(localDate(instant, 'UTC')).toBe('2026-10-22');
    expect(localDate(instant, 'Asia/Ho_Chi_Minh')).toBe('2026-10-23');
    expect(localDate(instant, 'Not/AZone')).toBe('2026-10-22');
    expect(dayIndex('2026-10-22', '2026-10-22')).toBe(1);
    expect(dayIndex('2026-10-22', '2026-10-29')).toBe(8);
    expect(dayIndex('2026-10-22', '2026-10-21')).toBe(1);
  });
});
