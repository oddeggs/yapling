import { useEffect, useMemo, useRef, useState } from 'react';

import type { CritterSpec } from '../critter';
import type { RigPictures } from '../rig/pictures';
import { ArtRenderer, type CritterPictures } from '../skia/renderer';
import { afterFirstFrame } from './schedule';

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

interface Shown {
  readonly key: string;
  readonly spec: CritterSpec;
  readonly pics: RigPictures;
}

/**
 * The rig for `spec` (null: none wanted), recorded after the first frame unless it is cached, and
 * pinned while drawn. Until it is ready this gives the previous rig if only the mood changed (a
 * mood is a swap of drawings anyway), else null: the caller draws today's critter at rest, which is
 * exactly the rig's rest pose. `failed` when the rig cannot cut this drawing.
 */
export function useRigPictures(
  renderer: ArtRenderer,
  spec: CritterSpec | null,
  pixelRatio: number,
): { pics: RigPictures | null; failed: boolean } {
  const key = spec ? ArtRenderer.rigKey(spec, pixelRatio) : null;
  const [, setVersion] = useState(0);
  const failed = useRef<Set<string>>(new Set());
  const last = useRef<Shown | null>(null);
  const cached =
    spec && key && !failed.current.has(key) ? renderer.peekRig(spec, pixelRatio) : undefined;

  useEffect(() => {
    if (!spec || !key || cached || failed.current.has(key)) return;
    return afterFirstFrame(() => {
      try {
        renderer.critterRig(spec, pixelRatio);
      } catch (e) {
        // A drawing the rig cannot cut (a generator change): today's critter is drawn instead.
        failed.current.add(key);
        console.warn(e);
      }
      setVersion((v) => v + 1);
    });
    // `spec` is described by `key`.
  }, [renderer, key, cached, pixelRatio]);

  let shown: Shown | null = null;
  if (spec && key && cached) shown = { key, spec, pics: cached };
  else if (spec && last.current) {
    const prev = last.current.spec;
    if (prev.species === spec.species && prev.size === spec.size) shown = last.current;
  }
  useEffect(() => {
    last.current = shown;
  });
  usePinned(renderer, shown?.key ?? null);
  return { pics: shown?.pics ?? null, failed: key ? failed.current.has(key) : false };
}
