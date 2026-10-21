import { useFonts } from '@shopify/react-native-skia';
import { ArtProvider } from '@yapling/art/native';
import type { ReactNode } from 'react';

/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles the fonts by require. */
const LEXEND = [
  require('../../../assets/fonts/Lexend-Medium.ttf') as number,
  require('../../../assets/fonts/Lexend-SemiBold.ttf') as number,
  require('../../../assets/fonts/Lexend-Bold.ttf') as number,
  require('../../../assets/fonts/Lexend-ExtraBold.ttf') as number,
  require('../../../assets/fonts/Lexend-Black.ttf') as number,
];
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * The art's own text (the burrow's season poster, the bus sign) is set in Lexend, loaded into
 * Skia from the app's bundled fonts. Until the root layout provides one renderer for the whole
 * app, the burrow and the week bring their own.
 */
export function BurrowArtProvider({ children }: { children: ReactNode }) {
  const fonts = useFonts({ Lexend: LEXEND });
  // The scene waits for its font, so the poster is never drawn twice in two faces.
  if (fonts === null) return null;
  return <ArtProvider fonts={fonts}>{children}</ArtProvider>;
}
