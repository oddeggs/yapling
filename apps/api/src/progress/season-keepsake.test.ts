import { Progress, type WeekRing } from '@yapling/contracts';
import { describe, expect, it } from 'vitest';

import { call, expectError, expectJson, newGuest } from '../auth/testing/client';

/*
 * The season keepsake on the server: kept in progress once the stored rings show every episode of
 * the season played, so the burrow wall hangs it after a reinstall or on another phone.
 */

const lastEpisodeAt = Date.UTC(2026, 11, 3, 3); // 10:00 on 3 Dec in Hồ Chí Minh City

/** Weeks 1–6 with the episodes in `played` done (Episode 6 last, on `lastEpisodeAt`). */
const rings = (played: readonly number[]): WeekRing[] =>
  [1, 2, 3, 4, 5, 6].map((week) => {
    const done = played.includes(week);
    return {
      week,
      slots: [
        {
          kind: 'episode',
          status: done ? 'done' : 'open',
          sceneId: `s1-e${week}`,
          callRecordId: done ? `call_e${week}` : null,
          doneAt: done ? lastEpisodeAt - (6 - week) * 7 * 86_400_000 : null,
        },
        { kind: 'real_week', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
        { kind: 'practice', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
      ],
    };
  });

async function read(token: string): Promise<Progress> {
  return Progress.parse(await expectJson(await call('/api/me/progress', { token })));
}

async function withRings(token: string, played: readonly number[]): Promise<Progress> {
  const current = await read(token);
  const body = { ...current, weeks: rings(played) };
  return Progress.parse(
    await expectJson(await call('/api/me/progress', { method: 'PUT', body, token })),
  );
}

const ask = (token: string, season = 1) =>
  call('/api/me/keepsakes/season', { method: 'POST', body: { season }, token });

describe('the season keepsake', () => {
  it('is refused while an episode is still to play, a missed one included', async () => {
    const { token } = await newGuest();
    await withRings(token, [1, 2, 3, 4, 5]);
    await expectError(await ask(token), 409, 'season_not_finished');
    await withRings(token, [1, 2, 4, 5, 6]);
    await expectError(await ask(token), 409, 'season_not_finished');
    expect((await read(token)).keepsakes).toEqual([]);
  });

  it('is kept once the last episode is played, dated by its slot and signed by Mei', async () => {
    const { token } = await newGuest();
    const before = await withRings(token, [1, 2, 3, 4, 5, 6]);
    const kept = Progress.parse(await expectJson(await ask(token)));
    const keepsake = {
      id: 'season-1',
      kind: 'season',
      canDoId: null,
      signedBy: 'mei',
      earnedOn: '2026-12-03',
    };
    expect(kept.keepsakes).toEqual([keepsake]);
    expect(kept.revision).toBe(before.revision + 1);
    // Another phone (or a reinstall) reads it from progress.
    expect((await read(token)).keepsakes).toEqual([keepsake]);
  });

  it('answers the same progress when asked again', async () => {
    const { token } = await newGuest();
    await withRings(token, [1, 2, 3, 4, 5, 6]);
    const first = Progress.parse(await expectJson(await ask(token)));
    const again = Progress.parse(await expectJson(await ask(token)));
    expect(again).toEqual(first);
  });

  it('survives a phone writing its copy from before the keepsake (the server wins the conflict)', async () => {
    const { token } = await newGuest();
    const stale = await withRings(token, [1, 2, 3, 4, 5, 6]);
    await expectJson(await ask(token));
    await expectError(
      await call('/api/me/progress', { method: 'PUT', body: stale, token }),
      409,
      'stale_revision',
    );
    expect((await read(token)).keepsakes.map((k) => k.id)).toEqual(['season-1']);
  });

  it('knows only the seasons there are, and needs a session', async () => {
    const { token } = await newGuest();
    await expectError(await ask(token, 2), 404, 'not_found');
    await expectError(await ask(token, 0), 400, 'bad_request');
    const anonymous = await call('/api/me/keepsakes/season', {
      method: 'POST',
      body: { season: 1 },
    });
    expect(anonymous.status).toBe(401);
  });
});
