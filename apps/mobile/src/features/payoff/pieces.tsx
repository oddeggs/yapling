import type { BurrowObjectId } from '@yapling/art';
import { BurrowObject } from '@yapling/art/native';
import {
  colours,
  motion,
  outline,
  palette,
  radii,
  stickerShadows,
  type,
  type Animation,
  type TypeStyle,
} from '@yapling/theme';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Sticker, Txt, useClock, useKeyframes, useReduceMotion } from '../../ui';
import type { BloomCard, ReceiptRow } from './model';

/*
 * The after-call screen's own pieces: the fix row, a phrase's object growing, the unpacked box,
 * the bloom card with its sparkles and the fluency receipt.
 */

/** Type the after-call screen sets that the theme's scale doesn't name, derived from its nearest. */
export const payoffType = {
  /** The fix row's words: 16, Bold (the better way ExtraBold). */
  fixFrom: { ...type.rowTitle },
  fixTo: { ...type.rowTitle, weight: 800 },
  /** The bloom card's phrase: 20, ExtraBold. */
  bloomPhrase: { ...type.cardTitle, size: 20, tracking: -0.03 },
  /** The bloom card's line: 12.5, SemiBold. */
  bloomSub: { ...type.rowSub },
  /** The quiet line when a call had nothing to report. */
  quiet: { ...type.cardTitle, size: 20 },
} as const satisfies Record<string, TypeStyle>;

/** A phrase's object turning into the next one: a seed packet giving way to a sprout. */
export function GrowingObject({
  from,
  to,
  index,
  size = 40,
}: {
  from: BurrowObjectId | null;
  to: BurrowObjectId;
  index: number;
  size?: number;
}) {
  const grows = from !== null;
  const sprout = motion.screens.sprout;
  // The prototype lets the seed packets sit for a beat (1.4 s) before they sprout, one by one.
  const timing: Animation = {
    ...sprout,
    delayMs: SPROUT_AFTER_MS + sprout.delayMs + index * (sprout.staggerMs ?? 0),
  };
  const pop = useKeyframes(timing, { active: grows });
  const reduce = useReduceMotion();
  const clock = useClock(timing, { active: grows && !reduce });
  const before = useAnimatedStyle(() => ({
    opacity: grows && !reduce && clock.get() < timing.delayMs ? 1 : 0,
  }));
  const height = (size * 4) / 3;
  return (
    <View style={{ width: size, height }}>
      {from !== null ? (
        <Animated.View style={[{ position: 'absolute', inset: 0 }, before]}>
          <BurrowObject id={from} size={size} />
        </Animated.View>
      ) : null}
      <Animated.View style={[{ transformOrigin: '50% 100%' }, grows ? pop : null]}>
        <BurrowObject id={to} size={size} />
      </Animated.View>
    </View>
  );
}

const SPROUT_AFTER_MS = 1400;

/** "1 LỖI ĐÃ SỬA  I calling → I'm calling": struck through in lilac, the better way on mint. */
export function FixRow({
  title,
  from,
  to,
  a11y,
}: {
  title: string;
  from: string;
  to: string;
  a11y: string;
}) {
  const easeIn = useKeyframes(motion.screens.postFix);
  return (
    <Animated.View style={easeIn} accessible accessibilityLabel={a11y}>
      <Sticker
        shadow={stickerShadows.button}
        radius={radii.row}
        outline={outline.regular}
        fill={colours.surface}
        contentStyle={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'center',
          columnGap: 10,
          rowGap: 4,
          paddingVertical: 12,
          paddingHorizontal: 14,
        }}
      >
        <Txt variant="label">{title}</Txt>
        <View>
          <Txt variant={payoffType.fixFrom}>{from}</Txt>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '52%',
              height: 3,
              backgroundColor: colours.accent,
            }}
          />
        </View>
        {/* Lexend has no arrow; the design's browser draws it from the system font, heavy. */}
        <Txt variant={payoffType.fixTo} style={{ fontFamily: 'System', fontWeight: '800' }}>
          →
        </Txt>
        <View style={{ backgroundColor: colours.success, borderRadius: 6, paddingHorizontal: 6 }}>
          <Txt variant={payoffType.fixTo}>{to}</Txt>
        </View>
      </Sticker>
    </Animated.View>
  );
}

/** The unpacked box beside "Một thùng trong hang đã được dỡ", as the prototype draws it. */
export function OpenBox() {
  return (
    <View
      style={{
        width: 46,
        height: 38,
        borderRadius: 4,
        backgroundColor: palette.cardboard,
        borderWidth: outline.regular,
        borderColor: colours.outline,
      }}
    >
      <View
        style={{
          position: 'absolute',
          top: -10,
          left: -4,
          width: 24,
          height: 10,
          borderRadius: 2,
          backgroundColor: palette.cardboardShade,
          borderWidth: outline.regular,
          borderColor: colours.outline,
          transformOrigin: '100% 100%',
          transform: [{ rotate: '-24deg' }],
        }}
      />
    </View>
  );
}

/** Two sparkles bursting over a corner, as around "You fixed it". */
function Sparkles() {
  const [first, second] = motion.call.sparkles;
  const a = useKeyframes(first ?? motion.call.sticker, { hiddenOutside: true });
  const b = useKeyframes(second ?? motion.call.sticker, { hiddenOutside: true });
  const glyph = { ...type.sticker, weight: 500 as const };
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', top: -14, right: 20 }, a]}
      >
        <Txt variant={glyph} colour={colours.accent}>
          ✦
        </Txt>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -8, right: 56 }, b]}>
        <Txt variant={{ ...glyph, size: 15 }} colour={colours.secondary}>
          ✦
        </Txt>
      </Animated.View>
    </>
  );
}

/** A phrase in bloom: the bloom, "BLOOM · YOUR OWN", the phrase, and sparkles. */
export function BloomCardView({ card }: { card: BloomCard }) {
  const pop = useKeyframes(motion.call.sticker);
  return (
    <Animated.View
      style={pop}
      accessible
      accessibilityLabel={`${card.label}. ${card.phrase}. ${card.sub}`}
    >
      <Sticker
        shadow={stickerShadows.sheet}
        radius={radii.bubble}
        outline={outline.bold}
        fill={colours.surface}
        contentStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 10,
          paddingLeft: 10,
          paddingRight: 14,
        }}
      >
        <BurrowObject id="plant-2" size={64} />
        <View style={{ flex: 1, gap: 3 }}>
          <Txt variant="label" colour={colours.textMuted}>
            {card.label}
          </Txt>
          <Txt variant={payoffType.bloomPhrase}>{card.phrase}</Txt>
          <Txt variant={payoffType.bloomSub} colour={colours.textMuted}>
            {card.sub}
          </Txt>
        </View>
      </Sticker>
      <Sparkles />
    </Animated.View>
  );
}

/** The receipt's printer face ('Courier New', as the design prints it), 13.5 Bold. */
const RECEIPT_FONT = {
  fontFamily: 'Courier New',
  fontSize: 13.5,
  fontWeight: '700',
  lineHeight: 23,
} as const;

/** The fluency receipt: Flow, how far it has come, Pace and Pauses, on a tilted slip. */
export function Receipt({ rows }: { rows: readonly ReceiptRow[] }) {
  const easeIn = useKeyframes(motion.screens.listIn);
  return (
    <Animated.View
      accessible
      accessibilityLabel={rows.map((r) => `${r.label} ${r.value}`).join(', ')}
      style={easeIn}
    >
      <View
        style={{
          marginHorizontal: 24,
          paddingHorizontal: 18,
          paddingVertical: 12,
          backgroundColor: colours.surface,
          borderWidth: outline.regular,
          borderColor: colours.outline,
          transform: [{ rotate: '-2deg' }],
        }}
      >
        {rows.map((row) => (
          <View
            key={row.label}
            style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}
          >
            <Text style={[RECEIPT_FONT, { color: colours.text, paddingLeft: row.trend ? 16 : 0 }]}>
              {row.label}
            </Text>
            <Text
              style={[
                RECEIPT_FONT,
                { color: colours.text },
                row.trend
                  ? {
                      backgroundColor: colours.success,
                      borderRadius: radii.aiTag,
                      paddingHorizontal: 4,
                    }
                  : null,
              ]}
            >
              {row.value}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
