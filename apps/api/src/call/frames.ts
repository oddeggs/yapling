import {
  AUDIO,
  encodeAudioFrame,
  type AlignmentFrame,
  type BeatFrame,
  type CorrectionFrame,
  type CorrectionResolvedFrame,
  type EndedFrame,
  type ErrorFrame,
  type HeardFrame,
  type HintFrame,
  type MeaningFrame,
  type MinutesFrame,
  type NotHeardFrame,
  type PartialFrame,
  type PlayRecFrame,
  type ReadyFrame,
  type SafetyFrame,
  type SayEndFrame,
  type SayStartFrame,
  type ThinkingFrame,
} from '@yapling/contracts';

/*
 * The phone side of the call socket: every frame the call sends, JSON or binary, numbered from 1
 * on this socket. A frame sent while no phone is attached (between a drop and a resume) is
 * dropped; the resumed call puts the learner back on the beat instead.
 */

type ServerFrame =
  | ReadyFrame
  | PartialFrame
  | HeardFrame
  | NotHeardFrame
  | SayStartFrame
  | AlignmentFrame
  | SayEndFrame
  | PlayRecFrame
  | BeatFrame
  | HintFrame
  | CorrectionFrame
  | CorrectionResolvedFrame
  | MeaningFrame
  | MinutesFrame
  | SafetyFrame
  | ThinkingFrame
  | ErrorFrame
  | EndedFrame;

/** A server frame without its `seq`, which the sender adds. */
export type FrameBody = ServerFrame extends infer F
  ? F extends { readonly seq: number }
    ? Omit<F, 'seq'>
    : never
  : never;

/** Even, at most 64 KiB: the largest TTS payload one binary frame carries. */
const MAX_TTS_PAYLOAD = AUDIO.ttsPayloadMaxBytes;

export class FrameSender {
  private seq = 0;

  constructor(private readonly socket: WebSocket | null) {}

  get attached(): boolean {
    return this.socket !== null;
  }

  send(body: FrameBody): void {
    if (this.socket === null) return;
    this.seq += 1;
    try {
      this.socket.send(JSON.stringify({ ...body, seq: this.seq }));
    } catch {
      // the phone is gone; the close handler deals with it
    }
  }

  /** TTS audio for a stream, split into frames the phone accepts. */
  audio(streamId: number, pcm: Uint8Array): void {
    if (this.socket === null) return;
    for (let offset = 0; offset < pcm.byteLength; offset += MAX_TTS_PAYLOAD) {
      const payload = pcm.subarray(offset, Math.min(pcm.byteLength, offset + MAX_TTS_PAYLOAD));
      this.seq += 1;
      try {
        this.socket.send(encodeAudioFrame({ kind: 'tts_pcm16', seq: this.seq, streamId, payload }));
      } catch {
        return;
      }
    }
  }
}
