import type { PipSpecies } from '@yapling/art';
import {
  colours,
  motion,
  outline,
  radii,
  stickerShadows,
  translucent,
  type,
  type TypeStyle,
} from '@yapling/theme';
import { CAST } from '@yapling/story';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  AiTag,
  DashedRule,
  GlassSheet,
  Press,
  sentences,
  Sticker,
  StickerButton,
  Txt,
  typeExtras,
  useKeyframes,
  useLocale,
} from '../../ui';
import { BurrowBackdrop, useStage } from '../burrow';
import { Face } from '../burrow/art';
import type { ResidencyCardView, StageUpView } from './stage-up-model';

/*
 * The end of a Visitor's week: Linh comes to the door with the Newcomer residency card. "Nhận thẻ"
 * stamps it and it goes up on the wall; "Ở lại thêm" keeps the Visitor's card, and Linh says see
 * you tomorrow. Either is fine.
 */

/** Where the design places things on its 390 × 844 burrow. */
const PLACE = {
  bubble: 100,
  card: { top: 262, left: 142, width: 232 },
  linh: { top: 406, left: 4, size: 170 },
  pip: { top: 478, left: 262, size: 110 },
} as const;

const upType = {
  line: { ...type.bubble, size: 19, lineHeight: 1.3 },
  gloss: { ...type.gloss, lineHeight: 1.3 },
  cardTop: { ...type.label, size: 10, tracking: 0.04 },
  cardName: { ...type.noteStrong, size: 12.5, lineHeight: 1.2 },
  cardStage: { ...type.cardName, lineHeight: 1.1 },
  cardLocal: { ...type.noteStrong, size: 12.5, lineHeight: 1.25 },
  stampStage: { ...type.aiTag, weight: 900, lineHeight: 1.15 },
  stampLine: { ...type.aiTag, size: 8.5, weight: 900, lineHeight: 1.15 },
  note: { ...typeExtras.boxNote, lineHeight: 1.4 },
} as const satisfies Record<string, TypeStyle>;

/** A speech bubble's corners with the tail at the bottom left, and its flat ink lip. */
const SHAPE = {
  borderTopLeftRadius: radii.bubble,
  borderTopRightRadius: radii.bubble,
  borderBottomRightRadius: radii.bubble,
  borderBottomLeftRadius: radii.aiTag,
  borderCurve: 'continuous',
} as const;
const LIP = stickerShadows.button.y;

/** Linh's line in a bubble with its tail at the bottom left, the meaning under a dashed rule. */
function LinhBubble({ line, gloss }: { line: string; gloss: string | null }) {
  const { t } = useLocale();
  const easeIn = useKeyframes({ ...motion.screens.listIn, delayMs: 300 });
  const name = CAST.linh.name;
  return (
    <Animated.View
      style={easeIn}
      accessible
      accessibilityLabel={sentences(`${name}, ${t('common.aiTag')}: ${line}`, gloss)}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          SHAPE,
          { top: LIP, bottom: -LIP, backgroundColor: colours.outline },
        ]}
      />
      <View
        style={[
          SHAPE,
          {
            paddingVertical: 11,
            paddingHorizontal: 15,
            gap: 3,
            backgroundColor: colours.surface,
            borderWidth: outline.regular,
            borderColor: colours.outline,
          },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt variant="bubbleName">{name}</Txt>
          <AiTag label={t('common.aiTag')} small />
        </View>
        <Txt variant={upType.line}>{line}</Txt>
        {gloss ? (
          <View style={{ paddingTop: 4 }}>
            <DashedRule />
            <Txt variant={upType.gloss} colour={colours.textGloss}>
              {gloss}
            </Txt>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** The round "NEWCOMER / NW / SEP 28" stamp, pressed on as the card is taken. */
function Stamp({ stamp }: { stamp: NonNullable<ResidencyCardView['stamp']> }) {
  const press = useKeyframes({ ...motion.screens.roundPop, delayMs: 600 });
  const [first, second] = motion.call.sparkles;
  const a = useKeyframes(first ?? motion.call.sticker, { hiddenOutside: true });
  const b = useKeyframes(second ?? motion.call.sticker, { hiddenOutside: true });
  return (
    <>
      <Animated.View style={[styles.stampAt, press]}>
        <View style={styles.stamp}>
          {/* As the design's stamp, the stage runs to the ring's edge on one line. */}
          <Txt variant={upType.stampStage} align="center" numberOfLines={1} style={{ width: 80 }}>
            {stamp.stage}
          </Txt>
          <Txt variant={upType.stampLine} align="center">
            {`${stamp.town}\n${stamp.date}`}
          </Txt>
        </View>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.sparkleA, a]}>
        <Txt variant={{ ...type.sticker, size: 24, weight: 500 }} colour={colours.accent}>
          ✦
        </Txt>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.sparkleB, b]}>
        <Txt variant={{ ...type.sticker, size: 16, weight: 500 }} colour={colours.secondary}>
          ✦
        </Txt>
      </Animated.View>
    </>
  );
}

/** The residency card in Linh's hand: Newcomer (lilac, "Chặng 1/5") or Visitor (sky, no count). */
function ResidencyCard({
  card,
  learnerName,
  species,
}: {
  card: ResidencyCardView;
  learnerName: string;
  species: PipSpecies;
}) {
  const hand = useKeyframes(motion.screens.residencyCard);
  return (
    <Animated.View style={hand} accessible accessibilityLabel={card.a11y}>
      <View style={{ transform: [{ rotate: '-6deg' }] }}>
        <Sticker
          shadow={stickerShadows.tiltedCard}
          radius={radii.bubble}
          outline={outline.heavy}
          fill={card.fill === 'accent' ? colours.accent : colours.secondarySoft}
          contentStyle={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, gap: 8 }}
        >
          <Txt variant={upType.cardTop} numberOfLines={1}>
            {card.top}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.cardFace}>
              <Face character="pip" species={species} size={44} background={colours.surface} />
            </View>
            <View style={{ flexShrink: 0 }}>
              <Txt variant={upType.cardName}>{learnerName}</Txt>
              <Txt variant={upType.cardStage} numberOfLines={1}>
                {card.stageName}
              </Txt>
              {card.stageLocal ? <Txt variant={upType.cardLocal}>{card.stageLocal}</Txt> : null}
            </View>
          </View>
          {card.chip ? (
            <View style={styles.chip}>
              <Txt variant={typeExtras.tagTiny} numberOfLines={1}>
                {card.chip}
              </Txt>
            </View>
          ) : null}
        </Sticker>
        {card.stamp ? <Stamp stamp={card.stamp} /> : null}
      </View>
    </Animated.View>
  );
}

export interface StageUpScreenProps {
  readonly view: StageUpView;
  readonly learnerName: string;
  readonly species: PipSpecies;
  readonly onTake: () => void;
  readonly onStay: () => void;
  readonly onDone: () => void;
}

export function StageUpScreen({
  view,
  learnerName,
  species,
  onTake,
  onStay,
  onDone,
}: StageUpScreenProps) {
  const { u, y } = useStage();
  const linhMood = view.phase === 'offer' ? 'wave' : view.phase === 'taken' ? 'happy' : 'warm';
  return (
    <BurrowBackdrop
      scene="burrow"
      timeOfDay={view.evening ? 'evening' : 'afternoon'}
      species={species}
      cast={[
        { character: 'linh', mood: linhMood, ...PLACE.linh },
        { character: 'pip', mood: view.phase === 'stay' ? 'happy' : 'excited', ...PLACE.pip },
      ]}
    >
      <View style={[styles.bubble, { top: y(PLACE.bubble) }]}>
        <LinhBubble key={view.phase} line={view.line} gloss={view.gloss} />
      </View>
      <View
        style={[
          styles.card,
          { top: y(PLACE.card.top), left: u(PLACE.card.left), width: PLACE.card.width },
        ]}
      >
        <ResidencyCard
          key={view.card.stageName}
          card={view.card}
          learnerName={learnerName}
          species={species}
        />
      </View>
      <GlassSheet kind="bar" entrance={motion.screens.infoSheet} style={{ padding: 16 }}>
        <Txt
          variant={upType.note}
          colour={colours.textBody}
          style={{ paddingHorizontal: 6 }}
          accessibilityLiveRegion="polite"
        >
          {view.note}
        </Txt>
        {view.choice ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Press
              onPress={onStay}
              accessibilityRole="button"
              accessibilityLabel={view.choice.stay}
              style={styles.stay}
            >
              <Txt variant="buttonGlass">{view.choice.stay}</Txt>
            </Press>
            <StickerButton
              label={view.choice.take}
              onPress={onTake}
              haptic="success"
              style={{ flex: 1.3 }}
            />
          </View>
        ) : null}
        {view.cta ? <StickerButton label={view.cta} onPress={onDone} haptic="success" /> : null}
      </GlassSheet>
    </BurrowBackdrop>
  );
}

const styles = StyleSheet.create({
  bubble: { position: 'absolute', left: 16, right: 16, zIndex: 4 },
  card: { position: 'absolute', zIndex: 3 },
  cardFace: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: outline.regular,
    borderColor: colours.outline,
    backgroundColor: colours.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: radii.tag,
    borderWidth: outline.thin,
    borderColor: colours.outline,
    backgroundColor: colours.surface,
  },
  stampAt: { position: 'absolute', right: -12, bottom: -24 },
  stamp: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: outline.bold,
    borderColor: colours.outline,
    backgroundColor: colours.surface,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-12deg' }],
  },
  sparkleA: { position: 'absolute', top: -16, left: '30%' },
  sparkleB: { position: 'absolute', top: -10, right: '20%' },
  stay: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: translucent.glassEdge,
    backgroundColor: translucent.frostStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
