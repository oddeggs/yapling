import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { MOUTHS } from '../critter';
import { load as loadVoice } from '../generated/yap-voice.generated';
import { REPO_ROOT } from '../node';
import type { PrototypeGlobals } from '../runtime/globals';
import { HOLD_S, mouthAt, prototypeDc, visemeTrack, type RecordedAlignment } from './visemes';

interface Timing {
  id: string;
  text: string;
  alignment: RecordedAlignment;
}

const LINES = join(REPO_ROOT, 'audio/season-1/lines');
const timings = readdirSync(LINES)
  .filter((f) => f.endsWith('.timing.json'))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(LINES, f), 'utf8')) as Timing);

interface VoiceState {
  mode: string;
  mouth: string;
}
interface YapVoice {
  play(line: { w: string; t: string; id: string }): VoiceState;
  tick(mouthFor: (t: string, i: number) => string): VoiceState | null;
}

/**
 * The prototype's voice engine (`yap-voice.js`) playing a recorded line in its timed mode (the
 * audio refuses to play, so it follows the alignment on its own clock), with that clock in hand.
 */
async function prototypeVoice(timing: Timing) {
  let now = 0;
  const window: Record<string, unknown> = {};
  const none = () => undefined;
  class Audio {
    playbackRate = 1;
    onended: unknown = null;
    play() {
      return Promise.reject(new Error('no audio here'));
    }
    pause() {}
  }
  loadVoice({
    window,
    document: { createElement: () => ({}), getElementById: none, head: { appendChild: none } },
    performance: { now: () => now },
    fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve(timing) }),
    Audio,
    setTimeout: () => 0,
    clearTimeout: none,
  } as unknown as PrototypeGlobals);
  const voice = window['YapVoice'] as YapVoice;
  const st = voice.play({ w: 'pip', t: timing.text, id: timing.id });
  for (let i = 0; i < 5 && st.mode !== 'align'; i++) await new Promise((r) => setImmediate(r));
  expect(st.mode).toBe('align');
  return {
    at(t: number): string {
      now = t * 1000;
      return voice.tick(prototypeDc().mouthFor)?.mouth ?? 'rest';
    },
  };
}

describe('the viseme track', () => {
  it('uses the prototype mapping: "th" is L, vowels open, lips close on m, b and p', () => {
    const { mouthFor } = prototypeDc();
    expect(mouthFor('the', 0)).toBe('L');
    expect(mouthFor('cat', 1)).toBe('A');
    expect(mouthFor('mop', 0)).toBe('M');
    expect(mouthFor('mop', 1)).toBe('O');
    expect(mouthFor('fun', 0)).toBe('F');
    expect(mouthFor('fun', 1)).toBe('U');
    expect(mouthFor('a b', 1)).toBe('rest');
  });

  it('has recorded lines to follow', () => {
    expect(timings.length).toBeGreaterThan(20);
  });

  it.each(timings.map((t) => [t.id, t] as const))(
    '%s: shows what the prototype voice engine shows at every millisecond',
    async (_, timing) => {
      const track = visemeTrack(timing.alignment);
      const voice = await prototypeVoice(timing);
      const starts = timing.alignment.character_start_times_seconds;
      const last = starts[starts.length - 1] ?? 0;
      let talking = 0;
      // Up to where the timed mode stops by itself (0.35 s after the last character starts).
      for (let t = 0.0003; t < last + 0.35; t += 0.001) {
        const want = voice.at(t);
        expect(mouthAt(track, t), `at ${t.toFixed(4)} s`).toBe(want);
        if (want !== 'rest') talking++;
      }
      expect(talking).toBeGreaterThan(0);
      expect(track.every((e) => (MOUTHS as readonly string[]).includes(e.mouth))).toBe(true);
    },
  );

  it('rests in a [tag], before the first character and after the last one', () => {
    const t = timings.find((x) => x.alignment.characters[0] === '[');
    if (!t) throw new Error('no line with a leading tag');
    const track = visemeTrack(t.alignment);
    const a = t.alignment;
    const close = a.characters.indexOf(']');
    expect(mouthAt(track, -1)).toBe('rest');
    expect(mouthAt(track, (a.character_start_times_seconds[close] ?? 0) - 0.0001)).toBe('rest');
    const end = a.character_end_times_seconds[a.characters.length - 1] ?? 0;
    expect(mouthAt(track, end + HOLD_S + 0.001)).toBe('rest');
    expect(track[track.length - 1]?.mouth).toBe('rest');
  });

  it('reads streamed alignment in milliseconds the same way', () => {
    const t = timings[0];
    if (!t) throw new Error('no lines');
    const a = t.alignment;
    const streamed = visemeTrack({
      chars: a.characters,
      startMs: a.character_start_times_seconds.map((s) => s * 1000),
      endMs: a.character_end_times_seconds.map((s) => s * 1000),
    });
    const recorded = visemeTrack(a);
    expect(streamed.map((e) => e.mouth)).toEqual(recorded.map((e) => e.mouth));
    streamed.forEach((e, i) => expect(e.t).toBeCloseTo(recorded[i]?.t ?? NaN, 9));
  });
});
