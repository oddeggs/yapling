import { Skia, type SkTypefaceFontProvider } from '@shopify/react-native-skia';
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import type { FontFamilies } from '../canvas/text';
import { ArtRenderer } from '../skia/renderer';

const ArtContext = createContext<ArtRenderer | null>(null);

/**
 * The fonts the art's text uses: Lexend (the bus sign, the burrow's poster) from `provider`, and
 * `sans-serif` (a confused critter's `?`, a sleepy one's `z`) from the system's Helvetica, which
 * the prototype's browser draws them in.
 */
export function artFonts(
  provider: SkTypefaceFontProvider = Skia.TypefaceFontProvider.Make(),
): FontFamilies {
  return {
    provider,
    families: { Lexend: { family: 'Lexend' }, 'sans-serif': { family: 'Helvetica' } },
    fallback: 'Helvetica',
  };
}

let fallback: ArtRenderer | null = null;

/** The renderer components use outside an `ArtProvider`: system fonts, default cache cap. */
function defaultRenderer(): ArtRenderer {
  fallback ??= new ArtRenderer(Skia, { fonts: artFonts() });
  return fallback;
}

export interface ArtProviderProps {
  /** Lexend for the art's text (from React Native Skia's `useFonts({ Lexend: [...] })`). */
  fonts?: SkTypefaceFontProvider | null;
  /** The picture cache's memory cap in bytes. */
  cacheBytes?: number;
  children?: ReactNode;
}

/** Shares one renderer, and so one picture cache, with the art below it. */
export function ArtProvider({ fonts = null, cacheBytes, children }: ArtProviderProps) {
  const renderer = useMemo(
    () =>
      new ArtRenderer(Skia, {
        fonts: artFonts(fonts ?? undefined),
        ...(cacheBytes !== undefined ? { cacheBytes } : {}),
      }),
    [fonts, cacheBytes],
  );
  // A replaced renderer lets go of its pictures; ones still on screen stay drawable.
  useEffect(() => () => renderer.flush(), [renderer]);
  return <ArtContext.Provider value={renderer}>{children}</ArtContext.Provider>;
}

/** The nearest `ArtProvider`'s renderer. */
export function useArtRenderer(): ArtRenderer {
  return useContext(ArtContext) ?? defaultRenderer();
}

/** The part of React Native's `AppState` this needs (passed in, so tests need no React Native). */
export interface MemoryWarnings {
  addEventListener(type: 'memoryWarning', listener: () => void): { remove(): void };
}

/** Drops every cached picture on a memory warning: `watchMemory(renderer, AppState)`. */
export function watchMemory(renderer: ArtRenderer, appState: MemoryWarnings): { remove(): void } {
  return appState.addEventListener('memoryWarning', () => renderer.flush());
}
