import { runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { localDateOf, startOfLocalDay } from '@yapling/domain';

import { call, newGuest } from '../auth/testing/client';
import { userObject } from './object';
import { ScheduledPushJob } from './jobs';
import { userClock } from './user-object';

const DAY = 24 * 60 * 60_000;
const HCM = 'Asia/Ho_Chi_Minh';

async function putProfile(token: string, timezone: string) {
  const response = await call('/api/me/profile', {
    method: 'PUT',
    token,
    body: {
      displayName: 'Lan',
      firstLanguage: 'vi',
      roommate: { species: 'cat', name: 'Pip' },
      track: 'life',
      quietHours: null,
      timezone,
      notificationsAllowed: true,
    },
  });
  expect(response.status).toBe(200);
}

/** What an RPC call rejected with, or null; awaited at once so no rejection goes unhandled. */
async function rejection(call: Promise<unknown>): Promise<unknown> {
  try {
    await call;
    return null;
  } catch (error) {
    return error;
  }
}

/** Catches what goes to the jobs queue instead of sending it. */
function spySend() {
  type Sent = Awaited<ReturnType<Queue['send']>>;
  return vi.spyOn(env.JOBS, 'send').mockResolvedValue(undefined as unknown as Sent);
}

function setClock(at: number) {
  vi.spyOn(userClock, 'now').mockReturnValue(at);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the live-minute ledger', () => {
  it("starts the first week at the install day's local midnight and charges both talkers", async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    const before = await user.balance();
    expect(before).toMatchObject({
      plan: 'free',
      allowanceSeconds: 3_600,
      usedSeconds: 0,
      leftSeconds: 3_600,
      firstWeek: true,
    });
    // No profile yet: the launch timezone stands in.
    const today = localDateOf(Date.now(), HCM);
    expect(before.periodStart).toBe(startOfLocalDay(today, HCM));
    expect(before.periodEnd - before.periodStart).toBe(7 * DAY);

    expect(await user.charge(3_000, 'learner')).toEqual({
      secondsLeft: 600,
      wrappingUp: false,
      exhausted: false,
    });
    expect(await user.charge(560, 'character')).toEqual({
      secondsLeft: 40,
      wrappingUp: true,
      exhausted: false,
    });
    expect(await user.charge(100, 'learner')).toEqual({
      secondsLeft: 0,
      wrappingUp: true,
      exhausted: true,
    });
    expect(await user.balance()).toMatchObject({ usedSeconds: 3_660, leftSeconds: 0 });
  });

  it('moves to the weekly allowance after the first week', async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    const { periodStart } = await user.balance();
    await user.charge(1_000, 'learner');
    setClock(periodStart + 8 * DAY);
    expect(await user.balance()).toMatchObject({
      periodStart: periodStart + 7 * DAY,
      allowanceSeconds: 600,
      usedSeconds: 0,
      firstWeek: false,
    });
  });

  it('switches to Plus for the calendar month, and back', async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    await user.charge(3_600, 'learner');
    const paidAt = Date.UTC(2026, 9, 22, 9);
    setClock(paidAt);
    expect(await user.setPlan('plus', paidAt)).toMatchObject({
      plan: 'plus',
      periodStart: startOfLocalDay('2026-10-01', HCM),
      periodEnd: startOfLocalDay('2026-11-01', HCM),
      allowanceSeconds: 9_000,
      leftSeconds: 9_000,
      firstWeek: false,
    });
    await user.charge(600, 'character');
    // The next calendar month is a fresh allowance.
    setClock(startOfLocalDay('2026-11-01', HCM));
    expect(await user.balance()).toMatchObject({ usedSeconds: 0, leftSeconds: 9_000 });
    vi.restoreAllMocks();
    expect(await user.setPlan('free', paidAt)).toMatchObject({ plan: 'free', leftSeconds: 0 });
  });

  it("pins the periods to the learner's profile timezone and install day", async () => {
    const { userId, token } = await newGuest();
    await putProfile(token, 'America/Los_Angeles');
    const user = userObject(env, userId);
    const la = 'America/Los_Angeles';
    const today = localDateOf(Date.now(), la);
    expect(await user.balance()).toMatchObject({
      periodStart: startOfLocalDay(today, la),
      firstWeek: true,
    });
    await user.charge(100, 'learner');
    // Moving the profile's timezone can't open a fresh allowance.
    await putProfile(token, 'Pacific/Kiritimati');
    expect(await user.balance()).toMatchObject({
      periodStart: startOfLocalDay(today, la),
      usedSeconds: 100,
    });
  });

  it('refuses a charge that is not whole seconds', async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    expect(await rejection(user.charge(1.5, 'learner'))).toBeInstanceOf(Error);
    expect(await rejection(user.charge(-1, 'learner'))).toBeInstanceOf(Error);
    // @ts-expect-error: not a talk kind
    expect(await rejection(user.charge(10, 'narrator'))).toBeInstanceOf(Error);
  });
});

describe('scheduled pushes', () => {
  async function onboard(token: string, quietHours: unknown) {
    const response = await call('/api/me/profile', {
      method: 'PUT',
      token,
      body: {
        displayName: 'Lan',
        firstLanguage: 'vi',
        roommate: { species: 'cat', name: 'Pip' },
        track: 'life',
        quietHours,
        timezone: 'UTC',
        notificationsAllowed: true,
      },
    });
    expect(response.status).toBe(200);
  }

  it('hands a due push to the jobs queue when its alarm fires', async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    const send = spySend();
    const at = Date.now() + 60_000;
    const scheduled = await user.schedule('voicemail', at, { voicemailId: 'vm-1' });
    expect(await runInDurableObject(user, (_, state) => state.storage.getAlarm({}))).toBe(at);

    setClock(at);
    expect(await runDurableObjectAlarm(user)).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(ScheduledPushJob.parse(send.mock.calls[0]?.[0])).toEqual({
      type: 'scheduled_push',
      id: scheduled.id,
      userId,
      kind: 'voicemail',
      payload: { voicemailId: 'vm-1' },
      scheduledFor: at,
      firedAt: at,
    });
    expect(await user.pending()).toEqual([]);
    expect(await runInDurableObject(user, (_, state) => state.storage.getAlarm({}))).toBeNull();
  });

  it('holds a push due in quiet hours until they end', async () => {
    const session = await newGuest();
    await onboard(session.token, { start: '22:00', end: '08:00' });
    const user = userObject(env, session.userId);
    const send = spySend();
    const night = Date.UTC(2026, 10, 2, 23, 30);
    const morning = Date.UTC(2026, 10, 3, 8, 0);
    const scheduled = await user.schedule('incoming_call', night, { sceneId: 's1-e1' });

    setClock(night);
    await runDurableObjectAlarm(user);
    expect(send).not.toHaveBeenCalled();
    expect(await user.pending()).toEqual([{ id: scheduled.id, due: morning }]);

    setClock(morning);
    await runDurableObjectAlarm(user);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]).toMatchObject({ id: scheduled.id, scheduledFor: night });
  });

  it('sends nothing for a cancelled push', async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    const send = spySend();
    const at = Date.now() + 60_000;
    const { id } = await user.schedule('voicemail', at, {});
    expect(await user.cancel(id)).toBe(true);
    setClock(at);
    expect(await runDurableObjectAlarm(user)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuses an unknown kind or a large payload', async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    // @ts-expect-error: not a push kind
    expect(await rejection(user.schedule('knock', Date.now(), {}))).toBeInstanceOf(Error);
    expect(
      await rejection(user.schedule('voicemail', Date.now(), { text: 'x'.repeat(5_000) })),
    ).toBeInstanceOf(Error);
  });
});

describe('erasing the object', () => {
  it('clears the ledger, the schedule and the alarm', async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    await user.charge(100, 'learner');
    await user.schedule('voicemail', Date.now() + 60_000, {});
    await user.erase();
    expect(await runInDurableObject(user, (_, state) => state.storage.getAlarm({}))).toBeNull();
    expect(await user.pending()).toEqual([]);
    expect(await user.balance()).toMatchObject({ usedSeconds: 0 });
  });
});
