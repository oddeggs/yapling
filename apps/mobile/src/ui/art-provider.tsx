import { useFonts } from '@shopify/react-native-skia';
import { ArtProvider } from '@yapling/art/native';
import { colours } from '@yapling/theme';
import type { ReactNode } from 'react';
import { View } from 'react-native';

/* eslint-disable @typescript-eslint/no-require-imports -- Metro bundles the fonts by require. */
const LEXEND = [
  require('../../assets/fonts/Lexend-Medium.ttf') as number,
  require('../../assets/fonts/Lexend-SemiBold.ttf') as number,
  require('../../assets/fonts/Lexend-Bold.ttf') as number,
  require('../../assets/fonts/Lexend-ExtraBold.ttf') as number,
  require('../../assets/fonts/Lexend-Black.ttf') as number,
];
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * The one art renderer for the whole app, with the art's own text (the burrow's season poster, the
 * bus sign) set in Lexend, loaded into Skia from the app's bundled fonts. The app waits the moment
 * the fonts take, so no picture is ever recorded twice in two faces.
 */
export function AppArtProvider({ children }: { children: ReactNode }) {
  const fonts = useFonts({ Lexend: LEXEND });
  if (fonts === null) return <View style={{ flex: 1, backgroundColor: colours.background }} />;
  return <ArtProvider fonts={fonts}>{children}</ArtProvider>;
}
