import type { BurrowObjectId } from '@yapling/art';
import {
  colours,
  glass,
  layout,
  motion,
  outline,
  pill,
  stickerShadows,
  type,
} from '@yapling/theme';
import type { Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import {
  GlassSheet,
  GlassView,
  KeepsakeFrame,
  Press,
  SpeechBubble,
  StickerButton,
  Sticker,
  Tag,
  Txt,
  WeekRing,
  useKeyframes,
  useLocale,
} from '../../ui';
import { Face, WordObject } from './art';
import { BurrowBackdrop, useStage } from './backdrop';
import { render } from './copy';
import type { BurrowHomeModel, DeltaCard, HungKeepsake, ShelfItem } from './model';

export interface BurrowHomeScreenProps {
  readonly model: BurrowHomeModel;
  /** The roommate's face at the top: the Me sheet. */
  readonly onOpenMe?: () => void;
  /** The ring chip: the week view. */
  readonly onOpenWeek?: () => void;
  /** The card's button, and the primary button: where they lead. */
  readonly onNavigate?: (to: Href) => void;
}

/** Where the prototype puts the room's things, in its 390-point units. */
const PLACE = {
  me: { size: 52, face: 46 },
  card: { top: 120 },
  shelves: { top: 323, labels: 412, left: { x: 22, slot: 56 }, right: { x: 216, slot: 52 } },
  mailbox: { left: 236, top: 515, size: 56 },
  pip: { left: 105, top: 560, size: 180 },
  keepsake: { left: 150, top: 200, width: 104 },
  ring: { top: 604 },
} as const;

const titleType = { ...type.slotTitle, size: 16 };

/**
 * The burrow home: the room at the hour of day, the learner's phrases grown on its shelves, the
 * keepsakes on the wall, Pip idling on the rug, and today: one new thing at the top and one thing
 * to do at the bottom.
 */
export function BurrowHomeScreen({
  model,
  onOpenMe,
  onOpenWeek,
  onNavigate,
}: BurrowHomeScreenProps) {
  const { t } = useLocale();
  const { u, y, height } = useStage();
  const pip = model.roommate;
  return (
    <BurrowBackdrop
      scene={model.scene}
      timeOfDay={model.timeOfDay}
      species={pip.species}
      cast={[{ character: 'pip', mood: model.pipMood, ...PLACE.pip }]}
      room={
        <>
          <Shelf items={model.shelves.left} {...PLACE.shelves.left} />
          <Shelf items={model.shelves.right} {...PLACE.shelves.right} />
          {model.mailbox ? (
            <WordObject
              id={model.mailbox === 'letter' ? 'mail-1' : 'mail-0'}
              size={u(PLACE.mailbox.size)}
              style={{
                position: 'absolute',
                left: u(PLACE.mailbox.left),
                top: y(PLACE.mailbox.top),
              }}
            />
          ) : null}
          {model.keepsake ? <WallKeepsake keepsake={model.keepsake} /> : null}
        </>
      }
    >
      {model.line ? (
        <SpeechBubble
          name={model.line.name}
          aiTag={t('common.aiTag')}
          tone={model.line.speaker === 'pip' ? 'pip' : 'neighbour'}
          text={model.line.text}
          {...(model.line.gloss
            ? { gloss: model.line.gloss, glossHint: t('call.tapForMeaning') }
            : {})}
          style={{
            position: 'absolute',
            left: 120,
            right: layout.marginScreen,
            bottom: height - y(570),
          }}
        />
      ) : null}

      <Press
        onPress={onOpenMe}
        haptic="tap"
        accessibilityRole="button"
        accessibilityLabel={t('burrow.a11y.me', { name: pip.name })}
        style={{ position: 'absolute', top: layout.topBar, left: layout.marginScreen, zIndex: 3 }}
      >
        <Sticker
          shadow={stickerShadows.chip}
          radius={PLACE.me.size / 2}
          outline={outline.bold}
          fill={colours.surface}
          contentStyle={styles.me}
        >
          <Face
            character="pip"
            species={pip.species}
            size={PLACE.me.face}
            background={colours.surface}
          />
        </Sticker>
      </Press>

      <Delta card={model.delta} species={pip.species} onNavigate={onNavigate} />

      {model.ring ? (
        <Press
          onPress={onOpenWeek}
          haptic="tap"
          accessibilityRole="button"
          accessibilityLabel={`${t('week.title')}: ${t('burrow.ring', model.ring)}`}
          style={{ position: 'absolute', left: layout.marginScreen, top: y(PLACE.ring.top) }}
        >
          <GlassView glass={glass.panel} radius={pill(46)} style={styles.ring}>
            <WeekRing filled={model.ring.done} size={30} />
            <Txt variant="buttonSmall">{t('burrow.ring', model.ring)}</Txt>
          </GlassView>
        </Press>
      ) : null}

      {model.action ? (
        <GlassSheet kind="bar">
          <StickerButton
            label={render(t, model.action.label)}
            onPress={() => model.action && onNavigate?.(model.action.target)}
          />
        </GlassSheet>
      ) : null}
    </BurrowBackdrop>
  );
}

/** One shelf: up to three objects standing on it, centred, each with its phrase underneath. */
function Shelf({ items, x, slot }: { items: readonly ShelfItem[]; x: number; slot: number }) {
  const { t } = useLocale();
  const { u, y } = useStage();
  const start = x + ((3 - items.length) * slot) / 2;
  return (
    <>
      {items.map((item, i) => {
        const left = start + i * slot;
        const label = render(t, item.label);
        return (
          <View
            key={item.id}
            accessible
            accessibilityLabel={
              item.stage
                ? t('burrow.a11y.object', { phrase: label, stage: render(t, item.stage) })
                : label
            }
            style={{
              position: 'absolute',
              left: u(left),
              top: y(PLACE.shelves.top),
              width: u(slot),
            }}
          >
            <ShelfArt id={item.art} size={u(slot)} />
            <Txt
              variant={{ ...type.aiTag, size: u(10), lineHeight: 1.1 }}
              align="center"
              numberOfLines={3}
              style={{
                position: 'absolute',
                top: u(PLACE.shelves.labels - PLACE.shelves.top),
                left: 0,
                right: 0,
              }}
            >
              {label}
            </Txt>
          </View>
        );
      })}
    </>
  );
}

/** A word object popping onto its shelf the first time it is drawn there. */
function ShelfArt({ id, size }: { id: BurrowObjectId; size: number }) {
  const pop = useKeyframes(motion.critter.wordObject);
  return (
    <Animated.View style={[{ alignSelf: 'center', transformOrigin: '50% 100%' }, pop]}>
      <WordObject id={id} size={size} />
    </Animated.View>
  );
}

/** The newest keepsake, hung on the wall over the map: the drawn frame, small. */
function WallKeepsake({ keepsake }: { keepsake: HungKeepsake }) {
  const { t } = useLocale();
  const { u, y } = useStage();
  const full = 278;
  const scale = u(PLACE.keepsake.width) / full;
  return (
    <View
      accessible
      accessibilityLabel={t('burrow.a11y.keepsake', { canDo: keepsake.canDo })}
      style={{
        position: 'absolute',
        left: u(PLACE.keepsake.left),
        top: y(PLACE.keepsake.top),
        width: full,
        transformOrigin: '0% 0%',
        transform: [{ scale }, { rotate: '-3deg' }],
      }}
    >
      <KeepsakeFrame
        heading={keepsake.heading}
        canDo={keepsake.canDo}
        witnessed={keepsake.witnessed}
        {...(keepsake.witness
          ? {
              witnessFace: (
                <Face character={keepsake.witness} size={44} background={colours.secondarySoft} />
              ),
            }
          : {})}
      />
    </View>
  );
}

/** The card at the top: what is new since the last open, with a way into it. */
function Delta({
  card,
  species,
  onNavigate,
}: {
  card: DeltaCard;
  species: BurrowHomeModel['roommate']['species'];
  onNavigate: ((to: Href) => void) | undefined;
}) {
  const { t } = useLocale();
  const enter = useKeyframes(motion.screens.listIn);
  const title = render(t, card.title);
  if (card.style === 'day-tag') {
    return (
      <Animated.View style={[styles.cardPlace, enter]}>
        <GlassView glass={glass.panel} radius={24} style={[styles.card, styles.dayCard]}>
          <Tag
            label={render(t, card.kicker)}
            fill={colours.successSoft}
            size="medium"
            edge={outline.regular}
          />
          <Txt variant={{ ...type.cardTitle, size: 17 }} style={{ flex: 1 }}>
            {title}
          </Txt>
        </GlassView>
      </Animated.View>
    );
  }
  const target = card.target;
  return (
    <Animated.View style={[styles.cardPlace, enter]}>
      <GlassView glass={glass.panel} radius={24} style={styles.card}>
        <Txt variant="label">{render(t, card.kicker)}</Txt>
        <View style={styles.cardRow}>
          {card.face ? (
            <View style={styles.cardFace}>
              <Face
                character={card.face.character}
                species={species}
                mood={card.face.mood}
                size={44}
              />
            </View>
          ) : null}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt variant={titleType} numberOfLines={2}>
              {title}
            </Txt>
            {card.sub ? (
              <Txt variant="rowSub" colour={colours.textMuted} numberOfLines={2}>
                {render(t, card.sub)}
              </Txt>
            ) : null}
          </View>
          {target ? (
            <Press
              onPress={() => onNavigate?.(target)}
              haptic="tap"
              accessibilityRole="button"
              accessibilityLabel={`${t('burrow.delta.a11y.open')}: ${title}`}
            >
              <Sticker
                shadow={stickerShadows.chip}
                radius={20}
                outline={outline.regular}
                fill={colours.accent}
                contentStyle={styles.cardButton}
              >
                <Txt variant={{ ...type.buttonGlass, size: 15 }}>›</Txt>
              </Sticker>
            </Press>
          ) : null}
        </View>
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  me: {
    width: PLACE.me.size,
    height: PLACE.me.size,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardPlace: { position: 'absolute', top: PLACE.card.top, left: 12, right: 12, zIndex: 3 },
  card: { paddingVertical: 10, paddingHorizontal: 12, gap: 6 },
  dayCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardFace: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: outline.regular,
    borderColor: colours.outline,
  },
  cardButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  ring: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 8,
    paddingRight: 16,
  },
});
