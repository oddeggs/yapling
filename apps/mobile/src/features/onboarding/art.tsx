import { Blur, Canvas, Group, Paint, Picture } from '@shopify/react-native-skia';
import { useArtRenderer } from '@yapling/art/native';
import { layout } from '@yapling/theme';
import { useMemo, type ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/*
 * The onboarding's backdrops, drawn by `@yapling/art`'s generators and recorded once into the
 * picture cache: a scene softly blurred behind an info sheet (the prototype draws it 438 × 892 at
 * −24, under a CSS blur), and the prototype's 390-point positions scaled to this screen.
 */

/** Scales the prototype's 390-point lengths to this screen's width. */
export function useScale(): { width: number; height: number; k: number; u: (n: number) => number } {
  const { width, height } = useWindowDimensions();
  const k = width / layout.screen.width;
  return { width, height, k, u: (n: number) => n * k };
}

/** The design's status bar: its screens place things this far under the top of the phone. */
const DESIGN_STATUS_BAR = 54;

/**
 * How far to move the design's top-pinned positions on this phone: up by what a shorter status
 * bar saves (the iPhone SE's 20 points), never down, so a short screen keeps its room.
 */
export function useTopShift(): number {
  const { top } = useSafeAreaInsets();
  return Math.min(0, top - DESIGN_STATUS_BAR);
}

/** The generator calls the backdrops use, as the prototype makes them. */
export type BackdropScene = 's_burrow2' | 's_burrowDay1';

export interface BlurredSceneProps {
  readonly fn: BackdropScene;
  /** The CSS blur radius (Skia's sigma is the same number). */
  readonly blur: number;
  /** Over the blur: the prototype's paper wash. */
  readonly wash: string;
  readonly children?: ReactNode;
}

const BLEED = 24;

/** A scene blurred behind a sheet, washed towards paper. */
export function BlurredScene({ fn, blur, wash, children }: BlurredSceneProps) {
  const { width, height, k, u } = useScale();
  const renderer = useArtRenderer();
  const art = useMemo(() => renderer.art({ fn, w: 438, h: 892, o: { t: 0 } }), [renderer, fn]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={{ width, height }}>
        <Group layer={<Paint>{<Blur blur={blur * k} mode="clamp" />}</Paint>}>
          <Group transform={[{ translateX: -u(BLEED) }, { translateY: -u(BLEED) }, { scale: k }]}>
            <Picture picture={art.picture} />
          </Group>
        </Group>
      </Canvas>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: wash }]} />
      {children}
    </View>
  );
}
