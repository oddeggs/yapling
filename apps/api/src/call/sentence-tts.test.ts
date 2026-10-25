import { afterEach, describe, expect, it } from 'vitest';

import { GUEST_MARK } from './reply-splitter';
import { SentenceTts } from './sentence-tts';
import { upstream } from './upstream';

const realFetch = upstream.fetch;
afterEach(() => {
  upstream.fetch = realFetch;
});

/** A stream/with-timestamps answer for `text`: 10 ms of audio a character, in two chunks. */
function answer(text: string, delayMs: number): Response {
  const chars = [...text];
  const half = Math.ceil(chars.length / 2);
  const chunk = (cs: string[], from: number) =>
    JSON.stringify({
      audio_base64: btoa(String.fromCharCode(...new Uint8Array(cs.length * 480))),
      alignment: {
        characters: cs,
        character_start_times_seconds: cs.map((_, i) => (from + i) * 0.01),
        character_end_times_seconds: cs.map((_, i) => (from + i + 1) * 0.01),
      },
    });
  const body = new ReadableStream<Uint8Array>({
    async start(c) {
      await new Promise((r) => setTimeout(r, delayMs));
      c.enqueue(new TextEncoder().encode(`${chunk(chars.slice(0, half), 0)}\n`));
      c.enqueue(new TextEncoder().encode(`${chunk(chars.slice(half), half)}\n`));
      c.close();
    },
  });
  return new Response(body, { status: 200 });
}

describe('a line said a sentence at a time', () => {
  it('asks once a sentence, with the text before it, and plays them in order with their captions', async () => {
    const asked: { text: string; previous: string | undefined }[] = [];
    upstream.fetch = (async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { text: string; previous_text?: string };
      asked.push({ text: body.text, previous: body.previous_text });
      // The second sentence answers first: its audio must still come second.
      return answer(body.text, asked.length === 1 ? 40 : 5);
    }) as typeof fetch;
    const audio: { ms: number; text: string; firstStart: number | undefined }[] = [];
    await new Promise<void>((done, fail) => {
      const tts = new SentenceTts(
        'key',
        { character: 'mei', speed: 1, breakSeconds: null },
        {
          audio: (pcm, a) =>
            audio.push({
              ms: pcm.byteLength / 48,
              text: a?.chars.join('') ?? '',
              firstStart: a?.startMs[0],
            }),
          done,
          failed: (d) => fail(new Error(d)),
        },
      );
      for (const w of 'Good morning. The sign blew away! Can you help?'.split(' '))
        tts.push(`${w} `);
      tts.end();
    });
    expect(asked.map((a) => a.text)).toEqual([
      'Good morning.',
      'The sign blew away!',
      'Can you help?',
    ]);
    expect(asked[1]?.previous).toBe('Good morning.');
    expect(audio.map((a) => a.text).join('')).toBe(
      'Good morning. The sign blew away! Can you help?',
    );
    // The second sentence's captions start after the first sentence's audio.
    const second = audio.find((a) => a.text.includes('The'));
    expect(second?.firstStart).toBeGreaterThanOrEqual(130 - 1);
  });

  it('hands the rest of a reply to the guest’s voice at the mark', async () => {
    const voices: string[] = [];
    upstream.fetch = (async (url: string, init?: RequestInit) => {
      voices.push(String(url).split('/text-to-speech/')[1]?.split('/')[0] ?? '');
      const body = JSON.parse(String(init?.body)) as { text: string };
      return answer(body.text, 1);
    }) as typeof fetch;
    await new Promise<void>((done, fail) => {
      const tts = new SentenceTts(
        'key',
        { character: 'sol', speed: 1, breakSeconds: null },
        { audio: () => undefined, done, failed: (d) => fail(new Error(d)) },
        { character: 'dex', speed: 1, breakSeconds: null },
      );
      tts.push('Okay, pressing play now. ');
      tts.push(`${GUEST_MARK} Hi Sol, it's Dex. `);
      tts.end();
    });
    expect(voices).toHaveLength(2);
    expect(voices[0]).not.toBe(voices[1]);
  });
});
