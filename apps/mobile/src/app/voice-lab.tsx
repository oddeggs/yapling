import Constants from 'expo-constants';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { decodeAudioData } from 'react-native-audio-api';
import Animated, { useAnimatedProps, useDerivedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  micPermissionStatus,
  requestMicPermission,
  useLipsyncClock,
  useStore,
  VoiceEngine,
  type CallState,
  type Lipsync,
  type MicPermission,
} from '../voice';
import { SpikeTransport } from '../voice/lab/spike-transport';

/*
 * Dev-only lab for the voice engine: connect to a call server (the production socket, or the
 * voice spike through an adapter), watch the call state, captions on the lipsync clock and
 * latency, talk, and feed fixture audio through the mic path. Not part of the product: release
 * builds redirect home, and its labels are English on purpose.
 *
 * Deep link: yapling-dev://voice-lab?url=<ws url>&mode=spike|call&fixture=<mp3 url>&auto=rec|live
 */

type Mode = 'call' | 'spike';

const DEFAULT_URL = 'ws://127.0.0.1:8787/api/calls/socket';
const DEV_TOKEN = 'dev-session-token-for-the-lab';

const AnimatedInput = Animated.createAnimatedComponent(TextInput);

function LiveCaption({ lipsync, text }: { lipsync: Lipsync; text: string }) {
  const shown = useDerivedValue(() => text.slice(0, lipsync.charIndex.value));
  const info = useDerivedValue(
    () =>
      `char ${lipsync.charIndex.value}/${text.length} · ${Math.max(0, Math.round(lipsync.streamMs.value))} ms · mouth ${lipsync.mouth.value}`,
  );
  const captionProps = useAnimatedProps(
    () => ({ text: shown.value, defaultValue: shown.value }) as unknown as TextInputProps,
  );
  const infoProps = useAnimatedProps(
    () => ({ text: info.value, defaultValue: info.value }) as unknown as TextInputProps,
  );
  return (
    <View>
      <AnimatedInput
        testID="lab-caption"
        editable={false}
        multiline
        style={styles.caption}
        animatedProps={captionProps}
      />
      <AnimatedInput
        testID="lab-clock"
        editable={false}
        style={styles.mono}
        animatedProps={infoProps}
      />
    </View>
  );
}

function Lab() {
  const params = useLocalSearchParams<{
    url?: string;
    mode?: Mode;
    fixture?: string;
    auto?: string;
    turn?: string;
    vp?: string;
  }>();
  const [url, setUrl] = useState(params.url ?? DEFAULT_URL);
  const [mode, setMode] = useState<Mode>(params.mode ?? 'call');
  const [holdToTalk, setHoldToTalk] = useState(params.turn === 'hold');
  const [fixture, setFixture] = useState(params.fixture ?? '');
  const [logs, setLogs] = useState<string[]>([]);
  const [permission, setPermission] = useState<MicPermission | '…'>('…');
  const [engine, setEngine] = useState<VoiceEngine | null>(null);
  const [prepared, setPrepared] = useState(false);
  const [session, setSession] = useState('');
  const autoRan = useRef(false);

  const log = useCallback((m: string) => {
    const t = (performance.now() / 1000).toFixed(2);
    setLogs((l) => [`${t} ${m}`, ...l].slice(0, 40));
  }, []);

  const build = useCallback(() => {
    const e = new VoiceEngine({
      url,
      hello: {
        token: DEV_TOKEN,
        kind: 'episode',
        sceneId: 's1-e1',
        stage: 'newcomer',
        firstLanguage: 'vi',
        clientVersion: Constants.expoConfig?.version ?? '0.1.0',
        turnMode: holdToTalk ? 'hold_to_talk' : 'hands_free',
      },
      preloadLines: ['s1-pro-01'],
      voiceProcessing: params.vp !== '0',
      onLog: log,
      ...(mode === 'spike' ? { createSocket: (u: string) => new SpikeTransport(u, log) } : {}),
    });
    setEngine(e);
    setPrepared(false);
    return e;
  }, [url, holdToTalk, mode, log, params.vp]);

  useEffect(() => {
    void micPermissionStatus().then(setPermission);
  }, []);

  useEffect(() => {
    return () => void engine?.dispose();
  }, [engine]);

  const prepare = useCallback(async (e: VoiceEngine) => {
    const status = await e.prepare();
    setPrepared(true);
    setSession(
      status
        ? `vp ${String(status.voiceProcessing)} · ${status.category.replace('AVAudioSessionCategory', '')}/${status.mode.replace('AVAudioSessionMode', '')} · ${status.sampleRate} Hz · out ${status.outputs.map((o) => o.type).join('+')} · in ${status.inputs.map((o) => o.type).join('+')} · lat ${Math.round((status.outputLatency + status.ioBufferDuration) * 1000)} ms${status.error ? ` · ${status.error}` : ''}`
        : 'no native session module',
    );
  }, []);

  const playRecorded = useCallback(async () => {
    const e = engine ?? build();
    if (!prepared) await prepare(e);
    e.playRecordedLocally('s1-pro-01', 'pip');
  }, [engine, build, prepared, prepare]);

  const connect = useCallback(async () => {
    const e = build();
    e.connect();
    await prepare(e);
    if (!e.micRunning) {
      // No mic (a simulator on a Mac without one): stream quiet room noise, as a phone would.
      log('no device mic: streaming room noise');
      void e.simulateMic(new Float32Array(0));
    }
  }, [build, prepare, log]);

  const fixtureTurn = useRef(0);
  const simulate = useCallback(async () => {
    // A comma-separated list plays one fixture per press, in turn.
    const list = fixture
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    const next = list[fixtureTurn.current % Math.max(1, list.length)];
    if (!engine || !next) return;
    fixtureTurn.current += 1;
    log(`decoding ${next}`);
    try {
      const buffer = await decodeAudioData(next, 16_000);
      log(`fixture ${buffer.duration.toFixed(2)} s → mic`);
      await engine.simulateMic(buffer.getChannelData(0), holdToTalk);
      log('fixture done; room noise continues');
    } catch (e) {
      log(`fixture failed: ${String(e)}`);
    }
  }, [engine, fixture, holdToTalk, log]);

  useEffect(() => {
    if (autoRan.current || !params.auto) return;
    autoRan.current = true;
    if (params.auto === 'rec') void playRecorded();
    if (params.auto === 'live') void connect();
  }, [params.auto, playRecorded, connect]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Voice lab</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.row}>
          <Text>Spike adapter</Text>
          <Switch value={mode === 'spike'} onValueChange={(v) => setMode(v ? 'spike' : 'call')} />
          <Text>Hold to talk</Text>
          <Switch value={holdToTalk} onValueChange={setHoldToTalk} />
        </View>
        <View style={styles.row}>
          <Button label="Connect" onPress={() => void connect()} testID="lab-connect" />
          <Button label="Play s1-pro-01" onPress={() => void playRecorded()} testID="lab-rec" />
          <Button label="Hang up" onPress={() => engine?.hangup()} />
        </View>
        <View style={styles.row}>
          <Text>Mic: {permission}</Text>
          <Button
            label="Ask mic"
            onPress={() =>
              void requestMicPermission().then(async (p) => {
                setPermission(p);
                if (p === 'granted' && prepared) await engine?.startMic();
              })
            }
          />
        </View>
        {engine ? <EngineView engine={engine} holdToTalk={holdToTalk} /> : null}
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.grow]}
            value={fixture}
            onChangeText={setFixture}
            placeholder="fixture mp3 URL"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button label="Simulate mic" onPress={() => void simulate()} testID="lab-sim" />
        </View>
        <View style={styles.row}>
          <Button label="Interrupt" onPress={() => void engine?.simulateInterruption('began')} />
          <Button label="Resume" onPress={() => void engine?.simulateInterruption('ended')} />
          <Button
            label="Audio"
            onPress={() => log(engine?.debugAudio() ?? 'no engine')}
            testID="lab-audio"
          />
        </View>
        <Text style={styles.mono}>{session}</Text>
        {logs.map((l, i) => (
          <Text key={i} style={styles.log}>
            {l}
          </Text>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function EngineView({ engine, holdToTalk }: { engine: VoiceEngine; holdToTalk: boolean }) {
  const state: CallState = useStore(engine.state);
  useLipsyncClock(engine.lipsync);
  const lags = state.latency.map((l) => `${l.kind} ${l.lagMs}`).join(' · ');
  return (
    <View style={styles.card}>
      <Text testID="lab-phase" style={styles.phase}>
        {state.phase}
        {state.reconnecting ? ' (reconnecting)' : ''}
        {state.interrupted ? ' (interrupted)' : ''}
        {state.onHold ? ' (on hold)' : ''}
      </Text>
      <Text style={styles.mono}>
        {state.caption
          ? `${state.caption.character} · stream ${state.caption.streamId}`
          : 'no line yet'}
      </Text>
      <LiveCaption lipsync={engine.lipsync} text={state.caption?.text ?? ''} />
      <Text style={styles.mono}>you: {state.learnerText || '…'}</Text>
      <Text testID="lab-latency" style={styles.mono}>
        latency ms: {lags || '—'}
      </Text>
      {state.error || state.warning ? (
        <Text style={styles.mono}>error: {state.error ?? state.warning}</Text>
      ) : null}
      <View style={styles.row}>
        <Pressable
          testID="lab-talk"
          style={[styles.talk, state.phase === 'listening' && styles.talkOn]}
          onPressIn={() => engine.pressTalk()}
          onPressOut={() => engine.releaseTalk()}
          disabled={!holdToTalk}
        >
          <Text>{holdToTalk ? 'Hold to talk' : 'Hands-free'}</Text>
        </Pressable>
        <Button label="Chờ chút" onPress={() => engine.holdOn(10)} />
        <Button label="Hint" onPress={() => engine.requestHint()} />
      </View>
    </View>
  );
}

function Button({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable style={styles.button} onPress={onPress} testID={testID}>
      <Text>{label}</Text>
    </Pressable>
  );
}

export default function VoiceLab() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Lab />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FBFAFD' },
  body: { padding: 16, gap: 10 },
  title: { fontSize: 22, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#D3CCDC', borderRadius: 8, padding: 8, fontSize: 12 },
  grow: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9DAFB',
    borderRadius: 8,
  },
  card: { padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF', gap: 6 },
  phase: { fontSize: 18, fontWeight: '700' },
  caption: { fontSize: 20, minHeight: 56, color: '#17131C', padding: 0 },
  mono: { fontFamily: 'Menlo', fontSize: 11, color: '#5D5366', padding: 0 },
  log: { fontFamily: 'Menlo', fontSize: 10, color: '#5D5366' },
  talk: { padding: 16, borderRadius: 40, backgroundColor: '#EFEFEF' },
  talkOn: { backgroundColor: '#EFA3F4' },
});
