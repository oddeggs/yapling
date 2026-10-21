import { describe, expect, it } from 'vitest';

import { Endpointer, holdFor, joinSegments, ENDPOINTING } from './endpointing';

/** PCM16 at 16 kHz: a tone (voiced) or near silence, `ms` long. */
function pcm(ms: number, voiced: boolean): Uint8Array {
  const samples = (ms * 16) | 0;
  const out = new Uint8Array(samples * 2);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples; i++) {
    const v = voiced ? Math.round(3_000 * Math.sin(i / 5)) : (i % 7) - 3;
    view.setInt16(i * 2, v, true);
  }
  return out;
}

function feedAll(endpointer: Endpointer, parts: [number, boolean][], chunkMs = 100) {
  const events = [];
  for (const [ms, voiced] of parts) {
    const audio = pcm(ms, voiced);
    for (let i = 0; i < audio.byteLength; i += chunkMs * 32) {
      events.push(...endpointer.feed(audio.subarray(i, i + chunkMs * 32)));
    }
  }
  return events;
}

describe('the endpointer', () => {
  it('commits after 180 ms of silence, whatever the chunk size', () => {
    for (const chunkMs of [20, 30, 100]) {
      const endpointer = new Endpointer();
      const events = feedAll(
        endpointer,
        [
          [400, false],
          [1_000, true],
          [300, false],
        ],
        chunkMs,
      );
      expect(events.map((e) => e.type)).toEqual(['speech_start', 'commit']);
      const commit = events[1];
      expect(commit?.type === 'commit' && commit.speechEndMs).toBe(1_400);
      expect(endpointer.speechMs).toBeCloseTo(1_000, -2);
    }
  });

  it('starts a new segment when speech resumes after a pause', () => {
    const endpointer = new Endpointer();
    const events = feedAll(endpointer, [
      [800, true],
      [600, false],
      [500, true],
      [800, false],
    ]);
    expect(events.map((e) => e.type)).toEqual(['speech_start', 'commit', 'speech_start', 'commit']);
    expect(endpointer.silenceMs).toBeGreaterThanOrEqual(ENDPOINTING.holdMs);
  });

  it('waits longer after a word that rarely ends a sentence', () => {
    expect(holdFor('I think we put the books on the', ENDPOINTING)).toBe(1_200);
    expect(holdFor('I put it on the shelf.', ENDPOINTING)).toBe(700);
  });

  it('joins segments as one hesitant sentence', () => {
    expect(joinSegments('I think we put the books.', 'On the shelf.')).toBe(
      'I think we put the books... on the shelf.',
    );
    expect(joinSegments('', 'Hello.')).toBe('Hello.');
  });
});
