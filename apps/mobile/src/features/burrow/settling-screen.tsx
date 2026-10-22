import { Canvas, Circle, Group, LinearGradient, Path, Rect, vec } from '@shopify/react-native-skia';
import { SETTLING_CHAPTER_COUNT } from '@yapling/contracts';
import type { SettlingChapter } from '@yapling/domain';
import {
  colours,
  controls,
  glass,
  motion,
  outline,
  palette,
  pill,
  radii,
  stickerCss,
  translucent,
  type,
  withAlpha,
  type Glass,
} from '@yapling/theme';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  GlassView,
  Press,
  SpeechBubble,
  StickerButton,
  Txt,
  useKeyframes,
  useLocale,
} from '../../ui';
import { Face, ShelfObject } from './art';
import { BurrowBackdrop, useStage } from './backdrop';
import { render } from './copy';
import {
  settlingTimeKey,
  type SegmentState,
  type SettlingBox,
  type SettlingCard,
  type SettlingHomeModel,
  type SettlingItem,
} from './settling-model';
import { DuskWindow, type DuskSpot } from './talk-screens';

/*
 * The burrow while settling in: the room still in boxes by the door, Pip on the rug, one thing on
 * a shelf for every chapter done, and the card at the bottom with Linh's sticker, the chapter and
 * the day's button. On the letter's day the room is at dusk and the café window shows the letter
 * going under Mei's door.
 */

export interface SettlingScreenProps {
  readonly model: SettlingHomeModel;
  /** The top pill (Pip's face): the Me sheet. */
  readonly onOpenMe?: () => void;
  /** The card's list button. */
  readonly onOpenList?: () => void;
  readonly onStartChapter?: (chapter: SettlingChapter) => void;
  /** "Tomorrow", after two chapters today. */
  readonly onRest?: () => void;
  /** "Good night" to the letter. */
  readonly onGoodnight?: () => void;
  /** The Settling-in list, when open: drawn over the room. */
  readonly list?: ReactNode;
}

/** Where the board puts the room's things, in the prototype's 390-point units. */
const PLACE = {
  pip: { left: 24, top: 464, size: 120 },
  lowShelf: { left: 18, top: 400, width: 190 },
  highShelf: { left: 262, top: 196, width: 112 },
  item: 44,
  box: { width: 76, height: 54 },
  bubble: { top: 440, left: 150, right: 16 },
  /** The bottom of the lowest box on the rug: kept above the card. */
  floor: 600,
} as const;

/** The café window over the room on the letter's evening. */
const LETTER_DUSK: DuskSpot = {
  top: 96,
  left: 44,
  width: 302,
  height: 226,
  cafe: { x: 1, y: 6 },
  letter: { left: 136, top: 162 },
  bars: { top: 108, left: 145 },
};

/** The card's frost, a little denser than a panel's so the text reads over the room. */
const CARD_GLASS: Glass = { ...glass.panel, fill: withAlpha(palette.white, 0.66) };

const BOX_LABEL = { ...type.handNote, size: 15, lineHeight: 1.15 };
const CARD_TITLE = { ...type.cardTitle, size: 24, lineHeight: 1.2 };
const CARD_SUB = { ...type.rowSub, size: 13, lineHeight: 1.3 };

const SEGMENT_FILL: Readonly<Record<SegmentState, string>> = {
  done: colours.success,
  next: colours.accent,
  todo: colours.surface,
};

export function SettlingScreen({
  model,
  onOpenMe,
  onOpenList,
  onStartChapter,
  onRest,
  onGoodnight,
  list,
}: SettlingScreenProps) {
  const { t } = useLocale();
  const { u, y } = useStage();
  const insets = useSafeAreaInsets();
  const top = Math.max(58, insets.top + 4);
  const pip = model.roommate;
  const when = t('burrow.settling.when', {
    day: model.when.day,
    time: t(settlingTimeKey(model.when.time)),
  });
  // On a short phone the card would cover the rug and the boxes: the room rises above it.
  const [cardTop, setCardTop] = useState<number | null>(null);
  const lift = cardTop === null ? 0 : Math.max(0, y(PLACE.floor) + 8 - cardTop);
  return (
    <View style={styles.screen}>
      <View style={[StyleSheet.absoluteFill, { transform: [{ translateY: -lift }] }]}>
        <BurrowBackdrop
          scene="burrow"
          timeOfDay={model.timeOfDay}
          species={pip.species}
          cast={[{ character: 'pip', mood: model.pipMood, ...PLACE.pip }]}
          room={
            <>
              {model.dusk ? <DuskTint /> : null}
              <ShelfBoard {...PLACE.lowShelf} />
              <ShelfBoard {...PLACE.highShelf} />
              {model.items.map((item) => (
                <Unpacked key={item.id} item={item} />
              ))}
              {model.boxes.map((box) => (
                <Box key={box.chapter} box={box} />
              ))}
            </>
          }
        >
          {model.dusk ? <DuskWindow spot={LETTER_DUSK} /> : null}
          {model.line ? (
            <SpeechBubble
              name={model.line.name}
              aiTag={t('common.aiTag')}
              tone="pip"
              text={model.line.text}
              {...(model.line.gloss
                ? { gloss: model.line.gloss, glossHint: t('call.tapForMeaning') }
                : {})}
              style={{
                position: 'absolute',
                top: y(PLACE.bubble.top),
                left: u(PLACE.bubble.left),
                right: u(PLACE.bubble.right),
              }}
            />
          ) : null}
        </BurrowBackdrop>
      </View>

      <Press
        onPress={onOpenMe}
        haptic="tap"
        accessibilityRole="button"
        accessibilityLabel={`${t('burrow.a11y.me', { name: pip.name })}. ${t('burrow.place')}, ${when}`}
        style={[styles.pillPlace, { top }]}
      >
        <GlassView glass={glass.panel} radius={pill(controls.topPill.height)} style={styles.pill}>
          <View style={styles.pillFace}>
            <Face
              character="pip"
              species={pip.species}
              size={controls.topPill.face}
              background={colours.accentSoft}
            />
          </View>
          <Txt variant="speaker" numberOfLines={1}>
            {t('burrow.place')}
          </Txt>
          <Txt variant="note" colour={colours.textMuted} numberOfLines={1}>
            {when}
          </Txt>
        </GlassView>
      </Press>

      <ChapterCard
        card={model.card}
        onOpenList={onOpenList}
        onStartChapter={onStartChapter}
        onRest={onRest}
        onGoodnight={onGoodnight}
        onTop={setCardTop}
      />
      {list}
    </View>
  );
}

/** The room washed towards dusk on the letter's evening. */
function DuskTint() {
  const { width, height } = useStage();
  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          positions={[0, 0.6, 1]}
          colors={[
            withAlpha(palette.dusk, 0.28),
            withAlpha(palette.lilac, 0.12),
            withAlpha(palette.dusk, 0.22),
          ]}
        />
      </Rect>
    </Canvas>
  );
}

/** A cardboard board laid on the room's shelf: where unpacked things stand. */
function ShelfBoard({ left, top, width }: { left: number; top: number; width: number }) {
  const { u, y } = useStage();
  return (
    <View
      pointerEvents="none"
      style={[styles.board, { left: u(left), top: y(top), width: u(width) }]}
    />
  );
}

/** Something out of a box, standing on its shelf; the newest pops on with sparkles. */
function Unpacked({ item }: { item: SettlingItem }) {
  const { u, y } = useStage();
  const size = u(PLACE.item);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: u(item.left), top: y(item.top), width: size }}
    >
      {item.fresh ? (
        <FreshObject item={item} size={size} />
      ) : (
        <StillObject item={item} size={size} />
      )}
    </View>
  );
}

function StillObject({ item, size }: { item: SettlingItem; size: number }) {
  return (
    <ShelfObject
      fam={item.art.fam}
      stage={item.art.stage}
      {...(item.art.extra ? { extra: item.art.extra } : {})}
      size={size}
    />
  );
}

const FRESH_POP = { ...motion.critter.wordObject, delayMs: 300 };

function FreshObject({ item, size }: { item: SettlingItem; size: number }) {
  const pop = useKeyframes(FRESH_POP);
  const [first, second] = motion.call.sparkles;
  const a = useKeyframes(first ?? motion.call.sticker, { hiddenOutside: true });
  const b = useKeyframes(second ?? motion.call.sticker, { hiddenOutside: true });
  const glyph = { ...type.sticker, weight: 500 as const };
  return (
    <>
      <Animated.View style={[{ transformOrigin: '50% 100%' }, pop]}>
        <StillObject item={item} size={size} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: -14, left: 28 }, a]}>
        <Txt variant={{ ...glyph, size: 20 }} colour={colours.accent}>
          ✦
        </Txt>
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', top: -4, left: -8 }, b]}>
        <Txt variant={{ ...glyph, size: 14 }} colour={colours.secondary}>
          ✦
        </Txt>
      </Animated.View>
    </>
  );
}

/** A box by the door, taped shut, the chapter's name on its side in Pip's hand. */
function Box({ box }: { box: SettlingBox }) {
  const { t } = useLocale();
  const { u, y } = useStage();
  return (
    <View
      accessible
      accessibilityLabel={t('burrow.settling.a11y.box', { title: box.label })}
      style={[
        styles.box,
        {
          left: u(box.left),
          top: y(box.top),
          width: u(PLACE.box.width),
          height: u(PLACE.box.height),
          transform: [{ rotate: `${box.rotate}deg` }],
        },
      ]}
    >
      <View style={[styles.tape, { left: u(29) }]} />
      <Txt variant={BOX_LABEL} align="center" numberOfLines={1} style={styles.boxLabelPlace}>
        {box.label}
      </Txt>
    </View>
  );
}

/** The list icon: three dots and three lines (the board's 24-unit drawing). */
const LIST_ICON = 'M9 6h11M9 12h11M9 18h11';

function ListIcon() {
  return (
    <Canvas style={{ width: 22, height: 22 }}>
      <Group transform={[{ scale: 22 / 24 }]}>
        <Path
          path={LIST_ICON}
          style="stroke"
          strokeWidth={2.5}
          strokeCap="round"
          color={colours.outline}
        />
        {[6, 12, 18].map((cy) => (
          <Circle key={cy} cx={4.5} cy={cy} r={1.6} color={colours.outline} />
        ))}
      </Group>
    </Canvas>
  );
}

/** The card at the bottom: Linh's sticker, the chapter, the six chapters, and the day's button. */
function ChapterCard({
  card,
  onOpenList,
  onStartChapter,
  onRest,
  onGoodnight,
  onTop,
}: {
  card: SettlingCard;
  /** Where the card's top edge sits on the screen, once laid out. */
  onTop: (top: number) => void;
  onOpenList: (() => void) | undefined;
  onStartChapter: ((chapter: SettlingChapter) => void) | undefined;
  onRest: (() => void) | undefined;
  onGoodnight: (() => void) | undefined;
}) {
  const { t } = useLocale();
  const rise = useKeyframes(motion.screens.infoSheet);
  const title = render(t, card.title);
  const actions = card.actions;
  return (
    <Animated.View style={[styles.cardPlace, rise]} onLayout={(e) => onTop(e.nativeEvent.layout.y)}>
      <GlassView glass={CARD_GLASS} radius={radii.sheetBar} style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.sticker}>
            <Face character="linh" size={62} background={colours.secondarySoft} />
          </View>
          <View
            accessible
            accessibilityRole="header"
            accessibilityLabel={`${render(t, card.kicker)}. ${title}. ${render(t, card.sub)}`}
            style={styles.cardText}
          >
            <Txt variant="label" colour={colours.textMuted}>
              {render(t, card.kicker)}
            </Txt>
            <Txt variant={CARD_TITLE} numberOfLines={1}>
              {title}
            </Txt>
            <Txt variant={CARD_SUB} colour={colours.textBody} numberOfLines={2}>
              {render(t, card.sub)}
            </Txt>
          </View>
          <Press
            onPress={onOpenList}
            haptic="tap"
            accessibilityRole="button"
            accessibilityLabel={t('burrow.settling.a11y.list')}
            style={styles.listButton}
          >
            <ListIcon />
          </Press>
        </View>
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={t('burrow.settling.a11y.progress', {
            done: card.done,
            total: SETTLING_CHAPTER_COUNT,
          })}
          style={styles.segments}
        >
          {card.segments.map((s, i) => (
            <View key={i} style={[styles.segment, { backgroundColor: SEGMENT_FILL[s] }]} />
          ))}
        </View>
        {actions.kind === 'chapter' ? (
          <StickerButton
            label={render(t, actions.label)}
            onPress={() => onStartChapter?.(actions.chapter)}
          />
        ) : null}
        {actions.kind === 'rest' ? (
          <View style={styles.pair}>
            <StickerButton
              label={t('burrow.settling.tomorrow')}
              onPress={() => onRest?.()}
              style={{ flex: 1.4 }}
            />
            <FrostButton
              label={t('burrow.settling.keepGoing')}
              onPress={() => onStartChapter?.(actions.chapter)}
              style={{ flex: 1 }}
            />
          </View>
        ) : null}
        {actions.kind === 'rested' ? (
          <FrostButton
            label={t('burrow.settling.keepGoing')}
            onPress={() => onStartChapter?.(actions.chapter)}
          />
        ) : null}
        {actions.kind === 'goodnight' ? (
          <StickerButton label={t('burrow.settling.goodnight')} onPress={() => onGoodnight?.()} />
        ) : null}
      </GlassView>
    </Animated.View>
  );
}

/** The quiet partner of a primary button: frost with a bright edge, no ink. */
export function FrostButton({
  label,
  onPress,
  height = controls.button.height,
  style,
}: {
  label: string;
  onPress: (() => void) | undefined;
  height?: number;
  style?: object;
}) {
  return (
    <Press
      onPress={onPress}
      haptic="tap"
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.frost, { height, borderRadius: pill(height) }, style]}
    >
      <Txt variant="buttonPair" align="center" numberOfLines={1}>
        {label}
      </Txt>
    </Press>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.accentSoft, overflow: 'hidden' },
  pillPlace: { position: 'absolute', left: 14, zIndex: 6 },
  pill: {
    height: controls.topPill.height,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 5,
    paddingRight: 14,
  },
  pillFace: {
    width: controls.topPill.face,
    height: controls.topPill.face,
    borderRadius: controls.topPill.face / 2,
    overflow: 'hidden',
    borderWidth: outline.thin,
    borderColor: colours.outline,
  },
  board: {
    position: 'absolute',
    height: 10,
    borderRadius: 3,
    backgroundColor: palette.cardboard,
    borderWidth: outline.regular,
    borderColor: colours.outline,
    boxShadow: stickerCss({ x: 0, y: 3, colour: colours.outline }),
  },
  box: {
    position: 'absolute',
    borderRadius: radii.paper,
    backgroundColor: palette.cardboard,
    borderWidth: outline.bold,
    borderColor: colours.outline,
    boxShadow: stickerCss({ x: 3, y: 4, colour: colours.outline }),
  },
  tape: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 20,
    backgroundColor: colours.surfacePaper,
    borderLeftWidth: outline.thin,
    borderRightWidth: outline.thin,
    borderColor: colours.outline,
  },
  boxLabelPlace: { position: 'absolute', left: 0, right: 0, bottom: 3 },
  cardPlace: { position: 'absolute', left: 10, right: 10, bottom: 10, zIndex: 6 },
  card: { padding: 16, gap: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sticker: {
    width: 62,
    height: 62,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: outline.bold,
    borderColor: colours.outline,
    boxShadow: stickerCss({ x: 2, y: 4, colour: colours.outline }),
    transform: [{ rotate: '-5deg' }],
  },
  cardText: { flex: 1, minWidth: 0, gap: 1 },
  listButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: translucent.frostStrong,
    borderWidth: glass.panel.border?.width ?? 1,
    borderColor: translucent.glassEdge,
  },
  segments: { flexDirection: 'row', gap: 5 },
  segment: {
    flex: 1,
    height: 9,
    borderRadius: 5,
    borderWidth: outline.thin,
    borderColor: colours.outline,
  },
  pair: { flexDirection: 'row', gap: 10 },
  frost: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    backgroundColor: translucent.frostStrong,
    borderWidth: 1,
    borderColor: translucent.glassEdge,
  },
});
