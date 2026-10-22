import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { addDays, localDateOf, startOfLocalDay } from '@yapling/domain';

import { call, newGuest } from '../auth/testing/client';
import { userObject } from './object';
import { userClock } from './user-object';

const DAY = 24 * 60 * 60_000;
const HCM = 'Asia/Ho_Chi_Minh';

const onboarding = {
  displayName: 'Lan',
  firstLanguage: 'vi',
  roommate: { species: 'cat', name: 'Pip' },
  track: 'life',
  quietHours: null,
  timezone: HCM,
  notificationsAllowed: true,
};

async function profile(token: string, method: 'PUT' | 'PATCH', body: object) {
  const response = await call('/api/me/profile', { method, token, body });
  expect(response.status, await response.clone().text()).toBe(200);
}

function setClock(at: number) {
  vi.spyOn(userClock, 'now').mockReturnValue(at);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the ledger and the story start', () => {
  const today = localDateOf(Date.now(), HCM);
  const installMidnight = startOfLocalDay(today, HCM);

  it("starts a Visitor's generous first week on the day the story started, once it has", async () => {
    const { userId, token } = await newGuest();
    await profile(token, 'PUT', { ...onboarding, startPath: 'visitor', storyStartedOn: null });
    const user = userObject(env, userId);
    // Settling in: the weeks count from the install day meanwhile.
    expect(await user.balance()).toMatchObject({ periodStart: installMidnight, firstWeek: true });
    await user.charge(300, 'learner');

    // The letter comes on day 3; a start still to come doesn't count yet.
    const storyDay = addDays(today, 2);
    await profile(token, 'PATCH', { storyStartedOn: storyDay });
    expect(await user.balance()).toMatchObject({ periodStart: installMidnight, usedSeconds: 300 });

    const storyMidnight = startOfLocalDay(storyDay, HCM);
    setClock(storyMidnight + 60 * 60_000);
    expect(await user.balance()).toMatchObject({
      periodStart: storyMidnight,
      periodEnd: storyMidnight + 7 * DAY,
      allowanceSeconds: 3_600,
      usedSeconds: 0,
      firstWeek: true,
    });
    await user.charge(100, 'character');

    // Pinned: moving the story start can't open a fresh first week.
    await profile(token, 'PATCH', { storyStartedOn: addDays(today, 3) });
    setClock(storyMidnight + DAY + 60 * 60_000);
    expect(await user.balance()).toMatchObject({ periodStart: storyMidnight, usedSeconds: 100 });
    setClock(storyMidnight + 7 * DAY + 60 * 60_000);
    expect(await user.balance()).toMatchObject({
      periodStart: storyMidnight + 7 * DAY,
      allowanceSeconds: 600,
      firstWeek: false,
    });
  });

  it('keeps a profile from an older app on the install day', async () => {
    const { userId, token } = await newGuest();
    // An older app's onboarding: no start path, no story start.
    await profile(token, 'PUT', onboarding);
    const user = userObject(env, userId);
    await user.charge(200, 'learner');
    expect(await user.balance()).toMatchObject({ periodStart: installMidnight, usedSeconds: 200 });
    // A story start sent later doesn't move the weeks: the story started on the install day.
    await profile(token, 'PATCH', { storyStartedOn: addDays(today, 1) });
    setClock(installMidnight + 2 * DAY);
    expect(await user.balance()).toMatchObject({ periodStart: installMidnight, usedSeconds: 200 });
  });

  it('never starts the story before the install day', async () => {
    const { userId, token } = await newGuest();
    await profile(token, 'PUT', {
      ...onboarding,
      startPath: 'placement',
      storyStartedOn: addDays(today, -5),
    });
    expect(await userObject(env, userId).balance()).toMatchObject({
      periodStart: installMidnight,
      firstWeek: true,
    });
  });
});

describe('unmetered calls', () => {
  it('charges a Settling-in call nothing, and never wraps it up or runs it out', async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    expect(await user.charge(600, 'learner', 'settling')).toEqual({
      secondsLeft: 3_600,
      wrappingUp: false,
      exhausted: false,
    });
    expect(await user.balance()).toMatchObject({ usedSeconds: 0 });

    // A charge without a call kind (as the call sends it today) is metered.
    expect(await user.charge(3_600, 'learner')).toMatchObject({ exhausted: true });
    expect(await user.charge(10, 'character', 'episode')).toMatchObject({ exhausted: true });
    expect(await user.charge(30, 'character', 'settling')).toEqual({
      secondsLeft: 0,
      wrappingUp: false,
      exhausted: false,
    });
    expect(await user.balance()).toMatchObject({ usedSeconds: 3_610 });
  });

  it('lets a Settling-in call start with no minutes left, and no metered call', async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    expect(await user.canStart('placement')).toBe(true);
    await user.charge(3_600, 'learner');
    expect(await user.canStart('settling')).toBe(true);
    expect(await user.canStart('episode')).toBe(false);
    expect(await user.canStart('placement')).toBe(false);
  });

  it("charges Pip's minute nothing, and lets it start in a week with no minutes left", async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    await user.charge(3_000, 'learner', 'episode');
    const before = await user.balance();
    expect(await user.charge(45, 'learner', 'daily')).toEqual({
      secondsLeft: before.leftSeconds,
      wrappingUp: false,
      exhausted: false,
    });
    expect(await user.charge(40, 'character', 'daily')).toMatchObject({ wrappingUp: false });
    expect(await user.balance()).toMatchObject({ usedSeconds: before.usedSeconds });
    await user.charge(600, 'learner', 'practice');
    expect(await user.canStart('practice')).toBe(false);
    expect(await user.canStart('daily')).toBe(true);
  });

  it('refuses an unknown call kind', async () => {
    const { userId } = await newGuest();
    const user = userObject(env, userId);
    let refused: unknown = null;
    try {
      // @ts-expect-error: not a call kind
      await user.charge(10, 'learner', 'chat');
    } catch (error) {
      refused = error;
    }
    expect(refused).toBeInstanceOf(Error);
  });
});
