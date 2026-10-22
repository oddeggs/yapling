import { getLine } from '@yapling/story';
import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { call, expectError, expectJson, newGuest } from '../auth/testing/client';
import { Phone } from '../../test/call/phone';
import { Providers } from '../../test/call/providers';
import { lineGlossAllowed, TRANSLATIONS_PER_CALL, writtenGloss } from './translate';

/*
 * Tap-to-translate for a live call's spoken lines: who gets line glosses, the story's own glosses,
 * and `POST /api/calls/translate` answered by the call object with the providers faked.
 */

let providers: Providers;
beforeEach(() => {
  providers = new Providers().install();
  vi.spyOn(env.JOBS, 'send').mockResolvedValue(
    undefined as unknown as Awaited<ReturnType<Queue['send']>>,
  );
});
afterEach(() => {
  providers.uninstall();
  vi.restoreAllMocks();
});

const translations = () =>
  providers.claudeRequests.filter(
    (r) => !r.stream && JSON.stringify(r.system).includes('Translate'),
  );

async function liveCall(stage: 'newcomer' | 'local' = 'newcomer') {
  const session = await newGuest();
  const phone = await Phone.call(session.token, { stage });
  const ready = await phone.next('ready');
  return { ...session, phone, resume: ready.resumeToken };
}

const translate = (token: string, body: unknown) => call('/api/calls/translate', { token, body });

describe('line glosses by stage', () => {
  it('gives line glosses to Newcomers and Neighbours only, and never for other', () => {
    expect(lineGlossAllowed('newcomer', 'vi')).toBe(true);
    expect(lineGlossAllowed('neighbour', 'vi')).toBe(true);
    expect(lineGlossAllowed('regular', 'vi')).toBe(false);
    expect(lineGlossAllowed('local', 'vi')).toBe(false);
    expect(lineGlossAllowed('newcomer', 'other')).toBe(false);
  });

  it("finds the story's own gloss for a line it wrote, whatever the spacing", () => {
    const line = getLine('s1-e1-03');
    expect(writtenGloss(`  ${line.caption.replace(' ', '  ')} `, 'vi')).toBe(
      'Cô ấy trông buồn. Bạn hỏi cô ấy có chuyện gì không?',
    );
    expect(writtenGloss('Nobody wrote this line.', 'vi')).toBeNull();
  });
});

describe('POST /api/calls/translate', () => {
  it('translates a generated line once and answers again from the call', async () => {
    providers.structured = () => ({ translation: 'Ồ, cảm ơn bạn! Được rồi.' });
    const { token, phone, resume } = await liveCall();
    const body = { call: resume, text: 'Oh, thank you! Okay.' };
    expect(await expectJson(await translate(token, body))).toEqual({
      gloss: 'Ồ, cảm ơn bạn! Được rồi.',
    });
    expect(await expectJson(await translate(token, body))).toEqual({
      gloss: 'Ồ, cảm ơn bạn! Được rồi.',
    });
    expect(translations()).toHaveLength(1);
    phone.close();
  });

  it('answers a written line from the story without asking the model', async () => {
    const { token, phone, resume } = await liveCall();
    const response = await translate(token, { call: resume, text: getLine('s1-e1-02').caption });
    expect(await expectJson(response)).toEqual({
      gloss: 'Ồ! Chào hai bạn. Xin lỗi, mình hơi… Ngồi đi. Bánh mì kaya nhé?',
    });
    expect(translations()).toHaveLength(0);
    phone.close();
  });

  it('gives no gloss from Local, where glosses fade to English', async () => {
    const { token, phone, resume } = await liveCall('local');
    expect(
      await expectJson(await translate(token, { call: resume, text: 'Oh, thank you!' })),
    ).toEqual({ gloss: null });
    expect(translations()).toHaveLength(0);
    phone.close();
  });

  it('refuses another learner, a made-up call, a missing session and a bad body', async () => {
    const { phone, resume } = await liveCall();
    const other = await newGuest();
    await expectError(await translate(other.token, { call: resume, text: 'Hi' }), 404, 'no_call');
    await expectError(
      await translate(other.token, { call: `${'a'.repeat(64)}.nope`, text: 'Hi' }),
      404,
      'no_call',
    );
    await expectError(await translate(other.token, { call: 'x', text: 'Hi' }), 404, 'no_call');
    expect(
      (await call('/api/calls/translate', { body: { call: resume, text: 'Hi' } })).status,
    ).toBe(401);
    await expectError(await translate(other.token, { call: resume, text: '' }), 400, 'bad_request');
    phone.close();
  });

  it('stops answering when the call is over, and past the per-call cap', async () => {
    providers.structured = (r) => ({ translation: `vi:${JSON.stringify(r.messages).length}` });
    const { token, phone, resume } = await liveCall();
    for (let i = 0; i < TRANSLATIONS_PER_CALL; i++) {
      expect((await translate(token, { call: resume, text: `Line ${i % 3}` })).status).toBe(200);
    }
    await expectError(await translate(token, { call: resume, text: 'One more' }), 429, 'too_many');
    phone.send({ type: 'hangup' });
    await phone.next('ended');
    await expectError(await translate(token, { call: resume, text: 'Hi' }), 404, 'no_call');
    phone.close();
  }, 20_000);
});
