import { env } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

import { call, expectError, expectJson, newGuest } from '../auth/testing/client';
import { callCost, noSamples } from '../call/costs';
import { costRecordOf, percentile, totalsOf, usageOf, type CostInputs } from './costs';
import { insertCall, storeSummary, type NewCall } from './store';

const inputs = (over: Partial<CostInputs> = {}): CostInputs => ({
  callId: 'call-1',
  userId: 'user-1',
  kind: 'episode',
  sceneId: 's1-e1',
  startedAt: 1_000_000,
  endedAt: 1_000_000 + 60_000,
  endReason: 'scene_complete',
  learnerSeconds: 25,
  characterSeconds: 30,
  sttSeconds: 60,
  ttsChars: 525,
  llm: { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 },
  samples: { replyOut: [1_400, 1_500, 1_600, 1_700, 2_300], phoneLag: [900, 950] },
  ...over,
});

describe('a call cost', () => {
  it('prices a conversation minute at the list rates', () => {
    // A minute of audio to speech-to-text and ~525 characters to text-to-speech: about $0.028.
    const record = costRecordOf(inputs());
    expect(record.usd.stt).toBeCloseTo(0.0065, 5);
    expect(record.usd.tts).toBeCloseTo(0.021, 5);
    expect(record.usd.llm).toBe(0);
    expect(record.usd.total).toBeCloseTo(0.0275, 5);
  });

  it('prices the live turns on Haiku, cache reads and writes apart', () => {
    const llm = {
      input: 1_000_000,
      cacheRead: 1_000_000,
      cacheWrite: 1_000_000,
      output: 1_000_000,
    };
    const record = costRecordOf(inputs({ sttSeconds: 0, ttsChars: 0, llm }));
    expect(record.usd.llm).toBeCloseTo(0.1 + 0.01 + 0.125 + 0.5, 5);
    expect(record.usd.total).toBe(record.usd.llm);
  });

  it('agrees with the call record’s own estimate', () => {
    const llm = { input: 12_000, cacheRead: 40_000, cacheWrite: 3_000, output: 900 };
    const own = callCost(83.4, 1_234, llm);
    const record = costRecordOf(inputs({ ...usageOf(own), samples: null }));
    expect(record.usd.total).toBeCloseTo(own.usd, 4);
    expect(record.sttSeconds).toBe(83.4);
    expect(record.turns).toBe(0);
    expect(record.replyP50Ms).toBeNull();
  });

  it('adds the post-call summary to the total', () => {
    const record = costRecordOf(inputs(), 0.004);
    expect(record.usd.summary).toBe(0.004);
    expect(record.usd.total).toBeCloseTo(0.0315, 5);
  });

  it('takes nearest-rank percentiles of the reply latency', () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([1_200], 90)).toBe(1_200);
    expect(percentile([5, 1, 4, 2, 3], 50)).toBe(3);
    expect(percentile([5, 1, 4, 2, 3], 90)).toBe(5);
    const record = costRecordOf(inputs());
    expect(record).toMatchObject({ turns: 5, replyP50Ms: 1_600, replyP90Ms: 2_300 });
  });

  it('totals calls per minute, with percentiles over every turn', () => {
    const a = costRecordOf(inputs());
    const b = costRecordOf(
      inputs({
        callId: 'call-2',
        endedAt: 1_000_000 + 120_000,
        sttSeconds: 120,
        ttsChars: 1_050,
        learnerSeconds: 35,
        samples: { replyOut: [1_000, 1_100], phoneLag: [] },
      }),
    );
    const totals = totalsOf([a, b]);
    expect(totals).toMatchObject({
      calls: 2,
      minutes: 3,
      learnerMinutes: 1,
      turns: 7,
      replyP50Ms: 1_500,
      replyP90Ms: 2_300,
      phoneP50Ms: 900,
    });
    expect(totals.usd).toBeCloseTo(0.0825, 5);
    expect(totals.usdPerMinute).toBeCloseTo(0.0275, 5);
    expect(totalsOf([])).toMatchObject({ calls: 0, usd: 0, usdPerMinute: null, replyP50Ms: null });
  });

  it('reads zeros from a call record without usage', () => {
    expect(usageOf({ usd: 0.01 })).toEqual({
      sttSeconds: 0,
      ttsChars: 0,
      llm: { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 },
    });
  });
});

const newCall = (userId: string, id: string, startedAt: number): NewCall => ({
  id,
  userId,
  kind: 'episode',
  sceneId: 's1-e1',
  character: 'mei',
  stage: 'newcomer',
  startedAt,
  endedAt: startedAt + 90_000,
  learnerSeconds: 40,
  characterSeconds: 35,
  endReason: 'scene_complete',
  summaryPending: true,
  sceneState: null,
  safetyFlag: null,
  cost: callCost(90, 800, { input: 5_000, cacheRead: 20_000, cacheWrite: 0, output: 400 }),
  timings: {},
  transcriptKey: `users/${userId}/calls/${id}.json`,
  samples: { ...noSamples(), replyOut: [1_300, 1_450, 1_900], phoneLag: [880] },
});

interface CostList {
  calls: { callId: string; usd: { total: number; summary: number }; replyP90Ms: number | null }[];
  totals: { calls: number; usd: number; replyP50Ms: number | null };
}

describe('the cost list', () => {
  it('keeps a cost record with every call and lists the learner’s own, newest first', async () => {
    const me = await newGuest();
    const other = await newGuest();
    await insertCall(env.DB, newCall(me.userId, 'cost-a', 1_000));
    await insertCall(env.DB, newCall(me.userId, 'cost-b', 200_000));
    await insertCall(env.DB, newCall(other.userId, 'cost-c', 300_000));

    const list = await expectJson<CostList>(
      await call('/api/calls/dev/costs', { token: me.token }),
    );
    expect(list.calls.map((c) => c.callId)).toEqual(['cost-b', 'cost-a']);
    expect(list.calls[0]).not.toHaveProperty('userId');
    expect(list.calls[0]?.replyP90Ms).toBe(1_900);
    expect(list.totals).toMatchObject({ calls: 2, replyP50Ms: 1_450 });

    await storeSummary(env.DB, me.userId, 'cost-b', null, { usd: 0.0123 });
    const after = await expectJson<CostList>(
      await call('/api/calls/dev/costs?limit=1', { token: me.token }),
    );
    expect(after.calls).toHaveLength(1);
    expect(after.calls[0]?.usd.summary).toBe(0.0123);
    expect(after.calls[0]?.usd.total).toBeCloseTo((list.calls[0]?.usd.total ?? 0) + 0.0123, 5);
  });

  it('needs a session, and the store API has none', async () => {
    await expectError(await call('/api/calls/dev/costs'), 401, 'unauthorized');
    const me = await newGuest();
    const { createApp } = await import('../app');
    const response = await createApp().request(
      '/api/calls/dev/costs',
      { headers: { authorization: `Bearer ${me.token}` } },
      { ...env, ENVIRONMENT: 'prd' },
    );
    expect(response.status).toBe(404);
  });
});
