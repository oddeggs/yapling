import { useEffect, useRef } from 'react';
import { decodeAudioData } from 'react-native-audio-api';

import type { VoiceEngine } from '../../voice/engine';

/*
 * Development builds only, for simulators on a Mac with no microphone: recorded learner answers
 * (`?fixtures=<url>,<url>`) are fed through the engine's mic path, one per learner turn, in place
 * of a voice; between them the mic hears quiet room noise. `silent` in the list lets a turn pass
 * with nothing said (the hint, then the nudge). Release builds never run this.
 */

/** A pause before the "learner" answers, as a person would take. */
const ANSWER_AFTER_MS = 1_400;

export function useDevMic(
  engine: VoiceEngine | null,
  fixtures: readonly string[] | null,
  learnerTurn: boolean,
  holdToTalk: boolean,
  log: (message: string) => void,
): void {
  const next = useRef(0);
  const busy = useRef(false);
  const noise = useRef<VoiceEngine | null>(null);

  // Room noise once the engine's audio is up and no device mic is running.
  useEffect(() => {
    if (!__DEV__ || !engine || !fixtures) return undefined;
    const check = setInterval(() => {
      if (noise.current === engine || engine.micRunning || !engine.state.get().connected) return;
      noise.current = engine;
      log('no device mic: room noise, answers from fixtures');
      void engine.simulateMic(new Float32Array(0));
    }, 500);
    return () => clearInterval(check);
  }, [engine, fixtures, log]);

  useEffect(() => {
    if (!__DEV__ || !engine || !fixtures || !learnerTurn || busy.current) return undefined;
    const url = fixtures[next.current];
    if (url === undefined) return undefined;
    const timer = setTimeout(() => {
      next.current += 1;
      if (url === 'silent') {
        log('fixture: staying silent this turn');
        return;
      }
      busy.current = true;
      void (async () => {
        try {
          const buffer = await decodeAudioData(url, 16_000);
          log(`fixture ${next.current}: ${buffer.duration.toFixed(1)} s`);
          await engine.simulateMic(buffer.getChannelData(0), holdToTalk);
          // Room noise again until the next answer.
          void engine.simulateMic(new Float32Array(0));
        } catch (e) {
          log(`fixture failed: ${String(e)}`);
        } finally {
          busy.current = false;
        }
      })();
    }, ANSWER_AFTER_MS);
    return () => clearTimeout(timer);
  }, [engine, fixtures, learnerTurn, holdToTalk, log]);
}
