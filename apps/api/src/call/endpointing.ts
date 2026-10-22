/*
 * Turn detection in the call object (Scribe's own turn prediction does not exist for the realtime
 * model, and its VAD cuts learners off). An energy gate runs over 20 ms slices of the mic audio:
 *
 * - two voiced slices in a row start speech;
 * - after `specMs` (180 ms) of silence the segment is committed to Scribe and the reply starts
 *   generating speculatively, but it is held;
 * - the hold is released after `holdMs` (700 ms) of silence, or `holdLongMs` (1,200 ms) when the
 *   words stop on one a sentence rarely ends with ("the", "is", "and", "to", "my"…);
 * - speech that resumes before the reply reached the phone drops the reply, and the segments are
 *   joined as one hesitant sentence.
 *
 * The app's hands-free mode times speech by the phone's own flags and waits longer (`PATIENT_HOLD`):
 * learners stop mid-sentence to find a word, and a tap on the mic ends the turn at once.
 *
 * Silence is counted in audio time, so the rules hold however the phone chunks its audio.
 */

export interface EndpointConfig {
  readonly specMs: number;
  readonly holdMs: number;
  readonly holdLongMs: number;
  /** RMS of a voiced 20 ms slice of PCM16 (about 400 for a close phone mic). */
  readonly voicedRms: number;
}

export const ENDPOINTING: EndpointConfig = {
  specMs: 180,
  holdMs: 700,
  holdLongMs: 1_200,
  voicedRms: 400,
};

/**
 * The holds when the phone times speech itself (the app's hands-free mode): 2 s after a phrase that
 * could be finished, 3.5 s after a word a sentence rarely ends on. A learner who stops mid-sentence
 * to think keeps the turn; one who wants an answer sooner taps the mic.
 */
export const PATIENT_HOLD: Pick<EndpointConfig, 'holdMs' | 'holdLongMs'> = {
  holdMs: 2_000,
  holdLongMs: 3_500,
};

/** Words a learner's sentence rarely ends on: a pause after them means "still thinking". */
export const DANGLING = new Set(
  'a an the and or but so because to of in on at for with from about into is am are was were be i my your his her our their this that very some want like go think um uh er'.split(
    ' ',
  ),
);

/** 20 ms of PCM16 at 16 kHz. */
export const SLICE_BYTES = 640;
const BYTES_PER_MS = 32;

/** RMS of a PCM16LE slice. */
export function sliceRms(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let sum = 0;
  const n = bytes.byteLength >> 1;
  for (let i = 0; i < n; i++) {
    const v = view.getInt16(i * 2, true);
    sum += v * v;
  }
  return Math.sqrt(sum / Math.max(1, n));
}

/** The silence to wait for before answering text that ends this way. */
export function holdFor(text: string, cfg: Pick<EndpointConfig, 'holdMs' | 'holdLongMs'>): number {
  const last =
    text
      .toLowerCase()
      .replace(/[^a-z' ]/g, ' ')
      .trim()
      .split(/\s+/)
      .at(-1) ?? '';
  return DANGLING.has(last) ? cfg.holdLongMs : cfg.holdMs;
}

/**
 * Joins committed segments split by a pause. Scribe ends each segment with a full stop, which
 * reads to the model like a finished sentence; show the pause as a hesitation instead.
 */
export function joinSegments(before: string, next: string): string {
  if (!before) return next;
  const head = before.replace(/[.,]+\s*$/, '').replace(/\.\.\.$/, '');
  const tail = /^(I|I'm|I've|I'll|I'd)\b/.test(next)
    ? next
    : next.charAt(0).toLowerCase() + next.slice(1);
  return `${head}... ${tail}`;
}

export type EndpointEvent =
  /** Speech started (or resumed). */
  | { readonly type: 'speech_start'; readonly atMs: number }
  /** Enough silence to commit the segment and start a reply speculatively. */
  | { readonly type: 'commit'; readonly speechEndMs: number };

/** The energy gate and its speech state, fed mic audio in any chunk size. */
export class Endpointer {
  private voicedRun = 0;
  private silence = 0;
  private speaking = false;
  private committed = true;
  private carry = new Uint8Array(0);
  /** Audio received so far, in ms (the mic clock). */
  audioMs = 0;
  /** Voiced audio while speaking, for metering learner talk. */
  speechMs = 0;

  constructor(private readonly cfg: EndpointConfig = ENDPOINTING) {}

  /** Silence since the last voiced slice, in audio ms. */
  get silenceMs(): number {
    return this.silence;
  }

  get inSpeech(): boolean {
    return this.speaking;
  }

  /** Feeds a mic chunk; returns what happened, in order. */
  feed(chunk: Uint8Array): EndpointEvent[] {
    const events: EndpointEvent[] = [];
    let bytes = chunk;
    if (this.carry.byteLength > 0) {
      bytes = new Uint8Array(this.carry.byteLength + chunk.byteLength);
      bytes.set(this.carry);
      bytes.set(chunk, this.carry.byteLength);
    }
    let offset = 0;
    for (; offset + SLICE_BYTES <= bytes.byteLength; offset += SLICE_BYTES) {
      this.step(bytes.subarray(offset, offset + SLICE_BYTES), events);
    }
    this.carry = bytes.slice(offset);
    return events;
  }

  /** Forgets the current segment (a hold-to-talk release or a new socket). */
  reset(): void {
    this.voicedRun = 0;
    this.silence = 0;
    this.speaking = false;
    this.committed = true;
  }

  private step(slice: Uint8Array, events: EndpointEvent[]): void {
    const ms = slice.byteLength / BYTES_PER_MS;
    this.audioMs += ms;
    if (sliceRms(slice) > this.cfg.voicedRms) {
      this.voicedRun++;
      this.silence = 0;
    } else {
      this.voicedRun = 0;
      this.silence += ms;
    }
    if (this.voicedRun >= 2 && !this.speaking) {
      this.speaking = true;
      this.committed = false;
      events.push({ type: 'speech_start', atMs: this.audioMs - 2 * ms });
    }
    if (this.speaking) this.speechMs += ms;
    if (this.speaking && !this.committed && this.silence >= this.cfg.specMs) {
      this.speaking = false;
      this.committed = true;
      this.speechMs -= this.silence;
      events.push({ type: 'commit', speechEndMs: this.audioMs - this.silence });
    }
  }
}
