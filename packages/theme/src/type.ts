/**
 * Type, from the prototype. Chrome is set in Lexend (the prototype loads weights 500–900 from
 * Google Fonts); glosses, notes and keepsakes in Kithfield Hand Bold. Both are embedded in the app
 * (`tools/fonts`), and both cover Vietnamese. Sizes are points on the prototype's 390 × 844
 * phone; letter spacing is in em, as the prototype writes it; a line height is a multiple of the
 * size, or null for the face's own.
 */

/** Lexend's embedded weights. */
export type LexendWeight = 500 | 600 | 700 | 800 | 900;

/** `lexend` is the chrome face; `hand` is Kithfield Hand (one weight, Bold). */
export type Face = 'lexend' | 'hand';

/**
 * The embedded fonts by the name each registers under: the PostScript name, which is also the file
 * name in `apps/mobile/assets/fonts/` (iOS finds a font by PostScript name).
 */
export const fontFamily = {
  lexend: {
    500: 'Lexend-Medium',
    600: 'Lexend-SemiBold',
    700: 'Lexend-Bold',
    800: 'Lexend-ExtraBold',
    900: 'Lexend-Black',
  },
  hand: 'KithfieldHand-Bold',
} as const satisfies { lexend: Record<LexendWeight, string>; hand: string };

export type FontName = (typeof fontFamily.lexend)[LexendWeight] | (typeof fontFamily)['hand'];

export interface FontFace {
  readonly name: FontName;
  /** The family name inside the file. */
  readonly family: 'Lexend' | 'Kithfield Hand';
  /** The file's OS/2 weight class. */
  readonly weight: LexendWeight;
  readonly file: `${FontName}.ttf`;
}

/** Every embedded font file. */
export const fontFaces: readonly FontFace[] = [
  ...([500, 600, 700, 800, 900] as const).map((weight): FontFace => ({
    name: fontFamily.lexend[weight],
    family: 'Lexend',
    weight,
    file: `${fontFamily.lexend[weight]}.ttf`,
  })),
  { name: fontFamily.hand, family: 'Kithfield Hand', weight: 700, file: `${fontFamily.hand}.ttf` },
];

/**
 * Each face's vertical metrics in em: the line box's ascent and descent (`hhea`), and the top of
 * its tallest Vietnamese letter in any embedded weight (capitals with stacked marks, `Ẳ` `Ổ`,
 * reach well above Lexend's ascent).
 */
export const fontMetrics = {
  lexend: { ascent: 1, descent: 0.25, inkTop: 1.127 },
  hand: { ascent: 0.76, descent: 0.24, inkTop: 0.746 },
} as const satisfies Record<Face, { ascent: number; descent: number; inkTop: number }>;

export interface TypeStyle {
  readonly face: Face;
  /** Lexend's weight; Kithfield Hand has only Bold. */
  readonly weight: LexendWeight;
  readonly size: number;
  /** A multiple of `size`, or null for the face's own line height. */
  readonly lineHeight: number | null;
  /** In em, as the prototype writes it. */
  readonly tracking: number;
  /** Set in capitals (the prototype's `text-transform: uppercase`). */
  readonly uppercase: boolean;
}

const lexend = (
  weight: LexendWeight,
  size: number,
  tracking = 0,
  lineHeight: number | null = null,
  uppercase = false,
): TypeStyle => ({ face: 'lexend', weight, size, lineHeight, tracking, uppercase });

const hand = (size: number, lineHeight: number | null = null): TypeStyle => ({
  face: 'hand',
  weight: 700,
  size,
  lineHeight,
  tracking: 0,
  uppercase: false,
});

/** The type styles, named by what wears them. */
export const type = {
  /** The lowercase wordmark on the splash (Lexend Black, tracking −6.5%). */
  wordmark: lexend(900, 70, -0.065, 1.05),
  /** The lock screen's clock. */
  lockTime: lexend(700, 96, -0.04, 1),
  /** The lock screen's date. */
  lockDate: lexend(700, 18),
  /** The brand sheet's display size ("Pip"). */
  display: lexend(800, 64, -0.055, 0.9),
  /** A celebration word after a call ("Done!"). */
  hero: lexend(900, 54, -0.06, 1),
  /** A big number: seconds, a count. */
  number: lexend(800, 46, -0.05, 0.9),
  /** A screen's title ("This week"). */
  screenTitle: lexend(800, 40, -0.055, 0.95),
  /** The brand sheet's title size ("Who's moving in?"). */
  title: lexend(800, 38, -0.05, 0.95),
  /** The roommate picker's title. */
  pickTitle: lexend(800, 32, -0.05),
  /** A headline on a scene ("Your ring is full!"). */
  headline: lexend(800, 30, -0.05, 1),
  /** A glass sheet's title. */
  sheetTitle: lexend(800, 28, -0.045, 1.02),
  /** The stage name on the residency card ("Newcomer"). */
  cardName: lexend(800, 27, -0.05, 0.95),
  /** The splash sheet's title ("Your first language"). */
  splashTitle: lexend(800, 26, -0.04),
  /** A card's title (fluency mirror, the episode peek). */
  cardTitle: lexend(800, 22, -0.04),
  /** A tilted sticker's words (the correction badges). */
  sticker: lexend(900, 22, -0.04),
  /** The seconds left inside the timer ring. */
  timer: lexend(900, 24, -0.04),
  /** An episode's title on the season map. */
  episodeTitle: lexend(800, 19, -0.04),
  /** A character's line in a speech bubble. */
  bubble: lexend(700, 18, 0, 1.22),
  /** The primary button (56 tall). */
  button: lexend(800, 17),
  /** A button in an equal pair (54 tall), a row's strong text. */
  buttonPair: lexend(800, 16),
  /** A glass secondary button (48 tall). */
  buttonGlass: lexend(800, 15),
  /** The call bar's buttons, small strong labels. */
  buttonSmall: lexend(800, 14),
  /** Chip buttons ("Too easy"). */
  chip: lexend(800, 12.5),
  /** A first-language choice. */
  choice: lexend(700, 14),
  /** A call slot's title in the week. */
  slotTitle: lexend(800, 15.5, -0.02, 1.1),
  /** A notification's text on the lock screen. */
  notification: lexend(600, 15.5, 0, 1.25),
  /** A sheet's paragraphs. */
  body: lexend(600, 15, 0, 1.38),
  /** A row's title. */
  rowTitle: lexend(700, 16),
  /** A list item's text (strengths, aims). */
  item: lexend(700, 14.5),
  /** What the learner said, in the caption bubble. */
  caption: lexend(700, 16.5, 0, 1.25),
  /** A row's subtitle, a table cell. */
  rowSub: lexend(600, 12.5),
  /** Helper text under a section. */
  note: lexend(600, 12),
  /** A quiet strong line ("Not quite right?"). */
  noteStrong: lexend(700, 13),
  /** A sheet's kicker ("BEFORE WE START"). */
  kicker: lexend(800, 11.5, 0.06),
  /** A section label ("THIS WEEK'S PHRASES"). */
  section: lexend(800, 11.5, 0.05),
  /** A small label on a card ("EPISODE"), set in capitals. */
  label: lexend(800, 11, 0.05, null, true),
  /** The smallest label ("YOU · heard"). */
  labelSmall: lexend(800, 10.5, 0.05),
  /** The speaker's name on the top pill. */
  speaker: lexend(800, 14),
  /** The speaker's name inside a bubble. */
  bubbleName: lexend(800, 11.5),
  /** The AI tag beside every character's name. */
  aiTag: lexend(800, 10),
  /** A small tag ("Stage 1 of 5"). */
  tag: lexend(800, 12),
  /** The mic's state under it, in capitals. */
  micLabel: lexend(800, 10, 0.04, null, true),
  /** A Vietnamese gloss under a character's line. */
  gloss: hand(18, 1.15),
  /** A gloss under a seed packet. */
  glossSmall: hand(14, 1.1),
  /** A gloss under a line of the letter. */
  glossLetter: hand(15, 1.15),
  /** A gloss under a line of the voice story. */
  glossStory: hand(17, 1.15),
  /** A gloss under Pip's whispered meaning. */
  glossWhisper: hand(19),
  /** A hint's Vietnamese, a keepsake's small lines. */
  handNote: hand(16),
  /** The brand sheet's "Pip writes" size. */
  handBrand: hand(24),
  /** A postcard's text. */
  postcard: hand(21, 1.15),
  /** The welcome on the residency card. */
  handWelcome: hand(21),
  /** The voicemail card's title. */
  handTitle: hand(26, 1),
  /** What the keepsake says the learner can now do. */
  keepsake: hand(26, 1.05),
} as const satisfies Record<string, TypeStyle>;

export type TypeStyleKey = keyof typeof type;

/** The font a style sets: its embedded cut. */
export function fontName(style: TypeStyle): FontName {
  return style.face === 'hand' ? fontFamily.hand : fontFamily.lexend[style.weight];
}

/** Tracking in points for a style (`em × size`). */
export function letterSpacing(style: TypeStyle): number {
  return Math.round(style.tracking * style.size * 100) / 100;
}

/** A type style shaped to spread into a React Native text style. */
export interface TextFont {
  fontFamily: FontName;
  fontSize: number;
  lineHeight?: number;
  letterSpacing: number;
  textTransform?: 'uppercase';
}

/**
 * A type style as a React Native text style. The embedded cut carries the weight, so no
 * `fontWeight` is set (iOS would otherwise look for a system face).
 */
export function fontFor(style: TypeStyleKey | TypeStyle): TextFont {
  const s = typeof style === 'string' ? type[style] : style;
  const out: TextFont = {
    fontFamily: fontName(s),
    fontSize: s.size,
    letterSpacing: letterSpacing(s),
  };
  if (s.lineHeight !== null) out.lineHeight = Math.round(s.lineHeight * s.size * 100) / 100;
  if (s.uppercase) out.textTransform = 'uppercase';
  return out;
}

/**
 * How far, in points, the tallest glyph of a first line can reach above the text's box on iOS,
 * for a style. iOS keeps the full descent at the bottom of a line box, so a line height tighter
 * than the face's own leaves stacked Vietnamese marks (`Ồ`, `Ế`) outside the box, where native
 * text is cut. Give the text that much room above (padding, then shift it back up).
 */
export function inkOverflowTop(style: TypeStyleKey | TypeStyle): number {
  const s = typeof style === 'string' ? type[style] : style;
  const { ascent, descent, inkTop } = fontMetrics[s.face];
  const own = (ascent + descent) * s.size;
  const lineHeight = s.lineHeight === null ? null : s.lineHeight * s.size;
  let baseline: number;
  if (lineHeight === null) baseline = ascent * s.size;
  else if (lineHeight < own) baseline = lineHeight - descent * s.size;
  else baseline = (lineHeight - own) / 2 + ascent * s.size;
  const over = inkTop * s.size - baseline;
  return over <= 0 ? 0 : Math.ceil(over - 1e-6);
}
