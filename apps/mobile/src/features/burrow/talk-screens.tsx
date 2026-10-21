import { RECORDED_LINE_ASSETS } from '@yapling/story/assets';
import {
  colours,
  layout,
  motion,
  outline,
  palette,
  radii,
  stickerShadows,
  type,
} from '@yapling/theme';
import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

import {
  BackButton,
  CallBar,
  SpeakerPill,
  SpeechBubble,
  Sticker,
  Txt,
  captionCharTimes,
  captionWords,
  useKeyframes,
  useLocale,
  type CaptionClock,
  type MicState,
} from '../../ui';
import { DuskCafe, Face } from './art';
import { BurrowBackdrop, useStage, type CastSpot } from './backdrop';
import type { LineModel } from './model';
import type { BackModel, DoorModel, EpisodePeek } from './scenes';

/*
 * The burrow's two scenes in the call frame: a speaker pill at the top, the line in a big bubble
 * with its caption following the recording, the critters in the room, and the call bar. The voice
 * engine plays the line and the call engine runs the learner's turn; these screens show what
 * they say and hand every press back.
 */

/** The call engine's side of a scene: the mic's state and the learner's presses. */
export interface TalkControls {
  readonly mic: MicState;
  /** Who is speaking while the mic is `speaking`. */
  readonly speaker?: string;
  readonly sceneDone?: boolean;
  readonly onTalkStart?: () => void;
  readonly onTalkEnd?: () => void;
  readonly onHoldToggle?: () => void;
  /** The bar's last button ("Chúc ngủ ngon", "Về hang"). */
  readonly onDone?: () => void;
  readonly onBack?: () => void;
}

/** On the learner's turn the critters listen, as in every call. */
const isListening = (mic: MicState) => mic === 'yourTurn' || mic === 'listening';

/**
 * A recorded line's caption, following the audio clock: the words start as the timing file says.
 * Without a clock (no audio playing) the line shows whole.
 */
export function useLineCaption(
  line: LineModel | null,
  seconds: SharedValue<number> | undefined,
): CaptionClock | undefined {
  const id = line?.lineId ?? null;
  const caption = line?.text ?? '';
  const words = useMemo(() => {
    if (id === null || !(id in RECORDED_LINE_ASSETS)) return null;
    const timing = RECORDED_LINE_ASSETS[id as keyof typeof RECORDED_LINE_ASSETS].timing();
    return captionWords(caption, captionCharTimes(caption, timing.alignment));
  }, [id, caption]);
  return words !== null && seconds !== undefined ? { words, seconds } : undefined;
}

/** Asks the voice engine to play a recorded line once, when it first shows. */
function usePlayOnce(line: LineModel | null, show: boolean, onPlayLine?: (id: string) => void) {
  const id = line?.lineId ?? null;
  useEffect(() => {
    if (show && id !== null) onPlayLine?.(id);
  }, [show, id, onPlayLine]);
}

function TalkFrame({
  pill,
  controls,
  exitLabel,
  children,
}: {
  pill: ReactNode;
  controls: TalkControls;
  exitLabel: string;
  children?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <>
      {children}
      <BackButton
        onPress={() => controls.onBack?.()}
        accessibilityLabel={t('common.a11y.back')}
        style={styles.back}
      />
      {pill}
      <CallBar
        mic={controls.mic}
        {...(controls.speaker !== undefined ? { speaker: controls.speaker } : {})}
        sceneDone={controls.sceneDone ?? false}
        exitLabel={exitLabel}
        {...(controls.onHoldToggle ? { onHoldToggle: controls.onHoldToggle } : {})}
        {...(controls.onDone ? { onExit: controls.onDone } : {})}
        {...(controls.onTalkStart ? { onTalkStart: controls.onTalkStart } : {})}
        {...(controls.onTalkEnd ? { onTalkEnd: controls.onTalkEnd } : {})}
        style={styles.callBar}
      />
    </>
  );
}

function Bubble({
  line,
  caption,
  talking,
  top,
  left,
  right,
}: {
  line: LineModel;
  caption: CaptionClock | undefined;
  talking: boolean;
  top: number;
  left: number;
  right: number;
}) {
  const { t } = useLocale();
  return (
    <SpeechBubble
      name={line.name}
      aiTag={t('common.aiTag')}
      tone={line.speaker === 'pip' ? 'pip' : 'neighbour'}
      text={line.text}
      talking={talking}
      {...(caption ? { caption } : {})}
      {...(line.gloss ? { gloss: line.gloss, glossHint: t('call.tapForMeaning') } : {})}
      style={{ position: 'absolute', top, left, right }}
    />
  );
}

/** Where Linh's knock puts things (the prototype's 390-point units). */
const DOOR = {
  pip: { size: 140, left: 8, top: 474 },
  linh: { size: 142, left: 146, top: 446 },
  bubble: { top: 306, left: 96, right: 16 },
  dusk: { top: 110, left: 30, width: 330, height: 250 },
} as const;

export type DoorPhase = 'knock' | 'welcome' | 'reply' | 'dusk';

export interface DoorScreenProps {
  readonly model: DoorModel;
  /** Before the line, Linh's line, the learner's turn, the letter at dusk. */
  readonly phase: DoorPhase;
  /** Seconds into Linh's recorded line, advanced by the voice engine on the UI thread. */
  readonly lineSeconds?: SharedValue<number>;
  /** Plays a recorded line (the voice engine), when the line first shows. */
  readonly onPlayLine?: (lineId: string) => void;
  readonly controls: TalkControls;
}

/** Linh knocks on the first evening; at dusk, a letter slips under the café door. */
export function DoorScreen({ model, phase, lineSeconds, onPlayLine, controls }: DoorScreenProps) {
  const { t } = useLocale();
  const { y } = useStage();
  const showLine = phase === 'welcome' || phase === 'reply';
  const caption = useLineCaption(model.line, lineSeconds);
  usePlayOnce(model.line, showLine, onPlayLine);
  const listening = isListening(controls.mic);
  const cast: CastSpot[] = [
    {
      character: 'pip',
      mood: phase === 'dusk' ? 'surprised' : listening ? 'listen' : 'happy',
      ...DOOR.pip,
    },
    { character: model.guest, mood: listening ? 'listen' : 'wave', ...DOOR.linh },
  ];
  return (
    <BurrowBackdrop
      scene={model.scene}
      timeOfDay={model.timeOfDay}
      species={model.roommate.species}
      cast={cast}
    >
      <TalkFrame
        controls={controls}
        exitLabel={t('onboarding.door.done')}
        pill={
          <SpeakerPill
            name={model.line.name}
            aiTag={t('common.aiTag')}
            place={t('onboarding.door.place')}
            face={<Face character={model.guest} size={30} />}
            style={styles.pill}
          />
        }
      >
        {showLine ? (
          <Bubble
            line={model.line}
            caption={caption}
            talking={controls.mic === 'speaking'}
            top={y(DOOR.bubble.top)}
            left={DOOR.bubble.left}
            right={DOOR.bubble.right}
          />
        ) : null}
        {phase === 'dusk' ? <DuskWindow /> : null}
      </TalkFrame>
    </BurrowBackdrop>
  );
}

/** The burrow window at dusk, looking at the café: a letter slides under its door, again and again. */
function DuskWindow() {
  const { u, y } = useStage();
  const pop = useKeyframes(motion.screens.roundPop);
  const letter = useKeyframes(motion.call.duskLetter, { hiddenOutside: true });
  const w = u(DOOR.dusk.width);
  const h = u(DOOR.dusk.height);
  const corners = { borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2 };
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: y(DOOR.dusk.top),
          left: u(DOOR.dusk.left),
          width: w,
          height: h,
        },
        pop,
      ]}
    >
      {/* The frame's flat ink shadow, 8 points down, as a sticker's. */}
      <View style={[styles.duskShadow, corners]} />
      <View style={[styles.dusk, corners]}>
        <View style={StyleSheet.absoluteFill}>
          <DuskCafe width={w} height={h} />
        </View>
        <Animated.View style={[styles.letter, { left: u(150), top: u(176) }, letter]} />
        <View style={[styles.bar, { left: 0, right: 0, top: u(118), height: 6 }]} />
        <View style={[styles.bar, { top: 0, bottom: 0, left: u(160), width: 6 }]} />
      </View>
    </Animated.View>
  );
}

/** Where coming back puts things. */
const BACK = {
  pip: { size: 230, left: 80, top: 330 },
  bubble: { top: 220, left: 20, right: 20 },
  bubbleUnderPeek: { top: 220 },
  peek: { top: 110, left: 16, right: 16 },
} as const;

export interface BackScreenProps {
  readonly model: BackModel;
  /** The next episode card: at once after days away, after the learner's answer on day 8. */
  readonly showPeek?: boolean;
  readonly lineSeconds?: SharedValue<number>;
  readonly onPlayLine?: (lineId: string) => void;
  readonly controls: TalkControls;
}

/** Coming back: Pip is glad, tells the story so far, and the next episode waits where it was. */
export function BackScreen({
  model,
  showPeek,
  lineSeconds,
  onPlayLine,
  controls,
}: BackScreenProps) {
  const { t } = useLocale();
  const { y } = useStage();
  const caption = useLineCaption(model.line, lineSeconds);
  usePlayOnce(model.line, true, onPlayLine);
  const peek = (showPeek ?? model.peekFirst) ? model.peek : null;
  return (
    <BurrowBackdrop
      scene={model.scene}
      timeOfDay={model.timeOfDay}
      species={model.roommate.species}
      cast={[
        { character: 'pip', mood: isListening(controls.mic) ? 'listen' : 'happy', ...BACK.pip },
      ]}
    >
      <TalkFrame
        controls={controls}
        exitLabel={t('burrow.back.done')}
        pill={
          <SpeakerPill
            name={model.roommate.name}
            aiTag={t('common.aiTag')}
            place={t('burrow.place')}
            face={<Face character="pip" species={model.roommate.species} size={30} />}
            style={styles.pill}
          />
        }
      >
        <Bubble
          line={model.line}
          caption={caption}
          talking={controls.mic === 'speaking'}
          top={y(BACK.bubble.top)}
          left={BACK.bubble.left}
          right={BACK.bubble.right}
        />
        {peek ? <PeekCard peek={peek} away={model.kind === 'away'} top={y(BACK.peek.top)} /> : null}
      </TalkFrame>
    </BurrowBackdrop>
  );
}

/** The next episode, on an ink card with a lilac lip, rising in. */
function PeekCard({ peek, away, top }: { peek: EpisodePeek; away: boolean; top: number }) {
  const { t } = useLocale();
  const rise = useKeyframes(motion.call.peek);
  return (
    <Animated.View
      style={[{ position: 'absolute', top, left: BACK.peek.left, right: BACK.peek.right }, rise]}
    >
      <Sticker
        shadow={stickerShadows.onInk}
        radius={22}
        outline={outline.bold}
        fill={palette.ink}
        contentStyle={styles.peek}
      >
        <View style={styles.peekFace}>
          <Face character={peek.face} size={44} background={colours.secondarySoft} />
        </View>
        <View style={{ flex: 1 }}>
          <Txt variant={{ ...type.label, tracking: 0.08 }} colour={colours.accent}>
            {t('burrow.peek.episode', { season: peek.season, episode: peek.episode })}
          </Txt>
          <Txt variant={{ ...type.cardTitle }} colour={colours.textOnInk}>
            {peek.title}
          </Txt>
          <Txt variant="note" colour={colours.lineArt}>
            {away ? t('burrow.peek.whereYouLeftIt') : t('burrow.peek.ready')}
          </Txt>
        </View>
      </Sticker>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  back: { position: 'absolute', top: layout.topBar, left: layout.marginScreen },
  pill: { position: 'absolute', top: layout.topBar, left: 62, right: layout.marginScreen },
  callBar: {
    position: 'absolute',
    left: layout.marginScreen,
    right: layout.marginScreen,
    bottom: layout.callBarBottom,
  },
  dusk: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: 6,
    borderColor: colours.outline,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: palette.dusk,
  },
  duskShadow: {
    position: 'absolute',
    top: stickerShadows.window.y,
    bottom: -stickerShadows.window.y,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: colours.outline,
  },
  letter: {
    position: 'absolute',
    width: 46,
    height: 12,
    backgroundColor: colours.surfacePaper,
    borderWidth: outline.thin,
    borderColor: colours.outline,
    borderRadius: radii.flap,
  },
  bar: { position: 'absolute', backgroundColor: colours.outline },
  peek: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  peekFace: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: outline.thin,
    borderColor: colours.surface,
  },
});
