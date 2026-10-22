import { PROTOCOL_VERSION } from '@yapling/contracts';
import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { newGuest } from '../auth/testing/client';
import { Phone } from '../../test/call/phone';
import { Providers } from '../../test/call/providers';

/*
 * A learner has one live call. A phone that opens a second call ends the first, and a phone
 * that leaves while its call is being set up never starts one: no lines, no voice, no record.
 */

let providers: Providers;
beforeEach(() => {
  providers = new Providers().install();
  vi.spyOn(env.JOBS, 'send').mockImplementation(() =>
    Promise.resolve(undefined as unknown as Awaited<ReturnType<Queue['send']>>),
  );
});
afterEach(() => {
  providers.uninstall();
  vi.restoreAllMocks();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const helloFor = (token: string) =>
  JSON.stringify({
    type: 'hello',
    seq: 1,
    protocol: PROTOCOL_VERSION,
    token,
    kind: 'episode',
    sceneId: 's1-e1',
    stage: 'newcomer',
    firstLanguage: 'vi',
    clientVersion: '1.0.0',
    turnMode: 'hands_free',
    resumeToken: null,
  });

const callsOf = async (userId: string) =>
  (
    await env.DB.prepare('SELECT id, end_reason FROM calls WHERE user_id = ? ORDER BY started_at')
      .bind(userId)
      .all<{ id: string; end_reason: string }>()
  ).results;

describe('one live call per learner', () => {
  it('ends the first call when the same learner starts another', async () => {
    const { token, userId } = await newGuest();
    const first = await Phone.call(token);
    const firstReady = await first.next('ready');
    await first.next('beat', (b) => b.beatId === 'ask-whats-wrong');

    const second = await Phone.call(token);
    const secondReady = await second.next('ready');
    expect(await first.next('ended')).toMatchObject({
      reason: 'replaced',
      callRecordId: firstReady.sessionId,
    });
    expect(await callsOf(userId)).toEqual([{ id: firstReady.sessionId, end_reason: 'replaced' }]);

    // The second call runs on, and a third replaces it in turn.
    await second.next('beat', (b) => b.beatId === 'ask-whats-wrong');
    const third = await Phone.call(token);
    await third.next('ready');
    expect(await second.next('ended')).toMatchObject({
      reason: 'replaced',
      callRecordId: secondReady.sessionId,
    });
    third.send({ type: 'hangup' });
    await third.next('ended');
  }, 30_000);

  it('leaves another learner’s call alone', async () => {
    const a = await newGuest();
    const b = await newGuest();
    const phoneA = await Phone.call(a.token);
    await phoneA.next('ready');
    const phoneB = await Phone.call(b.token);
    await phoneB.next('ready');
    await sleep(300);
    expect(phoneA.of('ended')).toHaveLength(0);
    phoneA.send({ type: 'hangup' });
    phoneB.send({ type: 'hangup' });
    await phoneA.next('ended');
    await phoneB.next('ended');
  }, 30_000);
});

describe('a phone that leaves while its call is set up', () => {
  it('never starts the call, through the Worker', async () => {
    const { token, userId } = await newGuest();
    const phone = await Phone.open();
    phone.ws.send(helloFor(token));
    phone.ws.close(1000, 'bye');
    await sleep(1_500);
    expect(providers.directions()).toHaveLength(0);
    expect(providers.ttsTexts).toHaveLength(0);
    expect(await callsOf(userId)).toEqual([]);
  });

  it('never starts the call, at the call object', async () => {
    const { token, userId } = await newGuest();
    const stub = env.CALL.get(env.CALL.newUniqueId());
    const response = await stub.fetch('https://call/socket', { headers: { Upgrade: 'websocket' } });
    const ws = response.webSocket;
    if (!ws) throw new Error('no socket');
    ws.accept();
    // `hello` is answered after a few lookups; the phone is gone before they finish.
    ws.send(helloFor(token));
    ws.close(1000, 'bye');
    await sleep(1_500);
    expect(providers.directions()).toHaveLength(0);
    expect(providers.ttsTexts).toHaveLength(0);
    expect(await callsOf(userId)).toEqual([]);
    expect(await stub.canResume('x')).toBe(false);
  });
});
