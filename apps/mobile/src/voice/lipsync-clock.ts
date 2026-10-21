import {
  charIndexAt,
  ctxAt,
  streamMsAt,
  type CaptionTrack,
  type ClockAnchor,
} from './caption-clock';
import type { Segment } from './playout';
import { mouthAt, type Mouth, type VisemeTrack } from './visemes';

/*
 * The lipsync clock's arithmetic, kept free of Reanimated so it runs in tests as well as in the
 * UI-thread frame callback.
 */

/** Everything the UI thread needs to place the playing line on the audio clock. */
export interface LipsyncSource {
  readonly streamId: number;
  readonly track: CaptionTrack;
  readonly visemes: VisemeTrack;
  /** Where the line's audio sits on the context clock. */
  readonly segments: readonly Segment[];
  /** Context time ↔ `performance.now()` (the same steady clock on the JS and UI threads). */
  readonly anchor: ClockAnchor;
  /** Seconds from leaving the graph to being heard. */
  readonly outputLatencyS: number;
}

export interface LipsyncFrame {
  readonly streamId: number;
  readonly streamMs: number;
  readonly charIndex: number;
  readonly mouth: Mouth;
}

/** The audible caption position and mouth at `perfMs`. */
export function lipsyncAt(source: LipsyncSource | null, perfMs: number): LipsyncFrame {
  'worklet';
  if (!source) return { streamId: 0, streamMs: -1, charIndex: 0, mouth: 'rest' };
  const audibleCtx = ctxAt(source.anchor, perfMs) - source.outputLatencyS;
  const ms = streamMsAt(source.segments, audibleCtx);
  if (ms < 0) return { streamId: source.streamId, streamMs: -1, charIndex: 0, mouth: 'rest' };
  return {
    streamId: source.streamId,
    streamMs: ms,
    charIndex: charIndexAt(source.track, ms),
    mouth: mouthAt(source.visemes, ms),
  };
}
