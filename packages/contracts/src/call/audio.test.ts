import { describe, expect, it } from 'vitest';

import { describeSchemas } from '../schema-runner.test-data';
import * as audio from './audio';
import {
  AUDIO,
  AUDIO_HEADER_BYTES,
  AudioFrameEncodeError,
  decodeAudioFrame,
  encodeAudioFrame,
  pcm16DurationMs,
  ttsFrameKind,
} from './audio';

const pcm = (bytes: number) => Uint8Array.from({ length: bytes }, (_, i) => i % 251);

describeSchemas('audio', audio, {
  AudioFrameKind: [['mic_pcm16', 'tts_pcm16', 'tts_mp3'], ['mic_opus']],
  TtsCodec: [['pcm16', 'mp3'], ['opus']],
  TtsSampleRateHz: [
    [16_000, 22_050, 24_000, 44_100],
    [8_000, 48_000, '24000'],
  ],
  AudioFrameHeader: [
    [
      { kind: 'mic_pcm16', seq: 1, streamId: 0 },
      { kind: 'tts_pcm16', seq: 0xffff_ffff, streamId: 7 },
      { kind: 'tts_mp3', seq: 3, streamId: 0xffff_ffff },
    ],
    [
      { kind: 'mic_pcm16', seq: 1, streamId: 2 },
      { kind: 'tts_mp3', seq: 1, streamId: 0 },
      { kind: 'tts_pcm16', seq: 0x1_0000_0000, streamId: 1 },
      { kind: 'tts_pcm16', seq: -1, streamId: 1 },
    ],
  ],
});

describe('the binary audio header', () => {
  it('lays out version, kind, reserved, seq and stream id little-endian before the payload', () => {
    const bytes = encodeAudioFrame({
      kind: 'tts_pcm16',
      seq: 0x0102_0304,
      streamId: 0x0a0b_0c0d,
      payload: Uint8Array.of(0xaa, 0xbb),
    });
    expect([...bytes]).toEqual([
      1, 2, 0, 0, 0x04, 0x03, 0x02, 0x01, 0x0d, 0x0c, 0x0b, 0x0a, 0xaa, 0xbb,
    ]);
    expect(AUDIO_HEADER_BYTES).toBe(12);
  });

  it.each([
    { kind: 'mic_pcm16', seq: 1, streamId: 0, payload: pcm(3_200) },
    { kind: 'tts_pcm16', seq: 812, streamId: 3, payload: pcm(AUDIO.ttsPayloadMaxBytes) },
    { kind: 'tts_mp3', seq: 0xffff_ffff, streamId: 0xffff_ffff, payload: pcm(417) },
  ] as const)('round-trips a $kind frame', (frame) => {
    const decoded = decodeAudioFrame(encodeAudioFrame(frame));
    expect(decoded).toEqual({ ok: true, frame });
  });

  it('decodes from an ArrayBuffer and from a view into a larger buffer without copying', () => {
    const frame = { kind: 'mic_pcm16', seq: 9, streamId: 0, payload: pcm(320) } as const;
    const bytes = encodeAudioFrame(frame);
    expect(decodeAudioFrame(bytes.buffer as ArrayBuffer)).toEqual({ ok: true, frame });

    const padded = new Uint8Array(bytes.byteLength + 8);
    padded.set(bytes, 5);
    const view = padded.subarray(5, 5 + bytes.byteLength);
    const decoded = decodeAudioFrame(view);
    expect(decoded).toEqual({ ok: true, frame });
    if (decoded.ok) expect(decoded.frame.payload.buffer).toBe(padded.buffer);
  });

  const valid = encodeAudioFrame({ kind: 'tts_pcm16', seq: 5, streamId: 2, payload: pcm(4) });
  const patched = (offset: number, value: number) => {
    const copy = valid.slice();
    copy[offset] = value;
    return copy;
  };

  it.each([
    ['too_short', valid.subarray(0, 11)],
    ['bad_version', patched(0, 2)],
    ['bad_kind', patched(1, 9)],
    ['bad_kind', patched(1, 0)],
    ['reserved_set', patched(3, 1)],
    ['bad_stream', patched(8, 0).fill(0, 8, 12)],
    ['empty_payload', valid.subarray(0, 12)],
    ['odd_pcm_length', valid.subarray(0, 15)],
  ] as const)('rejects a frame with %s', (error, bytes) => {
    expect(decodeAudioFrame(bytes)).toEqual({ ok: false, error });
  });

  it('rejects mic audio on a TTS stream and mic chunks over a second', () => {
    const mic = encodeAudioFrame({ kind: 'mic_pcm16', seq: 1, streamId: 0, payload: pcm(2) });
    const onStream = mic.slice();
    onStream[8] = 1;
    expect(decodeAudioFrame(onStream)).toEqual({ ok: false, error: 'bad_stream' });

    const long = new Uint8Array(AUDIO_HEADER_BYTES + AUDIO.micPayloadMaxBytes + 2);
    long.set(mic.subarray(0, AUDIO_HEADER_BYTES));
    expect(decodeAudioFrame(long)).toEqual({ ok: false, error: 'payload_too_long' });
  });

  it('refuses to encode a frame no peer would accept', () => {
    const bad = [
      { kind: 'mic_pcm16', seq: 1, streamId: 4, payload: pcm(2) },
      { kind: 'tts_mp3', seq: 1, streamId: 0, payload: pcm(2) },
      { kind: 'tts_pcm16', seq: -1, streamId: 1, payload: pcm(2) },
      { kind: 'tts_pcm16', seq: 1, streamId: 1, payload: pcm(3) },
      { kind: 'tts_mp3', seq: 1, streamId: 1, payload: pcm(0) },
      { kind: 'mic_pcm16', seq: 1, streamId: 0, payload: pcm(AUDIO.micPayloadMaxBytes + 2) },
    ] as const;
    for (const frame of bad) {
      expect(() => encodeAudioFrame(frame), JSON.stringify(frame.kind)).toThrow(
        AudioFrameEncodeError,
      );
    }
  });
});

describe('audio helpers', () => {
  it('pick the TTS frame kind for a codec', () => {
    expect(ttsFrameKind('pcm16')).toBe('tts_pcm16');
    expect(ttsFrameKind('mp3')).toBe('tts_mp3');
  });

  it('measure PCM16 duration', () => {
    expect(pcm16DurationMs(640, AUDIO.micSampleRateHz)).toBe(AUDIO.micChunkMs);
    expect(pcm16DurationMs(48_000, 24_000)).toBe(1_000);
  });
});
