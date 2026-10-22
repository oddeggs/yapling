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
import { useRef, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Animated from 'react-native-reanimated';

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

/**
 * What a sheet holds above its buttons. On a short screen (the iPhone SE) it scrolls, and its
 * scroll bar shows once so the learner sees there is more.
 */
export function SheetScroll({ gap, children }: { gap: number; children: ReactNode }) {
  const ref = useRef<ScrollViewInstance>(null);
  const flashed = useRef(false);
  const viewport = useRef(0);
  const flash = (content: number) => {
    if (flashed.current || viewport.current === 0 || content <= viewport.current) return;
    flashed.current = true;
    ref.current?.flashScrollIndicators();
  };
  return (
    <ScrollView
      ref={ref}
      style={{ flex: 1 }}
      contentContainerStyle={{ gap }}
      bounces={false}
      onLayout={(e) => {
        viewport.current = e.nativeEvent.layout.height;
      }}
      onContentSizeChange={(_, h) => flash(h)}
    >
      {children}
    </ScrollView>
  );
}
