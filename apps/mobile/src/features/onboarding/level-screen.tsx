import type { BurrowObjectId, Mood } from '@yapling/art';
import { BurrowObject, Critter } from '@yapling/art/native';
import type { StartPath } from '@yapling/contracts';
import {
  colours,
  controls,
  corners,
  motion,
  outline,
  palette,
  pill,
  stickerShadows,
  translucent,
  type,
} from '@yapling/theme';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { AiTag, GlassSheet, Press, Sticker, StickerButton, Txt, useKeyframes } from '../../ui';
import { BlurredScene, useScale, useTopShift } from './art';
import { SheetScroll } from './sheets';

/*
 * "Tiếng Anh của bạn bây giờ thế nào?": the day-one burrow blurred behind, Linh peeking in from
 * the right with her line (English, its Vietnamese under it), and a glass sheet with two big
 * choices, a note on what the picked one means, and "Continue". Nothing is tested here.
 */

/** Where the sheet starts; on a short screen what doesn't fit scrolls above "Continue". */
const SHEET_TOP = 318;
const CHOICE_ART = 56;

/** The progress dots: this is step 3 of the 5 before the burrow. */
export const LEVEL_STEP = 3;
export const LEVEL_STEPS = 5;

export interface LevelChoice {
  readonly path: StartPath;
  readonly title: string;
  readonly sub: string;
}

export interface LevelScreenProps {
  readonly picked: StartPath | null;
  readonly choices: readonly LevelChoice[];
  readonly kicker: string;
  readonly title: string;
  readonly sub: string;
  /** What the picked choice means, under the choices; empty before a pick. */
  readonly note: string;
  readonly cta: string;
  /** "Step 3 of 5". */
  readonly stepLabel: string;
  /** Linh's line in English, and its meaning in the learner's language (or null). */
  readonly linh: {
    readonly name: string;
    readonly aiTag: string;
    readonly en: string;
    readonly gloss: string | null;
  };
  readonly onPick: (path: StartPath) => void;
  readonly onContinue: () => void;
}

const LINH_MOOD: Readonly<Record<'none' | StartPath, Mood>> = {
  none: 'wave',
  visitor: 'warm',
  placement: 'excited',
};

const CHOICE_ART_ID: Readonly<Record<StartPath, BurrowObjectId>> = {
  visitor: 'seed',
  placement: 'plant-1',
};

export function LevelScreen({
  picked,
  choices,
  kicker,
  title,
  sub,
  note,
  cta,
  stepLabel,
  linh,
  onPick,
  onContinue,
}: LevelScreenProps) {
  const { u } = useScale();
  const shift = useTopShift();
  const peek = useKeyframes(motion.screens.infoHero);
  // The bubble eases in after Linh, and again each time her line changes.
  const bubbleIn = useKeyframes(
    { ...motion.screens.listIn, delayMs: picked === null ? 500 : 0 },
    { trigger: picked },
  );
  return (
    <View style={{ flex: 1, backgroundColor: colours.background }}>
      <BlurredScene fn="s_burrowDay1" blur={10} wash={translucent.paperWash} />
      <Dots label={stepLabel} top={66 + shift} />
      <Animated.View
        style={[{ position: 'absolute', top: 126 + shift, left: u(262) }, peek]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Critter character="linh" mood={LINH_MOOD[picked ?? 'none']} size={150} />
      </Animated.View>
      <Animated.View
        style={[
          { position: 'absolute', top: 98 + shift, left: 18, width: 232, zIndex: 3 },
          bubbleIn,
        ]}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${linh.name}, ${linh.aiTag}: ${linh.en}${linh.gloss ? `. ${linh.gloss}` : ''}`}
      >
        <LinhBubble {...linh} />
      </Animated.View>
      <GlassSheet
        kind="info"
        top={SHEET_TOP + shift}
        entrance={motion.screens.infoSheet}
        style={{ paddingHorizontal: 16, gap: 0 }}
      >
        <SheetScroll gap={10}>
          <Txt variant="kicker" colour={colours.textMuted} style={{ paddingHorizontal: 4 }}>
            {kicker}
          </Txt>
          <Txt
            variant={{ ...type.sheetTitle, lineHeight: 1.18 }}
            accessibilityRole="header"
            style={{ paddingHorizontal: 4 }}
          >
            {title}
          </Txt>
          <Txt
            variant={{ ...type.body, size: 14, lineHeight: 1.35 }}
            colour={colours.textBody}
            style={{ paddingHorizontal: 4 }}
          >
            {sub}
          </Txt>
          <View accessibilityRole="radiogroup" style={{ gap: 10, marginTop: 4 }}>
            {choices.map((c) => (
              <Choice
                key={c.path}
                choice={c}
                picked={c.path === picked}
                onPress={() => onPick(c.path)}
              />
            ))}
          </View>
          <Txt
            variant={{ ...type.noteStrong, lineHeight: 1.35 }}
            colour={colours.textMuted}
            accessibilityLiveRegion="polite"
            style={{ minHeight: 36, paddingTop: 2, paddingHorizontal: 6 }}
          >
            {note}
          </Txt>
        </SheetScroll>
        <View style={{ paddingTop: 10 }}>
          {picked === null ? (
            <WaitingButton label={cta} />
          ) : (
            <StickerButton label={cta} onPress={onContinue} />
          )}
        </View>
      </GlassSheet>
    </View>
  );
}

/** Five dots under the status bar, the current one long and lilac. */
function Dots({ label, top }: { label: string; top: number }) {
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{
        position: 'absolute',
        top,
        left: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
      }}
    >
      {Array.from({ length: LEVEL_STEPS }, (_, i) => {
        const step = i + 1;
        if (step === LEVEL_STEP)
          return (
            <View
              key={step}
              style={{
                width: 34,
                height: 9,
                borderRadius: 5,
                backgroundColor: colours.accent,
                borderWidth: outline.thin,
                borderColor: colours.outline,
              }}
            />
          );
        return (
          <View
            key={step}
            style={{
              width: 22,
              height: 7,
              borderRadius: 4,
              backgroundColor: step < LEVEL_STEP ? colours.outline : colours.lineArt,
            }}
          />
        );
      })}
    </View>
  );
}

/** Linh's bubble: her name and the AI tag, the English line, and its meaning in the hand font. */
function LinhBubble({
  name,
  aiTag,
  en,
  gloss,
}: {
  name: string;
  aiTag: string;
  en: string;
  gloss: string | null;
}) {
  const [tl, tr, br, bl] = corners.pip;
  const shape = {
    borderTopLeftRadius: tl,
    borderTopRightRadius: tr,
    borderBottomRightRadius: br,
    borderBottomLeftRadius: bl,
  };
  return (
    <View>
      <View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: stickerShadows.button.y,
            bottom: -stickerShadows.button.y,
            left: 0,
            right: 0,
            backgroundColor: stickerShadows.button.colour,
          },
          shape,
        ]}
      />
      <View
        style={[
          {
            gap: 3,
            paddingVertical: 11,
            paddingHorizontal: 14,
            backgroundColor: colours.surface,
            borderWidth: outline.regular,
            borderColor: colours.outline,
          },
          shape,
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Txt variant="bubbleName">{name}</Txt>
          <AiTag label={aiTag} />
        </View>
        <Txt variant={{ ...type.bubble, size: 16.5, lineHeight: 1.32 }}>{en}</Txt>
        {gloss ? (
          <View
            style={{
              borderTopWidth: outline.thin,
              borderStyle: 'dashed',
              borderColor: translucent.glossRule,
              paddingTop: 4,
            }}
          >
            <Txt variant={{ ...type.gloss, size: 17, lineHeight: 1.25 }} colour={colours.textGloss}>
              {gloss}
            </Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** One of the two big choices: its art, title and examples, and a round tick. */
function Choice({
  choice,
  picked,
  onPress,
}: {
  choice: LevelChoice;
  picked: boolean;
  onPress: () => void;
}) {
  const face = (
    <>
      <View style={{ width: CHOICE_ART, height: (CHOICE_ART * 4) / 3 }}>
        <BurrowObject id={CHOICE_ART_ID[choice.path]} size={CHOICE_ART} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt variant={{ ...type.cardTitle, size: 20, tracking: -0.03 }}>{choice.title}</Txt>
        <Txt variant={{ ...type.body, size: 13.5, lineHeight: 1.35 }} colour={colours.textBody}>
          {choice.sub}
        </Txt>
      </View>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          borderWidth: outline.regular,
          borderColor: colours.outline,
          backgroundColor: picked ? palette.ink : colours.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {picked ? (
          <Txt variant={{ ...type.buttonSmall, weight: 900 }} colour={colours.textOnInk}>
            ✓
          </Txt>
        ) : null}
      </View>
    </>
  );
  const content = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    minHeight: 96,
    paddingVertical: 12,
    paddingLeft: 10,
    paddingRight: 14,
  };
  return (
    <Press
      onPress={onPress}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected: picked, checked: picked }}
      accessibilityLabel={`${choice.title}. ${choice.sub}`}
    >
      {picked ? (
        <Sticker
          shadow={stickerShadows.button}
          radius={24}
          outline={outline.bold}
          fill={colours.accent}
          contentStyle={content}
        >
          {face}
        </Sticker>
      ) : (
        <View
          style={[
            content,
            {
              borderRadius: 24,
              borderWidth: 1.5,
              borderColor: translucent.inkBorder,
              backgroundColor: translucent.frostStrong,
            },
          ]}
        >
          {face}
        </View>
      )}
    </Press>
  );
}

/** "Continue" before anything is picked: a quiet pill, not yet a button. */
function WaitingButton({ label }: { label: string }) {
  const height = controls.button.height;
  return (
    <View
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      accessibilityLabel={label}
      style={{
        height,
        borderRadius: pill(height),
        borderWidth: controls.button.outline,
        borderColor: palette.line,
        backgroundColor: palette.mist,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Txt variant="button" colour={colours.textDisabled}>
        {label}
      </Txt>
    </View>
  );
}
