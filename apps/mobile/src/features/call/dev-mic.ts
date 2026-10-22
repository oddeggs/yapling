import { useEffect, useRef } from 'react';
import { decodeAudioData } from 'react-native-audio-api';

import type { VoiceEngine } from '../../voice/engine';

/*
 * Development builds only, for simulators on a Mac with no microphone: recorded learner answers
 * (`?fixtures=<url>,<url>`) are fed through the engine's mic path, one per learner turn, in place
 * of a voice; between them the mic hears quiet room noise. `silent` in the list lets a turn pass
 * with nothing said: the call waits (offering the hint once after a long quiet) until the next
 * turn starts, from a press on the mic; `silent:<seconds>` waits that long in quiet, then the next
 * fixture answers the same turn (hands-free thinking time), and `<url>@tap=<ms>` taps the mic that
 * long after the answer starts (hands-free "I'm done"). Hold-to-talk holds the mic for the
 * fixture's length, so a fixture shorter than the shortest turn is a tap. Release builds never run
 * this.
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
    let cancelled = false;
    const timer = setTimeout(() => {
      next.current += 1;
      if (url === 'silent') {
        log('fixture: staying silent this turn');
        return;
      }
      busy.current = true;
      void (async () => {
        try {
          let answer = url;
          const quiet = /^silent:(\d+)$/.exec(url);
          if (quiet) {
            log(`fixture: thinking for ${quiet[1]} s`);
            await new Promise((r) => setTimeout(r, Number(quiet[1]) * 1_000));
            answer = fixtures[next.current] ?? '';
            next.current += 1;
            if (cancelled || !answer) return;
          }
          // `<url>@tap=<ms>`: hands-free, the mic is tapped that long after the answer starts.
          const [src = answer, tapAt] = answer.split('@tap=');
          if (tapAt !== undefined) {
            setTimeout(() => log(`fixture: tap ${String(engine.endTurnNow())}`), Number(tapAt));
          }
          const buffer = await decodeAudioData(src, 16_000);
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
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [engine, fixtures, learnerTurn, holdToTalk, log]);
}
