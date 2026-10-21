import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { CAST as ART_CAST, type Character } from '@yapling/art';
import type { CharacterId } from '@yapling/contracts';
import { translucent } from '@yapling/theme';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

/*
 * Which cast members `@yapling/art` draws, and the prototype's dotted paper behind the after-call
 * page. Faces come from the burrow's `Face` (the generator's own crop).
 */

/** The cast members `@yapling/art` draws (voices like the receptionist have no face). */
export function artCharacter(id: CharacterId): Character | null {
  return id in ART_CAST ? (id as Character) : null;
}

/** The prototype's dotted paper: a dot every 18 points, as its radial-gradient background. */
export function DotGrid({ width, height }: { width: number; height: number }) {
  const path = useMemo(() => {
    const b = Skia.PathBuilder.Make();
    for (let y = 9; y < height; y += 18) {
      for (let x = 9; x < width; x += 18) b.addCircle(x, y, 1.25);
    }
    return b.build();
  }, [width, height]);
  return (
    <Canvas style={[StyleSheet.absoluteFill, { width, height }]} pointerEvents="none">
      <Path path={path} color={translucent.dotGrid} />
    </Canvas>
  );
}
