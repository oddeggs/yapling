import { z } from 'zod';

/*
 * Audio on the call socket travels as binary WebSocket messages; everything else is JSON text.
 *
 * Every binary message is a 12-byte header followed by the payload. All header integers are
 * little-endian (the same order as the PCM16 samples):
 *
 *   offset  size  field
 *   0       u8    version   AUDIO_FRAME_VERSION (1)
 *   1       u8    kind      1 = mic_pcm16 (phone → call), 2 = tts_pcm16, 3 = tts_mp3 (call → phone)
 *   2       u16   reserved  0
 *   4       u32   seq       the sender's monotonic frame counter, shared with its JSON frames
 *   8       u32   streamId  0 for mic audio; the `say_start` stream for TTS audio
 *   12      ...   payload   mic_pcm16 and tts_pcm16: signed 16-bit LE mono samples (even length);
 *                           tts_mp3: MP3 bytes
 *
 * Mic audio is always PCM16, 16 kHz, mono, sent in chunks of about 20 ms (640 bytes; the measured
 * default, which the app sends). TTS audio uses the codec and sample rate `say_start` announced for
 * its stream.
 */

export const AUDIO_FRAME_VERSION = 1;
export const AUDIO_HEADER_BYTES = 12;

export const AUDIO = {
  /** The mic format: PCM16, 16 kHz, mono. */
  micSampleRateHz: 16_000,
  micChannels: 1,
  bytesPerSample: 2,
  /** The recommended mic chunk: 20 ms. */
  micChunkMs: 20,
  /** A mic payload never exceeds one second of audio. */
  micPayloadMaxBytes: 32_000,
  /** A TTS payload never exceeds 64 KiB. */
  ttsPayloadMaxBytes: 65_536,
  /** Header integer bounds. */
  u32Max: 0xffff_ffff,
} as const;

export const AUDIO_FRAME_KINDS = ['mic_pcm16', 'tts_pcm16', 'tts_mp3'] as const;
export const AudioFrameKind = z.enum(AUDIO_FRAME_KINDS);
export type AudioFrameKind = z.infer<typeof AudioFrameKind>;

/** The kind byte of each frame kind. */
const KIND_CODES: Record<AudioFrameKind, number> = { mic_pcm16: 1, tts_pcm16: 2, tts_mp3: 3 };
const KIND_BY_CODE = new Map(Object.entries(KIND_CODES).map(([k, c]) => [c, k as AudioFrameKind]));

/** The codec of TTS audio, announced in `say_start`. */
export const TTS_CODECS = ['pcm16', 'mp3'] as const;
export const TtsCodec = z.enum(TTS_CODECS);
export type TtsCodec = z.infer<typeof TtsCodec>;

/** TTS sample rates the call may stream. */
export const TtsSampleRateHz = z.union([
  z.literal(16_000),
  z.literal(22_050),
  z.literal(24_000),
  z.literal(44_100),
]);
export type TtsSampleRateHz = z.infer<typeof TtsSampleRateHz>;

/** The binary frame kind that carries TTS audio in a codec. */
export const ttsFrameKind = (codec: TtsCodec): AudioFrameKind =>
  codec === 'pcm16' ? 'tts_pcm16' : 'tts_mp3';

const U32 = z.int().min(0).max(AUDIO.u32Max);

/** The header fields of a binary audio frame, as decoded. */
export const AudioFrameHeader = z
  .object({ kind: AudioFrameKind, seq: U32, streamId: U32 })
  .refine((h) => (h.kind === 'mic_pcm16' ? h.streamId === 0 : h.streamId > 0), {
    message: 'Mic audio uses stream 0; TTS audio a stream from say_start (1 and up)',
  });
export type AudioFrameHeader = z.infer<typeof AudioFrameHeader>;

/** A decoded binary audio frame. `payload` is a view into the received bytes, not a copy. */
export type AudioFrame = AudioFrameHeader & { readonly payload: Uint8Array };

/** Why a binary message is not a valid audio frame. */
export const AUDIO_FRAME_ERRORS = [
  'too_short',
  'bad_version',
  'bad_kind',
  'reserved_set',
  'bad_stream',
  'empty_payload',
  'odd_pcm_length',
  'payload_too_long',
] as const;
export type AudioFrameError = (typeof AUDIO_FRAME_ERRORS)[number];

export type AudioFrameResult =
  | { readonly ok: true; readonly frame: AudioFrame }
  | { readonly ok: false; readonly error: AudioFrameError };

/** Checks a payload against its kind's rules; null when it fits. */
const payloadError = (kind: AudioFrameKind, length: number): AudioFrameError | null => {
  if (length === 0) return 'empty_payload';
  const max = kind === 'mic_pcm16' ? AUDIO.micPayloadMaxBytes : AUDIO.ttsPayloadMaxBytes;
  if (length > max) return 'payload_too_long';
  if (kind !== 'tts_mp3' && length % AUDIO.bytesPerSample !== 0) return 'odd_pcm_length';
  return null;
};

/** Thrown by `encodeAudioFrame` for a frame no peer would accept. */
export class AudioFrameEncodeError extends Error {
  override readonly name = 'AudioFrameEncodeError';
}

/** Builds a binary audio frame: the 12-byte header, then the payload. */
export const encodeAudioFrame = (frame: AudioFrameHeader & { payload: Uint8Array }): Uint8Array => {
  const header = AudioFrameHeader.safeParse(frame);
  if (!header.success) throw new AudioFrameEncodeError(header.error.issues[0]?.message);
  const problem = payloadError(frame.kind, frame.payload.byteLength);
  if (problem) throw new AudioFrameEncodeError(problem);

  const bytes = new Uint8Array(AUDIO_HEADER_BYTES + frame.payload.byteLength);
  const view = new DataView(bytes.buffer);
  view.setUint8(0, AUDIO_FRAME_VERSION);
  view.setUint8(1, KIND_CODES[frame.kind]);
  view.setUint16(2, 0, true);
  view.setUint32(4, frame.seq, true);
  view.setUint32(8, frame.streamId, true);
  bytes.set(frame.payload, AUDIO_HEADER_BYTES);
  return bytes;
};

/** Reads a binary audio frame without copying the payload. Never throws. */
export const decodeAudioFrame = (data: ArrayBuffer | Uint8Array): AudioFrameResult => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength < AUDIO_HEADER_BYTES) return { ok: false, error: 'too_short' };
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint8(0) !== AUDIO_FRAME_VERSION) return { ok: false, error: 'bad_version' };
  const kind = KIND_BY_CODE.get(view.getUint8(1));
  if (!kind) return { ok: false, error: 'bad_kind' };
  if (view.getUint16(2, true) !== 0) return { ok: false, error: 'reserved_set' };
  const seq = view.getUint32(4, true);
  const streamId = view.getUint32(8, true);
  if (kind === 'mic_pcm16' ? streamId !== 0 : streamId === 0) {
    return { ok: false, error: 'bad_stream' };
  }
  const payload = bytes.subarray(AUDIO_HEADER_BYTES);
  const problem = payloadError(kind, payload.byteLength);
  if (problem) return { ok: false, error: problem };
  return { ok: true, frame: { kind, seq, streamId, payload } };
};

/** Milliseconds of audio in a PCM16 payload at a sample rate (mono). */
export const pcm16DurationMs = (byteLength: number, sampleRateHz: number): number =>
  (byteLength / AUDIO.bytesPerSample / sampleRateHz) * 1_000;
