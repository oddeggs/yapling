import { Profile } from '@yapling/contracts';
import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { call, expectError, expectJson, newGuest } from '../auth/testing/client';
import { setStage } from './store';

const onboarding = {
  displayName: 'Lan',
  firstLanguage: 'vi',
  roommate: { species: 'redpanda', name: 'Pip' },
  track: 'work',
  quietHours: { start: '22:00', end: '08:00' },
  timezone: 'Asia/Ho_Chi_Minh',
  notificationsAllowed: true,
};

async function onboarded() {
  const session = await newGuest();
  const response = await call('/api/me/profile', {
    method: 'PUT',
    body: onboarding,
    token: session.token,
  });
  return { session, profile: Profile.parse(await expectJson(response)) };
}

describe('the profile', () => {
  it('is not there before onboarding', async () => {
    const { token } = await newGuest();
    await expectError(await call('/api/me/profile', { token }), 404, 'not_found');
    await expectError(
      await call('/api/me/profile', { method: 'PATCH', body: { displayName: 'Lan' }, token }),
      404,
      'not_found',
    );
  });

  it('is written at the end of onboarding, at Newcomer, and read back', async () => {
    const { session, profile } = await onboarded();
    expect(profile).toMatchObject({ ...onboarding, revision: 1, stage: 'newcomer' });
    const read = await expectJson(await call('/api/me/profile', { token: session.token }));
    expect(read).toEqual(profile);
  });

  it('takes edits to some fields and grows the revision', async () => {
    const { session } = await onboarded();
    const response = await call('/api/me/profile', {
      method: 'PATCH',
      body: { quietHours: null, roommate: { species: 'cat', name: 'Bơ' }, track: 'both' },
      token: session.token,
    });
    const edited = Profile.parse(await expectJson(response));
    expect(edited).toMatchObject({
      ...onboarding,
      quietHours: null,
      roommate: { species: 'cat', name: 'Bơ' },
      track: 'both',
      revision: 2,
    });
  });

  it("keeps the learner's pace: asked after onboarding, kept by a whole-profile write", async () => {
    const { session, profile } = await onboarded();
    expect(profile.pace).toBeNull();
    const token = session.token;
    const patch = await call('/api/me/profile', {
      method: 'PATCH',
      body: { pace: 'slower' },
      token,
    });
    expect(Profile.parse(await expectJson(patch)).pace).toBe('slower');
    const kept = await call('/api/me/profile', { method: 'PUT', body: onboarding, token });
    expect(Profile.parse(await expectJson(kept)).pace).toBe('slower');
    const cleared = await call('/api/me/profile', {
      method: 'PUT',
      body: { ...onboarding, pace: null },
      token,
    });
    expect(Profile.parse(await expectJson(cleared)).pace).toBeNull();
    await expectError(
      await call('/api/me/profile', { method: 'PATCH', body: { pace: 'fast' }, token }),
      400,
      'bad_request',
    );
  });

  it('keeps the story start and start path, which an older app never sends', async () => {
    const { session, profile } = await onboarded();
    expect(profile).toMatchObject({ storyStartedOn: null, startPath: null });
    const token = session.token;

    // A PATCH with only these is an edit.
    const patch = await call('/api/me/profile', {
      method: 'PATCH',
      body: { storyStartedOn: '2026-10-27' },
      token,
    });
    expect(Profile.parse(await expectJson(patch))).toMatchObject({
      storyStartedOn: '2026-10-27',
      startPath: null,
      revision: 2,
    });
    const path = await call('/api/me/profile', {
      method: 'PATCH',
      body: { startPath: 'visitor' },
      token,
    });
    expect(Profile.parse(await expectJson(path))).toMatchObject({
      storyStartedOn: '2026-10-27',
      startPath: 'visitor',
    });

    // An older app's whole-profile write keeps both.
    const kept = await call('/api/me/profile', { method: 'PUT', body: onboarding, token });
    expect(Profile.parse(await expectJson(kept))).toMatchObject({
      storyStartedOn: '2026-10-27',
      startPath: 'visitor',
    });
    const read = Profile.parse(await expectJson(await call('/api/me/profile', { token })));
    expect(read).toMatchObject({ storyStartedOn: '2026-10-27', startPath: 'visitor' });

    // A newer app's sets them, null included.
    const set = await call('/api/me/profile', {
      method: 'PUT',
      body: { ...onboarding, storyStartedOn: null, startPath: 'placement' },
      token,
    });
    expect(Profile.parse(await expectJson(set))).toMatchObject({
      storyStartedOn: null,
      startPath: 'placement',
    });

    for (const body of [{ startPath: 'beginner' }, { storyStartedOn: '27/10/2026' }]) {
      await expectError(
        await call('/api/me/profile', { method: 'PATCH', body, token }),
        400,
        'bad_request',
      );
    }
  });

  it('takes the story start and start path at onboarding', async () => {
    const { token } = await newGuest();
    const response = await call('/api/me/profile', {
      method: 'PUT',
      body: { ...onboarding, startPath: 'visitor', storyStartedOn: null },
      token,
    });
    expect(Profile.parse(await expectJson(response))).toMatchObject({
      revision: 1,
      stage: 'newcomer',
      startPath: 'visitor',
      storyStartedOn: null,
    });
  });

  it('never takes the stage from the client', async () => {
    const { session } = await onboarded();
    const put = await call('/api/me/profile', {
      method: 'PUT',
      body: { ...onboarding, stage: 'voice' },
      token: session.token,
    });
    expect(Profile.parse(await expectJson(put)).stage).toBe('newcomer');

    const patch = await call('/api/me/profile', {
      method: 'PATCH',
      body: { stage: 'local', displayName: 'Lan Anh' },
      token: session.token,
    });
    expect(Profile.parse(await expectJson(patch))).toMatchObject({
      stage: 'newcomer',
      displayName: 'Lan Anh',
    });

    // A stage alone is an empty edit.
    await expectError(
      await call('/api/me/profile', {
        method: 'PATCH',
        body: { stage: 'regular' },
        token: session.token,
      }),
      400,
      'bad_request',
    );
  });

  it('takes the stage from the server, which a later PUT keeps', async () => {
    const { session } = await onboarded();
    expect(await setStage(env.DB, session.userId, 'regular', Date.now())).toBe(true);
    const put = await call('/api/me/profile', {
      method: 'PUT',
      body: onboarding,
      token: session.token,
    });
    expect(Profile.parse(await expectJson(put))).toMatchObject({ stage: 'regular', revision: 3 });
    expect(await setStage(env.DB, 'nobody', 'regular', Date.now())).toBe(false);
  });

  it('refuses a bad body', async () => {
    const { token } = await newGuest();
    for (const body of [
      { ...onboarding, displayName: ' Lan' },
      { ...onboarding, timezone: '+07:00' },
      { ...onboarding, track: undefined },
    ]) {
      await expectError(
        await call('/api/me/profile', { method: 'PUT', body, token }),
        400,
        'bad_request',
      );
    }
  });

  it('needs a session', async () => {
    await expectError(await call('/api/me/profile'), 401, 'unauthorized');
    await expectError(
      await call('/api/me/profile', { method: 'PUT', body: onboarding }),
      401,
      'unauthorized',
    );
    await expectError(
      await call('/api/me/profile', { method: 'PATCH', body: { track: 'life' } }),
      401,
      'unauthorized',
    );
  });
});
