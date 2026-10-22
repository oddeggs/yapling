import { Canvas, Group, Path } from '@shopify/react-native-skia';
import {
  colours,
  cssEasing,
  glass,
  motion,
  outline,
  palette,
  radii,
  screenKeyframes,
  softShadows,
  shadowCss,
  stickerShadows,
  type,
  type Animation,
  type Glass,
  type TypeStyle,
} from '@yapling/theme';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { useLocale } from '../../ui/locale';
import { useKeyframes } from '../../ui/motion/play';
import { Press } from '../../ui/press';
import { GlassView, Sticker } from '../../ui/surface';
import { typeExtras } from '../../ui/type-extras';
import type { ViewStyleProp } from '../../ui/style';
import { Dial } from '../payoff/too-hard-sheet';
import { CallTxt } from './call-text';
import type { CardsView } from './scaffold';

/*
 * The beginner path's help over the call bar, as the Settling-in call board draws it: the say-this
 * cards (their Vietnamese in the hand font, a "hear it" button, a mint tick once said), the dark
 * task card, the replay pills and "Bỏ qua", and the toast when voices slow down.
 */

const cardType = {
  kicker: { ...type.labelSmall, tracking: 0.06 },
  one: { ...type.cardTitle, tracking: -0.02, lineHeight: 1.25 },
  two: { ...type.cardTitle, size: 17, tracking: -0.02, lineHeight: 1.25 },
  gloss: { ...type.glossStory, lineHeight: 1.22 },
  task: { ...type.body, weight: 700, lineHeight: 1.3 },
  tag: { ...typeExtras.tagSmall, size: 10.5, tracking: 0.04 },
  pill: typeExtras.meaningChip,
  skip: { ...typeExtras.meaningChip, weight: 700 },
  tick: { ...type.buttonSmall, weight: 900, size: 15 },
} as const satisfies Record<string, TypeStyle>;

/** The pills' frosted glass: a little whiter than the back button's. */
const pillGlass: Glass = {
  ...glass.button,
  fill: 'rgba(255,255,255,0.72)',
  border: { width: 1, colour: 'rgba(255,255,255,0.95)' },
};
const PILL_H = 38;
const HEAR = 32;

/** A passed card's fill easing from white to mint, a beat after the tick's pop starts. */
const softFill: Animation = {
  keyframes: screenKeyframes.fIn,
  durationMs: 600,
  delayMs: 200,
  easing: cssEasing.easeOut,
  iterations: 1,
  fill: 'both',
};

/** The speaker glyph in the design's 24-point box. */
const SPEAKER = 'M4 9h4l5-4v14l-5-4H4z';
const WAVES = 'M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12';
/** The round arrow on "Nói lại". */
const AGAIN = 'M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5';

function Glyph({
  size,
  colour,
  children,
}: {
  size: number;
  colour: string;
  children: (colour: string) => React.ReactNode;
}) {
  return (
    <Canvas style={{ width: size, height: size }} pointerEvents="none">
      <Group transform={[{ scale: size / 24 }]}>{children(colour)}</Group>
    </Canvas>
  );
}

function SpeakerGlyph() {
  return (
    <Glyph size={16} colour={colours.outline}>
      {(c) => (
        <>
          <Path path={SPEAKER} color={c} />
          <Path path={SPEAKER} color={c} style="stroke" strokeWidth={1.5} strokeJoin="round" />
          <Path path={WAVES} color={c} style="stroke" strokeWidth={2.2} strokeCap="round" />
        </>
      )}
    </Glyph>
  );
}

function AgainGlyph() {
  return (
    <Glyph size={15} colour={colours.outline}>
      {(c) => (
        <Path
          path={AGAIN}
          color={c}
          style="stroke"
          strokeWidth={2.8}
          strokeCap="round"
          strokeJoin="round"
        />
      )}
    </Glyph>
  );
}

/** One card or two side by side; the turn's tick and mint once it passed. */
export function SayCards({
  view,
  canHear,
  onHear,
}: {
  view: CardsView;
  /** A recorded line can play now (nothing else is heard). */
  canHear: boolean;
  onHear: (lineId: string) => void;
}) {
  const { t } = useLocale();
  const rise = useKeyframes(motion.call.hint, { trigger: view.key });
  const two = view.cards.length > 1;
  const kickerOf = (said: boolean) =>
    said ? 'call.card.said' : two ? 'call.card.choose' : 'call.card.read';
  return (
    <Animated.View style={[{ flexDirection: 'row', gap: 8 }, view.passed ? null : rise]}>
      {view.cards.map((card, i) => (
        <SayCard
          key={`${view.key}:${i}`}
          kicker={t(kickerOf(card.said))}
          phrase={card.phrase}
          gloss={card.gloss}
          two={two}
          passed={card.said}
          hearLabel={t('call.card.hear')}
          onHear={
            card.hear && view.modelLineId !== null
              ? () => {
                  if (view.modelLineId !== null) onHear(view.modelLineId);
                }
              : null
          }
          canHear={canHear}
          last={i === view.cards.findLastIndex((c) => c.said)}
        />
      ))}
    </Animated.View>
  );
}

function SayCard({
  kicker,
  phrase,
  gloss,
  two,
  passed,
  hearLabel,
  onHear,
  canHear,
  last,
}: {
  kicker: string;
  phrase: string;
  gloss: string | null;
  two: boolean;
  passed: boolean;
  hearLabel: string;
  onHear: (() => void) | null;
  canHear: boolean;
  last: boolean;
}) {
  const fillIn = useKeyframes(softFill, { active: passed });
  const pop = useKeyframes(motion.call.stickerSecond, { active: passed, hiddenOutside: true });
  return (
    <View style={{ flex: 1 }}>
      <Sticker
        shadow={stickerShadows.sheet}
        radius={radii.bubble}
        outline={outline.bold}
        fill={colours.surface}
        contentStyle={{
          paddingTop: 10,
          paddingRight: 10,
          paddingBottom: 12,
          paddingLeft: 14,
          gap: 3,
        }}
      >
        {passed ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                inset: 0,
                borderRadius: radii.bubble - outline.bold,
                backgroundColor: colours.successSoft,
              },
              fillIn,
            ]}
          />
        ) : null}
        <View
          accessible
          accessibilityLabel={`${kicker}: ${phrase}${gloss ? `. ${gloss}` : ''}`}
          style={{ gap: 3 }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              minHeight: HEAR,
            }}
          >
            <CallTxt variant={cardType.kicker} colour={colours.textMuted}>
              {kicker.toUpperCase()}
            </CallTxt>
          </View>
          <CallTxt variant={two ? cardType.two : cardType.one}>{phrase}</CallTxt>
          {gloss ? (
            <CallTxt variant={cardType.gloss} colour={colours.textGloss}>
              {gloss}
            </CallTxt>
          ) : null}
        </View>
        {onHear ? (
          <Press
            onPress={onHear}
            disabled={!canHear}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel={hearLabel}
            hitSlop={(44 - HEAR) / 2}
            style={{
              position: 'absolute',
              top: 10 - outline.bold,
              right: 10 - outline.bold,
              width: HEAR,
              height: HEAR,
              borderRadius: HEAR / 2,
              borderWidth: outline.thin,
              borderColor: colours.outline,
              backgroundColor: colours.surface,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SpeakerGlyph />
          </Press>
        ) : null}
      </Sticker>
      {passed && last ? (
        <Animated.View
          accessible
          accessibilityLabel={kicker}
          style={[
            {
              position: 'absolute',
              top: -12,
              right: -8,
              width: 32,
              height: 32,
              borderRadius: 16,
              borderWidth: outline.regular,
              borderColor: colours.outline,
              backgroundColor: colours.success,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pop,
          ]}
        >
          <CallTxt variant={cardType.tick} importantForAccessibility="no">
            ✓
          </CallTxt>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** "CÁCH CHƠI": what to do in this kind of turn, in the learner's language, until "OK". */
export function TaskCard({
  text,
  trigger,
  onOk,
}: {
  text: string;
  trigger: string;
  onOk: () => void;
}) {
  const { t } = useLocale();
  const rise = useKeyframes(motion.call.hint, { trigger });
  return (
    <Animated.View style={rise} accessibilityLiveRegion="polite">
      <Sticker
        shadow={stickerShadows.onInk}
        radius={radii.bubbleSmall}
        outline={0}
        fill={palette.ink}
        contentStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingVertical: 10,
          paddingLeft: 12,
          paddingRight: 10,
        }}
      >
        <View
          accessible
          accessibilityLabel={`${t('call.task.tag')}: ${text}`}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
        >
          <View
            style={{
              paddingVertical: 3,
              paddingHorizontal: 7,
              borderRadius: radii.tag,
              backgroundColor: colours.highlight,
            }}
          >
            <CallTxt variant={cardType.tag}>{t('call.task.tag')}</CallTxt>
          </View>
          <CallTxt variant={cardType.task} colour={colours.textOnInk} style={{ flex: 1 }}>
            {text}
          </CallTxt>
        </View>
        <Press
          onPress={onOk}
          haptic="selection"
          accessibilityRole="button"
          accessibilityLabel={t('call.task.a11yOk')}
          hitSlop={4}
          style={{
            height: 36,
            paddingHorizontal: 14,
            borderRadius: 18,
            backgroundColor: colours.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CallTxt variant={cardType.pill}>{t('call.task.ok')}</CallTxt>
        </Press>
      </Sticker>
    </Animated.View>
  );
}

function Pill({
  label,
  a11y,
  icon,
  on = false,
  enabled,
  onPress,
}: {
  label: string;
  a11y: string;
  icon: React.ReactNode;
  on?: boolean;
  enabled: boolean;
  onPress: () => void;
}) {
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <CallTxt variant={cardType.pill} colour={on ? colours.textOnInk : colours.text}>
        {label}
      </CallTxt>
    </View>
  );
  const shape = {
    height: PILL_H,
    borderRadius: PILL_H / 2,
    paddingLeft: 11,
    paddingRight: 14,
    justifyContent: 'center',
  } as const;
  return (
    <Press
      onPress={onPress}
      disabled={!enabled}
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled: !enabled, ...(on ? { selected: true } : {}) }}
      hitSlop={(44 - PILL_H) / 2}
    >
      {on ? (
        <View
          style={[
            shape,
            {
              backgroundColor: palette.ink,
              borderWidth: 1,
              borderColor: palette.ink,
              boxShadow: shadowCss(softShadows.floating),
            },
          ]}
        >
          {body}
        </View>
      ) : (
        <GlassView glass={pillGlass} radius={PILL_H / 2} style={shape}>
          {body}
        </GlassView>
      )}
    </Press>
  );
}

/** "Gợi ý", "Nói lại", "Chậm thôi" and, after a try at a card, "Bỏ qua", centred over the bar. */
export function ReplayRow({
  replay,
  hint,
  skip,
  onReplay,
  onHint,
  onSkip,
  style,
}: {
  replay: { readonly enabled: boolean; readonly slowerOn: boolean } | null;
  hint: boolean;
  skip: boolean;
  onReplay: (slower: boolean) => void;
  onHint: () => void;
  onSkip: () => void;
  style?: ViewStyleProp;
}) {
  const { t } = useLocale();
  const skipIn = useKeyframes(motion.call.gloss, { active: skip });
  if (!replay && !hint && !skip) return null;
  return (
    <View
      style={[{ flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }, style]}
    >
      {hint ? (
        <Pill
          label={t('call.hintPill')}
          a11y={t('call.a11y.hintPill')}
          icon={null}
          enabled
          onPress={onHint}
        />
      ) : null}
      {replay ? (
        <>
          <Pill
            label={t('call.replay.again')}
            a11y={t('call.replay.a11yAgain')}
            icon={<AgainGlyph />}
            enabled={replay.enabled}
            onPress={() => onReplay(false)}
          />
          <Pill
            // "· đang bật" only while the row has room: the dark pill says it's on either way.
            label={t(
              replay.slowerOn && !skip && !hint ? 'call.replay.slowerOn' : 'call.replay.slower',
            )}
            a11y={t('call.replay.a11ySlower')}
            icon={
              <Dial
                size={16}
                speed="slow"
                colour={replay.slowerOn ? colours.textOnInk : colours.outline}
              />
            }
            on={replay.slowerOn}
            enabled={replay.enabled}
            onPress={() => onReplay(true)}
          />
        </>
      ) : null}
      {skip ? (
        <Animated.View style={skipIn}>
          <Press
            onPress={onSkip}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel={t('call.a11y.skip')}
            hitSlop={(44 - PILL_H) / 2}
            style={{
              height: PILL_H,
              paddingHorizontal: 14,
              borderRadius: PILL_H / 2,
              borderWidth: 1.5,
              borderStyle: 'dashed',
              borderColor: 'rgba(23,19,28,0.3)',
              backgroundColor: 'rgba(255,255,255,0.35)',
              justifyContent: 'center',
            }}
          >
            <CallTxt variant={cardType.skip} colour={colours.textBody}>
              {t('call.skip')}
            </CallTxt>
          </Press>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** "Mọi người sẽ nói chậm hơn": an ink pill dropping in under the speaker pill, then away. */
export function PaceToast({ text, style }: { text: string; style?: ViewStyleProp }) {
  const drop = useKeyframes(motion.screens.toast, { hiddenOutside: true });
  return (
    <View pointerEvents="none" style={[{ alignItems: 'center' }, style]}>
      <Animated.View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={text}
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
          drop,
        ]}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colours.secondarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Dial size={16} speed="slow" />
        </View>
        <CallTxt variant={cardType.pill} colour={colours.textOnInk}>
          {text}
        </CallTxt>
      </Animated.View>
    </View>
  );
}
