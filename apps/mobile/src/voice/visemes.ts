import type { CaptionTrack } from './caption-clock';

/*
 * Mouth shapes on the audio clock. `@yapling/art` owns the mouths and will provide
 * `visemeTrack(alignment)`; until it lands this file maps characters to the prototype's eight
 * lip shapes with the prototype's own rule (`mouthFor` in `design/prototype/art/yap-dc.js`).
 * Swap `localVisemeTrack` for the art package's function when it exists; the shape below is the
 * interface the lipsync driver needs.
 */

/** The prototype's lip shapes; `rest` is the closed mouth between words. */
export const MOUTHS = ['rest', 'A', 'E', 'O', 'U', 'M', 'F', 'L'] as const;
export type Mouth = (typeof MOUTHS)[number];

/** Mouth shapes over time, on the same clock as the caption track (ms from the stream's first sample). */
export interface VisemeTrack {
  readonly startMs: readonly number[];
  readonly endMs: readonly number[];
  readonly mouth: readonly Mouth[];
}

/** What the art package is expected to export. */
export type VisemeTrackFn = (alignment: CaptionTrack) => VisemeTrack;

/** How long a mouth holds past its character's end before it closes. */
export const MOUTH_HOLD_MS = 60;

export function mouthForChar(text: string, i: number): Mouth {
  const c = (text[i] ?? ' ').toLowerCase();
  const n = (text[i + 1] ?? '').toLowerCase();
  if (c === 't' && n === 'h') return 'L';
  if ('aiáàạ'.includes(c)) return 'A';
  if (c === 'e' || c === 'y' || c === 'ê') return 'E';
  if (c === 'o' || c === 'ô') return 'O';
  if ('uwư'.includes(c)) return 'U';
  if ('mbp'.includes(c)) return 'M';
  if ('fv'.includes(c)) return 'F';
  if ('ltdn'.includes(c)) return 'L';
  if ('sczkgrjh'.includes(c)) return 'E';
  return 'rest';
}

export const localVisemeTrack: VisemeTrackFn = (track) => ({
  startMs: track.startMs,
  endMs: track.endMs,
  mouth: Array.from(track.text, (_, i) => mouthForChar(track.text, i)),
});

/** The mouth at `ms`: the shape of the character playing, `rest` in pauses and outside the line. */
export function mouthAt(visemes: VisemeTrack, ms: number): Mouth {
  'worklet';
  const starts = visemes.startMs;
  let lo = 0;
  let hi = starts.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((starts[mid] ?? 0) <= ms) lo = mid + 1;
    else hi = mid;
  }
  const k = lo - 1;
  if (k < 0) return 'rest';
  if (ms > (visemes.endMs[k] ?? 0) + MOUTH_HOLD_MS) return 'rest';
  return visemes.mouth[k] ?? 'rest';
}
