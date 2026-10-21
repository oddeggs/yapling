import { type FontName } from '@yapling/theme';

/** google/fonts, pinned: the repository Google Fonts publishes from (the licence lives here). */
const GOOGLE_FONTS =
  'https://raw.githubusercontent.com/google/fonts/e2332cf862ac3145c0ee5f24f04f4c1819b2410b/ofl';

/**
 * Google Fonts' own static cuts of Lexend, as the CSS API serves them for the prototype's
 * `css2?family=Lexend:wght@500;600;700;800;900`; the repository ships only the variable font,
 * which a native font loader cannot pick a weight from.
 */
const GSTATIC_LEXEND = 'https://fonts.gstatic.com/s/lexend/v26';

export interface Source {
  /** File name in `tools/fonts/files/` (downloads) and in the app. */
  file: string;
  /**
   * A URL, downloaded into `tools/fonts/files/`, or a path under `design/prototype/` for a font
   * the design ships (kept there, not copied here).
   */
  from: { url: string } | { design: string };
  sha256: string;
}

export interface FontSource extends Source {
  name: FontName;
}

/** Every embedded font file, unmodified, with the SHA-256 of its bytes. */
export const fontSources: readonly FontSource[] = [
  {
    name: 'Lexend-Medium',
    file: 'Lexend-Medium.ttf',
    from: { url: `${GSTATIC_LEXEND}/wlptgwvFAVdoq2_F94zlCfv0bz1WCwkW_LA.ttf` },
    sha256: 'db7457c80dadc20cff9ad3c3c53f1f3e5a66def7fdadc66fdb4f3d3d63f548c6',
  },
  {
    name: 'Lexend-SemiBold',
    file: 'Lexend-SemiBold.ttf',
    from: { url: `${GSTATIC_LEXEND}/wlptgwvFAVdoq2_F94zlCfv0bz1WC-UR_LA.ttf` },
    sha256: 'cf25b9fec4c9293579914bd6b2c65379f218bb1594f5df990091c3ca7188776b',
  },
  {
    name: 'Lexend-Bold',
    file: 'Lexend-Bold.ttf',
    from: { url: `${GSTATIC_LEXEND}/wlptgwvFAVdoq2_F94zlCfv0bz1WC9wR_LA.ttf` },
    sha256: '7eca286b060cae36de89344033a6deaaeb40ad809fbfc160bf872858300274c2',
  },
  {
    name: 'Lexend-ExtraBold',
    file: 'Lexend-ExtraBold.ttf',
    from: { url: `${GSTATIC_LEXEND}/wlptgwvFAVdoq2_F94zlCfv0bz1WC7sR_LA.ttf` },
    sha256: '557374841a9934ec41ef89f6b53f36a64b6979ce22647b476beec7341e5cf2bc',
  },
  {
    name: 'Lexend-Black',
    file: 'Lexend-Black.ttf',
    from: { url: `${GSTATIC_LEXEND}/wlptgwvFAVdoq2_F94zlCfv0bz1WC5IR_LA.ttf` },
    sha256: '6ae2697ce63082c30eefd2c04c717e65379194df67b32ef0c20872ac3ca41404',
  },
  {
    name: 'KithfieldHand-Bold',
    file: 'KithfieldHand-Bold.ttf',
    from: { design: 'fonts/KithfieldHand-Bold.ttf' },
    sha256: '539a3e6a1d1c2085d1c02606d1c9019020b5bdf4003819deba6e82b3ea3cd5f4',
  },
];

/** Lexend's SIL Open Font License, from the same pinned repository. */
export const licenceSources: readonly Source[] = [
  {
    file: 'OFL-Lexend.txt',
    from: { url: `${GOOGLE_FONTS}/lexend/OFL.txt` },
    sha256: '5da8505887d0fa7fe963445fd58852707fda34adfeb65af25c99d152bab285bd',
  },
];

export const allSources: readonly Source[] = [...fontSources, ...licenceSources];

/** The files kept in `tools/fonts/files/`: everything downloaded. */
export const downloadedSources: readonly Source[] = allSources.filter((s) => 'url' in s.from);
