import type { PhraseProgress, Progress } from '@yapling/contracts';
import { localDateOf } from '@yapling/domain';
import { getScene, type Beat, type Scene } from '@yapling/story';
import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { userBlobPrefix } from '../account';
import { call, expectJson, newGuest } from '../auth/testing/client';
import { insertCall } from '../calls/store';
import { consumeJobs } from '../jobs';
import { applyPipsMinute } from '../jobs/daily-call';
import { readProgress } from '../progress';
import { userObject } from '../user';
import { Phone } from '../../test/call/phone';
import { Providers } from '../../test/call/providers';
import {
  pipsMinuteMeta,
  pipsMinuteOutcome,
  pipsMinuteScenes,
  type PipsMinuteScene,
  type PipsMinuteScenes,
} from './daily';
import { transcriptKey, type TranscriptFile } from './transcript';

/*
 * Pip's minute (a `daily` call) end to end through the call object, with the providers faked and
 * a minute built from the story's own card beats: two card turns judged by their words, no model
 * at all, no live minutes, and the phrase uses written as prompted uses before the call ends.
 */

const HCM = 'Asia/Ho_Chi_Minh';
const DAY = 24 * 60 * 60_000;

const beatOf = (sceneId: string, beatId: string): Beat => {
  const beat = getScene(sceneId).beats.find((b) => b.id === beatId);
  if (!beat) throw new Error(`no beat ${beatId}`);
  return beat;
};

/** A minute: Pip offers tea ("Yes, please"), then the learner says "Nice to meet you" right. */
const MINUTE_ID = 's1-pm.yes-please.nice-to-meet-you';
const minuteScene = (beats: readonly Beat[] = []): Scene => ({
  ...getScene('s1-set2'),
  id: MINUTE_ID,
  title: "Pip's minute",
  cast: ['pip', 'linh'],
  phrases: ['yes-please', 'nice-to-meet-you'],
  canDos: [],
  beats: [
    beatOf('s1-set2', 'pip-tea'),
    beatOf('s1-set2', 'tea-for-you'),
    beatOf('s1-set1', 'nice-to-meet'),
    beatOf('s1-set1', 'say-nice'),
    beatOf('s1-set1', 'pip-nice'),
    ...beats,
  ],
});
const MINUTE: PipsMinuteScene = {
  scene: minuteScene(),
  due: 'yes-please',
  reuse: 'nice-to-meet-you',
};

const fakeScenes = (minutes: readonly PipsMinuteScene[]): PipsMinuteScenes => ({
  find: (id) => minutes.find((m) => m.scene.id === id) ?? null,
});

const seed = (id: string, text: string, at: number): PhraseProgress => ({
  id,
  text,
  state: 'seed',
  seedAt: at,
  sproutAt: null,
  leafAt: null,
  bloomAt: null,
  lastUsedAt: null,
  usedOn: [],
  contexts: [],
});

/** Yesterday the learner met "Yes, please" and used "Nice to meet you" once. */
function phrasesFromYesterday(now: number): PhraseProgress[] {
  const yesterday = now - DAY;
  return [
    seed('yes-please', 'Yes, please.', yesterday),
    {
      ...seed('nice-to-meet-you', 'Nice to meet you.', yesterday - DAY),
      state: 'sprout',
      sproutAt: yesterday,
      lastUsedAt: yesterday,
      usedOn: [localDateOf(yesterday, HCM)],
      contexts: ['s1-set1'],
    },
  ];
}

async function learner() {
  const session = await newGuest();
  const response = await call('/api/me/profile', {
    method: 'PUT',
    token: session.token,
    body: {
      displayName: 'Lan',
      firstLanguage: 'vi',
      roommate: { species: 'redpanda', name: 'Pip' },
      track: 'work',
      quietHours: null,
      timezone: HCM,
      notificationsAllowed: true,
      startPath: 'visitor',
    },
  });
  expect(response.status).toBe(200);
  await readProgress(env.DB, session.userId, Date.now());
  await env.DB.prepare('UPDATE progress SET phrases = ? WHERE user_id = ?')
    .bind(JSON.stringify(phrasesFromYesterday(Date.now())), session.userId)
    .run();
  return session;
}

let providers: Providers;
let jobs: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  providers = new Providers().install();
  pipsMinuteScenes.current = fakeScenes([MINUTE]);
  jobs = vi
    .spyOn(env.JOBS, 'send')
    .mockResolvedValue(undefined as unknown as Awaited<ReturnType<Queue['send']>>);
});
afterEach(() => {
  providers.uninstall();
  pipsMinuteScenes.current = { find: () => null };
  vi.restoreAllMocks();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function say(phone: Phone, text: string) {
  providers.speech.push(text);
  const from = phone.frames.length;
  phone.speak(900);
  return phone.next('heard', () => true, { from });
}

const phraseOf = (progress: Progress, id: string) => progress.phrases.find((p) => p.id === id);

describe("Pip's minute", () => {
  it('grows its phrases with no model, no live minutes and no summary job', async () => {
    const { token, userId } = await learner();
    const before = await userObject(env, userId).balance();
    const phone = await Phone.call(token, { kind: 'daily', sceneId: MINUTE_ID, stage: 'visitor' });
    const ready = await phone.next('ready');
    await phone.next('beat', (b) => b.beatId === 'tea-for-you', { timeoutMs: 10_000 });
    await sleep(100);
    await say(phone, 'Yes, please.');
    await phone.next('beat', (b) => b.beatId === 'say-nice', { timeoutMs: 10_000 });
    await sleep(100);
    await say(phone, 'Nice to meet you, too.');
    const ended = await phone.next('ended', () => true, { timeoutMs: 15_000 });
    expect(ended).toMatchObject({ reason: 'scene_complete', summaryPending: false });

    // No model at all: no reply, no prewarm, no summary; and nothing queued.
    expect(providers.claudeRequests).toEqual([]);
    expect(jobs).not.toHaveBeenCalled();
    // Minutes unchanged.
    expect((await userObject(env, userId).balance()).usedSeconds).toBe(before.usedSeconds);

    // The seed sprouts, the phrase Pip said wrong leafs on a new day and rests a week.
    const progress = await readProgress(env.DB, userId, Date.now());
    expect(phraseOf(progress, 'yes-please')).toMatchObject({
      state: 'sprout',
      contexts: [MINUTE_ID],
    });
    const fixed = phraseOf(progress, 'nice-to-meet-you');
    expect(fixed).toMatchObject({ state: 'leaf' });
    expect(fixed?.pipReusedAt).toBeGreaterThan(0);
    // Never a ring slot.
    expect(progress.weeks.flatMap((w) => w.slots).filter((s) => s.status === 'done')).toEqual([]);

    const record = await expectJson<{
      kind: string;
      summaryPending: boolean;
      summary: { wins: string[]; phraseEvents: { phraseId: string; event: string }[] };
    }>(await call(`/api/calls/${ready.sessionId}`, { token }));
    expect(record).toMatchObject({ kind: 'daily', summaryPending: false });
    expect(record.summary.wins).toEqual([]);
    expect(record.summary.phraseEvents).toEqual([
      { phraseId: 'yes-please', text: 'Yes, please.', event: 'used' },
      { phraseId: 'yes-please', text: 'Yes, please.', event: 'sprouted' },
      { phraseId: 'nice-to-meet-you', text: 'Nice to meet you.', event: 'used' },
      { phraseId: 'nice-to-meet-you', text: 'Nice to meet you.', event: 'leafed' },
    ]);
  }, 40_000);

  it('passes a misheard card on Jev, still with no model', async () => {
    const { token, userId } = await learner();
    providers.jevCard = () => 'card_a';
    const phone = await Phone.call(token, { kind: 'daily', sceneId: MINUTE_ID, stage: 'visitor' });
    await phone.next('beat', (b) => b.beatId === 'tea-for-you', { timeoutMs: 10_000 });
    await sleep(100);
    await say(phone, 'Jazz, peas.');
    await phone.next('beat', (b) => b.beatId === 'say-nice', { timeoutMs: 10_000 });
    phone.send({ type: 'hangup' });
    await phone.next('ended', () => true, { timeoutMs: 15_000 });
    expect(providers.jevRequests.some((r) => 'card' in r.questions)).toBe(true);
    expect(providers.claudeRequests).toEqual([]);
    const progress = await readProgress(env.DB, userId, Date.now());
    expect(phraseOf(progress, 'yes-please')?.state).toBe('sprout');
    // The fix turn was never reached: Pip hasn't reused that phrase.
    expect(phraseOf(progress, 'nice-to-meet-you')?.pipReusedAt).toBeUndefined();
  }, 40_000);

  it('refuses a daily hello for any other scene, and a minute with a generated line', async () => {
    const withGen: PipsMinuteScene = {
      ...MINUTE,
      scene: { ...minuteScene([beatOf('s1-e1', 'mei-deflects')]), id: 's1-pm.gen' },
    };
    pipsMinuteScenes.current = fakeScenes([MINUTE, withGen]);
    const { token } = await learner();
    for (const sceneId of ['s1-e1', 's1-pm.gen', 's1-pm.unknown']) {
      const phone = await Phone.call(token, { kind: 'daily', sceneId });
      expect(await phone.next('error')).toMatchObject({ code: 'unknown_scene', fatal: true });
    }
    // And a minute only runs as a daily call: it never stands in for a metered one.
    const phone = await Phone.call(token, { kind: 'practice', sceneId: MINUTE_ID });
    expect(await phone.next('error')).toMatchObject({ code: 'unknown_scene' });
  }, 30_000);

  it('is written by the post-call job, with no model, when the call could not write it', async () => {
    const { token, userId } = await learner();
    const callId = `call_${crypto.randomUUID().replaceAll('-', '')}`;
    const key = transcriptKey(userBlobPrefix(userId), callId);
    const now = Date.now();
    const file: TranscriptFile = {
      version: 1,
      callId,
      sceneId: MINUTE_ID,
      kind: 'daily',
      stage: 'visitor',
      firstLanguage: 'vi',
      timezone: HCM,
      startedAt: now - 60_000,
      endedAt: now,
      lines: [],
      pipsMinute: {
        due: 'yes-please',
        reuse: 'nice-to-meet-you',
        dueSaid: true,
        reuseFixed: false,
        played: true,
      },
    };
    await env.BLOBS.put(key, JSON.stringify(file));
    await insertCall(env.DB, {
      id: callId,
      userId,
      kind: 'daily',
      sceneId: MINUTE_ID,
      character: 'pip',
      stage: 'visitor',
      startedAt: now - 60_000,
      endedAt: now,
      learnerSeconds: 4,
      characterSeconds: 9,
      endReason: 'scene_complete',
      summaryPending: true,
      sceneState: null,
      safetyFlag: null,
      cost: { usd: 0 },
      timings: {},
      transcriptKey: key,
    });
    const messages = [0, 1].map((i) => ({
      id: `m${i}`,
      timestamp: new Date(),
      attempts: 1,
      body: { type: 'post_call', callId, userId },
      ack: () => undefined,
      retry: () => undefined,
    }));
    // Delivered twice: the second changes nothing.
    await consumeJobs({ queue: 'jobs', messages } as unknown as MessageBatch, env);
    expect(providers.claudeRequests).toEqual([]);
    const progress = await readProgress(env.DB, userId, now);
    expect(phraseOf(progress, 'yes-please')?.state).toBe('sprout');
    // Not fixed: no use, but Pip did reuse it.
    expect(phraseOf(progress, 'nice-to-meet-you')).toMatchObject({ state: 'sprout' });
    expect(phraseOf(progress, 'nice-to-meet-you')?.pipReusedAt).toBe(now);
    // Applied once: one revision over the first read.
    expect(progress.revision).toBe(2);
    const record = await expectJson<{ summaryPending: boolean }>(
      await call(`/api/calls/${callId}`, { token }),
    );
    expect(record.summaryPending).toBe(false);
  });
});

describe("Pip's minute's outcome", () => {
  const meta = pipsMinuteMeta(MINUTE);

  it('keeps the turn of each phrase', () => {
    expect(meta).toEqual({
      due: 'yes-please',
      reuse: 'nice-to-meet-you',
      turns: [
        { beatId: 'tea-for-you', phrase: 'yes-please' },
        { beatId: 'say-nice', phrase: 'nice-to-meet-you' },
      ],
    });
    // A minute without a turn for its phrase isn't one.
    expect(pipsMinuteMeta({ ...MINUTE, due: 'deal' })).toBeNull();
    expect(pipsMinuteMeta({ ...MINUTE, reuse: 'deal' })).toBeNull();
    expect(pipsMinuteMeta({ ...MINUTE, reuse: null })?.turns).toEqual([
      { beatId: 'tea-for-you', phrase: 'yes-please' },
    ]);
  });

  it('counts a turn passed on its words, never a generous pass, a skip or a fallback', () => {
    if (meta === null) throw new Error('no minute');
    expect(pipsMinuteOutcome(meta, [])).toMatchObject({
      dueSaid: false,
      reuseFixed: null,
      played: false,
    });
    expect(
      pipsMinuteOutcome(meta, [
        { beatId: 'tea-for-you', pass: 'match' },
        { beatId: 'say-nice', pass: 'match' },
      ]),
    ).toMatchObject({ dueSaid: true, reuseFixed: true, played: true });
    for (const pass of ['generous', 'skip', 'fallback'] as const) {
      expect(
        pipsMinuteOutcome(meta, [
          { beatId: 'tea-for-you', pass },
          { beatId: 'say-nice', pass },
        ]),
      ).toMatchObject({ dueSaid: false, reuseFixed: false, played: true });
    }
  });
});

describe("Pip's minute's change to progress", () => {
  const AT = Date.UTC(2026, 10, 2, 3);
  const current = (phrases: PhraseProgress[]): Progress => ({
    revision: 1,
    installedOn: '2026-10-01',
    dayIndex: 33,
    phrases,
    errorTargets: [],
    canDos: [],
    keepsakes: [],
    weeks: [],
    settlingChaptersDone: [],
  });
  const outcome = {
    due: 'yes-please',
    reuse: null,
    dueSaid: true,
    reuseFixed: null,
    played: true,
  } as const;

  it('never blooms a leaf, however long ago it was met', () => {
    const leaf: PhraseProgress = {
      ...seed('yes-please', 'Yes, please.', AT - 30 * DAY),
      state: 'leaf',
      sproutAt: AT - 20 * DAY,
      leafAt: AT - 10 * DAY,
      lastUsedAt: AT - 10 * DAY,
      usedOn: [localDateOf(AT - 20 * DAY, HCM), localDateOf(AT - 10 * DAY, HCM)],
      contexts: ['s1-set2'],
    };
    const change = applyPipsMinute(current([leaf]), {
      sceneId: MINUTE_ID,
      endedAt: AT,
      timezone: HCM,
      outcome,
    });
    expect(change.lists.phrases[0]).toMatchObject({ state: 'leaf', bloomAt: null });
    expect(change.phraseEvents.map((e) => e.event)).toEqual(['used']);
  });

  it('changes nothing for a turn not said, and leaves the other lists alone', () => {
    const before = current(phrasesFromYesterday(AT));
    const change = applyPipsMinute(before, {
      sceneId: MINUTE_ID,
      endedAt: AT,
      timezone: HCM,
      outcome: { ...outcome, dueSaid: false },
    });
    expect(change.lists.phrases).toEqual(before.phrases);
    expect(change.phraseEvents).toEqual([]);
  });
});
