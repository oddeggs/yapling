import { Blur, Canvas, Group, Paint, Picture } from '@shopify/react-native-skia';
import type { BurrowObjectId, Character, Mood, PipSpecies, SceneName } from '@yapling/art';
import { useArtRenderer } from '@yapling/art/native';
import {
  colours,
  glass,
  layout,
  motion,
  outline,
  palette,
  radii,
  stickerShadows,
  translucent,
  type,
} from '@yapling/theme';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BackButton,
  GlassView,
  Press,
  SpeakerPill,
  Sticker,
  Txt,
  useKeyframes,
  useLocale,
} from '../../ui';
import { Face, WordObject } from '../burrow/art';
import { waveBars } from './story-model';

/*
 * The pieces the story and voicemail screens share: the blurred burrow behind them, the top bar,
 * the waveform, the postcard and voicemail cards, and the growing phrase's sticker.
 */

/** The prototype's frame is 390 points wide with a 54-point status bar; this places its points. */
export function useFrame() {
  const { width, height } = useWindowDimensions();
  const { top } = useSafeAreaInsets();
  const k = width / layout.screen.width;
  const drop = Math.max(0, top - 54);
  return { width, height, k, drop, u: (n: number) => n * k, y: (n: number) => drop + n * k };
}

/**
 * The burrow (or another place: a voicemail from the café), blurred and washed toward paper:
 * behind every listening screen.
 */
export function BlurredBurrow({
  children,
  scene = 'burrow',
}: {
  children?: ReactNode;
  scene?: SceneName;
}) {
  const { width, height } = useWindowDimensions();
  const renderer = useArtRenderer();
  const art = useMemo(() => renderer.scene(scene, {}), [renderer, scene]);
  // The prototype draws the room 24 points past each edge so the blur has no hard border.
  const k = art ? (width + 48) / art.width : 1;
  return (
    <View style={styles.screen}>
      {art ? (
        <Canvas style={StyleSheet.absoluteFill}>
          <Group
            transform={[{ translateX: -24 }, { translateY: -24 }, { scale: k }]}
            layer={
              <Paint>
                <Blur blur={12 / k} />
              </Paint>
            }
          >
            <Picture picture={art.picture} />
          </Group>
        </Canvas>
      ) : null}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: translucent.paperWashCall }]} />
      <View style={{ width, height }}>{children}</View>
    </View>
  );
}

/** The back button and the speaker's pill, at the top of a listening screen. */
export function ListenTop({
  name,
  place,
  face,
  onBack,
}: {
  name: string;
  place: string;
  face: ReactNode;
  onBack: () => void;
}) {
  const { t } = useLocale();
  const { y } = useFrame();
  return (
    <>
      <BackButton
        onPress={onBack}
        accessibilityLabel={t('common.a11y.back')}
        style={[styles.back, { top: y(layout.topBar) }]}
      />
      <SpeakerPill
        name={name}
        aiTag={t('common.aiTag')}
        place={place}
        face={face}
        style={[styles.pill, { top: y(layout.topBar) }]}
      />
    </>
  );
}

/** A face in a circle, as the pill and the player crop it. */
export function RoundFace({
  character,
  species,
  size,
  mood = 'happy',
  background = palette.lilacTint,
  border = outline.thin,
}: {
  character: Character;
  species: PipSpecies;
  size: number;
  mood?: Mood;
  background?: string;
  border?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        borderWidth: border,
        borderColor: colours.outline,
      }}
    >
      <Face
        character={character}
        species={species}
        mood={mood}
        size={size - border * 2}
        background={background}
      />
    </View>
  );
}

/**
 * The waveform: idle bars, and over them the played bars, revealed up to `played` (0–1) on the UI
 * thread.
 */
export function Waveform({
  bars,
  spread,
  height,
  played,
  label,
}: {
  bars: number;
  spread: number;
  height: number;
  played: SharedValue<number>;
  label: string;
}) {
  const heights = useMemo(() => waveBars(bars, spread), [bars, spread]);
  const [width, setWidth] = useState(0);
  const reveal = useAnimatedStyle(() => ({ width: width * played.get() }));
  const row = (colour: string) => (
    <View style={[styles.waveRow, { height, width: width || undefined }]}>
      {heights.map((h, i) => (
        <View key={i} style={[styles.bar, { height: h, backgroundColor: colour }]} />
      ))}
    </View>
  );
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ flex: 1, height, justifyContent: 'center' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {row(translucent.waveIdle)}
      <Animated.View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }, reveal]}>
        {row(colours.text)}
      </Animated.View>
    </View>
  );
}

/** A character's portrait in a dashed stamp frame, tilted, as postcards and voicemails wear it. */
export function Stamp({
  character,
  species,
  mood,
  background,
  width,
  height,
}: {
  character: Character;
  species: PipSpecies;
  mood: Mood;
  background: string;
  width: number;
  height: number;
}) {
  return (
    <View style={styles.stamp}>
      <View style={[styles.stampInner, { width, height }]}>
        <Face
          character={character}
          species={species}
          mood={mood}
          size={Math.max(width, height) + 4}
          background={background}
        />
      </View>
    </View>
  );
}

/** A postcard: the hand-written note on the left, the stamp and the postmark on the right. */
export function PostcardCard({
  from,
  fromName,
  text,
  gloss,
  postmark,
  species,
  style,
  glossReveal = 'on_tap',
  tilt = -3,
  onGloss,
}: {
  from: Character;
  fromName: string;
  text: string;
  gloss: string | null;
  postmark: string;
  species: PipSpecies;
  style?: object;
  /** `shown`: the gloss sits under the note from the start; otherwise a tap opens it. */
  glossReveal?: 'shown' | 'marked' | 'on_tap' | 'none';
  /** The card's tilt, in degrees. */
  tilt?: number;
  /** The gloss was opened by a tap. */
  onGloss?: () => void;
}) {
  const { t } = useLocale();
  const fly = useKeyframes(motion.call.postcard);
  const [tapped, setTapped] = useState(false);
  const glossShown = glossReveal === 'shown' || tapped;
  const tappable = gloss !== null && glossReveal !== 'shown' && glossReveal !== 'none';
  return (
    <Animated.View style={[style, fly]}>
      <Sticker
        shadow={stickerShadows.paper}
        radius={radii.aiTag}
        outline={outline.bold}
        fill={colours.surfacePaper}
        style={{ transform: [{ rotate: `${tilt}deg` }] }}
        contentStyle={styles.postcard}
      >
        <Press
          onPress={
            tappable
              ? () => {
                  if (!tapped) onGloss?.();
                  setTapped((g) => !g);
                }
              : undefined
          }
          haptic={tappable ? 'selection' : null}
          accessibilityLabel={
            glossShown && gloss
              ? `${t('story.a11y.postcard', { name: fromName, text })}. ${gloss}`
              : t('story.a11y.postcard', { name: fromName, text })
          }
          {...(tappable ? { accessibilityHint: t('call.tapForMeaning') } : {})}
          style={styles.postcardText}
        >
          <Txt variant="postcard">{text}</Txt>
          <Txt variant="postcard" colour={colours.textHand} style={{ marginTop: 6 }}>
            {fromName}
          </Txt>
          {glossShown && gloss ? (
            <Txt variant="glossStory" colour={colours.textGloss} style={{ marginTop: 6 }}>
              {gloss}
            </Txt>
          ) : null}
        </Press>
        <VerticalDash />
        <View style={{ width: 84, alignItems: 'center', gap: 6 }}>
          <Stamp
            character={from}
            species={species}
            mood="happy"
            background={palette.mintTint}
            width={66}
            height={74}
          />
          <View style={styles.postmark}>
            {/* The town's name runs past the ring, as a rubber stamp does. */}
            <Txt variant={POSTMARK} colour={colours.textGloss} align="center" style={{ width: 90 }}>
              {postmark}
            </Txt>
          </View>
        </View>
      </Sticker>
    </Animated.View>
  );
}

/** A 2-point dashed rule down the postcard: the right edge of a dashed box, the rest clipped. */
export function VerticalDash() {
  return (
    <View style={{ width: 2, marginLeft: -12, overflow: 'hidden' }}>
      <View
        style={[
          styles.dash,
          { borderWidth: 2, borderStyle: 'dashed', borderColor: colours.lineArt },
        ]}
      />
    </View>
  );
}

/** The postmark's 8.5-point ExtraBold capitals. */
const POSTMARK = { ...type.label, size: 8.5, tracking: 0, lineHeight: 1.15 };

/** Pip's voicemail: the stamp, "Voicemail from Pip" in the hand, and the waveform. */
export function VoicemailCard({
  title,
  species,
  played,
  label,
  style,
}: {
  title: string;
  species: PipSpecies;
  played: SharedValue<number>;
  label: string;
  style?: object;
}) {
  const fly = useKeyframes(motion.call.voicemail);
  return (
    <Animated.View style={[style, fly]}>
      <Sticker
        shadow={stickerShadows.paper}
        radius={radii.frame}
        outline={outline.bold}
        fill={colours.surfacePaper}
        style={{ transform: [{ rotate: '-2deg' }] }}
        contentStyle={{ padding: 14, gap: 10 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Stamp
            character="pip"
            species={species}
            mood="excited"
            background={palette.cyanTint}
            width={62}
            height={70}
          />
          <Txt variant="handTitle" style={{ flexShrink: 1 }}>
            {title}
          </Txt>
        </View>
        <Waveform bars={34} spread={20} height={30} played={played} label={label} />
      </Sticker>
    </Animated.View>
  );
}

/**
 * The phrase's sticker after the fix: its burrow object growing from `from` to `to` (a sprout
 * into a leaf), with what it became and the phrase.
 */
export function GrowSticker({
  from,
  to,
  stage,
  phrase,
  fill = colours.success,
}: {
  from: BurrowObjectId;
  to: BurrowObjectId;
  stage: string;
  phrase: string;
  fill?: string;
}) {
  const pop = useKeyframes(motion.call.sticker);
  const [grown, setGrown] = useState(from === to);
  const grow = useKeyframes(motion.screens.sprout, {
    active: grown && from !== to,
    trigger: grown,
  });
  return (
    <Animated.View style={pop} onLayout={() => setTimeout(() => setGrown(true), 700)}>
      <Sticker
        shadow={stickerShadows.badge}
        radius={radii.bubbleSmall}
        outline={outline.bold}
        fill={fill}
        style={{ transform: [{ rotate: '-3deg' }] }}
        contentStyle={styles.grow}
      >
        <Animated.View style={[{ transformOrigin: '50% 100%' }, grown ? grow : null]}>
          <WordObject id={grown ? to : from} size={56} />
        </Animated.View>
        <View accessible accessibilityLabel={`${stage}: ${phrase}`}>
          <Txt variant="label">{stage}</Txt>
          <Txt variant={GROW_PHRASE}>{phrase}</Txt>
        </View>
      </Sticker>
    </Animated.View>
  );
}

const GROW_PHRASE = { ...type.episodeTitle, tracking: 0 };

/** A glass card holding a few lines (the hint, an offline note). */
export function GlassNote({ children }: { children: ReactNode }) {
  return (
    <GlassView glass={glass.hint} radius={radii.bubbleSmall} style={styles.note}>
      {children}
    </GlassView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colours.accentSoft, overflow: 'hidden' },
  back: { position: 'absolute', left: layout.marginScreen },
  pill: { position: 'absolute', left: 62, right: layout.marginScreen },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bar: { width: 4, borderRadius: 2 },
  stamp: {
    padding: 4,
    backgroundColor: colours.surface,
    borderWidth: outline.regular,
    borderStyle: 'dashed',
    borderColor: colours.outline,
    transform: [{ rotate: '4deg' }],
  },
  stampInner: {
    overflow: 'hidden',
    borderWidth: outline.thin,
    borderColor: colours.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postcard: { flexDirection: 'row', gap: 12, padding: 16 },
  postcardText: { flex: 1, paddingRight: 10 },
  dash: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 8 },
  postmark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: outline.regular,
    borderColor: colours.textGloss,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-14deg' }],
  },
  grow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 16,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
});
