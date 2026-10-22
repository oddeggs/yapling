import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { newGuest } from '../auth/testing/client';
import { Phone } from '../../test/call/phone';
import { control, Providers } from '../../test/call/providers';

/*
 * Off the happy path, end to end: what the model writes that isn't speech never reaches the
 * voice or the captions, and a turn that doesn't do what the beat hoped keeps the beat.
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

const directionOf = (request: { messages: { content: unknown }[] }) =>
  JSON.stringify(request.messages.at(-1)?.content ?? '');

describe('narration from the model', () => {
  it('never reaches the voice or the captions, and a line left empty says a safe word', async () => {
    providers.reply = (request) =>
      directionOf(request).includes('what the learner just said')
        ? `The learner asked what is wrong, so I need to respond gently. Mei sighs.${control({ outcome: 'fine' })}`
        : `Mei looks away. "Aiyah, nothing lah." *sighs*${control({ outcome: 'fine' })}`;
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await phone.next('beat', (b) => b.beatId === 'ask-whats-wrong');
    await sleep(150);
    const from = phone.frames.length;
    providers.speech.push("What's wrong?");
    phone.speak(1_200);
    // The answer was all narration: a safe word, then the next beat's own line, its quote only.
    await phone.next('say_end', (s) => s.text === 'Aiyah, nothing lah.', { from });
    const captions = phone.frames
      .slice(from)
      .filter((f) => f.type === 'say_end')
      .map((f) => (f as { text?: string }).text);
    expect(captions).toEqual(['Mm, okay.', 'Aiyah, nothing lah.']);
    const spoken = providers.ttsTexts
      .flat()
      .join('')
      .replace(/<break[^>]*>/g, '');
    expect(spoken).not.toMatch(/learner|sighs|looks away|"/);
    phone.close();
  }, 30_000);
});

describe('a turn that does not do what the beat hoped', () => {
  it('keeps the beat, with the line written for its case, and the hint follows', async () => {
    providers.reply = (request) =>
      directionOf(request).includes('what the learner just said')
        ? // The control line disagrees; the line was written for the tagged case.
          `[off_topic] One coffee, can lah! Sit down first, ok?${control({ outcome: 'fine' })}`
        : `Okay, here we go. Ready?${control({ outcome: 'fine' })}`;
    const { token } = await newGuest();
    const phone = await Phone.call(token);
    await phone.next('beat', (b) => b.beatId === 'ask-whats-wrong');
    await sleep(150);
    const from = phone.frames.length;
    providers.speech.push('Hello. Can I have a coffee, please?');
    phone.speak(1_200);
    const said = await phone.next('say_end', () => true, { from });
    expect(said.text).toBe('One coffee, can lah! Sit down first, ok?');
    // Newcomers get the phrase hint; the scene stays on the beat.
    await phone.next('hint', () => true, { from });
    await sleep(300);
    expect(phone.frames.slice(from).some((f) => f.type === 'beat')).toBe(false);
    phone.close();
  }, 30_000);
});
