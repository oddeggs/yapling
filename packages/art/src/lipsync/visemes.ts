import type { Mouth } from '../critter';
import { load as loadDc } from '../generated/yap-dc.generated';
import type { PrototypeGlobals } from '../runtime/globals';
import type { YapDc } from '../runtime/prototype';

/** A recorded line's alignment (the `.timing.json` of `audio/season-1/lines`, from ElevenLabs). */
export interface RecordedAlignment {
  readonly characters: readonly string[];
  readonly character_start_times_seconds: readonly number[];
  readonly character_end_times_seconds: readonly number[];
}

/** A live line's alignment, as the call socket streams it (milliseconds). */
export interface StreamedAlignment {
  readonly chars: readonly string[];
  readonly startMs: readonly number[];
  readonly endMs: readonly number[];
}

export type Alignment = RecordedAlignment | StreamedAlignment;

/** From time `t` (seconds from the alignment's zero) the critter shows `mouth`. */
export interface VisemeEvent {
  readonly t: number;
  readonly mouth: Mouth;
}

let dc: YapDc | null = null;

/** The prototype's own `mouthFor(text, i)` from `yap-dc.js` (loaded without a canvas). */
export function prototypeDc(): YapDc {
  if (dc) return dc;
  const window: Record<string, unknown> = {};
  const none = () => undefined;
  loadDc({
    window,
    document: { createElement: () => ({}), getElementById: none, head: { appendChild: none } },
  } as unknown as PrototypeGlobals);
  const make = window['YapDC'] as (react: unknown) => YapDc;
  dc = make({ createElement: none, Component: class {} });
  return dc;
}

/** How long a mouth stays on after its character ends (the voice engine's 60 ms). */
export const HOLD_S = 0.06;

function normalize(a: Alignment): { chars: readonly string[]; start: number[]; end: number[] } {
  if ('characters' in a) {
    return {
      chars: a.characters,
      start: [...a.character_start_times_seconds],
      end: [...a.character_end_times_seconds],
    };
  }
  return {
    chars: a.chars,
    start: a.startMs.map((v) => v / 1000),
    end: a.endMs.map((v) => v / 1000),
  };
}

/**
 * The mouth shapes for a line, as the prototype's voice engine (`yap-voice.js`, `tick`) shows
 * them while the line plays: before the first character and inside a `[tag]` the mouth rests; on
 * a character, the shape `mouthFor` gives it (looking at the next character for "th"), held until
 * 60 ms after the character ends, then rest. The result changes only at the listed times.
 */
export function visemeTrack(alignment: Alignment): VisemeEvent[] {
  const { chars, start, end } = normalize(alignment);
  const n = Math.min(chars.length, start.length, end.length);
  const raw = chars.slice(0, n).join('');
  const mouthFor = prototypeDc().mouthFor;
  // Whether each character sits inside a `[…]` tag, brackets included.
  const inTag: boolean[] = [];
  let inb = false;
  for (let i = 0; i < n; i++) {
    const c = chars[i];
    if (c === '[') inb = true;
    inTag.push(inb);
    if (c === ']') inb = false;
  }
  const mouthAtTime = (t: number): Mouth => {
    let k = 0;
    while (k < n && (start[k] ?? Infinity) <= t) k++;
    const j = Math.max(0, k - 1);
    if (k === 0 || inTag[j] || t > (end[j] ?? 0) + HOLD_S) return 'rest';
    return mouthFor(raw, j) as Mouth;
  };
  // The shape changes only where a character starts or its hold runs out.
  const times = new Set<number>([0]);
  for (let i = 0; i < n; i++) {
    times.add(start[i] ?? 0);
    times.add((end[i] ?? 0) + HOLD_S);
  }
  const out: VisemeEvent[] = [];
  for (const t of [...times].sort((a, b) => a - b)) {
    // Just after `t`: a start counts from its time, a hold runs out after its time.
    const mouth = mouthAtTime(t + 1e-9);
    if (out[out.length - 1]?.mouth !== mouth) out.push({ t, mouth });
  }
  return out;
}

/** The mouth at `t` seconds on a track (a worklet: runs on the UI thread against the audio clock). */
export function mouthAt(track: readonly VisemeEvent[], t: number): Mouth {
  'worklet';
  let lo = 0;
  let hi = track.length - 1;
  if (hi < 0 || t < (track[0]?.t ?? 0)) return 'rest';
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((track[mid]?.t ?? Infinity) <= t) lo = mid;
    else hi = mid - 1;
  }
  return track[lo]?.mouth ?? 'rest';
}
