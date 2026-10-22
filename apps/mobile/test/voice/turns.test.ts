import { describe, expect, it } from '@jest/globals';

import { LatencyMeter, MIN_HOLD_MS, TurnTaker } from '../../src/voice/turns';

const frame = (v: number) => new Int16Array(320).fill(v);

function setup(mode: 'hands_free' | 'hold_to_talk', minHoldMs = 0) {
  const sent: number[][] = [];
  let endTurns = 0;
  const clock = { ms: 0 };
  const t = new TurnTaker(
    mode,
    {
      sendMic: (pcm) => {
        const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
        const firsts: number[] = [];
        for (let i = 0; i < pcm.byteLength; i += 640) firsts.push(view.getInt16(i, true));
        sent.push(firsts);
      },
      endTurn: () => endTurns++,
    },
    { chunkMs: 20, prerollMs: 60, maxTailMs: 100, minHoldMs, now: () => clock.ms },
  );
  return { t, sent, clock, endTurns: () => endTurns };
}

describe('turn-taking', () => {
  it('streams every frame hands-free and never ends a turn itself', () => {
    const { t, sent, endTurns } = setup('hands_free');
    [1, 2, 3].forEach((v) => t.frame(frame(v), false, null));
    t.press();
    t.release(false);
    expect(sent).toEqual([[1], [2], [3]]);
    expect(endTurns()).toBe(0);
  });

  it('holds to talk: pre-roll first, then live frames, then end_turn on release', () => {
    const { t, sent, endTurns } = setup('hold_to_talk');
    [1, 2, 3, 4, 5].forEach((v) => t.frame(frame(v), false, null));
    expect(sent).toEqual([]);
    t.press();
    expect(sent).toEqual([[3], [4], [5]]);
    t.frame(frame(6), true, { type: 'speech_start', atMs: 0 });
    t.release(false);
    expect(sent.at(-1)).toEqual([6]);
    expect(endTurns()).toBe(1);
    t.frame(frame(7), false, null);
    expect(sent.at(-1)).toEqual([6]);
  });

  it('keeps streaming after release until the learner stops, so a word is never cut', () => {
    const { t, sent, endTurns } = setup('hold_to_talk');
    t.press();
    t.frame(frame(1), true, null);
    t.release(true);
    expect(endTurns()).toBe(0);
    t.frame(frame(2), true, null);
    t.frame(frame(3), false, { type: 'speech_end', atMs: 40 });
    expect(endTurns()).toBe(1);
    expect(sent.map((s) => s[0])).toEqual([1, 2, 3]);
  });

  it('caps the tail when the learner keeps talking', () => {
    const { t, endTurns } = setup('hold_to_talk');
    t.press();
    t.release(true);
    for (let i = 0; i < 10; i++) t.frame(frame(i), true, null);
    expect(endTurns()).toBe(1);
  });

  it('drops held audio on reset', () => {
    const { t, sent } = setup('hold_to_talk');
    t.frame(frame(1), false, null);
    t.reset();
    t.press();
    expect(sent).toEqual([]);
  });
});

describe('the shortest turn', () => {
  /** Holds for `ms`, one frame every 20 ms, then lets go. */
  const hold = (h: ReturnType<typeof setup>, ms: number, speaking = false) => {
    h.t.press();
    for (let at = 20; at <= ms; at += 20) {
      h.clock.ms += 20;
      h.t.frame(frame(at / 20), speaking, null);
    }
    return h.t.release(false);
  };

  it('is a two-second hold', () => {
    expect(MIN_HOLD_MS).toBe(2_000);
  });

  it('drops a tap unsent: no audio, no end_turn', () => {
    const h = setup('hold_to_talk', MIN_HOLD_MS);
    [1, 2, 3].forEach((v) => h.t.frame(frame(v), false, null));
    expect(hold(h, 500, true)).toBe('tap');
    expect(hold(h, MIN_HOLD_MS - 20)).toBe('tap');
    expect(h.sent).toEqual([]);
    expect(h.endTurns()).toBe(0);
    // Nothing of the taps leaks into the next turn.
    h.t.frame(frame(99), false, null);
    expect(h.sent).toEqual([]);
  });

  it('holds the audio back until two seconds, then sends it all, pre-roll first', () => {
    const h = setup('hold_to_talk', MIN_HOLD_MS);
    [7, 8, 9].forEach((v) => h.t.frame(frame(v), false, null));
    h.t.press();
    for (let i = 1; i < 100; i++) {
      h.clock.ms += 20;
      h.t.frame(frame(i), true, null);
    }
    expect(h.sent).toEqual([]);
    h.clock.ms += 20;
    h.t.frame(frame(100), true, null);
    expect(h.sent.map((c) => c[0])).toEqual([
      7,
      8,
      9,
      ...Array.from({ length: 100 }, (_, i) => i + 1),
    ]);
    h.clock.ms += 20;
    h.t.frame(frame(101), true, null);
    expect(h.sent.at(-1)).toEqual([101]);
    expect(h.t.release(false)).toBe('turn');
    expect(h.endTurns()).toBe(1);
  });

  it('sends a two-second hold released before its next frame as a turn', () => {
    const h = setup('hold_to_talk', MIN_HOLD_MS);
    h.t.press();
    h.clock.ms += 20;
    h.t.frame(frame(1), true, null);
    h.clock.ms = MIN_HOLD_MS + 5;
    expect(h.t.release(false)).toBe('turn');
    expect(h.sent.map((c) => c[0])).toEqual([1]);
    expect(h.endTurns()).toBe(1);
  });

  it('never applies hands-free', () => {
    const h = setup('hands_free', MIN_HOLD_MS);
    h.t.press();
    expect(h.t.release(false)).toBeNull();
    h.t.frame(frame(1), true, null);
    expect(h.sent).toEqual([[1]]);
  });
});

describe('the latency meter', () => {
  it('measures the first recorded and the first live line after the learner stops', () => {
    const m = new LatencyMeter();
    expect(m.lineScheduled(1, 'recorded', 500)).toBeNull(); // no learner turn yet
    m.speechStarted();
    m.speechEnded(10_000);
    expect(m.lineScheduled(2, 'recorded', 10_920)).toBe(920);
    expect(m.lineScheduled(3, 'live', 11_480)).toBe(1480);
    expect(m.lineScheduled(4, 'live', 14_000)).toBeNull();
    expect(m.takeLag(2)).toBe(920);
    expect(m.takeLag(2)).toBeNull();
    expect(m.takeLag(4)).toBeNull();
  });

  it('never counts the next recorded beat after the reply as a reaction', () => {
    const m = new LatencyMeter();
    m.speechEnded(10_000);
    expect(m.lineScheduled(5, 'live', 12_000)).toBe(2000);
    expect(m.lineScheduled(6, 'recorded', 16_780)).toBeNull();
    expect(m.takeLag(6)).toBeNull();
  });

  it('starts over when the learner speaks again', () => {
    const m = new LatencyMeter();
    m.speechEnded(1000);
    m.speechStarted();
    expect(m.lineScheduled(1, 'live', 2000)).toBeNull();
    m.speechEnded(3000);
    expect(m.lineScheduled(1, 'live', 4500)).toBe(1500);
  });
});
