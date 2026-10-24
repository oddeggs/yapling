import { CAST } from '@yapling/story';
import { PLACES, clockLabel } from '@yapling/scene';
import { usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useStore } from '../data/store';
import { useLocale } from '../ui/locale';
import { useLipsyncClock, type VoiceEngine } from '../voice';
import { app } from './app';
import { Dock, type DockMode } from './dock';
import { KeptCard } from './kept';
import { SafetySheet } from './safety/safety-sheet';
import { Stage, type StageHandle } from './stage';
import { placeWeather } from './talk';
import { C, label } from './theme';

/*
 * The scene: the painted place, the critters, the words and the one control. Most of the app is
 * here. A moment begins by itself when one is ready; tapping the scene ends a turn at once or
 * opens the control's three choices; a finished moment becomes a kept painting.
 */

const CONTROLS_MS = 4_500;
const BEGIN_AFTER_MS = 1_600;

export function SceneScreen() {
  const a = app();
  const { world, talk, sound } = a;
  const w = useStore(world.store);
  const tv = useStore(talk.view);
  const { t } = useLocale();
  const router = useRouter();
  // The scene is focused unless the menu sheet is up.
  const focused = usePathname() === '/';
  const insets = useSafeAreaInsets();
  const [controls, setControls] = useState(false);
  const [keptImage, setKeptImage] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [bump, setBump] = useState(0);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [now, setNow] = useState(Date.now());
  const [safetyClosed, setSafetyClosed] = useState(false);
  const [aiChip, setAiChip] = useState(false);
  const lastStage = useRef(tv.stage);

  const setStage = useCallback(
    (s: StageHandle | null) => {
      a.stage = s;
    },
    [a],
  );

  // ---- the world ----
  useEffect(() => {
    void world.start();
    const sub = AppState.addEventListener('change', (s) => {
      setActive(s === 'active');
      if (s === 'active') {
        setNow(Date.now());
        if (talk.current.stage === 'idle' && !world.state.moment) void world.next();
      }
    });
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      sub.remove();
      clearInterval(tick);
    };
  }, [world, talk]);

  const { weather, t: local } = placeWeather(w.place, now);
  useEffect(() => {
    a.stage?.send({ t: 'scene', place: w.place, v: w.variant, wx: weather });
    sound.setPlace(w.place, weather);
  }, [a, sound, w.place, w.variant, weather]);
  useEffect(() => sound.setOn(w.settings.sound && active), [sound, w.settings.sound, active]);

  // The 45 keeps its timetable: at :00, :20 and :40 it pulls in and leaves again.
  useEffect(() => {
    if (w.place !== 'bus' || w.variant === 2) return;
    let leave: ReturnType<typeof setTimeout> | null = null;
    const msToSlot = () => {
      const local = Date.now() - new Date().getTimezoneOffset() * 60_000;
      return 1_200_000 - (local % 1_200_000);
    };
    let arrive: ReturnType<typeof setTimeout>;
    const schedule = () => {
      arrive = setTimeout(() => {
        sound.effect('bus-arrive', 0.8);
        leave = setTimeout(() => sound.effect('bus-leave', 0.8), 6_300);
        schedule();
      }, msToSlot());
    };
    schedule();
    return () => {
      clearTimeout(arrive);
      if (leave) clearTimeout(leave);
    };
  }, [w.place, w.variant, sound]);

  // A moment begins by itself, a breath after the scene settles.
  useEffect(() => {
    const moment = w.moment;
    if (!focused || !active || tv.stage !== 'idle' || moment === null) return;
    const id = setTimeout(() => void talk.begin(moment), BEGIN_AFTER_MS);
    return () => clearTimeout(id);
  }, [focused, active, tv.stage, w.moment, talk]);

  // The director is still writing: ask again, and after half a minute Pip fills the gap.
  useEffect(() => {
    if (!focused || !active || tv.stage !== 'idle' || w.moment !== null || !w.planning) return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      void world.next().then((m) => {
        if (m === null && tries >= 5) {
          clearInterval(id);
          void world.free();
        }
      });
    }, 6_000);
    return () => clearInterval(id);
  }, [focused, active, tv.stage, w.moment, w.planning, world]);

  // The painting's title over the scene as a moment opens.
  useEffect(() => {
    const before = lastStage.current;
    lastStage.current = tv.stage;
    if (tv.stage === 'talking' && before === 'connecting') {
      const place = PLACES[w.place].name;
      a.stage?.send({
        t: 'label',
        title: w.moment?.titleOpen ?? '',
        sub: `${place} · ${clockLabel(local.hour)}`,
        ms: 4_200,
      });
    }
  }, [tv.stage, a, w.moment, w.place, local.hour]);

  // The AI disclosure as the conversation opens.
  useEffect(() => {
    if (tv.safety !== 'ai_disclosure') return;
    setAiChip(true);
    const id = setTimeout(() => setAiChip(false), 4_000);
    return () => clearTimeout(id);
  }, [tv.safety]);
  useEffect(() => {
    if (tv.safety === 'crisis') setSafetyClosed(false);
  }, [tv.safety]);

  // A kept painting: re-painted for its card.
  useEffect(() => {
    const p = tv.painting;
    if (!p) return;
    setKeptImage(null);
    void a.stage
      ?.render({ place: p.place, v: p.variant, hour: p.hour, wx: p.weather }, 260, 325)
      .then(setKeptImage);
  }, [tv.painting?.id, a]); // eslint-disable-line react-hooks/exhaustive-deps

  // The controls fold back after a while.
  useEffect(() => {
    if (!controls) return;
    const id = setTimeout(() => setControls(false), CONTROLS_MS);
    return () => clearTimeout(id);
  }, [controls]);

  // ---- what the learner does ----
  const onScene = () => {
    if (tv.stage === 'kept') {
      setLeaving(true);
      return;
    }
    if (tv.stage === 'talking' && talk.tap() === 'ended_turn') return;
    if (!w.settings.sound && tv.stage === 'idle') {
      world.setSetting('sound', true);
      return;
    }
    setControls((c) => !c);
    if (!controls && (tv.stage === 'talking' || tv.stage === 'idle')) {
      a.stage?.send({
        t: 'label',
        title: '',
        sub: `${PLACES[w.place].name} · ${clockLabel(local.hour)}`,
        ms: CONTROLS_MS,
      });
    }
  };

  const goOn = useCallback(() => {
    talk.dismissKept();
    setKeptImage(null);
    setLeaving(false);
    setBump((b) => b + 1);
    void world.refreshWall();
    if (talk.current.stage === 'out') return;
    void world.next().then((m) => {
      if (m === null) void world.free();
    });
  }, [talk, world]);

  const speaker = w.moment?.speaker ?? PLACES[w.place].resident;
  const speakerName = CAST[speaker].name;

  let mode: DockMode = 'hidden';
  let hint = '';
  if (tv.stage === 'kept') mode = 'go';
  else if (tv.stage === 'out') mode = 'out';
  else if (tv.stage === 'paused') mode = 'paused';
  else if (controls) mode = 'controls';
  else if (w.offline) {
    mode = 'hint';
    hint = t('world.retry');
  } else if (tv.stage === 'talking' && tv.phase === 'listening') mode = 'ember';
  else if (tv.stage === 'talking' && tv.phase === 'your_turn' && !tv.micDenied) {
    mode = 'hint';
    hint = t('world.hint.talk');
  } else if (tv.stage === 'idle' && !w.settings.sound) {
    mode = 'hint';
    hint = t('world.hint.sound');
  } else if (tv.stage === 'idle' && w.planning && !w.moment) {
    mode = 'hint';
    hint = t('world.hint.wait');
  }

  const engine = talk.engine;

  return (
    <View style={styles.root}>
      <Stage
        ref={setStage}
        onReady={() =>
          a.stage?.send({ t: 'scene', place: w.place, v: w.variant, wx: weather, cut: true })
        }
      />
      {engine && <CaptionBridge key={engine.state.get().sessionId ?? 'call'} engine={engine} />}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onScene}
        onLongPress={() => {
          const latest = world.state.paintings[0];
          if (__DEV__ && latest) talk.previewKept(latest);
        }}
        accessibilityLabel={t('world.a11y.scene')}
      />
      {aiChip && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[styles.chip, { top: insets.top + 8 }]}
          pointerEvents="none"
        >
          <Text style={[label, styles.chipText]}>{t('world.ai', { name: speakerName })}</Text>
        </Animated.View>
      )}
      {tv.micDenied && tv.stage === 'talking' && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.micNote}>
          <Text style={styles.micText}>{t('world.mic.note', { name: speakerName })}</Text>
          <Pressable
            style={styles.micBtn}
            onPress={() =>
              void talk.allowMic().then((ok) => {
                if (!ok) void Linking.openSettings();
              })
            }
          >
            <Text style={styles.micBtnText}>{t('world.mic.allow', { name: speakerName })}</Text>
          </Pressable>
        </Animated.View>
      )}
      {tv.painting && (
        <KeptCard
          painting={tv.painting}
          image={keptImage}
          speakerName={CAST[tv.painting.speaker].name}
          outAfter={tv.outAfter}
          leaving={leaving}
          onTap={() => setLeaving(true)}
          onPlus={() => router.push('/menu/plus')}
          onGone={goOn}
        />
      )}
      <Dock
        mode={mode}
        hint={hint}
        hintIcon={mode === 'hint' && tv.stage === 'idle' && !w.settings.sound ? 'speaker' : null}
        level={engine?.level.value ?? null}
        bump={bump}
        onHint={() => {
          if (w.offline) void world.start();
          else if (!w.settings.sound) world.setSetting('sound', true);
        }}
        onAgain={() => {
          setControls(false);
          talk.again();
        }}
        onPause={() => {
          setControls(false);
          talk.pause();
        }}
        onResume={() => talk.resume()}
        onMenu={() => {
          setControls(false);
          router.push('/menu');
        }}
        onGo={() => setLeaving(true)}
        onOut={() => router.push('/menu/plus')}
      />
      {tv.safety === 'crisis' && !safetyClosed && (
        <SafetySheet name={speakerName} onClose={() => setSafetyClosed(true)} />
      )}
    </View>
  );
}

/** Runs the call's caption clock and tells the stage how much of the line the voice has said. */
function CaptionBridge({ engine }: { engine: VoiceEngine }) {
  useLipsyncClock(engine.lipsync);
  const stage = app();
  const send = useCallback((n: number) => stage.stage?.send({ t: 'chars', n }), [stage]);
  const { charIndex, streamId } = engine.lipsync;
  // Words arrive a few a second: a dozen updates a second is plenty, and keeps the JS thread free
  // for the mic and the voice.
  const sentAt = useSharedValue(0);
  useAnimatedReaction(
    () => (streamId.value === 0 ? -1 : charIndex.value),
    (n, prev) => {
      if (n < 0 || n === prev) return;
      const t = Date.now();
      if (prev !== -1 && prev !== null && n > prev && t - sentAt.value < 80) return;
      sentAt.value = t;
      scheduleOnRN(send, n);
    },
  );
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  chip: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(28,25,32,0.6)',
  },
  chipText: { fontSize: 10, color: C.dim },
  micNote: {
    position: 'absolute',
    left: 28,
    right: 28,
    top: '38%',
    alignItems: 'center',
    gap: 18,
  },
  micText: { color: C.bone, fontSize: 17, lineHeight: 24, textAlign: 'center' },
  micBtn: {
    height: 44,
    paddingHorizontal: 22,
    borderRadius: 22,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  micBtnText: { color: C.bone, fontSize: 14.5, fontWeight: '600' },
});
