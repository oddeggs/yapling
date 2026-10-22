import { Profile, type Stage } from '@yapling/contracts';
import { env } from 'cloudflare:workers';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { call, expectError, expectJson, newGuest } from '../auth/testing/client';
import { applyPlacement, stageChanges } from './stage';
import { setStage } from './store';

const onboarding = {
  displayName: 'Lan',
  firstLanguage: 'vi',
  roommate: { species: 'redpanda', name: 'Pip' },
  track: 'work',
  quietHours: null,
  timezone: 'Asia/Ho_Chi_Minh',
  notificationsAllowed: true,
};

async function onboarded(extra: object = {}) {
  const session = await newGuest();
  const response = await call('/api/me/profile', {
    method: 'PUT',
    body: { ...onboarding, ...extra },
    token: session.token,
  });
  expect(response.status).toBe(200);
  return session;
}

function ask(token: string, body: unknown) {
  return call('/api/me/stage', { method: 'POST', body, token });
}

async function asked(token: string, to: Stage, reason: string): Promise<Profile> {
  return Profile.parse(await expectJson(await ask(token, { to, reason })));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/me/stage', () => {
  it('moves the stage the learner asks for, and records each move', async () => {
    const { token, userId } = await onboarded({ startPath: 'visitor' });
    // "Mình mới bắt đầu" at onboarding.
    expect(await asked(token, 'visitor', 'self_select')).toMatchObject({
      stage: 'visitor',
      revision: 2,
    });
    // "Ở lại thêm" at the end of week 1: recorded, nothing changes.
    expect(await asked(token, 'visitor', 'stay')).toMatchObject({
      stage: 'visitor',
      revision: 2,
    });
    // Linh's Newcomer card.
    expect(await asked(token, 'newcomer', 'stage_up')).toMatchObject({ stage: 'newcomer' });
    // "Thử nhanh hơn", then "Khó quá" back down.
    expect(await asked(token, 'neighbour', 'too_easy')).toMatchObject({ stage: 'neighbour' });
    expect(await asked(token, 'newcomer', 'too_hard')).toMatchObject({ stage: 'newcomer' });
    // "Tập với Linh trước" takes a Newcomer to Visitor.
    expect(await asked(token, 'visitor', 'too_hard')).toMatchObject({
      stage: 'visitor',
      revision: 6,
    });

    const changes = await stageChanges(env.DB, userId);
    expect(changes.map(({ reason, from, to, callId }) => ({ reason, from, to, callId }))).toEqual([
      { reason: 'self_select', from: 'newcomer', to: 'visitor', callId: null },
      { reason: 'stay', from: 'visitor', to: 'visitor', callId: null },
      { reason: 'stage_up', from: 'visitor', to: 'newcomer', callId: null },
      { reason: 'too_easy', from: 'newcomer', to: 'neighbour', callId: null },
      { reason: 'too_hard', from: 'neighbour', to: 'newcomer', callId: null },
      { reason: 'too_hard', from: 'newcomer', to: 'visitor', callId: null },
    ]);
    expect(changes.every((c) => Number.isInteger(c.at) && c.at > 0)).toBe(true);
  });

  it('logs each move for the call logs, without the learner', async () => {
    const { token, userId } = await onboarded();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    await asked(token, 'visitor', 'self_select');
    expect(log).toHaveBeenCalledWith({
      msg: 'stage change',
      reason: 'self_select',
      from: 'newcomer',
      to: 'visitor',
      callId: null,
    });
    expect(JSON.stringify(log.mock.calls)).not.toContain(userId);
  });

  it("refuses a move that doesn't fit the stage, and records nothing", async () => {
    const { token, userId } = await onboarded();
    for (const body of [
      // Linh's card is only a Visitor's.
      { to: 'neighbour', reason: 'stage_up' },
      // One stage at a time.
      { to: 'regular', reason: 'too_easy' },
      // "Stay" is the stage the learner has.
      { to: 'visitor', reason: 'stay' },
      // The onboarding question is Visitor or Newcomer only.
      { to: 'local', reason: 'self_select' },
    ]) {
      await expectError(await ask(token, body), 409, 'stage_conflict');
    }
    await setStage(env.DB, userId, 'regular', Date.now());
    await expectError(
      await ask(token, { to: 'visitor', reason: 'self_select' }),
      409,
      'stage_conflict',
    );
    expect(await stageChanges(env.DB, userId)).toEqual([]);
    const profile = Profile.parse(await expectJson(await call('/api/me/profile', { token })));
    expect(profile.stage).toBe('regular');
  });

  it('refuses a bad body, and answers not found before onboarding', async () => {
    const { token } = await onboarded();
    for (const body of [
      { to: 'beginner', reason: 'too_hard' },
      { to: 'visitor', reason: 'placement' },
      { to: 'visitor' },
      {},
    ]) {
      await expectError(await ask(token, body), 400, 'bad_request');
    }
    const guest = await newGuest();
    await expectError(
      await ask(guest.token, { to: 'visitor', reason: 'self_select' }),
      404,
      'not_found',
    );
  });

  it('needs a session', async () => {
    await expectError(
      await call('/api/me/stage', { method: 'POST', body: { to: 'visitor', reason: 'stay' } }),
      401,
      'unauthorized',
    );
  });
});

describe('the placement call setting the stage', () => {
  const now = 1_792_000_000_000;

  it('places a learner as a Visitor when at most one open box was fine', async () => {
    const { token, userId } = await onboarded({ startPath: 'placement' });
    expect(
      await applyPlacement(
        env.DB,
        userId,
        { callId: 'call_a0', openBoxesFine: [false, true] },
        now,
      ),
    ).toEqual({ applied: true, stage: 'visitor' });
    const profile = Profile.parse(await expectJson(await call('/api/me/profile', { token })));
    expect(profile).toMatchObject({ stage: 'visitor', revision: 2 });
    expect(await stageChanges(env.DB, userId)).toEqual([
      { reason: 'placement', from: 'newcomer', to: 'visitor', callId: 'call_a0', at: now },
    ]);
  });

  it('keeps a learner at Newcomer when two open boxes were fine, and records it', async () => {
    const { token, userId } = await onboarded({ startPath: 'placement' });
    expect(
      await applyPlacement(
        env.DB,
        userId,
        { callId: 'call_a2', openBoxesFine: [true, false, true] },
        now,
      ),
    ).toEqual({ applied: true, stage: 'newcomer' });
    const profile = Profile.parse(await expectJson(await call('/api/me/profile', { token })));
    expect(profile).toMatchObject({ stage: 'newcomer', revision: 1 });
    expect(await stageChanges(env.DB, userId)).toHaveLength(1);
  });

  it('applies once: a retry or a later placement call changes nothing', async () => {
    const { token, userId } = await onboarded({ startPath: 'placement' });
    const first = { callId: 'call_1', openBoxesFine: [true, true, true] };
    expect(await applyPlacement(env.DB, userId, first, now)).toEqual({
      applied: true,
      stage: 'newcomer',
    });
    expect(await applyPlacement(env.DB, userId, first, now)).toEqual({
      applied: false,
      reason: 'placed',
      stage: 'newcomer',
    });
    const later = { callId: 'call_2', openBoxesFine: [false, false] };
    expect(await applyPlacement(env.DB, userId, later, now + 1)).toMatchObject({
      applied: false,
      reason: 'placed',
    });
    const profile = Profile.parse(await expectJson(await call('/api/me/profile', { token })));
    expect(profile.stage).toBe('newcomer');
    expect(await stageChanges(env.DB, userId)).toHaveLength(1);
  });

  it("leaves a learner who didn't choose the placement path, or has moved on", async () => {
    const fine = { callId: 'call_x', openBoxesFine: [false, false] };
    // An older app never sends a start path: today's behaviour, Newcomer stays.
    const older = await onboarded();
    expect(await applyPlacement(env.DB, older.userId, fine, now)).toEqual({
      applied: false,
      reason: 'not_placement_path',
      stage: 'newcomer',
    });
    const visitor = await onboarded({ startPath: 'visitor' });
    expect(await applyPlacement(env.DB, visitor.userId, fine, now)).toMatchObject({
      applied: false,
      reason: 'not_placement_path',
    });
    const movedOn = await onboarded({ startPath: 'placement' });
    await setStage(env.DB, movedOn.userId, 'neighbour', now);
    expect(await applyPlacement(env.DB, movedOn.userId, fine, now)).toEqual({
      applied: false,
      reason: 'moved_on',
      stage: 'neighbour',
    });
    const guest = await newGuest();
    expect(await applyPlacement(env.DB, guest.userId, fine, now)).toEqual({
      applied: false,
      reason: 'no_profile',
      stage: null,
    });
    for (const id of [older.userId, visitor.userId, movedOn.userId]) {
      expect(await stageChanges(env.DB, id)).toEqual([]);
    }
  });

  it('lets the learner move a placed stage afterwards', async () => {
    const { token, userId } = await onboarded({ startPath: 'placement' });
    await applyPlacement(env.DB, userId, { callId: 'call_p', openBoxesFine: [] }, now);
    // "Vào thẳng truyện" on the Visitor's card.
    expect(await asked(token, 'newcomer', 'too_easy')).toMatchObject({ stage: 'newcomer' });
    expect((await stageChanges(env.DB, userId)).map((c) => c.reason)).toEqual([
      'placement',
      'too_easy',
    ]);
  });
});
