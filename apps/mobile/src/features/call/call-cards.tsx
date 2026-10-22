import { Canvas, Path } from '@shopify/react-native-skia';
import type { FirstLanguage } from '@yapling/contracts';
import { glossFor, type Letter, type LetterLine } from '@yapling/story';
import {
  colours,
  cssEasing,
  glass,
  hubKeyframes,
  motion,
  outline,
  palette,
  radii,
  softShadows,
  shadowCss,
  stickerShadows,
  translucent,
  type Animation,
} from '@yapling/theme';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import Animated from 'react-native-reanimated';

import { AiTag, Tag } from '../../ui/chip';
import { useLocale } from '../../ui/locale';
import { useKeyframes } from '../../ui/motion/play';
import { Press } from '../../ui/press';
import { DashedRule, type BubbleTone } from '../../ui/speech-bubble';
import { GlassView, Sticker } from '../../ui/surface';
import { typeExtras } from '../../ui/type-extras';
import type { ViewStyleProp } from '../../ui/style';
import { CallTxt } from './call-text';

/*
 * The cards a call shows over its scene, as the prototype draws them: the hint, the learner's
 * caption, Pip's whispered meaning, the thinking dots, "You fixed it yourself", the phone pill and
 * the rent letter with its tap-to-gloss lines.
 */

const bubbleFills: Record<BubbleTone, string> = {
  pip: colours.bubblePip,
  neighbour: colours.surface,
  office: colours.bubbleOffice,
};

/** The phrase to try, after the stage's pause: "HINT", the English, the gloss in Kithfield Hand. */
export function HintCard({
  phrase,
  gloss,
  onDismiss,
}: {
  phrase: string;
  gloss: string | null;
  onDismiss: () => void;
}) {
  const { t } = useLocale();
  const rise = useKeyframes(motion.call.hint);
  return (
    <Animated.View style={rise}>
      <Press
        onPress={onDismiss}
        haptic="selection"
        accessibilityLabel={`${t('call.hint')}: ${phrase}${gloss ? `. ${gloss}` : ''}`}
      >
        <GlassView
          glass={glass.hint}
          radius={radii.bubbleSmall}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 11,
            paddingHorizontal: 14,
          }}
        >
          <Tag label={t('call.hint')} fill={palette.honey} />
          <View style={{ flexShrink: 1 }}>
            <CallTxt variant={{ ...typeExtras.phrase, size: 15.5, lineHeight: null }}>
              {phrase}
            </CallTxt>
            {gloss ? (
              <CallTxt variant="handNote" colour={colours.textMuted}>
                {gloss}
              </CallTxt>
            ) : null}
          </View>
        </GlassView>
      </Press>
    </Animated.View>
  );
}

/** What the learner said: the partial while they talk, then the heard line. */
export function YouCaption({ text, heard }: { text: string; heard: boolean }) {
  const { t } = useLocale();
  return (
    <View
      accessible
      accessibilityLabel={`${heard ? t('call.youHeard') : t('call.you')}: ${text}`}
      style={{
        alignSelf: 'flex-end',
        maxWidth: 310,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: radii.bubbleSmall,
        borderBottomRightRadius: 6,
        backgroundColor: translucent.caption,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.95)',
        boxShadow: shadowCss(softShadows.floating),
      }}
    >
      <CallTxt variant="labelSmall" colour={colours.textMuted}>
        {heard ? t('call.youHeard') : t('call.you')}
      </CallTxt>
      <CallTxt variant="caption">{text}</CallTxt>
    </View>
  );
}

/**
 * "What does that mean?": the character explains in simple English first; the first language is
 * one more tap away and hidden until then.
 */
export function MeaningWhisper({
  name,
  simple,
  gloss,
  translated,
  onReveal,
  onHide,
  onClose,
}: {
  name: string;
  simple: string | null;
  gloss: string | null;
  translated: boolean;
  onReveal: () => void;
  onHide: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const rise = useKeyframes(motion.call.whisper);
  return (
    <Animated.View style={rise}>
      <Sticker
        shadow={stickerShadows.button}
        radius={radii.bubble}
        outline={outline.regular}
        fill={colours.bubblePip}
        contentStyle={{ paddingVertical: 12, paddingHorizontal: 16, gap: 3 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 30 }}>
          <CallTxt variant="bubbleName">{t('call.whisper', { name })}</CallTxt>
          <AiTag label={t('common.aiTag')} small />
        </View>
        {simple === null ? (
          <ThinkingDots />
        ) : (
          <CallTxt variant={{ ...typeExtras.phrase, size: 16, weight: 700, lineHeight: 1.25 }}>
            {simple}
          </CallTxt>
        )}
        {translated && gloss ? <GlossLine text={gloss} variant="glossWhisper" /> : null}
        {simple !== null && gloss ? (
          <Press
            onPress={translated ? onHide : onReveal}
            haptic="selection"
            style={{
              alignSelf: 'flex-start',
              marginTop: 6,
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: radii.tagLarge,
              borderWidth: outline.thin,
              borderColor: colours.outline,
              backgroundColor: colours.surface,
            }}
          >
            <CallTxt variant={{ ...typeExtras.meaningChip, size: 12 }}>
              {t(translated ? 'call.hideTranslation' : 'call.showTranslation')}
            </CallTxt>
          </Press>
        ) : null}
        <CloseButton label={t('common.a11y.close')} onPress={onClose} />
      </Sticker>
    </Animated.View>
  );
}

/** The round ✕ in a card's top-right corner. */
export function CloseButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Press
      onPress={onPress}
      haptic="selection"
      accessibilityLabel={label}
      hitSlop={9}
      style={{
        position: 'absolute',
        top: 6,
        right: 8,
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: translucent.inkWash,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CallTxt variant={{ ...typeExtras.meaningChip, size: 12 }} importantForAccessibility="no">
        ✕
      </CallTxt>
    </Press>
  );
}

function GlossLine({ text, variant }: { text: string; variant: 'glossWhisper' | 'glossLetter' }) {
  const easeIn = useKeyframes(motion.call.gloss);
  return (
    // The whispered meaning sits under a dashed rule; a letter line's gloss just follows it.
    <Animated.View
      style={[variant === 'glossWhisper' ? { marginTop: 4, paddingTop: 4 } : null, easeIn]}
    >
      {variant === 'glossWhisper' ? <DashedRule /> : null}
      <CallTxt variant={variant} colour={colours.textGloss}>
        {text}
      </CallTxt>
    </Animated.View>
  );
}

/** One dot of the thinking dots: the hub's `ydot`, a beat behind the one before. */
const dot = (i: number): Animation => ({
  keyframes: hubKeyframes.ydot,
  durationMs: 1_000,
  delayMs: i * 150,
  easing: cssEasing.easeInOut,
  iterations: Infinity,
  fill: 'none',
});

function Dot({ index }: { index: number }) {
  const anim = useMemo(() => dot(index), [index]);
  const style = useKeyframes(anim);
  return (
    <Animated.View
      style={[
        { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colours.textMuted },
        style,
      ]}
    />
  );
}

export function ThinkingDots() {
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingVertical: 8 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} />
      ))}
    </View>
  );
}

/** A character's bubble while the reply is on its way: their name and the dots, no words yet. */
export function ThinkingBubble({
  name,
  tone,
  style,
}: {
  name: string;
  tone: BubbleTone;
  style?: ViewStyleProp;
}) {
  const { t } = useLocale();
  return (
    <View
      style={style}
      accessible
      accessibilityLabel={`${name}, ${t('common.aiTag')}: ${t('call.a11y.thinking', { name })}`}
    >
      <Sticker
        shadow={stickerShadows.button}
        radius={radii.bubble}
        outline={outline.regular}
        fill={bubbleFills[tone]}
        style={{ alignSelf: 'flex-start' }}
        contentStyle={{ paddingVertical: 11, paddingHorizontal: 15, gap: 3 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CallTxt variant="bubbleName">{name}</CallTxt>
          <AiTag label={t('common.aiTag')} small />
        </View>
        <ThinkingDots />
      </Sticker>
    </View>
  );
}

/** "You fixed it yourself", with three sparkles: only after the learner says it again. */
export function FixedSticker({ style }: { style?: ViewStyleProp }) {
  const { t } = useLocale();
  const pop = useKeyframes(motion.call.sticker);
  const sparkles = [
    { colour: palette.lilac, size: 22, top: -16, left: '28%' as const },
    { colour: palette.cyan, size: 16, top: -12, left: '72%' as const },
    { colour: palette.butter, size: 14, top: undefined, left: '55%' as const },
  ];
  return (
    <Animated.View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={t('call.fixedIt')}
      // The pop's transform is the sticker's last word, as in the prototype (its CSS tilt is overridden).
      style={[style, pop]}
    >
      <Sticker
        shadow={stickerShadows.badge}
        radius={radii.badge}
        outline={outline.bold}
        fill={colours.success}
        contentStyle={{ paddingVertical: 8, paddingHorizontal: 14 }}
      >
        <CallTxt variant={{ ...typeExtras.phrase, size: 17 }}>{t('call.fixedIt')}</CallTxt>
      </Sticker>
      {sparkles.map((s, i) => (
        <Sparkle key={i} index={i} {...s} />
      ))}
    </Animated.View>
  );
}

function Sparkle({
  index,
  colour,
  size,
  top,
  left,
}: {
  index: number;
  colour: string;
  size: number;
  top: number | undefined;
  left: `${number}%`;
}) {
  const anim = motion.call.sparkles[index] ?? motion.call.sparkles[0];
  const style = useKeyframes(anim, { hiddenOutside: true });
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left }, top === undefined ? { bottom: -14 } : { top }, style]}
    >
      <Text style={{ fontSize: size, color: colour }}>✦</Text>
    </Animated.View>
  );
}

/** The phone icon, as the prototype draws it (32-unit box). */
const PHONE_PATH =
  'M9 5 C7 5 5 7 5 9 C5 19 13 27 23 27 C25 27 27 25 27 23 L27 20 L21 18 L19 21 C15 19 13 17 11 13 L14 11 L12 5 Z';

/** "Calling Harbour Lane Office": an ink pill with a bouncing green phone. */
export function PhonePill({ label, style }: { label: string; style?: ViewStyleProp }) {
  const rise = useKeyframes(motion.call.phonePill);
  const bounce = useKeyframes(motion.call.phoneIcon);
  return (
    <Animated.View
      accessible
      accessibilityLabel={label}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 8,
          paddingLeft: 8,
          paddingRight: 14,
          borderRadius: 22,
          backgroundColor: palette.ink,
        },
        style,
        rise,
      ]}
    >
      <Animated.View
        style={[
          {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colours.success,
            alignItems: 'center',
            justifyContent: 'center',
          },
          bounce,
        ]}
      >
        <Canvas style={{ width: 16, height: 16 }}>
          <Path path={PHONE_PATH} color={palette.ink} transform={[{ scale: 0.5 }]} />
        </Canvas>
      </Animated.View>
      <CallTxt variant={{ ...typeExtras.meaningChip, size: 13 }} colour={colours.textOnInk}>
        {label}
      </CallTxt>
    </Animated.View>
  );
}

/** The rent letter, flying in: each line taps open its gloss and drops its phrase in the burrow. */
export function LetterCard({
  letter,
  language,
  onLineGloss,
  maxHeight,
  interactive = true,
  onTuck,
  style,
}: {
  letter: Letter;
  language: FirstLanguage;
  /** A line's gloss opened for the first time. */
  onLineGloss: (line: LetterLine) => void;
  /** Taller than this, the lines scroll inside the paper. */
  maxHeight?: number;
  /** False while tucked away: the lines don't take taps or VoiceOver. */
  interactive?: boolean;
  /** Puts the letter away (its corner button, as the whispered meaning's). */
  onTuck?: () => void;
  style?: ViewStyleProp;
}) {
  const { t } = useLocale();
  const fly = useKeyframes(motion.call.letter);
  const [open, setOpen] = useState<readonly number[]>([]);
  const scroll = useRef<ScrollViewInstance>(null);
  const [overflows, setOverflows] = useState(false);
  const inner = maxHeight === undefined ? undefined : maxHeight - 2 * outline.bold;
  // Tucked away, the letter shows its top again.
  useEffect(() => {
    if (!interactive) scroll.current?.scrollTo({ y: 0, animated: false });
  }, [interactive]);
  return (
    // The fly-in leaves the letter at its last tilt, as the prototype's animation does.
    <Animated.View
      style={[style, fly]}
      pointerEvents={interactive ? 'auto' : 'none'}
      accessibilityElementsHidden={!interactive}
      importantForAccessibility={interactive ? 'auto' : 'no-hide-descendants'}
    >
      <Sticker
        shadow={stickerShadows.card}
        radius={radii.paper}
        outline={outline.bold}
        fill={colours.surfacePaper}
        contentStyle={{ overflow: 'hidden' }}
      >
        <ScrollView
          ref={scroll}
          style={inner === undefined ? null : { maxHeight: inner }}
          contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 14, gap: 6 }}
          scrollEnabled={overflows && interactive}
          showsVerticalScrollIndicator={overflows}
          bounces={false}
          onContentSizeChange={(_w, h) => {
            const over = inner !== undefined && h > inner + 1;
            // A short phone shows the scroll bar once, so the rest of the letter is found.
            if (over && !overflows) setTimeout(() => scroll.current?.flashScrollIndicators(), 0);
            setOverflows(over);
          }}
        >
          {letter.lines.map((line, i) => {
            const gloss = glossFor(line.glosses, language);
            const shown = open.includes(i);
            return (
              <Press
                key={i}
                haptic={gloss ? 'selection' : null}
                onPress={
                  gloss
                    ? () => {
                        setOpen((o) => (shown ? o.filter((n) => n !== i) : [...o, i]));
                        if (!shown) onLineGloss(line);
                      }
                    : undefined
                }
                accessibilityLabel={shown && gloss ? `${line.en}. ${gloss}` : line.en}
                style={{ gap: 2, paddingVertical: 3, paddingHorizontal: 4, marginHorizontal: -4 }}
              >
                <CallTxt
                  variant={{ ...typeExtras.win, size: 13.5, weight: 700, lineHeight: 1.25 }}
                  style={{
                    textDecorationLine: 'underline',
                    textDecorationStyle: 'dotted',
                    textDecorationColor: palette.dotted,
                  }}
                >
                  {line.en}
                </CallTxt>
                {shown && gloss ? <GlossLine text={gloss} variant="glossLetter" /> : null}
              </Press>
            );
          })}
        </ScrollView>
        {onTuck && interactive ? (
          <CloseButton label={t('common.a11y.close')} onPress={onTuck} />
        ) : null}
      </Sticker>
    </Animated.View>
  );
}
