import {
  Canvas,
  ColorMatrix,
  Group,
  LinearGradient,
  Paint,
  Picture,
  Rect,
  vec,
} from '@shopify/react-native-skia';
import {
  speciesOf,
  type BurrowObjectId,
  type SceneName,
  type SceneOptions,
  type Character,
  type Mood,
  type PipSpecies,
} from '@yapling/art';
import { useArtRenderer } from '@yapling/art/native';
import { useMemo, type ComponentProps } from 'react';

type CanvasStyle = ComponentProps<typeof Canvas>['style'];

/*
 * Art the burrow places that `@yapling/art` has no component for yet: a face crop (`s_face`), a
 * word object with the prototype's options, and the café seen through the window at dusk. Each is
 * the generator's own drawing, recorded once into the shared picture cache.
 */

export interface FaceProps {
  readonly character: Character;
  /** Pip's species, the learner's pick. */
  readonly species?: PipSpecies;
  readonly mood?: Mood;
  /** The face's square, in points. */
  readonly size: number;
  /** Behind the face, as the prototype's `fc()` takes it. */
  readonly background?: string;
  readonly style?: CanvasStyle;
}

/** A cast member's face, as the prototype crops it for pills, rows and cards. */
export function Face({ character, species, mood = 'happy', size, background, style }: FaceProps) {
  const renderer = useArtRenderer();
  const sp = speciesOf(character, species);
  const art = useMemo(
    () =>
      renderer.art({
        fn: 's_face',
        w: size,
        h: size,
        o: { sp, mood, bg: background ?? '#F9DAFB' },
      }),
    [renderer, sp, mood, size, background],
  );
  return (
    <Canvas style={[{ width: size, height: size }, style]}>
      <Picture picture={art.picture} />
    </Canvas>
  );
}

/** A burrow word object, `size` wide and 4/3 as tall. */
export function WordObject({
  id,
  size,
  style,
}: {
  id: BurrowObjectId;
  size: number;
  style?: CanvasStyle;
}) {
  const renderer = useArtRenderer();
  const art = useMemo(() => renderer.object(id), [renderer, id]);
  const k = size / art.width;
  return (
    <Canvas style={[{ width: size, height: art.height * k }, style]}>
      <Group transform={[{ scale: k }]}>
        <Picture picture={art.picture} />
      </Group>
    </Canvas>
  );
}

/**
 * A burrow object drawn with the prototype's own options (a jar's fill, a plant's lid), `size`
 * wide and 4/3 as tall: what comes out of a box while settling in.
 */
export function ShelfObject({
  fam,
  stage,
  extra,
  size,
  style,
}: {
  fam: string;
  stage: number;
  extra?: object;
  size: number;
  style?: CanvasStyle;
}) {
  const renderer = useArtRenderer();
  const key = JSON.stringify(extra ?? {});
  const art = useMemo(
    () =>
      renderer.art({ fn: 's_obj', w: size, h: (size * 4) / 3, o: { t: 0, fam, stage, ...extra } }),
    // `key` holds the options' content.
    [renderer, fam, stage, key, size],
  );
  return (
    <Canvas style={[{ width: size, height: (size * 4) / 3 }, style]}>
      <Picture picture={art.picture} />
    </Canvas>
  );
}

/** A CSS filter as a 4 × 5 colour matrix, multiplied in the order CSS applies them. */
type Matrix = number[];

const multiply = (a: Matrix, b: Matrix): Matrix => {
  // Both are 4 × 5 (the fifth column is the offset); compose b after a.
  const out: number[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      let v = c === 4 ? (b[r * 5 + 4] ?? 0) : 0;
      for (let k = 0; k < 4; k++) v += (b[r * 5 + k] ?? 0) * (a[k * 5 + c] ?? 0);
      out.push(v);
    }
  }
  return out;
};

/** CSS `hue-rotate(deg)` (Filter Effects, feColorMatrix type="hueRotate"). */
const hueRotate = (deg: number): Matrix => {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    0.213 + c * 0.787 - s * 0.213,
    0.715 - c * 0.715 - s * 0.715,
    0.072 - c * 0.072 + s * 0.928,
    0,
    0,
    0.213 - c * 0.213 + s * 0.143,
    0.715 + c * 0.285 + s * 0.14,
    0.072 - c * 0.072 - s * 0.283,
    0,
    0,
    0.213 - c * 0.213 - s * 0.787,
    0.715 - c * 0.715 + s * 0.715,
    0.072 + c * 0.928 + s * 0.072,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ];
};

/** CSS `brightness(v)`. */
const brightness = (v: number): Matrix => [
  v,
  0,
  0,
  0,
  0,
  0,
  v,
  0,
  0,
  0,
  0,
  0,
  v,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
];

/** CSS `saturate(v)`. */
const saturate = (v: number): Matrix => [
  0.213 + 0.787 * v,
  0.715 - 0.715 * v,
  0.072 - 0.072 * v,
  0,
  0,
  0.213 - 0.213 * v,
  0.715 + 0.285 * v,
  0.072 - 0.072 * v,
  0,
  0,
  0.213 - 0.213 * v,
  0.715 - 0.715 * v,
  0.072 + 0.928 * v,
  0,
  0,
  0,
  0,
  0,
  1,
  0,
];

/** The prototype's dusk: `hue-rotate(-20deg) brightness(.62) saturate(1.3)`. */
export const DUSK_FILTER = multiply(multiply(hueRotate(-20), brightness(0.62)), saturate(1.3));

/** The café at dusk as seen through the burrow window: dimmed, with a lilac-to-night wash. */
export function DuskCafe({
  width,
  height,
  offset = { x: 15, y: 20 },
}: {
  width: number;
  height: number;
  /** Where the café's 300 × 220 picture sits in the window. */
  offset?: { readonly x: number; readonly y: number };
}) {
  const renderer = useArtRenderer();
  const cafe = useMemo(
    () => renderer.art({ fn: 's_cafeWarm', w: 300, h: 220, o: { t: 0 } }),
    [renderer],
  );
  return (
    <Canvas style={{ width, height }}>
      <Group
        transform={[{ translateX: offset.x }, { translateY: offset.y }]}
        layer={
          <Paint opacity={0.85}>
            <ColorMatrix matrix={DUSK_FILTER} />
          </Paint>
        }
      >
        <Picture picture={cafe.picture} />
      </Group>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={['rgba(239,163,244,0.35)', 'rgba(43,30,80,0.35)']}
        />
      </Rect>
    </Canvas>
  );
}

/**
 * A room scene drawn `drop` points lower than the top of its canvas, so it sits under the status
 * bar: the band above is the scene's own top edge (wall paint, in the scene's light) stretched to
 * fill it, so nothing new is drawn by hand.
 */
export function RoomScene({
  name,
  options,
  width,
  drop,
}: {
  name: SceneName;
  options: SceneOptions;
  width: number;
  drop: number;
}) {
  const renderer = useArtRenderer();
  const key = JSON.stringify(options);
  // `key` holds the options' content.
  const art = useMemo(() => renderer.scene(name, options), [renderer, name, key]);
  if (art === null) return null;
  const k = width / art.width;
  const band = 6;
  return (
    <Canvas style={{ width, height: art.height * k + drop }}>
      {drop > 0 ? (
        <Group
          transform={[{ scaleX: k }, { scaleY: drop / band }]}
          clip={{ x: 0, y: 0, width: art.width, height: band }}
        >
          <Picture picture={art.picture} />
        </Group>
      ) : null}
      <Group transform={[{ translateY: drop }, { scale: k }]}>
        <Picture picture={art.picture} />
      </Group>
    </Canvas>
  );
}
