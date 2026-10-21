import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { newGuest } from '../auth/testing/client';
import { pcm, Phone } from '../../test/call/phone';
import { control, Providers } from '../../test/call/providers';
import { sttTiming } from './stt';

/*
 * Turn-taking inputs beyond the call object's own energy gate: the phone's speech flags, and
 * hold-to-talk, where the mic is silent between presses and Scribe must stay open.
 */

let providers: Providers;
const timing = { ...sttTiming };
beforeEach(() => {
  providers = new Providers().install();
  providers.reply = (request) => {
    const direction = JSON.stringify(request.messages.at(-1)?.content ?? '');
    return direction.includes('The learner just spoke')
      ? `Oh, thank you! Okay.${control({ outcome: 'fine', phrasesUsed: [] })}`
      : `Okay, here we go. Ready?${control({ outcome: 'fine' })}`;
  };
  vi.spyOn(env.JOBS, 'send').mockResolvedValue(
    undefined as unknown as Awaited<ReturnType<Queue['send']>>,
  );
});
afterEach(() => {
  providers.uninstall();
  Object.assign(sttTiming, timing);
  vi.restoreAllMocks();
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const listening = (phone: Phone) =>
  phone.next('beat', (b) => b.beatId === 'ask-whats-wrong', { from: 0 });

describe("the phone's speech flags", () => {
  it('time the turn by the phone when it sends them, whatever the energy gate hears', async () => {
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await listening(phone);
    await sleep(200);
    const from = phone.frames.length;
    providers.speech.push("What's wrong?");
    // Quiet audio the gate takes for silence: only the phone knows the learner is speaking.
    phone.send({ type: 'speech', state: 'start', atMs: phone.micMs });
    phone.silence(1_000);
    phone.send({ type: 'speech', state: 'end', atMs: phone.micMs });
    phone.silence(500);
    await sleep(300);
    // Committed (the reply is generating) but not spoken before 700 ms of silence.
    expect(providers.scribeCommits.length).toBeGreaterThan(0);
    expect(phone.frames.slice(from).filter((f) => f.type === 'say_start')).toHaveLength(0);
    phone.silence(300);
    const heard = await phone.next('heard', () => true, { from });
    expect(heard.text).toBe("What's wrong?");
    await phone.next('say_start', () => true, { from });
    phone.close();
  }, 20_000);

  it('keep a voiced echo from starting a turn once the phone sends them', async () => {
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await listening(phone);
    await sleep(200);
    phone.send({ type: 'speech', state: 'end', atMs: phone.micMs });
    const commits = providers.scribeCommits.length;
    phone.mic(pcm(1_000, true));
    phone.silence(900);
    await sleep(500);
    expect(providers.scribeCommits.length).toBe(commits);
    expect(phone.of('heard')).toHaveLength(0);
    phone.close();
  }, 20_000);
});

describe('hold-to-talk', () => {
  /** One press: voiced audio, then the release. */
  async function press(phone: Phone, text: string) {
    providers.speech.push(text);
    const from = phone.frames.length;
    const startMs = phone.micMs;
    phone.mic(pcm(1_000, true));
    phone.send({ type: 'end_turn' });
    const heard = await phone.next('heard', () => true, { from });
    await phone.next('say_end', () => true, { from });
    return { heard, startMs };
  }

  it('keeps Scribe open between presses with a little silence', async () => {
    sttTiming.idleMs = 150;
    sttTiming.checkMs = 50;
    providers.scribeIdleCloseMs = 400;
    const { token } = await newGuest();
    const phone = await Phone.call(token, { turnMode: 'hold_to_talk' });
    await listening(phone);
    await sleep(1_000);
    expect(providers.scribeKeepalives).toBeGreaterThan(0);
    const { heard, startMs } = await press(phone, "What's wrong?");
    expect(heard.text).toBe("What's wrong?");
    // Words stay on the mic clock: the keepalives are taken back out.
    expect(Math.abs((heard.words[0]?.startMs ?? -1) - startMs)).toBeLessThan(100);
    expect(providers.scribeSessions).toBe(1);
    phone.close();
  }, 20_000);

  it('reopens a Scribe session that closed, on the next press, with words on the mic clock', async () => {
    sttTiming.idleMs = 60_000;
    providers.scribeIdleCloseMs = 300;
    const { token } = await newGuest();
    const phone = await Phone.call(token, { turnMode: 'hold_to_talk' });
    await listening(phone);
    await press(phone, "What's wrong?");
    const sessions = providers.scribeSessions;
    await sleep(600);
    const { heard, startMs } = await press(phone, 'Can I help you?');
    expect(heard.text).toBe('Can I help you?');
    expect(providers.scribeSessions).toBe(sessions + 1);
    expect(Math.abs((heard.words[0]?.startMs ?? -1) - startMs)).toBeLessThan(100);
    expect(phone.of('error')).toHaveLength(0);
    phone.close();
  }, 20_000);
});
