import { describe, expect, it } from '@jest/globals';

import { Connectivity } from '../../src/data/connectivity';
import { FakeApi, launch, newPhone, profileInput, settle } from './fake-api';

describe('connectivity', () => {
  it('probes with backoff while the API is unreachable, and stops once it answers', () => {
    const timers: { run: () => void; ms: number }[] = [];
    const connectivity = new Connectivity(
      (run, ms) => {
        timers.push({ run, ms });
        return () => undefined;
      },
      [10, 20],
    );
    let probes = 0;
    connectivity.setProbe(() => {
      probes += 1;
      connectivity.reportNoAnswer();
      return Promise.resolve();
    });
    let back = 0;
    connectivity.onBackOnline(() => (back += 1));

    connectivity.reportNoAnswer();
    timers.shift()?.run();
    timers.shift()?.run();
    expect(probes).toBe(2);
    expect(timers.map((t) => t.ms)).toEqual([20]);
    connectivity.reportAnswer();
    expect(connectivity.online).toBe(true);
    expect(back).toBe(1);
  });

  it('flushes the queue when a probe finds the API back', async () => {
    const api = new FakeApi();
    const phone = newPhone();
    const probes: (() => void)[] = [];
    const data = launch(api, phone, (run) => {
      probes.push(run);
      return () => undefined;
    });
    await data.start();
    await data.profile.put(profileInput);
    api.offline = true;
    await data.profile.patch({ displayName: 'Lan Anh' });
    expect(probes).toHaveLength(1);

    api.offline = false;
    probes.shift()?.();
    await settle();
    await data.outbox.flush();
    const userId = data.session.state.session?.userId ?? '';
    expect(api.profiles.get(userId)?.displayName).toBe('Lan Anh');
    expect(data.connectivity.online).toBe(true);
  });
});
