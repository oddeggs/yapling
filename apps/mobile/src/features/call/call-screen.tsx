import { useFonts } from '@shopify/react-native-skia';
import type { Mouth, PipSpecies } from '@yapling/art';
import { ArtProvider, BurrowObject } from '@yapling/art/native';
import {
  LIMITS,
  type CallEndReason,
  type CharacterId,
  type FirstLanguage,
  type Pace,
  type Stage,
  type TurnMode,
} from '@yapling/contracts';
import { callKindOf, CAST as STORY_CAST, type LetterLine, type Scene } from '@yapling/story';
import { colours, layout as space } from '@yapling/theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, View, useWindowDimensions } from 'react-native';
import { makeMutable } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallBar } from '../../ui/call-bar';
import { MeaningChip } from '../../ui/chip';
import { useLocale } from '../../ui/locale';
import { SpeakerPill } from '../../ui/speaker-pill';
import { SpeechBubble, type BubbleTone } from '../../ui/speech-bubble';
import { useToast } from '../../ui/toast';
import { useLipsyncClock, type Lipsync } from '../../voice/lipsync';
import { BubbleCaption } from './bubble-caption';
import { CritterFace } from './call-art';
import {
  FixedSticker,
  HintCard,
  LetterCard,
  MeaningWhisper,
  PhonePill,
  ThinkingBubble,
  YouCaption,
} from './call-cards';
import { CallErrorSheet } from './call-errors';
import { CallStage } from './call-stage';
import { useDevMic } from './dev-mic';
import { CallTimer, MirrorCard, RoundsStrip } from './pass-it-on';
import { FRAME_WIDTH, layoutFor } from './scene-layout';
import { useCall } from './use-call';
import { callView } from './view-model';

/*
 * A live call, full screen: the scene and its cast, the speaker pill, the line in a big bubble
 * with its caption following the voice, the call bar, and everything a beat brings (the hint, the
 * correction's two beats, "What does that mean?", the letter, timers and the fluency mirror).
 */

/** A phrase the learner opened (a line's gloss, a letter line, a meaning): a seed for the burrow. */
export interface SeedDrop {
  readonly text: string;
  readonly gloss: string | null;
  readonly source: 'line' | 'letter' | 'meaning';
}

export interface CallFinish {
  readonly callId: string | null;
  readonly reason: CallEndReason | null;
}

export interface CallScreenProps {
  readonly scene: Scene;
  readonly stage: Stage;
  readonly firstLanguage: FirstLanguage;
  /** The pace the learner asked for on the residency card; null for the stage's own. */
  readonly pace?: Pace | null;
  /** The roommate the learner picked. */
  readonly roommate: { readonly name: string; readonly species: PipSpecies };
  readonly turnMode: TurnMode;
  /** `wss://<api>/api/calls/socket`. */
  readonly url: string;
  readonly clientVersion: string;
  readonly getToken: () => Promise<string>;
  /** The call is over and the learner moves on (the post-call card, or back). */
  readonly onFinish: (finish: CallFinish) => void;
  /** A crisis: open the safety sheet. */
  readonly onSafety: () => void;
  /** A phrase dropped in the burrow as a seed packet. */
  readonly onSeed?: (seed: SeedDrop) => void;
  /** Development only: recorded answers for a simulator with no microphone. */
  readonly devFixtures?: readonly string[] | null;
}

const bubbleTone = (c: CharacterId): BubbleTone =>
  c === 'pip' ? 'pip' : c === 'office' ? 'office' : 'neighbour';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/** Lexend for the scenes' own lettering (the bus sign, the burrow's poster), as Metro assets. */
/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles fonts only through require. */
const LEXEND = [
  require('../../../assets/fonts/Lexend-Bold.ttf') as number,
  require('../../../assets/fonts/Lexend-ExtraBold.ttf') as number,
  require('../../../assets/fonts/Lexend-Black.ttf') as number,
];
/* eslint-enable @typescript-eslint/no-require-imports */

/** A fixed closed mouth for before the engine exists. */
const restMouth = makeMutable<Mouth>('rest');

export function CallScreen(props: CallScreenProps) {
  const fonts = useFonts({ Lexend: LEXEND });
  return (
    <ArtProvider fonts={fonts}>
      <CallScreenInner {...props} />
    </ArtProvider>
  );
}

function CallScreenInner({
  scene,
  stage,
  firstLanguage,
  pace = null,
  roommate,
  turnMode,
  url,
  clientVersion,
  getToken,
  onFinish,
  onSafety,
  onSeed,
  devFixtures = null,
}: CallScreenProps) {
  const { t } = useLocale();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const k = width / FRAME_WIDTH;
  const layout = useMemo(() => layoutFor(scene), [scene]);
  const kind = callKindOf(scene.kind) ?? 'episode';
  const log = useCallback((m: string) => {
    if (__DEV__) console.log(`[call] ${m}`);
  }, []);

  const call = useCall({
    scene,
    kind,
    stage,
    firstLanguage,
    pace,
    turnMode,
    url,
    clientVersion,
    getToken,
    onLog: log,
  });
  const { engine, state, tracker, dispatch } = call;

  // Re-render while "You fixed it" is up, so it leaves on time.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (tracker.fixedAt === null) return undefined;
    setNow(Date.now());
    const tick = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(tick);
  }, [tracker.fixedAt]);

  const view = callView({
    call: state,
    tracker,
    scene,
    layout,
    stage,
    firstLanguage,
    now: tracker.fixedAt === null ? Date.now() : now,
    micDenied: call.mic === 'denied',
    connectFailed: call.connectFailed,
  });

  const nameOf = useCallback(
    (c: CharacterId) =>
      c === 'pip'
        ? roommate.name
        : c === 'office'
          ? t('call.callee.harbourLaneOffice')
          : STORY_CAST[c].name,
    [roommate.name, t],
  );

  // Leaving: a hang-up waits for the call's `ended` (or the engine's own short wait).
  const leaving = useRef(false);
  const finished = useRef(false);
  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    onFinish({ callId: state.callRecordId, reason: state.endReason });
  }, [onFinish, state.callRecordId, state.endReason]);
  useEffect(() => {
    if (leaving.current && state.endReason !== null) finish();
  }, [state.endReason, finish]);
  const exit = () => {
    if (view.sceneDone || !engine || view.mode !== 'live') {
      finish();
      return;
    }
    leaving.current = true;
    engine.hangup();
  };

  // A crisis steps out of the story at once.
  const safetyOpened = useRef(false);
  useEffect(() => {
    if (view.safety && !safetyOpened.current) {
      safetyOpened.current = true;
      onSafety();
    }
  }, [view.safety, onSafety]);

  // A phrase opened becomes a seed packet in the burrow.
  const dropSeed = useCallback(
    (seed: SeedDrop, text: string) => {
      onSeed?.(seed);
      toast({ text, art: <BurrowObject id="seed" size={33} />, haptic: 'success' });
    },
    [onSeed, toast],
  );
  const meaningAbout = tracker.meaning?.about ?? null;
  useEffect(() => {
    if (meaningAbout === null || tracker.meaning?.phase !== 'shown') return;
    dropSeed(
      { text: meaningAbout, gloss: tracker.meaning.gloss, source: 'meaning' },
      t('call.seedDropped'),
    );
    // Once per answer.
  }, [meaningAbout]);

  // VoiceOver reads each line once it has been spoken.
  const bubble = view.bubble;
  const spoken =
    bubble && !bubble.playing && !bubble.thinking ? `${bubble.streamId}:${bubble.text}` : null;
  useEffect(() => {
    if (!spoken || !bubble) return;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (on)
        AccessibilityInfo.announceForAccessibility(`${nameOf(bubble.speaker)}: ${bubble.text}`);
    });
  }, [spoken]);

  const learnerTurn =
    view.mic === 'yourTurn' || (view.mic === 'listening' && state.phase === 'your_turn');
  useDevMic(engine, devFixtures, learnerTurn && !state.onHold, turnMode === 'hold_to_talk', log);

  if (view.mode === 'error_net' || view.mode === 'error_mic') {
    return (
      <CallErrorSheet
        kind={view.mode === 'error_net' ? 'net' : 'mic'}
        name={roommate.name}
        species={roommate.species}
        onBack={() => {
          void engine?.dispose();
          finish();
        }}
        onPrimary={view.mode === 'error_net' ? call.retry : () => void Linking.openSettings()}
      />
    );
  }

  const top = Math.max(space.topBar, insets.top + 4);
  const dy = top - space.topBar;
  const place =
    layout.place.key === 'onboarding.unpack.place'
      ? t(layout.place.key, { day: layout.place.day })
      : t(layout.place.key);
  const pillPlace =
    view.mode === 'ringing'
      ? t('call.calling', { who: nameOf(layout.pill) })
      : view.wrapUpSeconds !== null
        ? `${place} · ${clock(view.wrapUpSeconds)}`
        : place;
  const spot = bubble ? (layout.bubbles[bubble.speaker] ?? layout.bubbleDefault) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colours.accentSoft, overflow: 'hidden' }}>
      {engine ? (
        <LipsyncClock key={engine.state.get().sessionId ?? 'call'} lipsync={engine.lipsync} />
      ) : null}
      <CallStage
        layout={layout}
        k={k}
        width={width}
        height={height}
        species={roommate.species}
        moods={view.moods}
        talking={view.talking}
        mouth={engine?.lipsync.mouth ?? restMouth}
        thinker={view.thinker}
      />

      {view.letter ? (
        <LetterCard
          letter={view.letter}
          language={firstLanguage}
          onLineGloss={(line: LetterLine) => {
            if (line.seed) {
              dropSeed(
                { text: line.seed.en, gloss: line.seed.glosses.vi?.text ?? null, source: 'letter' },
                t('call.wordAdded', { word: line.seed.en }),
              );
            }
          }}
          style={{ position: 'absolute', top: 156 * k + dy, left: 150 * k, width: 222 }}
        />
      ) : null}

      {bubble && spot ? (
        <View
          style={{
            position: 'absolute',
            top: spot.top * k,
            left: spot.left,
            right: spot.right,
            gap: 8,
          }}
        >
          {bubble.thinking ? (
            <ThinkingBubble name={nameOf(bubble.speaker)} tone={bubbleTone(bubble.speaker)} />
          ) : (
            <BubbleCaption
              lipsync={engine?.lipsync ?? null}
              streamId={bubble.streamId}
              playing={bubble.playing}
              text={bubble.text}
            >
              {(caption) => (
                <SpeechBubble
                  key={bubble.streamId}
                  name={nameOf(bubble.speaker)}
                  aiTag={t('common.aiTag')}
                  tone={bubbleTone(bubble.speaker)}
                  text={bubble.text}
                  {...(caption ? { caption } : {})}
                  talking={bubble.playing}
                  {...(bubble.gloss
                    ? { gloss: bubble.gloss, glossHint: t('call.tapForMeaning') }
                    : {})}
                  onGlossChange={(shown) => {
                    if (shown) {
                      dropSeed(
                        { text: bubble.text, gloss: bubble.gloss, source: 'line' },
                        t('call.seedDropped'),
                      );
                    }
                  }}
                />
              )}
            </BubbleCaption>
          )}
          {view.meaningChip ? (
            <MeaningChip
              label={t('call.whatDoesThatMean')}
              onPress={() => {
                if (engine?.requestMeaning({ kind: 'last_line' })) {
                  const lineId =
                    bubble.streamId >= 0 ? (tracker.recorded[bubble.streamId] ?? null) : null;
                  dispatch({
                    type: 'meaning_requested',
                    line: { speaker: bubble.speaker, text: bubble.text, lineId },
                  });
                }
              }}
            />
          ) : null}
        </View>
      ) : null}

      {view.fixed ? (
        <FixedSticker style={{ position: 'absolute', top: 380 * k, left: 24 }} />
      ) : null}

      {view.mirror ? (
        <MirrorCard
          mirror={view.mirror}
          style={{ position: 'absolute', top: 170 * k + dy, left: 16, right: 16 }}
        />
      ) : null}

      <SpeakerPill
        name={nameOf(layout.pill)}
        aiTag={t('common.aiTag')}
        place={pillPlace}
        face={<CritterFace character={layout.pill} species={roommate.species} size={26} />}
        {...(layout.episodeTag ? { episode: layout.episodeTag } : {})}
        style={{ position: 'absolute', top, left: 62, right: space.marginScreen }}
      />

      {view.rounds ? (
        <RoundsStrip
          rounds={view.rounds}
          species={roommate.species}
          style={{ position: 'absolute', top: 108 + dy, left: 14, right: 14 }}
        />
      ) : null}

      {view.timer ? (
        <CallTimer
          key={view.timer.key}
          timer={view.timer}
          onDone={() => {
            dispatch({ type: 'timer_done' });
            // The turn ends at the learner's next pause, never mid-word.
            if (engine?.state.get().talkHeld) engine.releaseTalk();
          }}
          style={{ position: 'absolute', top: 110 + dy, right: space.marginCard }}
        />
      ) : null}

      {view.phone || view.mode === 'ringing' ? (
        <View
          style={{ position: 'absolute', top: 108 + dy, left: 0, right: 0, alignItems: 'center' }}
        >
          <PhonePill
            label={
              view.mode === 'ringing'
                ? t('call.calling', { who: nameOf(layout.pill) })
                : t('call.calling', { who: t('call.callee.harbourLaneOffice') })
            }
          />
        </View>
      ) : null}

      <View
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: space.callBarBottom,
          gap: 10,
        }}
      >
        {view.meaning ? (
          <MeaningWhisper
            name={nameOf(scene.cast.includes('pip') ? 'pip' : layout.pill)}
            simple={view.meaning.simple}
            gloss={view.meaning.gloss}
            translated={view.meaning.phase === 'translated'}
            onReveal={() => dispatch({ type: 'translation_shown' })}
            onClose={() => dispatch({ type: 'meaning_closed' })}
          />
        ) : null}
        {view.hint ? (
          <HintCard
            phrase={view.hint.phrase}
            gloss={view.hint.gloss}
            onDismiss={() => dispatch({ type: 'hint_dismissed' })}
          />
        ) : null}
        {view.you ? <YouCaption text={view.you.text} heard={view.you.heard} /> : null}
        <CallBar
          mic={view.mic}
          {...(view.talking ? { speaker: nameOf(view.talking) } : {})}
          sceneDone={view.sceneDone}
          exitLabel={t(layout.exit)}
          onHoldToggle={() => engine?.holdOn(state.onHold ? 0 : LIMITS.holdSecondsMax)}
          onExit={exit}
          onTalkStart={() => engine?.pressTalk()}
          onTalkEnd={() => engine?.releaseTalk()}
        />
      </View>
    </View>
  );
}

/** Runs the engine's lipsync clock on the UI thread while the call is on screen. */
function LipsyncClock({ lipsync }: { lipsync: Lipsync }) {
  useLipsyncClock(lipsync);
  return null;
}
