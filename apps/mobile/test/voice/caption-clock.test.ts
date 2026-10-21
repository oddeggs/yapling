import { describe, expect, it } from '@jest/globals';
import { RECORDED_LINE_IDS } from '@yapling/story';
import type { LineTiming } from '@yapling/story';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  appendAlignment,
  charIndexAt,
  ctxAt,
  EMPTY_TRACK,
  perfAt,
  streamMsAt,
  trackFromTiming,
} from '../../src/voice/caption-clock';
import { lipsyncAt } from '../../src/voice/lipsync-clock';
import { localVisemeTrack, mouthAt } from '../../src/voice/visemes';

const LINES = join(__dirname, '../../../../audio/season-1/lines');
const timing = (id: string): LineTiming => {
  const file = readdirSync(LINES).find((f) => f.startsWith(`${id}-`) && f.endsWith('.timing.json'));
  if (!file) throw new Error(`no timing for ${id}`);
  return JSON.parse(readFileSync(join(LINES, file), 'utf8')) as LineTiming;
};

describe('recorded line captions', () => {
  it('maps every recorded line onto its caption exactly, without the delivery tags', () => {
    expect(RECORDED_LINE_IDS.length).toBeGreaterThan(0);
    for (const id of RECORDED_LINE_IDS) {
      const t = timing(id);
      const track = trackFromTiming(t);
      expect(track.text).toBe(t.caption);
      expect(track.startMs).toHaveLength(t.caption.length);
      // Exact mapping, not the even spread used when the texts disagree.
      const firstSpoken = t.alignment.characters.findIndex((_, i) => {
        const before = t.alignment.characters.slice(0, i + 1).join('');
        return (
          !/\[[^\]]*$/.test(before) &&
          !before.endsWith(']') &&
          /\S/.test(t.alignment.characters[i] ?? '')
        );
      });
      expect(track.startMs[0]).toBe(
        Math.round((t.alignment.character_start_times_seconds[firstSpoken] ?? 0) * 1000),
      );
      for (let i = 1; i < track.startMs.length; i++) {
        expect(track.startMs[i]).toBeGreaterThanOrEqual(track.startMs[i - 1] ?? 0);
      }
    }
  });

  it('reveals the opening line of the prologue as it is spoken', () => {
    const track = trackFromTiming(timing('s1-pro-01'));
    expect(track.text.startsWith('This is it.')).toBe(true);
    expect(charIndexAt(track, -1)).toBe(0);
    const tEnd = track.startMs[3] ?? 0; // "This"
    expect(track.text.slice(0, charIndexAt(track, tEnd))).toBe('This');
    expect(charIndexAt(track, 1e9)).toBe(track.text.length);
  });
});

describe('live alignment', () => {
  it('appends alignment frames onto one caption', () => {
    let t = appendAlignment(EMPTY_TRACK, ['H', 'i', ' '], [0, 50, 90], [50, 90, 120]);
    t = appendAlignment(t, ['y', 'o', 'u'], [120, 160, 200], [160, 200, 260]);
    expect(t.text).toBe('Hi you');
    expect(charIndexAt(t, 0)).toBe(1);
    expect(charIndexAt(t, 159)).toBe(4);
    expect(charIndexAt(t, 200)).toBe(6);
  });

  it('gives a multi-unit character its times for each unit', () => {
    const t = appendAlignment(EMPTY_TRACK, ['a', '👋', 'b'], [0, 10, 20], [10, 20, 30]);
    expect(t.text.length).toBe(4);
    expect(t.startMs).toEqual([0, 10, 10, 20]);
  });
});

describe('the audio clock', () => {
  const segments = [
    { seq: 1, ctxStart: 10, streamMs: 0, durationMs: 100 },
    { seq: 2, ctxStart: 10.1, streamMs: 100, durationMs: 100 },
    // An underrun: 300 ms of silence, then the rest of the line.
    { seq: 3, ctxStart: 10.5, streamMs: 200, durationMs: 100 },
  ];

  it('places the audible stream position on the context clock, holding through a gap', () => {
    expect(streamMsAt(segments, 9.99)).toBe(-1);
    expect(streamMsAt(segments, 10.05)).toBeCloseTo(50);
    expect(streamMsAt(segments, 10.15)).toBeCloseTo(150);
    expect(streamMsAt(segments, 10.35)).toBeCloseTo(200);
    expect(streamMsAt(segments, 10.55)).toBeCloseTo(250);
    expect(streamMsAt(segments, 11)).toBeCloseTo(300);
  });

  it('converts between the audio clock and performance.now()', () => {
    const anchor = { ctx: 5, perfMs: 1000 };
    expect(ctxAt(anchor, 1250)).toBeCloseTo(5.25);
    expect(perfAt(anchor, 5.5)).toBeCloseTo(1500);
  });

  it('drives the caption and mouth from the clock, minus the output latency', () => {
    const track = appendAlignment(
      EMPTY_TRACK,
      ['m', 'a', ' ', 'o'],
      [0, 40, 80, 220],
      [40, 80, 100, 260],
    );
    const source = {
      streamId: 7,
      track,
      visemes: localVisemeTrack(track),
      segments,
      anchor: { ctx: 10, perfMs: 0 },
      outputLatencyS: 0.02,
    };
    expect(lipsyncAt(null, 0)).toEqual({ streamId: 0, streamMs: -1, charIndex: 0, mouth: 'rest' });
    expect(lipsyncAt(source, 10)).toMatchObject({ streamMs: -1, charIndex: 0, mouth: 'rest' });
    // perf 70 ms → ctx 10.07, heard 20 ms later: stream position 50 ms, inside "a".
    const f = lipsyncAt(source, 70);
    expect(f.streamMs).toBeCloseTo(50);
    expect(f.charIndex).toBe(2);
    expect(f.mouth).toBe('A');
    // In the underrun gap the caption holds and the mouth closes.
    const gap = lipsyncAt(source, 400);
    expect(gap.streamMs).toBeCloseTo(200);
    expect(gap.charIndex).toBe(3);
    expect(gap.mouth).toBe('rest');
  });
});

describe('mouth shapes', () => {
  it('follows the prototype mapping and closes in pauses', () => {
    const track = appendAlignment(
      EMPTY_TRACK,
      ['t', 'h', 'e', ' ', 'b', 'o', 'x'],
      [0, 50, 100, 150, 400, 450, 500],
      [50, 100, 150, 160, 450, 500, 560],
    );
    const v = localVisemeTrack(track);
    expect(v.mouth).toEqual(['L', 'E', 'E', 'rest', 'M', 'O', 'rest']);
    expect(mouthAt(v, -5)).toBe('rest');
    expect(mouthAt(v, 10)).toBe('L');
    expect(mouthAt(v, 300)).toBe('rest');
    expect(mouthAt(v, 460)).toBe('O');
    expect(mouthAt(v, 1000)).toBe('rest');
  });
});
