import {
  LIMITS,
  type CallKind,
  type FirstLanguage,
  type Pace,
  type Stage,
  type TurnMode,
} from '@yapling/contracts';
import { getLine, type Scene } from '@yapling/story';
import { RECORDED_LINE_ASSETS } from '@yapling/story/assets';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type { SocketLike } from '../../voice/call-socket';
import { initialCallState, type CallState } from '../../voice/call-state';
import { micPermissionStatus, requestMicPermission } from '../../voice/audio-session';
import { VoiceEngine } from '../../voice/engine';
import { Store, useStore } from '../../voice/store';
import { artVisemeTrack } from '../../voice/visemes';
import { tapSocket } from './frame-tap';
import { initialTracker, reduceTracker, type TrackerEvent, type TrackerState } from './tracker';

/*
 * One live call's machinery for the screen: the microphone permission first, then the session
 * token and the socket (opened while the screen rings), the voice engine with the art package's
 * mouths, and the tracker fed from the socket's frames. Retrying builds everything again.
 */

export interface CallSetup {
  readonly scene: Scene;
  readonly kind: CallKind;
  readonly stage: Stage;
  readonly firstLanguage: FirstLanguage;
  /** The pace the learner asked for; null for the stage's own. */
  readonly pace: Pace | null;
  readonly turnMode: TurnMode;
  /** `wss://<api>/api/calls/socket`. */
  readonly url: string;
  readonly clientVersion: string;
  /** The session token for `hello`. */
  readonly getToken: () => Promise<string>;
  readonly onLog?: (message: string) => void;
}

export type MicAccess = 'checking' | 'granted' | 'denied';

/** How long the phone rings before the call counts as unreachable. */
const CONNECT_TIMEOUT_MS = 15_000;
/** "Chờ chút" holds until the learner speaks: the hold is renewed before the server's cap. */
const HOLD_RENEW_MS = (LIMITS.holdSecondsMax - 5) * 1_000;

const webSocket = (url: string) => new WebSocket(url) as unknown as SocketLike;

/** The scene's opening recorded lines, decoded while the phone rings. */
function openingLines(scene: Scene): string[] {
  const out: string[] = [];
  for (const beat of scene.beats) {
    if (beat.kind !== 'rec') break;
    if (getLine(beat.line).audio) out.push(beat.line);
  }
  return out.slice(0, 3);
}

/**
 * The cast's recorded reactions ("Ooh," "Mm,"…), decoded while the phone rings so the first one
 * plays the moment the learner's first turn ends, not after its decode.
 */
function reactionLines(scene: Scene): string[] {
  const prefixes = scene.cast.map((c) => `s1-react-${c}-`);
  return Object.keys(RECORDED_LINE_ASSETS).filter((id) => prefixes.some((p) => id.startsWith(p)));
}

/** The state before the engine exists: idle, nothing heard. */
const idleStore = new Store<CallState>(initialCallState('hold_to_talk'));

export function useCall(setup: CallSetup) {
  const [attempt, setAttempt] = useState(0);
  const [engine, setEngine] = useState<VoiceEngine | null>(null);
  const [mic, setMic] = useState<MicAccess>('checking');
  const [connectFailed, setConnectFailed] = useState(false);
  const tracker = useMemo(() => new Store<TrackerState>(initialTracker), [attempt]);
  const latest = useRef(setup);
  latest.current = setup;

  const dispatch = useCallback(
    (event: TrackerEvent) => {
      const { scene, stage } = latest.current;
      tracker.set(reduceTracker(tracker.get(), event, { scene, stage }));
    },
    [tracker],
  );

  // The microphone: ask once, and look again when the learner comes back from Settings.
  useEffect(() => {
    let alive = true;
    const check = async (ask: boolean) => {
      let status = await micPermissionStatus();
      if (status === 'undetermined' && ask) status = await requestMicPermission();
      if (alive)
        setMic(status === 'denied' ? 'denied' : status === 'granted' ? 'granted' : 'checking');
    };
    void check(true);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check(false);
    });
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  // The call itself, once the microphone is allowed.
  useEffect(() => {
    if (mic !== 'granted') return undefined;
    let cancelled = false;
    let built: VoiceEngine | null = null;
    setConnectFailed(false);
    const timer = setTimeout(() => {
      if (!built?.state.get().connected) setConnectFailed(true);
    }, CONNECT_TIMEOUT_MS);
    void (async () => {
      const s = latest.current;
      let token: string;
      try {
        token = await s.getToken();
      } catch (e) {
        s.onLog?.(`no session: ${String(e)}`);
        if (!cancelled) setConnectFailed(true);
        return;
      }
      if (cancelled) return;
      built = new VoiceEngine({
        url: s.url,
        hello: {
          token,
          kind: s.kind,
          sceneId: s.scene.id,
          stage: s.stage,
          firstLanguage: s.firstLanguage,
          clientVersion: s.clientVersion,
          turnMode: s.turnMode,
          pace: s.pace,
        },
        createSocket: tapSocket(webSocket, (frame) => {
          if (frame.type === 'beat') s.onLog?.(`beat ${frame.beatId}`);
          if (frame.type === 'heard') s.onLog?.(`heard ${frame.turn}: ${frame.words.length} words`);
          dispatch({ type: 'frame', frame, now: Date.now() });
        }),
        visemeTrack: artVisemeTrack,
        preloadLines: [...openingLines(s.scene), ...reactionLines(s.scene)],
        ...(s.onLog ? { onLog: s.onLog } : {}),
      });
      setEngine(built);
      // The socket opens while the phone rings; the audio graph comes up alongside.
      built.connect();
      try {
        await built.prepare();
      } catch (e) {
        s.onLog?.(`audio failed: ${String(e)}`);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      void built?.dispose();
      setEngine(null);
    };
  }, [mic, attempt, dispatch]);

  // Back from the background mid-call: a socket iOS dropped reconnects at once, audio restarts.
  useEffect(() => {
    if (!engine) return undefined;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void engine.foregrounded();
    });
    return () => sub.remove();
  }, [engine]);

  const state = useStore(engine?.state ?? idleStore);
  const track = useStore(tracker);

  // The tracker hears when the learner starts talking (hints hide, a round's timer starts).
  const talking = state.learnerSpeaking || state.talkHeld;
  useEffect(() => {
    if (talking) dispatch({ type: 'speech_started' });
  }, [talking, dispatch]);

  // "Chờ chút" stays on until the learner speaks or lets it go.
  useEffect(() => {
    if (!engine || !state.onHold) return undefined;
    const renew = setInterval(() => engine.holdOn(LIMITS.holdSecondsMax), HOLD_RENEW_MS);
    return () => clearInterval(renew);
  }, [engine, state.onHold]);

  const retry = useCallback(() => {
    setConnectFailed(false);
    setAttempt((n) => n + 1);
  }, []);

  return { engine, state, tracker: track, dispatch, mic, connectFailed, retry };
}
