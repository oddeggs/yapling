import type { CharacterId, Stage } from '@yapling/contracts';
import { speechSettings, ttsSpeedFactor } from '@yapling/domain';

import { openTts, voiceKey, type TtsVoice } from './tts';

/** A character's live voice at the learner's stage: its speed and phrase breaks. */
export const stageVoice = (character: CharacterId, stage: Stage): TtsVoice => ({
  character,
  speed: ttsSpeedFactor(stage),
  breakSeconds: speechSettings(stage).phraseBreakSeconds,
});

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
