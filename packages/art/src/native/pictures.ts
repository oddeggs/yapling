import { useEffect, useMemo } from 'react';

import type { CritterSpec } from '../critter';
import { ArtRenderer, type CritterPictures } from '../skia/renderer';

/** Keeps the cache entry `key` pinned while the calling component is mounted with it. */
export function usePinned(renderer: ArtRenderer, key: string | null): void {
  useEffect(() => {
    if (!key || !renderer.cache.pin(key)) return;
    return () => renderer.cache.unpin(key);
  }, [renderer, key]);
}

/**
 * Today's critter pictures, recorded on first use and pinned while drawn. With a `pixelRatio` the
 * outline is cached as pixels (for a critter that moves: replaying 24 silhouette copies every frame
 * is what costs); a still critter keeps the vector outline, drawn once.
 */
export function useCritterPictures(
  renderer: ArtRenderer,
  spec: CritterSpec,
  pixelRatio: number,
): CritterPictures {
  const { species, mood, size } = spec;
  const pics = useMemo(
    () => renderer.critter({ species, mood, size }, pixelRatio),
    [renderer, species, mood, size, pixelRatio],
  );
  usePinned(renderer, ArtRenderer.critterKey({ species, mood, size }, pixelRatio));
  return pics;
}
