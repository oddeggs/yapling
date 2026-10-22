import type { CharacterId, Pace, Stage } from '@yapling/contracts';
import { speechSettings, ttsSpeedFactor } from '@yapling/domain';

import { openTts, voiceKey, type TtsVoice } from './tts';

/** The TTS speed factors ElevenLabs takes. */
const SPEED_RANGE = { min: 0.7, max: 1.2 } as const;
/** How much the learner's pace moves the stage's speed, and the pause between phrases. */
const PACE_STEP = { speed: 0.1, breakSeconds: 0.15 } as const;

const clampSpeed = (speed: number) =>
  Math.round(Math.min(SPEED_RANGE.max, Math.max(SPEED_RANGE.min, speed)) * 100) / 100;

/**
 * A character's live voice at the learner's stage: its speed and phrase breaks, a step slower (with
 * longer breaks) or faster (with shorter ones) when the learner asked for that pace.
 */
export const stageVoice = (
  character: CharacterId,
  stage: Stage,
  pace: Pace | null = null,
): TtsVoice => {
  const speed = ttsSpeedFactor(stage);
  const breakSeconds = speechSettings(stage).phraseBreakSeconds;
  if (pace === 'slower')
    return {
      character,
      speed: clampSpeed(speed - PACE_STEP.speed),
      breakSeconds: (breakSeconds ?? 0) + PACE_STEP.breakSeconds,
    };
  if (pace === 'faster') {
    const shorter = breakSeconds === null ? null : breakSeconds - PACE_STEP.breakSeconds;
    return {
      character,
      speed: clampSpeed(speed + PACE_STEP.speed),
      breakSeconds: shorter !== null && shorter > 0.05 ? shorter : null,
    };
  }
  return { character, speed, breakSeconds };
};

/** The quiet before the stage's hint or nudge: sooner for a slower pace, later for a faster one. */
export const paceSilenceMs = (silenceMs: number, pace: Pace | null = null): number =>
  pace === 'slower'
    ? Math.round(silenceMs * 0.75)
    : pace === 'faster'
      ? Math.round(silenceMs * 1.5)
      : silenceMs;

/**
 * Flash sockets opened ahead of time, one spare per voice in use, so a line never waits for the
 * TLS and WebSocket handshake. A spare that closed meanwhile (Flash drops idle sockets after
 * 180 s) is replaced by a fresh socket.
 */
export class VoicePool {
  private readonly spares = new Map<string, Promise<WebSocket | null>>();
  private closed = false;

  constructor(private readonly key: string) {}

  async take(voice: TtsVoice): Promise<WebSocket> {
    const key = voiceKey(voice);
    const spare = this.spares.get(key);
    this.spares.delete(key);
    const ws = spare ? await spare : null;
    this.warm(voice);
    if (ws !== null && ws.readyState === 1) return ws;
    return openTts(this.key, voice);
  }

  warm(voice: TtsVoice): void {
    const key = voiceKey(voice);
    if (this.closed || this.spares.has(key)) return;
    this.spares.set(
      key,
      openTts(this.key, voice).catch(() => null),
    );
  }

  close(): void {
    this.closed = true;
    for (const spare of this.spares.values()) void spare.then((ws) => ws?.close(1000, 'ended'));
    this.spares.clear();
  }
}
