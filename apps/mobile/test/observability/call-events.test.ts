import { describe, expect, it } from '@jest/globals';

import {
  SLOW_REPLY_MS,
  callEventsBetween,
  type CallSnapshot,
} from '../../src/observability/call-events';
import { readObservabilityConfig } from '../../src/observability/config';

const ringing: CallSnapshot = {
  mode: 'ringing',
  connected: false,
  error: null,
  warning: null,
  endReason: null,
  learnerFinal: false,
  learnerText: '',
  latency: [],
};
const live: CallSnapshot = { ...ringing, mode: 'live', connected: true };

describe('a call as analytics hear it', () => {
  it('starts once, when the call answers', () => {
    expect(callEventsBetween(null, ringing, false)).toEqual([]);
    expect(callEventsBetween(ringing, live, false)).toEqual([{ type: 'started' }]);
    expect(callEventsBetween(live, live, true)).toEqual([]);
  });

  it('names the problems the learner meets, once each', () => {
    const net = { ...ringing, mode: 'error_net', error: 'no_connection' } as const;
    expect(callEventsBetween(ringing, net, false)).toEqual([
      { type: 'problem', problem: 'no_connection', code: 'no_connection' },
    ]);
    expect(callEventsBetween(net, net, false)).toEqual([]);
    expect(callEventsBetween(null, { ...ringing, mode: 'error_mic' }, false)).toEqual([
      { type: 'problem', problem: 'mic_denied', code: null },
    ]);
  });

  it('hears an empty final transcript as not heard, and a slow live reply as slow', () => {
    expect(
      callEventsBetween(live, { ...live, learnerFinal: true, learnerText: ' ' }, true),
    ).toEqual([{ type: 'problem', problem: 'not_heard', code: null }]);
    expect(
      callEventsBetween(live, { ...live, learnerFinal: true, learnerText: 'I am Lan' }, true),
    ).toEqual([]);

    const slow = SLOW_REPLY_MS + 300;
    const samples = [
      { streamId: 1, kind: 'recorded', lagMs: 4_000 },
      { streamId: 2, kind: 'live', lagMs: 1_400 },
      { streamId: 3, kind: 'live', lagMs: slow },
    ] as const;
    const after = { ...live, latency: samples };
    expect(callEventsBetween(live, after, true)).toEqual([
      { type: 'problem', problem: 'slow_reply', code: String(slow) },
    ]);
    // A sample already seen is not counted again.
    expect(callEventsBetween(after, { ...after }, true)).toEqual([]);
  });

  it('counts a failed reply the call recovers from, and the end once', () => {
    const warned = { ...live, warning: 'llm_failed' } as const;
    expect(callEventsBetween(live, warned, true)).toEqual([
      { type: 'problem', problem: 'reply_failed', code: 'llm_failed' },
    ]);
    const ended = { ...warned, endReason: 'scene_complete' } as const;
    expect(callEventsBetween(warned, ended, true)).toEqual([
      { type: 'ended', reason: 'scene_complete' },
    ]);
    expect(callEventsBetween(ended, ended, true)).toEqual([]);
  });
});

describe('the build settings', () => {
  it('turns each part off without its key, and defaults the host', () => {
    expect(readObservabilityConfig({})).toEqual({
      posthogKey: null,
      posthogHost: 'https://eu.i.posthog.com',
      sentryDsn: null,
      appVariant: 'dev',
    });
    expect(readObservabilityConfig({ posthogKey: '  ', sentryDsn: '' })).toMatchObject({
      posthogKey: null,
      sentryDsn: null,
    });
    expect(
      readObservabilityConfig({
        posthogKey: ' phc_test ',
        posthogHost: 'https://us.i.posthog.com',
        appVariant: 'prd',
      }),
    ).toMatchObject({
      posthogKey: 'phc_test',
      posthogHost: 'https://us.i.posthog.com',
      appVariant: 'prd',
    });
  });
});
