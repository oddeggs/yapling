import {
  colours,
  fontFor,
  motion,
  outline,
  radii,
  stickerShadows,
  translucent,
} from '@yapling/theme';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { saidLength, type CaptionWord } from './caption';
import { AiTag } from './chip';
import { useKeyframes } from './motion/play';
import { Press } from './press';
import { Sticker } from './surface';
import { FRAME_TEXT_MAX_SCALE, Txt } from './text';
import { typeExtras } from './type-extras';
import type { ViewStyleProp } from './style';

/** Whose bubble: Pip's is lilac, the office's sky, every other neighbour's white. */
export type BubbleTone = 'pip' | 'neighbour' | 'office';

const fills: Record<BubbleTone, string> = {
  pip: colours.bubblePip,
  neighbour: colours.surface,
  office: colours.bubbleOffice,
};

/** The line's audio clock and its words' start times: the caption follows the voice. */
export interface CaptionClock {
  readonly words: readonly CaptionWord[];
  /** Seconds into the line's audio, advanced by the player on the UI thread. */
  readonly seconds: SharedValue<number>;
}

export interface SpeechBubbleProps {
  readonly name: string;
  readonly aiTag: string;
  readonly tone: BubbleTone;
  /** The line's caption (delivery tags already stripped). */
  readonly text: string;
  /** While the line plays: the unsaid part stays faint and fills in word by word. */
  readonly caption?: CaptionClock;
  /** True while the line is being spoken: the tap-for-meaning hint waits until it ends. */
  readonly talking?: boolean;
  /** The Vietnamese line, shown in the hand font when the bubble is tapped. */
  readonly gloss?: string;
  /** "Chạm để xem nghĩa". */
  readonly glossHint?: string;
  /** Called when the gloss opens or closes (a first opening drops the phrase in the burrow). */
  readonly onGlossChange?: (shown: boolean) => void;
  readonly style?: ViewStyleProp;
}

/**
 * A character's line: the speaker and the AI tag, the line in big type with its caption filling
 * in as it's spoken, and, on a tap, the Vietnamese meaning in Kithfield Hand.
 */
export function SpeechBubble({
  name,
  aiTag,
  tone,
  text,
  caption,
  talking = false,
  gloss,
  glossHint,
  onGlossChange,
  style,
}: SpeechBubbleProps) {
  const [glossShown, setGlossShown] = useState(false);
  const said = useSaidLength(text, caption);
  const canGloss = gloss !== undefined && gloss !== '';
  const toggle = () => {
    if (!canGloss) return;
    const next = !glossShown;
    setGlossShown(next);
    onGlossChange?.(next);
  };
  return (
    <Press
      onPress={canGloss ? toggle : undefined}
      haptic={canGloss ? 'selection' : null}
      accessibilityLabel={`${name}, ${aiTag}: ${text}`}
      {...(canGloss && glossHint ? { accessibilityHint: glossHint } : {})}
      style={style}
    >
      <Sticker
        shadow={stickerShadows.button}
        radius={radii.bubble}
        outline={outline.regular}
        fill={fills[tone]}
        contentStyle={{ paddingVertical: 11, paddingHorizontal: 15, gap: 3 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE} variant="bubbleName">
            {name}
          </Txt>
          <AiTag label={aiTag} small />
        </View>
        <Text
          maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE}
          style={[fontFor('bubble'), { color: colours.text }]}
        >
          <Text>{text.slice(0, said)}</Text>
          <Text style={{ opacity: 0.3 }}>{text.slice(said)}</Text>
        </Text>
        {canGloss && glossShown ? <Gloss text={gloss} /> : null}
        {canGloss && !glossShown && !talking && glossHint ? (
          <Txt
            maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE}
            variant={typeExtras.tapHint}
            style={{ opacity: 0.6 }}
          >
            {glossHint}
          </Txt>
        ) : null}
      </Sticker>
    </Press>
  );
}

/**
 * The said part's length, following the audio clock on the UI thread. The text re-renders only
 * when a new word starts, a few times a second.
 */
function useSaidLength(text: string, caption: CaptionClock | undefined): number {
  const [said, setSaid] = useState(caption ? 0 : text.length);
  const words = caption?.words;
  const seconds = caption?.seconds;
  useAnimatedReaction(
    () => (words && seconds ? saidLength(words, seconds.get()) : -1),
    (now, before) => {
      if (now >= 0 && now !== before) scheduleOnRN(setSaid, now);
    },
  );
  return caption ? said : text.length;
}

/** The Vietnamese under the line: a dashed rule, then the hand font, easing in. */
function Gloss({ text }: { text: string }) {
  const easeIn = useKeyframes(motion.call.gloss);
  return (
    <Animated.View style={[{ paddingTop: 4 }, easeIn]}>
      <DashedRule />
      <Txt maxFontSizeMultiplier={FRAME_TEXT_MAX_SCALE} variant="gloss" colour={colours.textGloss}>
        {text}
      </Txt>
    </Animated.View>
  );
}

/** A 2-point dashed rule: the top edge of a dashed box, the rest clipped away. */
export function DashedRule({ colour = translucent.glossRule }: { colour?: string }) {
  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, overflow: 'hidden' }}
    >
      <View
        style={{
          height: 8,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: colour,
        }}
      />
    </View>
  );
}
