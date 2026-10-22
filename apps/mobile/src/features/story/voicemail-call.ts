import type { FirstLanguage, Stage } from '@yapling/contracts';
import type { Scene } from '@yapling/story';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { decodeAudioData } from 'react-native-audio-api';

import { getSessionToken } from '../../data';
import { apiBase, clientVersion } from '../../data/config';
import { Store, useStore, VoiceEngine, type CallState } from '../../voice';
import { initialCallState } from '../../voice/call-state';
import {
  initialVoicemail,
  reduceVoicemail,
  type VoicemailEvent,
  type VoicemailState,
  voicemailScript,
} from './voicemail-model';

/*
 * The voicemail's live turn: a short call of kind `voicemail_reply` on the voicemail scene. The
 * call plays Pip's recorded message and its slip, runs the fix beat (judging, hinting, falling
 * back), and the phone follows its frames into the voicemail's own states.
 */

/** The call socket beside the API: `wss://<host>/api/calls/socket`. */
export const callSocketUrl = (base: string): string =>
  `${base.replace(/^http/, 'ws').replace(/\/$/, '')}/calls/socket`;

export interface VoicemailCallOptions {
  readonly scene: Scene;
  readonly stage: Stage;
  readonly firstLanguage: FirstLanguage;
  /** A new value opens a new call (after the line dropped). */
  readonly attempt: number;
  /**
   * Development only: fixture audio (a URL) played into the mic path on the learner's turn, for a
   * simulator on a Mac without a microphone.
   */
  readonly fixture?: string | undefined;
}

export interface VoicemailCall {
  readonly engine: VoiceEngine | null;
  readonly call: CallState | null;
  readonly voicemail: VoicemailState;
}

const reducerFor = (scene: Scene) => {
  const script = voicemailScript(scene);
  return (state: VoicemailState, event: VoicemailEvent): VoicemailState =>
    reduceVoicemail(script, state, event);
};

export function useVoicemailCall({
  scene,
  stage,
  firstLanguage,
  attempt,
  fixture,
}: VoicemailCallOptions): VoicemailCall {
  const reducer = useMemo(() => reducerFor(scene), [scene]);
  const [voicemail, dispatch] = useReducer(reducer, initialVoicemail);
  const [engine, setEngine] = useState<VoiceEngine | null>(null);

  // A fresh call for each attempt.
  useEffect(() => {
    let live = true;
    let made: VoiceEngine | null = null;
    dispatch({ type: 'reset' });
    void (async () => {
      let token: string;
      try {
        token = await getSessionToken();
      } catch {
        if (live) dispatch({ type: 'error', code: 'no_connection' });
        return;
      }
      if (!live) return;
      const e = new VoiceEngine({
        url: callSocketUrl(apiBase()),
        hello: {
          token,
          kind: 'voicemail_reply',
          sceneId: scene.id,
          stage,
          firstLanguage,
          clientVersion: clientVersion(),
          turnMode: 'hold_to_talk',
        },
        preloadLines: scene.beats.flatMap((b) => (b.kind === 'rec' ? [b.line] : [])),
      });
      made = e;
      setEngine(e);
      e.connect();
      await e.prepare();
      // No mic (a simulator on a Mac without one): quiet room noise, as a phone would hear.
      if (live && !e.micRunning && __DEV__) void e.simulateMic(new Float32Array(0));
    })();
    return () => {
      live = false;
      void made?.dispose();
      setEngine(null);
    };
    // A new attempt rebuilds the call; the learner's stage and language are read once per call.
  }, [scene, attempt]);

  const call = useEngineState(engine);
  useFrames(call, dispatch);
  useFixture(engine, call, voicemail, fixture);
  return { engine, call, voicemail };
}

/** Before the engine exists the screen reads an idle call. */
const IDLE = new Store(initialCallState('hold_to_talk'));

function useEngineState(engine: VoiceEngine | null): CallState | null {
  const state = useStore(engine?.state ?? IDLE);
  return engine ? state : null;
}

/** Turns changes in the call's state into the voicemail's events. */
function useFrames(call: CallState | null, dispatch: (e: VoicemailEvent) => void): void {
  const last = useRef<CallState | null>(null);
  useEffect(() => {
    const before = last.current;
    last.current = call;
    if (!call) return;
    if (call.beat && call.beat.beatId !== before?.beat?.beatId) {
      dispatch({ type: 'beat', beatId: call.beat.beatId });
    }
    if (call.caption && call.caption.streamId !== before?.caption?.streamId) {
      dispatch({ type: 'line', source: call.caption.source });
    }
    if (call.learnerFinal && (!before?.learnerFinal || call.learnerText !== before.learnerText)) {
      dispatch({ type: 'heard', text: call.learnerText });
    }
    if (call.hint && call.hint !== before?.hint) {
      dispatch({ type: 'hint', phrase: call.hint.phrase, gloss: call.hint.gloss });
    }
    if (call.endReason && !before?.endReason) dispatch({ type: 'ended', reason: call.endReason });
    if (call.error && !before?.error) dispatch({ type: 'error', code: call.error });
  }, [call, dispatch]);
}

/** Development only: plays the fixture into the mic once, when the learner's turn opens. */
function useFixture(
  engine: VoiceEngine | null,
  call: CallState | null,
  voicemail: VoicemailState,
  fixture: string | undefined,
): void {
  const played = useRef<VoiceEngine | null>(null);
  const yourTurn = voicemail.phase === 'turn' && call?.phase === 'your_turn';
  useEffect(() => {
    if (!__DEV__ || !fixture || !engine || !yourTurn || played.current === engine) return;
    played.current = engine;
    void (async () => {
      const buffer = await decodeAudioData(fixture, 16_000);
      await engine.simulateMic(buffer.getChannelData(0), engine.turnMode === 'hold_to_talk');
    })().catch(() => undefined);
  }, [engine, yourTurn, fixture]);
}
