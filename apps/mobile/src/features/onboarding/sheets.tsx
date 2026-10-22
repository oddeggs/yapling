import {
  colours,
  controls,
  glass,
  motion,
  palette,
  pill,
  translucent,
  withAlpha,
  type Glass,
} from '@yapling/theme';
import { Canvas, LinearGradient, Rect, vec } from '@shopify/react-native-skia';
import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { GlassView, Press, Txt, useKeyframes } from '../../ui';
import type { ViewStyleProp } from '../../ui/style';

/*
 * The sheets the residency card opens over itself: a dim scrim, then a paper-glass sheet rising
 * from the bottom with a grab handle ("Go straight to the story?", "Too hard"). A tap on the scrim
 * closes it, as does VoiceOver's escape gesture.
 */

/** The sheet's glass: paper at 94 %, blurred 30, as the beginner-path boards draw it. */
const sheetGlass: Glass = {
  ...glass.panel,
  fill: withAlpha(palette.paper, 0.94),
  blur: 30,
  border: { width: 1, colour: 'rgba(255,255,255,0.95)' },
};

/** The scrim's ink: 32 % over a sheet that asks, 30 % over one that offers. */
export type ScrimDepth = 0.3 | 0.32;

/** A sheet rising: the info sheet's curve, played sooner and a little quicker. */
const RISE = { ...motion.screens.infoSheet, durationMs: 450, delayMs: 0 };
/** The scrim fading in under it. */
const DIM = motion.screenTransitions.fade.enter;

export interface ModalSheetProps {
  readonly onClose: () => void;
  /** VoiceOver's label for the scrim (closing the sheet). */
  readonly closeLabel: string;
  readonly scrim?: ScrimDepth;
  /** Pins the sheet's top edge; otherwise it hugs its content. */
  readonly top?: number;
  readonly children: ReactNode;
}

export function ModalSheet({ onClose, closeLabel, scrim = 0.32, top, children }: ModalSheetProps) {
  const dim = useKeyframes(DIM);
  const rise = useKeyframes(RISE);
  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 8 }]}
      accessibilityViewIsModal
      onAccessibilityEscape={onClose}
    >
      <Animated.View style={[StyleSheet.absoluteFill, dim]}>
        <Press
          onPress={onClose}
          haptic={null}
          accessibilityLabel={closeLabel}
          style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(palette.ink, scrim) }]}
        />
      </Animated.View>
      <GlassView
        glass={sheetGlass}
        radius={42}
        style={[
          {
            position: 'absolute',
            left: 8,
            right: 8,
            bottom: 8,
            ...(top === undefined ? {} : { top }),
            paddingTop: 12,
            paddingHorizontal: 18,
            paddingBottom: 16,
            gap: 10,
          },
          rise,
        ]}
      >
        <View
          style={{
            alignSelf: 'center',
            width: 40,
            height: 5,
            borderRadius: 3,
            backgroundColor: palette.line,
          }}
        />
        {children}
      </GlassView>
    </View>
  );
}

/** The quiet white way out under a sheet's primary button. */
export function QuietButton({
  label,
  onPress,
  style,
}: {
  label: string;
  onPress: () => void;
  style?: ViewStyleProp;
}) {
  const height = controls.buttonGlass.height;
  return (
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={style}>
      <View
        style={{
          height,
          borderRadius: pill(height),
          borderWidth: 1.5,
          borderColor: translucent.inkBorder,
          backgroundColor: colours.surface,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 6,
        }}
      >
        <Txt variant="buttonGlass" align="center" numberOfLines={2}>
          {label}
        </Txt>
      </View>
    </Press>
  );
}

/** How tall the fade over the last of a sheet's rows is, while there are more below. */
const MORE_FADE = 36;

/**
 * What a sheet holds above its buttons. On a short screen (the iPhone SE) it scrolls: its scroll
 * bar shows once, and while there is more below, the last rows fade into the sheet so the learner
 * sees there is more to scroll to.
 */
export function SheetScroll({
  gap,
  fill = true,
  children,
}: {
  gap: number;
  /** Takes the sheet's room above its buttons; false: only what the rows need, shrinking to fit. */
  fill?: boolean;
  children: ReactNode;
}) {
  const ref = useAnimatedRef<Animated.ScrollView>();
  const flashed = useRef(false);
  const viewport = useSharedValue(0);
  const content = useSharedValue(0);
  const offset = useSharedValue(0);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const flash = () => {
    if (flashed.current || viewport.value === 0 || content.value <= viewport.value) return;
    flashed.current = true;
    ref.current?.flashScrollIndicators();
  };
  const onScroll = useAnimatedScrollHandler((e) => {
    offset.value = e.contentOffset.y;
  });
  const fade = useAnimatedStyle(() => {
    const left = content.value - viewport.value - offset.value;
    return { opacity: interpolate(left, [0, MORE_FADE], [0, 1], 'clamp') };
  });
  return (
    <View style={fill ? { flex: 1 } : { flexShrink: 1 }}>
      <Animated.ScrollView
        ref={ref}
        style={fill ? { flex: 1 } : { flexGrow: 0, flexShrink: 1 }}
        contentContainerStyle={{ gap }}
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onLayout={(e) => {
          viewport.value = e.nativeEvent.layout.height;
          setSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height });
          flash();
        }}
        onContentSizeChange={(_, h) => {
          content.value = h;
          flash();
        }}
      >
        {children}
      </Animated.ScrollView>
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: MORE_FADE }, fade]}
      >
        {size.width > 0 ? (
          <Canvas style={{ width: size.width, height: MORE_FADE }}>
            <Rect x={0} y={0} width={size.width} height={MORE_FADE}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, MORE_FADE)}
                colors={[withAlpha(palette.paper, 0), withAlpha(palette.paper, 0.92)]}
              />
            </Rect>
          </Canvas>
        ) : null}
      </Animated.View>
    </View>
  );
}
