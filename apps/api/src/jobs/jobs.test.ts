import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { userBlobPrefix } from '../account';
import { deleteAccount } from '../account/delete';
import { call, expectJson, newGuest } from '../auth/testing/client';
import { insertCall } from '../calls/store';
import { transcriptKey, type TranscriptFile } from '../call/transcript';
import { listMemory } from '../memory';
import { readProgress } from '../progress';
import { Providers } from '../../test/call/providers';
import { consumeJobs } from '.';

let providers: Providers;
beforeEach(() => {
  providers = new Providers().install();
});
afterEach(() => providers.uninstall());

const ENDED = Date.UTC(2026, 9, 23, 3);

/** A finished Episode 1 call: its record and transcript, as the call object leaves them. */
async function finishedCall(
  userId: string,
  callId = `call_${crypto.randomUUID().replaceAll('-', '')}`,
) {
  const key = transcriptKey(userBlobPrefix(userId), callId);
  const file: TranscriptFile = {
    version: 1,
    callId,
    sceneId: 's1-e1',
    kind: 'episode',
    stage: 'newcomer',
    firstLanguage: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
    startedAt: ENDED - 240_000,
    endedAt: ENDED,
    lines: [
      {
        speaker: 'pip',
        text: 'Mei looks sad.',
        at: ENDED - 200_000,
        lineId: 's1-e1-03',
        beatId: 'notice',
      },
      {
        speaker: 'learner',
        text: "What's wrong?",
        at: ENDED - 190_000,
        turn: 1,
        beatId: 'ask-whats-wrong',
        words: [
          { word: "What's", startMs: 1_000, endMs: 1_400 },
          { word: 'wrong?', startMs: 1_450, endMs: 1_900 },
        ],
        outcome: 'fine',
        phrasesUsed: ['whats-wrong'],
        canDo: 'ask-whats-wrong',
        targetId: null,
        correctionFixed: null,
      },
      {
        speaker: 'mei',
        text: 'Aiyah, nothing lah.',
        at: ENDED - 185_000,
        lineId: null,
        beatId: 'mei-deflects',
      },
      {
        speaker: 'learner',
        text: 'Can I help you? I work in marketing.',
        at: ENDED - 180_000,
        turn: 2,
        beatId: 'mei-deflects',
        words: [
          { word: 'Can', startMs: 9_000, endMs: 9_200 },
          { word: 'I', startMs: 9_250, endMs: 9_300 },
          { word: 'help', startMs: 10_400, endMs: 10_700 },
        ],
        outcome: 'fine',
        phrasesUsed: ['can-i-help'],
        canDo: null,
        targetId: null,
        correctionFixed: null,
      },
    ],
  };
  await env.BLOBS.put(key, JSON.stringify(file));
  await insertCall(env.DB, {
    id: callId,
    userId,
    kind: 'episode',
    sceneId: 's1-e1',
    character: 'mei',
    stage: 'newcomer',
    startedAt: file.startedAt,
    endedAt: ENDED,
    learnerSeconds: 20,
    characterSeconds: 30,
    endReason: 'scene_complete',
    summaryPending: true,
    sceneState: null,
    safetyFlag: null,
    cost: { usd: 0.01 },
    timings: { turns: 2 },
    transcriptKey: key,
  });
  return { callId, key };
}

/** Runs the consumer on a batch; answers which messages it acked and retried. */
async function runJobs(bodies: unknown[]) {
  const explicitAcks: string[] = [];
  const retries: string[] = [];
  const messages = bodies.map((body, i) => ({
    id: `m${i}`,
    timestamp: new Date(),
    attempts: 1,
    body,
    ack: () => explicitAcks.push(`m${i}`),
    retry: () => retries.push(`m${i}`),
  }));
  const batch = {
    queue: 'yapling-jobs-dev',
    messages,
    ackAll: () => undefined,
    retryAll: () => undefined,
  } as unknown as MessageBatch;
  await consumeJobs(batch, env);
  return { explicitAcks, retries };
}

describe('the post-call job', () => {
  it('writes the summary, grows phrases, ticks the can-do and remembers', async () => {
    const { userId, token } = await newGuest();
    const { callId } = await finishedCall(userId);
    providers.structured = () => ({
      wins: ['You asked Mei what was wrong.', 'You offered help.'],
      fix: {
        from: 'I work in marketing.',
        to: 'I work in marketing.',
        targetId: null,
        explanation: 'Câu này đúng rồi.',
      },
      phrasesUsed: ['can-i-help'],
      recurringErrors: ['past_ed'],
      canDoEvidence: [{ canDoId: 'ask-whats-wrong', quote: "What's wrong?", witness: 'mei' }],
      memories: [{ text: 'You work in marketing.', category: 'about_you' }],
    });
    const result = await runJobs([{ type: 'post_call', callId, userId }]);
    expect(result.explicitAcks).toEqual(['m0']);

    const record = await expectJson<{ summaryPending: boolean; summary: Record<string, unknown> }>(
      await call(`/api/calls/${callId}`, { token }),
    );
    expect(record.summaryPending).toBe(false);
    expect(record.summary).toMatchObject({
      version: 1,
      wins: ['You asked Mei what was wrong.', 'You offered help.'],
      canDoEvidence: [{ canDoId: 'ask-whats-wrong', quote: "What's wrong?", witness: 'mei' }],
    });
    const summary = record.summary as {
      phraseEvents: { phraseId: string; event: string }[];
      metrics: { paceWpm: number };
      memoryItemIds: string[];
    };
    expect(summary.phraseEvents).toContainEqual(
      expect.objectContaining({ phraseId: 'whats-wrong', event: 'sprouted' }),
    );
    expect(summary.phraseEvents).toContainEqual(
      expect.objectContaining({ phraseId: 'i-need-a-plan', event: 'met' }),
    );
    expect(summary.metrics.paceWpm).toBeGreaterThan(0);
    expect(summary.memoryItemIds).toHaveLength(1);

    const progress = await readProgress(env.DB, userId, ENDED);
    expect(progress.phrases.find((p) => p.id === 'whats-wrong')?.state).toBe('sprout');
    expect(progress.canDos.find((c) => c.id === 'ask-whats-wrong')).toMatchObject({
      status: 'ticked',
      witness: 'mei',
    });
    expect(progress.keepsakes).toContainEqual(
      expect.objectContaining({ kind: 'can_do', canDoId: 'ask-whats-wrong', signedBy: 'mei' }),
    );
    expect(progress.errorTargets).toContainEqual(
      expect.objectContaining({ id: 'past_ed', status: 'active' }),
    );
    expect((await listMemory(env.DB, userId)).map((m) => m.text)).toEqual([
      'You work in marketing.',
    ]);

    // Sonnet wrote it, with its own cost on the record.
    const sonnet = providers.claudeRequests.at(-1);
    expect(sonnet?.model).toBe('claude-sonnet-5-5');

    // A redelivered job changes nothing.
    await runJobs([{ type: 'post_call', callId, userId }]);
    expect(await listMemory(env.DB, userId)).toHaveLength(1);
  });

  it('records a scheduled push as sent once', async () => {
    const { userId } = await newGuest();
    const push = {
      type: 'scheduled_push',
      id: 'push_1',
      userId,
      kind: 'voicemail',
      payload: {},
      scheduledFor: 1,
      firedAt: 2,
    };
    const result = await runJobs([push, push, { type: 'nonsense' }]);
    expect(result.explicitAcks.sort()).toEqual(['m0', 'm1', 'm2']);
    const rows = await env.DB.prepare('SELECT id FROM push_sends WHERE user_id = ?')
      .bind(userId)
      .all();
    expect(rows.results).toEqual([{ id: 'push_1' }]);
  });
});

describe('call records', () => {
  it('lists the learner’s calls newest first and answers one by id', async () => {
    const { userId, token } = await newGuest();
    const other = await newGuest();
    const first = await finishedCall(userId);
    const theirs = await finishedCall(other.userId);
    const list = await expectJson<{ calls: { id: string; summaryPending: boolean }[] }>(
      await call('/api/calls', { token }),
    );
    expect(list.calls.map((c) => c.id)).toEqual([first.callId]);
    expect(list.calls[0]?.summaryPending).toBe(true);
    expect((await call(`/api/calls/${theirs.callId}`, { token })).status).toBe(404);
    expect((await call('/api/calls')).status).toBe(401);
  });

  it('goes with the account: rows and transcript', async () => {
    const { userId } = await newGuest();
    const { key } = await finishedCall(userId);
    await deleteAccount(env, userId, Date.now());
    expect(
      await env.DB.prepare('SELECT id FROM calls WHERE user_id = ?').bind(userId).first(),
    ).toBeNull();
    expect(await env.BLOBS.get(key)).toBeNull();
  });
});
