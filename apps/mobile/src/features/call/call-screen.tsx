import type { Mouth, PipSpecies } from '@yapling/art';
import { BurrowObject } from '@yapling/art/native';
import {
  LIMITS,
  type CallEndReason,
  type CharacterId,
  type FirstLanguage,
  type Pace,
  type Stage,
  type TurnMode,
} from '@yapling/contracts';
import {
  callKindOf,
  findLine,
  glossFor,
  CAST as STORY_CAST,
  type LetterLine,
  type Scene,
} from '@yapling/story';
import { colours, controls, layout as space } from '@yapling/theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, View, useWindowDimensions } from 'react-native';
import { makeMutable } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CallBar } from '../../ui/call-bar';
import { MeaningChip } from '../../ui/chip';
import { haptics } from '../../ui/haptics';
import { useLocale } from '../../ui/locale';
import { SpeakerPill } from '../../ui/speaker-pill';
import { SpeechBubble, type BubbleTone } from '../../ui/speech-bubble';
import { useToast } from '../../ui/toast';
import { useCallAnalytics } from '../../observability';
import { useLipsyncClock, type Lipsync } from '../../voice/lipsync';
import { BubbleCaption } from './bubble-caption';
import { CritterFace } from './call-art';
import {
  FixedSticker,
  HintCard,
  MeaningWhisper,
  PhonePill,
  ThinkingBubble,
  YouCaption,
} from './call-cards';
import { CallErrorSheet } from './call-errors';
import {
  HistoryButton,
  HistorySheet,
  lineGlossProps,
  TurnPager,
  useLineGlosses,
} from './call-history';
import { CallLetter } from './call-letter';
import { CallStage } from './call-stage';
import { CallTip } from './call-tip';
import { useDevMic } from './dev-mic';
import { bandOf } from './letter-place';
import { saidLines, transcriptOf } from './line-history';
import { CallTimer, MirrorCard, RoundsStrip } from './pass-it-on';
import { FRAME_WIDTH, layoutFor } from './scene-layout';
import { TurnModeSwitch, useMicBar } from './turn-mode-switch';
import { useCall } from './use-call';
import { callView, lineGlossOffered } from './view-model';

/*
 * A live call, full screen: the scene and its cast, the speaker pill, the line in a big bubble
 * with its caption following the voice, the call bar, and everything a beat brings (the hint, the
 * correction's two beats, "What does that mean?", the letter, timers and the fluency mirror).
 */

/** A phrase the learner opened (a line's gloss, a letter line, a meaning): a seed for the burrow. */
export interface SeedDrop {
  /** The story's phrase, when the tap is known to hold one. */
  readonly phraseId?: string | null;
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
  /** How the call starts (the learner's preference); the call's switch changes it. */
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

/** A fixed closed mouth for before the engine exists. */
const restMouth = makeMutable<Mouth>('rest');

export function CallScreen({
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
  // The edges the letter keeps clear of: the pills at the top and the cards over the call bar.
  const [pillBottom, setPillBottom] = useState(0);
  const [phoneBottom, setPhoneBottom] = useState(0);
  const [stackTop, setStackTop] = useState(height - space.callBarBottom - controls.callBar.height);
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
  // A spoken line with no written gloss is translated on a tap; missed lines can be read again.
  const { glosses } = useLineGlosses(url, getToken, tracker.callToken);
  const [historyOpen, setHistoryOpen] = useState(false);

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
  useCallAnalytics(kind, scene.id, { ...state, mode: view.mode });

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
  // A turn with no answer: the character says it didn't catch that, and it's the learner's turn.
  const bubble = view.bubble?.didntCatch
    ? { ...view.bubble, text: t('call.didntCatch') }
    : view.bubble;
  const spoken =
    bubble && !bubble.playing && !bubble.thinking ? `${bubble.streamId}:${bubble.text}` : null;
  useEffect(() => {
    if (!spoken || !bubble) return;
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (on)
        AccessibilityInfo.announceForAccessibility(`${nameOf(bubble.speaker)}: ${bubble.text}`);
    });
  }, [spoken]);

  // A tap too short to be a turn, or a hold with no words: a light tap and the tip, read out.
  const tipText =
    view.tip === 'hold_longer'
      ? t('call.tip.holdLonger')
      : view.tip === 'not_heard'
        ? t('call.tip.notHeard')
        : null;
  useEffect(() => {
    if (tipText === null) return;
    haptics.play('tap');
    void AccessibilityInfo.isScreenReaderEnabled().then((on) => {
      if (on) AccessibilityInfo.announceForAccessibility(tipText);
    });
  }, [tipText]);

  const learnerTurn =
    view.mic === 'yourTurn' || (view.mic === 'listening' && state.phase === 'your_turn');
  const holdToTalk = state.turnMode === 'hold_to_talk';
  useDevMic(engine, devFixtures, learnerTurn && !state.onHold, holdToTalk, log);
  const micBar = useMicBar(engine, state, view);

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
  const phoneShown = view.phone || view.mode === 'ringing';

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

      {view.letter && layout.letter ? (
        <CallLetter
          key={view.letter.id}
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
          spots={layout.letter}
          frame={{
            k,
            width,
            topBound: Math.max(pillBottom, phoneShown ? phoneBottom : 0, top),
            bottomBound: stackTop,
          }}
          band={spot ? bandOf(layout.letter, spot) : null}
        />
      ) : null}

      {bubble && spot ? (
        <View
          style={{
            position: 'absolute',
            // A line from before the phone rang, gone back to, sits under the phone pill.
            top: Math.max(spot.top * k, phoneShown ? phoneBottom + 6 : 0),
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
                  {...lineGlossProps(bubble, glosses, glosses.entry(bubble.text), t)}
                  onGlossChange={(shown) => {
                    // A written line's phrase drops in the burrow; a generated one doesn't.
                    if (shown && bubble.gloss) {
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
          {bubble.page && !bubble.thinking ? (
            <TurnPager
              page={bubble.page}
              onGo={(streamId) => dispatch({ type: 'browse', streamId })}
              style={{ position: 'absolute', top: 7, right: 10 }}
            />
          ) : null}
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

      <View
        style={{ position: 'absolute', top, left: 62, right: space.marginScreen }}
        onLayout={(e) => setPillBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
      >
        <SpeakerPill
          name={nameOf(layout.pill)}
          aiTag={t('common.aiTag')}
          place={pillPlace}
          face={<CritterFace character={layout.pill} species={roommate.species} size={26} />}
          {...(layout.episodeTag ? { episode: layout.episodeTag } : {})}
        />
      </View>

      {view.mode === 'live' && saidLines(tracker.lines).length > 0 ? (
        <HistoryButton
          onPress={() => setHistoryOpen((open) => !open)}
          style={{ position: 'absolute', top, left: 14 }}
        />
      ) : null}

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

      {phoneShown ? (
        <View
          style={{ position: 'absolute', top: 108 + dy, left: 0, right: 0, alignItems: 'center' }}
          onLayout={(e) => setPhoneBottom(e.nativeEvent.layout.y + e.nativeEvent.layout.height)}
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

      {historyOpen && view.mode === 'live' ? (
        <HistorySheet
          entries={transcriptOf(tracker.lines, tracker.heard)}
          replayable={
            state.phase === 'your_turn' &&
            !state.playing &&
            !state.learnerSpeaking &&
            !state.talkHeld
          }
          lineView={({ line }) => {
            const story = line.lineId ? findLine(line.lineId) : undefined;
            const written = story ? glossFor(story.glosses, firstLanguage) : null;
            const lineId = story?.audio ? story.id : null;
            return {
              speaker: line.speaker,
              name: nameOf(line.speaker),
              tone: bubbleTone(line.speaker),
              glossProps: lineGlossProps(
                {
                  text: line.text,
                  gloss: written,
                  translatable: scene.kind !== 'practice' && lineGlossOffered(stage, firstLanguage),
                },
                glosses,
                glosses.entry(line.text),
                t,
              ),
              onReplay:
                lineId && engine ? () => engine.playRecordedLocally(lineId, line.speaker) : null,
            };
          }}
          onClose={() => setHistoryOpen(false)}
          style={{
            position: 'absolute',
            top: pillBottom + 10,
            left: space.sheetInset,
            right: space.sheetInset,
            bottom: height - stackTop + 10,
          }}
        />
      ) : null}

      <View
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: space.callBarBottom,
          gap: 10,
        }}
        onLayout={(e) => setStackTop(e.nativeEvent.layout.y)}
      >
        {view.meaning ? (
          <MeaningWhisper
            name={nameOf(scene.cast.includes('pip') ? 'pip' : layout.pill)}
            simple={view.meaning.simple}
            gloss={view.meaning.gloss}
            translated={view.meaning.phase === 'translated'}
            onReveal={() => dispatch({ type: 'translation_shown' })}
            onHide={() => dispatch({ type: 'translation_hidden' })}
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
        {tipText !== null ? (
          <CallTip
            key={view.tip}
            text={tipText}
            art={<CritterFace character="pip" species={roommate.species} size={30} />}
          />
        ) : null}
        {view.mode === 'live' && !view.sceneDone ? (
          <TurnModeSwitch
            engine={engine}
            state={state}
            art={<CritterFace character="pip" species={roommate.species} size={30} />}
          />
        ) : null}
        {view.paused ? (
          <View style={{ alignItems: 'center' }} accessibilityLiveRegion="polite">
            <PhonePill
              label={t(view.paused === 'interrupted' ? 'call.interrupted' : 'call.reconnecting')}
            />
          </View>
        ) : null}
        <CallBar
          mic={view.mic}
          {...(view.talking ? { speaker: nameOf(view.talking) } : {})}
          sceneDone={view.sceneDone}
          exitLabel={t(layout.exit)}
          onHoldToggle={() => engine?.holdOn(state.onHold ? 0 : LIMITS.holdSecondsMax)}
          onExit={exit}
          {...micBar}
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
