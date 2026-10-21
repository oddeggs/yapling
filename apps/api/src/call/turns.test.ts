import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { newGuest } from '../auth/testing/client';
import { pcm, Phone } from '../../test/call/phone';
import { control, Providers } from '../../test/call/providers';

/*
 * Turn-taking inputs beyond the call object's own energy gate: the phone's speech flags.
 */

let providers: Providers;
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
