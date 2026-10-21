import type { LineTiming } from '@yapling/story';

import type { Segment } from './playout';

/*
 * Caption and mouth timing on the audio clock. The lookups are worklets: the lipsync driver runs
 * them on the UI thread each frame, and tests run them in Node.
 */

/** A caption with each character's start and end on its stream's clock (ms from the first sample). */
export interface CaptionTrack {
  readonly text: string;
  readonly startMs: readonly number[];
  readonly endMs: readonly number[];
}

export const EMPTY_TRACK: CaptionTrack = { text: '', startMs: [], endMs: [] };

/** A live line's alignment so far, with the next alignment frame's characters appended. */
export function appendAlignment(
  track: CaptionTrack,
  chars: readonly string[],
  startMs: readonly number[],
  endMs: readonly number[],
): CaptionTrack {
  return {
    text: track.text + chars.join(''),
    startMs: [...track.startMs, ...expandTimes(chars, startMs)],
    endMs: [...track.endMs, ...expandTimes(chars, endMs)],
  };
}

/** An alignment "character" may hold more than one code unit (an emoji, a combined mark). */
function expandTimes(chars: readonly string[], times: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    const n = (chars[i] ?? '').length;
    for (let k = 0; k < n; k++) out.push(times[i] ?? 0);
  }
  return out;
}

/**
 * A recorded line's caption track from its timing file. The alignment covers the performed text,
 * which carries delivery tags (`[excited] `); the caption is that text without them. Each caption
 * character takes the times of its character in the performed text.
 */
export function trackFromTiming(timing: LineTiming): CaptionTrack {
  const { characters, character_start_times_seconds: starts } = timing.alignment;
  const ends = timing.alignment.character_end_times_seconds;
  const caption = timing.caption;
  const startMs: number[] = [];
  const endMs: number[] = [];
  let ci = 0;
  let inTag = false;
  let afterTag = false;
  for (let i = 0; i < characters.length && ci < caption.length; i++) {
    const ch = characters[i] ?? '';
    if (ch === '[') inTag = true;
    if (inTag) {
      if (ch === ']') {
        inTag = false;
        afterTag = true;
      }
      continue;
    }
    // The space after a tag is dropped with it.
    if (afterTag && /\s/.test(ch) && caption[ci] !== ch) continue;
    afterTag = false;
    for (let k = 0; k < ch.length && ci < caption.length; k++) {
      if (caption[ci] !== ch[k]) {
        return proportionalTrack(caption, timing);
      }
      startMs.push(Math.round((starts[i] ?? 0) * 1000));
      endMs.push(Math.round((ends[i] ?? 0) * 1000));
      ci++;
    }
  }
  if (ci !== caption.length) return proportionalTrack(caption, timing);
  return { text: caption, startMs, endMs };
}

/** When the caption and the performed text don't line up, spread the caption evenly. */
function proportionalTrack(caption: string, timing: LineTiming): CaptionTrack {
  const starts = timing.alignment.character_start_times_seconds;
  const ends = timing.alignment.character_end_times_seconds;
  const first = (starts[0] ?? 0) * 1000;
  const last = (ends[ends.length - 1] ?? 0) * 1000;
  const step = caption.length > 0 ? (last - first) / caption.length : 0;
  const startMs = Array.from(caption, (_, i) => Math.round(first + i * step));
  const endMs = startMs.map((s) => Math.round(s + step));
  return { text: caption, startMs, endMs };
}

/** How many caption characters have started by `ms` (the progressive caption's length). */
export function charIndexAt(track: CaptionTrack, ms: number): number {
  'worklet';
  const starts = track.startMs;
  let lo = 0;
  let hi = starts.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((starts[mid] ?? 0) <= ms) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * The stream position audible at context time `ctx`, from the placed segments: inside a segment it
 * runs with the clock; in a gap (underrun) it holds at the end of the segment before; before the
 * first segment it is -1.
 */
export function streamMsAt(segments: readonly Segment[], ctx: number): number {
  'worklet';
  let pos = -1;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    if (!s || s.ctxStart > ctx) break;
    const into = (ctx - s.ctxStart) * 1000;
    pos = s.streamMs + Math.min(into, s.durationMs);
  }
  return pos;
}

/** A clock pairing: the audio context time and `performance.now()` read together. */
export interface ClockAnchor {
  readonly ctx: number;
  readonly perfMs: number;
}

/** The audio context time at `perfMs`, extrapolated from an anchor (audio and host clocks agree to ppm). */
export function ctxAt(anchor: ClockAnchor, perfMs: number): number {
  'worklet';
  return anchor.ctx + (perfMs - anchor.perfMs) / 1000;
}

/** `performance.now()` at context time `ctx`. */
export function perfAt(anchor: ClockAnchor, ctx: number): number {
  'worklet';
  return anchor.perfMs + (ctx - anchor.ctx) * 1000;
}
