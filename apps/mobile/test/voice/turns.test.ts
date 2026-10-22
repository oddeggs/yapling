import { describe, expect, it } from '@jest/globals';

import { LatencyMeter, TurnTaker } from '../../src/voice/turns';

const frame = (v: number) => new Int16Array(320).fill(v);

function setup(mode: 'hands_free' | 'hold_to_talk') {
  const sent: number[][] = [];
  let endTurns = 0;
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
    { chunkMs: 20, prerollMs: 60, maxTailMs: 100 },
  );
  return { t, sent, endTurns: () => endTurns };
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
