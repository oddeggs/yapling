import { BurrowObject } from '@yapling/art/native';
import type { Stage } from '@yapling/contracts';
import {
  colours,
  layout,
  motion,
  outline,
  palette,
  radii,
  stickerShadows,
  translucent,
  type,
  type TypeStyle,
} from '@yapling/theme';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSheet, Press, Sticker, StickerButton, Txt, typeExtras, useKeyframes } from '../../ui';
import { Face } from '../burrow/art';
import { artCharacter, DotGrid } from './art';
import { DoneTitle } from './after-call-screen';
import { OpenBox } from './pieces';
import { TooHardSheet, type TooHardChoice } from './too-hard-sheet';
import type { VisitorAfterCall } from './visitor-model';

/*
 * The Visitor's after-call card: "Xong rồi!", the learner's own sentences popping in as stickers,
 * the chapter's seed packet, "Cuộc gọi này thế nào?" with "Vừa sức / Khó quá" and the guide's
 * reply, and the box unpacked. No score, no fixes.
 */

/** How the learner said the call felt; "Khó quá" ends in one of the sheet's two choices. */
export type Feel = 'just_right' | TooHardChoice;

/** Where the design puts things on its 390 × 844 page. */
const PLACE = {
  heading: 96,
  /** The guide's sticker beside the title. */
  host: 84,
  /** "Bạn đã nói được" starts at 196, the seed packet at 398 and the question at 530. */
  saidTop: 196,
  seedTop: 398,
  feelTop: 530,
  /** "Xong rồi!" at 54 × 1.15. */
  titleLine: 62,
  /** The heading block: the kicker, a 2-point gap and the title's line. */
  headingHeight: 16 + 2 + 62,
  barRoom: 170,
} as const;

/** The design's page height and its status bar. */
const DESIGN_HEIGHT = 844;
const DESIGN_STATUS_BAR = 54;

const cardType = {
  sticker: { ...type.sticker, size: 24 },
  seedPhrase: { ...type.button, lineHeight: 1.25 },
  seedGloss: { ...type.handNote, lineHeight: 1.22 },
  question: { ...type.noteStrong, weight: 800 },
  reply: { ...type.gloss, lineHeight: 1.22 },
} as const satisfies Record<string, TypeStyle>;

/** The stickers take turns: lilac, sky and mint, tilted one way then the other. */
const STICKER_FILLS = [colours.accent, colours.secondarySoft, colours.successSoft] as const;
const STICKER_TILTS = [-5, 4, -2] as const;
/** The design pops them in a quarter second apart, from 0.2 s. */
const STICKER_DELAY_MS = 200;
const STICKER_STEP_MS = 250;

function SaidSticker({ text, index }: { text: string; index: number }) {
  const pop = useKeyframes({
    ...motion.call.sticker,
    delayMs: STICKER_DELAY_MS + index * STICKER_STEP_MS,
  });
  return (
    <Animated.View style={pop}>
      <Sticker
        shadow={stickerShadows.badge}
        radius={radii.tile}
        outline={outline.bold}
        fill={STICKER_FILLS[index % STICKER_FILLS.length] ?? colours.accent}
        style={{ transform: [{ rotate: `${STICKER_TILTS[index % STICKER_TILTS.length]}deg` }] }}
        contentStyle={{ paddingVertical: 8, paddingHorizontal: 14 }}
      >
        <Txt variant={cardType.sticker}>{text}</Txt>
      </Sticker>
    </Animated.View>
  );
}

function HostSticker({ model, top }: { model: VisitorAfterCall; top: number }) {
  const pop = useKeyframes({ ...motion.screens.roundPop, delayMs: 300 });
  const host = artCharacter(model.host);
  if (!host) return null;
  return (
    <Animated.View
      style={[styles.host, { top }, pop]}
      importantForAccessibility="no-hide-descendants"
    >
      <Sticker
        shadow={stickerShadows.badge}
        radius={radii.panel}
        outline={outline.bold}
        fill={colours.secondarySoft}
        style={{ transform: [{ rotate: '6deg' }] }}
        contentStyle={{
          width: 78,
          height: 78,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Drawn at the sticker's full 84 and clipped inside its edge, as the design crops it. */}
        <Face character={host} size={84} background={colours.secondarySoft} />
      </Sticker>
    </Animated.View>
  );
}

function SeedCard({ seed }: { seed: NonNullable<VisitorAfterCall['seed']> }) {
  const easeIn = useKeyframes({ ...motion.screens.listIn, delayMs: 900 });
  return (
    <Animated.View
      style={easeIn}
      accessible
      accessibilityLabel={[seed.tag, seed.phrase, seed.gloss, seed.sub].filter(Boolean).join('. ')}
    >
      <Sticker
        shadow={stickerShadows.button}
        radius={radii.bubbleSmall}
        outline={outline.regular}
        fill={colours.surface}
        contentStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 12,
          paddingLeft: 10,
          paddingRight: 14,
        }}
      >
        <BurrowObject id="seed" size={54} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="label" colour={colours.textMuted}>
            {seed.tag}
          </Txt>
          <Txt variant={cardType.seedPhrase}>{seed.phrase}</Txt>
          {seed.gloss ? (
            <Txt variant={cardType.seedGloss} colour={colours.textGloss}>
              {seed.gloss}
            </Txt>
          ) : null}
          <Txt variant="note" colour={colours.textMuted} style={{ marginTop: 2 }}>
            {seed.sub}
          </Txt>
        </View>
      </Sticker>
    </Animated.View>
  );
}

function FeelButton({
  label,
  chosen,
  fill,
  onPress,
}: {
  label: string;
  chosen: boolean;
  fill: string;
  onPress: () => void;
}) {
  const body = <Txt variant="buttonPair">{label}</Txt>;
  return (
    <Press
      onPress={onPress}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: chosen }}
      accessibilityLabel={label}
      style={{ flex: 1 }}
    >
      {chosen ? (
        <Sticker
          shadow={stickerShadows.button}
          radius={25}
          outline={outline.bold}
          fill={fill}
          contentStyle={styles.feelFace}
        >
          {body}
        </Sticker>
      ) : (
        <View style={[styles.feelFace, styles.feelIdle]}>{body}</View>
      )}
    </Press>
  );
}

function Reply({ text }: { text: string }) {
  const easeIn = useKeyframes({ ...motion.call.gloss });
  return (
    <Animated.View style={[styles.reply, easeIn]} accessible accessibilityLiveRegion="polite">
      <View style={styles.replyFace}>
        <Face character="linh" size={24} background={colours.successSoft} />
      </View>
      <Txt variant={cardType.reply} style={{ flex: 1 }}>
        {text}
      </Txt>
    </Animated.View>
  );
}

export interface VisitorAfterCallScreenProps {
  readonly model: VisitorAfterCall;
  readonly stage: Stage;
  /** What the learner said about the call; null until they tap. */
  readonly feel: Feel | null;
  readonly onFeel: (feel: Feel) => void;
  readonly onContinue: () => void;
}

export function VisitorAfterCallScreen({
  model,
  stage,
  feel,
  onFeel,
  onContinue,
}: VisitorAfterCallScreenProps) {
  const { width, height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const [sheet, setSheet] = useState(false);
  // The design's 844-point page; a shorter phone (SE) closes the gaps between the blocks and
  // starts under its shorter status bar, so the question stays above the bar.
  const k = Math.min(1, Math.max(0.75, height / DESIGN_HEIGHT));
  const headingTop = PLACE.heading - Math.max(0, DESIGN_STATUS_BAR - top);
  const reply =
    feel === 'just_right'
      ? model.feel.replies.justRight
      : feel === 'slower'
        ? model.feel.replies.slower
        : feel === 'practise'
          ? model.feel.replies.practise
          : null;
  return (
    <View style={styles.screen}>
      <DotGrid width={width} height={height} />
      <ScrollView
        contentContainerStyle={{ paddingTop: headingTop, paddingBottom: PLACE.barRoom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Txt variant="noteStrong" colour={colours.textMuted}>
            {model.kicker}
          </Txt>
          {/* "Xong rồi!" sits centred in the design's 1.15 line. */}
          <View style={{ height: PLACE.titleLine, justifyContent: 'center' }}>
            <DoneTitle text={model.title} />
          </View>
        </View>
        <View
          style={[
            styles.side,
            {
              marginTop: (PLACE.saidTop - PLACE.heading - PLACE.headingHeight) * k,
              minHeight: (PLACE.seedTop - PLACE.saidTop) * k,
              gap: 12,
            },
          ]}
        >
          {model.said ? (
            <>
              <Txt variant={cardType.question}>{model.said.title}</Txt>
              <View
                style={styles.stickers}
                accessible
                accessibilityLabel={model.said.a11y}
                accessibilityRole="text"
              >
                {model.said.lines.map((line, i) => (
                  <SaidSticker key={line} text={line} index={i} />
                ))}
              </View>
            </>
          ) : null}
        </View>
        <View
          style={[
            styles.side,
            // On a shorter phone the seed card keeps a gap above the question.
            { minHeight: (PLACE.feelTop - PLACE.seedTop) * k, paddingBottom: k < 1 ? 16 : 0 },
          ]}
        >
          {model.seed ? <SeedCard seed={model.seed} /> : null}
        </View>
        <View style={[styles.side, { gap: 8 }]}>
          <Txt variant={cardType.question} style={{ paddingLeft: 4 }} accessibilityRole="header">
            {model.feel.title}
          </Txt>
          <View style={{ flexDirection: 'row', gap: 8 }} accessibilityRole="radiogroup">
            <FeelButton
              label={model.feel.justRight}
              chosen={feel === 'just_right'}
              fill={colours.success}
              onPress={() => onFeel('just_right')}
            />
            <FeelButton
              label={model.feel.tooHard}
              chosen={feel === 'slower' || feel === 'practise'}
              fill={colours.accent}
              onPress={() => setSheet(true)}
            />
          </View>
          {reply ? <Reply key={reply} text={reply} /> : null}
        </View>
      </ScrollView>
      <HostSticker model={model} top={headingTop - PLACE.heading + PLACE.host} />
      <GlassSheet kind="bar" entrance={motion.screens.postSheet}>
        {model.box ? (
          <View style={styles.barRow}>
            <OpenBox />
            <Txt variant={typeExtras.boxNote} style={{ flex: 1 }}>
              {model.box}
            </Txt>
          </View>
        ) : null}
        <StickerButton
          label={model.cta}
          onPress={onContinue}
          haptic={model.keepsakes ? 'tap' : 'success'}
        />
      </GlassSheet>
      {sheet ? (
        <TooHardSheet
          stage={stage}
          onClose={() => setSheet(false)}
          onChoose={(choice) => {
            setSheet(false);
            onFeel(choice);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.peach, overflow: 'hidden' },
  heading: { marginHorizontal: layout.marginTitle, gap: 2 },
  host: { position: 'absolute', right: layout.marginTitle },
  side: { marginHorizontal: layout.marginCard },
  stickers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 14,
    columnGap: 12,
    paddingTop: 4,
    paddingHorizontal: 4,
  },
  feelFace: { height: 50, alignItems: 'center', justifyContent: 'center' },
  feelIdle: {
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: translucent.inkBorderSoft,
    backgroundColor: colours.surface,
  },
  reply: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  replyFace: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: outline.thin,
    borderColor: colours.outline,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 6 },
});
