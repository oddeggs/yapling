import type { Mood, PipSpecies } from '@yapling/art';
import { Critter } from '@yapling/art/native';
import { getLine, glossFor, type Scene } from '@yapling/story';
import { RECORDED_LINE_ASSETS } from '@yapling/story/assets';
import type { FirstLanguage } from '@yapling/contracts';
import { colours, corners, glass, layout, motion, outline, palette, radii } from '@yapling/theme';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import {
  CallBar,
  GlassView,
  SpeechBubble,
  StickerButton,
  Txt,
  captionCharTimes,
  captionWords,
  typeExtras,
  useKeyframes,
  useLocale,
  useReduceMotion,
  type CaptionClock,
  type MicState,
} from '../../ui';
import { haptics } from '../../ui/haptics';
import { useLipsyncClock, type CallState, type Lipsync } from '../../voice';
import { createLipsync } from '../../voice/lipsync';
import { MIN_HOLD_MS } from '../../voice/turns';
import { CritterFace } from '../call/call-art';
import { CallTip } from '../call/call-tip';
import type { VoicemailCall } from './voicemail-call';
import {
  BlurredBurrow,
  GlassNote,
  GrowSticker,
  ListenTop,
  RoundFace,
  VoicemailCard,
  useFrame,
} from './parts';
import { formatDuration, playedFraction } from './story-model';
import { PHRASE_OBJECT, type Growth } from './voicemail-model';

/*
 * Pip's voicemail and the fix: the voicemail card while the message plays, then Pip in the burrow
 * saying its phrase slightly wrong, the learner's turn to fix it (the hint offered once after a
 * long quiet; they can think as long as they like), and the phrase's sticker growing a leaf as Pip
 * thanks them. If their tries don't get there, Pip works it out on its own and the scene ends just
 * as warmly.
 */

export interface VoicemailScreenProps {
  readonly scene: Scene;
  readonly roommateName: string;
  readonly species: PipSpecies;
  readonly firstLanguage: FirstLanguage;
  readonly call: VoicemailCall;
  /** How the fix grows the phrase, and the phrase. */
  readonly growth: Growth;
  readonly phrase: string;
  readonly onSeasonMap: () => void;
  readonly onRetry: () => void;
  readonly onBack: () => void;
}

/** The voicemail's recorded line whose caption the call is playing, if any. */
function recordedLineFor(scene: Scene, caption: string) {
  for (const beat of scene.beats) {
    if (beat.kind !== 'rec') continue;
    const line = getLine(beat.line);
    if (line.caption === caption) return line;
  }
  return null;
}

function micStateOf(call: CallState | null, turn: boolean): MicState {
  if (!call) return 'idle';
  if (call.onHold) return 'paused';
  switch (call.phase) {
    case 'character_speaking':
      return 'speaking';
    case 'listening':
      return 'listening';
    case 'your_turn':
      return turn ? 'yourTurn' : 'idle';
    case 'idle':
    case 'connecting':
    case 'thinking':
    case 'ended':
    case 'error':
      return 'idle';
  }
}

export function VoicemailScreen({
  scene,
  roommateName,
  species,
  firstLanguage,
  call: { engine, call, voicemail },
  growth,
  phrase,
  onSeasonMap,
  onRetry,
  onBack,
}: VoicemailScreenProps) {
  const { t } = useLocale();
  const reduce = useReduceMotion();
  const { u, y } = useFrame();
  const lipsync = useMemo(() => engine?.lipsync ?? createLipsync(), [engine]);
  // A new call brings a new clock.
  const clockKey = useMemo(() => String(Math.random()), [lipsync]);

  const phase = voicemail.phase;
  const caption = call?.caption ?? null;
  const recorded = caption?.source === 'recorded' ? recordedLineFor(scene, caption.text) : null;
  const pipTalking = call?.phase === 'character_speaking' && caption?.character === 'pip';
  const turn = phase === 'turn';
  const mic = micStateOf(call, turn);
  const grown = (phase === 'grown' || phase === 'done') && voicemail.outcome !== null;
  // A tap too short to be a turn, or a hold with no words: the retry tip and a light tap.
  const tip =
    turn && call && !call.playing
      ? call.notice === 'hold_longer'
        ? t('call.tip.holdLonger')
        : call.notice === 'not_heard'
          ? t('call.tip.notHeard')
          : null
      : null;
  useEffect(() => {
    if (tip !== null) haptics.play('tap');
  }, [tip]);

  const mood: Mood = pipTalking
    ? phase === 'oops'
      ? 'proud'
      : 'excited'
    : voicemail.outcome === 'fixed'
      ? 'excited'
      : mic === 'yourTurn' || mic === 'listening'
        ? 'listen'
        : 'happy';

  const message = scene.beats.find((b) => b.kind === 'rec');
  const messageMs = message?.kind === 'rec' ? (getLine(message.line).audio?.durationMs ?? 0) : 0;
  const played = useDerivedValue(() =>
    phase === 'message' ? playedFraction(Math.max(0, lipsync.streamMs.get()), messageMs) : 0,
  );

  return (
    <BlurredBurrow>
      <LipsyncClock key={clockKey} lipsync={lipsync} />
      <Critter
        character="pip"
        species={species}
        mood={mood}
        size={u(210)}
        mouth={pipTalking ? lipsync.mouth : 'rest'}
        animated={!reduce}
        style={{ position: 'absolute', left: u(90), top: y(360) }}
      />
      <ListenTop
        name={roommateName}
        place={t('story.place.voicemail')}
        face={<RoundFace character="pip" species={species} size={30} />}
        onBack={onBack}
      />
      {phase === 'opening' || phase === 'message' ? (
        <VoicemailCard
          title={t('story.voicemailFrom', { name: roommateName })}
          species={species}
          played={played}
          label={t('story.a11y.waveform', {
            elapsed: formatDuration(0),
            duration: formatDuration(messageMs),
          })}
          style={[styles.card, { top: y(110) }]}
        />
      ) : null}
      {caption && phase !== 'opening' && phase !== 'offline' ? (
        <LineBubble
          key={caption.streamId}
          name={caption.character === 'pip' ? roommateName : caption.character}
          text={recorded ? recorded.caption : caption.text}
          lineId={recorded?.id ?? null}
          gloss={recorded ? glossFor(recorded.glosses, firstLanguage) : null}
          talking={call?.phase === 'character_speaking'}
          lipsync={lipsync}
          top={y(250)}
        />
      ) : null}
      {grown ? (
        <View style={[styles.sticker, { top: y(150) }]} pointerEvents="none">
          {voicemail.outcome === 'fixed' ? (
            <GrowSticker
              from={PHRASE_OBJECT[growth.from]}
              to={PHRASE_OBJECT[growth.to]}
              stage={growth.to === 'sprout' ? t('story.voicemail.nowASprout') : t('call.nowALeaf')}
              phrase={phrase}
            />
          ) : (
            <GrowSticker
              from={PHRASE_OBJECT[growth.from]}
              to={PHRASE_OBJECT[growth.from]}
              stage={t('story.voicemail.workedItOut', { name: roommateName })}
              phrase={phrase}
              fill={colours.surface}
            />
          )}
        </View>
      ) : null}
      {phase === 'offline' ? (
        <View style={[styles.offline, { top: y(150) }]}>
          <GlassNote>
            <Txt variant="rowTitle" style={{ flex: 1 }}>
              {t('story.voicemail.offline', { name: roommateName })}
            </Txt>
          </GlassNote>
          <StickerButton label={t('story.voicemail.tryAgain')} size="small" onPress={onRetry} />
        </View>
      ) : null}
      <View style={styles.bottom} pointerEvents="box-none">
        {turn && voicemail.hint && mic !== 'listening' ? (
          <HintCard phrase={voicemail.hint.phrase} gloss={voicemail.hint.gloss} />
        ) : null}
        {turn && call && call.learnerText !== '' ? (
          <YouBubble text={call.learnerText} heard={call.learnerFinal} />
        ) : null}
        {tip !== null ? (
          <CallTip
            key={tip}
            text={tip}
            art={<CritterFace character="pip" species={species} size={30} />}
          />
        ) : null}
        <CallBar
          mic={mic}
          speaker={roommateName}
          sceneDone={phase === 'done' || phase === 'offline'}
          exitLabel={t('call.done.seasonMap')}
          onHoldToggle={() => engine?.holdOn(call?.onHold ? 0 : 10)}
          onExit={onSeasonMap}
          onTalkStart={() => engine?.pressTalk()}
          onTalkEnd={() => engine?.releaseTalk()}
          holdMs={MIN_HOLD_MS}
        />
      </View>
    </BlurredBurrow>
  );
}

/** Runs the call's caption and mouth clock on the UI thread while mounted. */
function LipsyncClock({ lipsync }: { lipsync: Lipsync }) {
  useLipsyncClock(lipsync);
  return null;
}

/** The line in Pip's bubble: a recorded line follows its timing file, a live one grows as sent. */
function LineBubble({
  name,
  text,
  lineId,
  gloss,
  talking,
  lipsync,
  top,
}: {
  name: string;
  text: string;
  lineId: string | null;
  gloss: string | null;
  talking: boolean;
  lipsync: Lipsync;
  top: number;
}) {
  const { t } = useLocale();
  const seconds = useDerivedValue(() => Math.max(0, lipsync.streamMs.get()) / 1000);
  const caption = useRecordedCaption(lineId, text, seconds);
  return (
    <SpeechBubble
      name={name}
      aiTag={t('common.aiTag')}
      tone="pip"
      text={text}
      talking={talking}
      {...(caption && talking ? { caption } : {})}
      {...(gloss ? { gloss, glossHint: t('call.tapForMeaning') } : {})}
      style={[styles.bubble, { top }]}
    />
  );
}

function useRecordedCaption(
  lineId: string | null,
  text: string,
  seconds: SharedValue<number>,
): CaptionClock | undefined {
  const words = useMemo(() => {
    if (lineId === null || !(lineId in RECORDED_LINE_ASSETS)) return null;
    const timing = RECORDED_LINE_ASSETS[lineId as keyof typeof RECORDED_LINE_ASSETS].timing();
    return captionWords(text, captionCharTimes(text, timing.alignment));
  }, [lineId, text]);
  return words ? { words, seconds } : undefined;
}

function HintCard({ phrase, gloss }: { phrase: string; gloss: string | null }) {
  const { t } = useLocale();
  const rise = useKeyframes(motion.call.hint);
  return (
    <Animated.View style={rise}>
      <GlassNote>
        <View style={styles.hintTag}>
          <Txt variant={typeExtras.tagSmall}>{t('call.hint')}</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant="noteStrong" style={{ fontSize: 15.5 }}>
            {phrase}
          </Txt>
          {gloss ? (
            <Txt variant="handNote" colour={colours.textMuted}>
              {gloss}
            </Txt>
          ) : null}
        </View>
      </GlassNote>
    </Animated.View>
  );
}

function YouBubble({ text, heard }: { text: string; heard: boolean }) {
  const { t } = useLocale();
  const [tl, tr, br, bl] = corners.caption;
  return (
    <GlassView
      glass={glass.hint}
      radius={radii.bubbleSmall}
      style={[
        styles.you,
        {
          borderTopLeftRadius: tl,
          borderTopRightRadius: tr,
          borderBottomRightRadius: br,
          borderBottomLeftRadius: bl,
        },
      ]}
    >
      <Txt variant="labelSmall" colour={colours.textMuted}>
        {heard ? t('call.youHeard') : t('call.you')}
      </Txt>
      <Txt variant="caption">{text}</Txt>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', left: 18, right: 18 },
  bubble: { position: 'absolute', left: 20, right: 20 },
  sticker: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  offline: {
    position: 'absolute',
    left: layout.marginCard,
    right: layout.marginCard,
    gap: 12,
    alignItems: 'center',
  },
  bottom: {
    position: 'absolute',
    left: layout.marginScreen,
    right: layout.marginScreen,
    bottom: layout.callBarBottom,
    gap: 10,
  },
  hintTag: {
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: radii.tag,
    borderWidth: outline.thin,
    borderColor: colours.outline,
    backgroundColor: palette.honey,
  },
  you: { alignSelf: 'flex-end', maxWidth: 310, paddingVertical: 10, paddingHorizontal: 14 },
});
