import { describe, expect, it } from '@jest/globals';
import type { WeekRing } from '@yapling/contracts';

import { CACHE_KEYS } from '../../src/data/storage';
import { hungKeepsakes } from '../../src/features/payoff/keepsake-model';
import { FakeApi, launch, newPhone } from './fake-api';

/*
 * The season keepsake, kept on the server once the season's last episode is played: the burrow
 * wall hangs it after a reinstall, or on another phone the learner signs in on.
 */

const lastEpisodeAt = Date.UTC(2026, 11, 3, 3); // 10:00 on 3 Dec in Hồ Chí Minh City

/** Weeks 1–6, every episode played up to `upTo`. */
const rings = (upTo: number): WeekRing[] =>
  [1, 2, 3, 4, 5, 6].map((week) => ({
    week,
    slots: [
      week <= upTo
        ? {
            kind: 'episode' as const,
            status: 'done' as const,
            sceneId: `s1-e${week}`,
            callRecordId: `call_e${week}`,
            doneAt: lastEpisodeAt - (6 - week) * 7 * 86_400_000,
          }
        : {
            kind: 'episode' as const,
            status: 'open' as const,
            sceneId: `s1-e${week}`,
            callRecordId: null,
            doneAt: null,
          },
      { kind: 'real_week', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
      { kind: 'practice', status: 'open', sceneId: null, callRecordId: null, doneAt: null },
    ],
  }));

const learner = { name: 'Lan', roommateName: 'Pip' };

describe('the season keepsake on the server', () => {
  it('is kept once the season is over, and hangs on the wall of a new phone', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const data = launch(api, phone);
    await data.start();
    await data.progress.update((p) => ({ ...p, weeks: rings(6) }));

    const kept = await data.progress.keepSeasonKeepsake(1);
    expect(kept?.keepsakes).toEqual([
      { id: 'season-1', kind: 'season', canDoId: null, signedBy: 'mei', earnedOn: '2026-12-03' },
    ]);
    expect(phone.cache.values.get(CACHE_KEYS.progress)).toContain('season-1');

    // Asked again (the wrap opened twice): nothing more is sent.
    await data.progress.keepSeasonKeepsake(1);
    expect(api.requests('POST', '/api/me/keepsakes/season')).toHaveLength(1);

    // A reinstall: a new phone, the same learner's progress from the server.
    const userId = data.session.state.session?.userId ?? '';
    const progress = api.progress.get(userId);
    if (progress === undefined) throw new Error('kept');
    const wall = hungKeepsakes(progress, learner);
    expect(wall.at(-1)).toMatchObject({
      id: 'season-1',
      heading: 'Lan helped…',
      canDo: 'keep the Lantern Café open!',
      witnessed: 'signed by Mei · Dec 3',
      witness: 'mei',
    });
  });

  it('is refused before the season is over, and the phone keeps what it had', async () => {
    const api = new FakeApi();
    const data = launch(api, newPhone());
    await data.start();
    await data.progress.update((p) => ({ ...p, weeks: rings(5) }));
    await expect(data.progress.keepSeasonKeepsake(1)).rejects.toMatchObject({
      code: 'season_not_finished',
    });
    expect(data.progress.resource.data?.keepsakes).toEqual([]);
  });

  it('waits offline, and is asked for again the next time', async () => {
    const api = new FakeApi();
    const data = launch(api, newPhone());
    await data.start();
    await data.progress.update((p) => ({ ...p, weeks: rings(6) }));
    api.offline = true;
    await expect(data.progress.keepSeasonKeepsake(1)).rejects.toMatchObject({ kind: 'network' });
    api.offline = false;
    const kept = await data.progress.keepSeasonKeepsake(1);
    expect(kept?.keepsakes.map((k) => k.id)).toEqual(['season-1']);
  });
});
