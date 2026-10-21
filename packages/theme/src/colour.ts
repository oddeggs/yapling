/**
 * Colour, from the prototype. `palette` holds every solid colour the app's screens use, named as
 * the brand sheet names them (`design/prototype/boards/Yapling R4 Brand.dc.html`, "Colour
 * tokens") and, for colours the sheet leaves out, by what they look like. `colours` names them by
 * role; screens use `colours`. Scene and critter colours belong to `@yapling/art`.
 */

export const palette = {
  /** Text, outlines, sticker shadows. */
  ink: '#17131C',
  /** Backgrounds. */
  paper: '#FBFAFD',
  /** Accent, primary: buttons, Pip's bubble, the selected choice. */
  lilac: '#EFA3F4',
  /** Surfaces: call backdrops, phrase tiles, face circles. */
  lilacTint: '#F9DAFB',
  /** Secondary: real-week calls, badges. */
  cyan: '#22BFF2',
  /** Glass, sky, the office's bubble. */
  cyanTint: '#CFF0FD',
  /** Success, answer: ticks, toggles on, the practice call. */
  mint: '#5FD98A',
  /** Gentle states: done rounds, the story's "nothing to fail". */
  mintTint: '#D7F7E2',
  /** Evening scenes. */
  night: '#241B38',
  /** Background line art, idle outlines, toggles off. */
  line: '#D3CCDC',
  /** Secondary text. */
  muted: '#5D5366',
  /** Blooms only (and the sparkles of a fix). */
  butter: '#FFD66B',
  white: '#FFFFFF',
  /** Body text on sheets. */
  inkSoft: '#3E3646',
  /** Text on a disabled button. */
  dim: '#9A90A6',
  /** Sunken surfaces: an info screen behind its sheet, a table's header row, the caption bubble. */
  fog: '#F4F1F7',
  /** Tracks and dividers: the timer and mirror tracks, table rules. */
  mist: '#F1ECF4',
  /** Hairline borders on white rows and filter chips. */
  hairline: '#E4DEEA',
  /** The dotted underline under a tappable word on the letter. */
  dotted: '#B9B0C4',
  /** Vietnamese glosses in the hand font, the postmark. */
  plum: '#5B4A8C',
  /** Hand-written accents: "Lan can now…", the postcard's signature. */
  orchid: '#9A5AA6',
  /** Paper: the letter, postcards, the voicemail, the keepsake. */
  cream: '#FFFDF6',
  /** The HINT tag. */
  honey: '#FFE48A',
  /** The page after a call. */
  peach: '#FFF7EE',
  /** Behind the episode's face in its call slot. */
  apricot: '#FFE9C2',
  /** Cardboard: the unpacked box, the keepsake's frame. */
  cardboard: '#F2CFA8',
  /** The box's flap. */
  cardboardShade: '#E6BE93',
  /** Behind the harbour on the splash. */
  harbourSky: '#E4F7FE',
  /** Behind the season map. */
  mapSky: '#F4FCFF',
  /** Behind the blurred lock-screen wallpaper. */
  lockNight: '#2A2140',
  /** The café window at dusk. */
  dusk: '#3B3160',
} as const;

export type PaletteName = keyof typeof palette;

/** A palette colour, or white or ink, at an alpha: `rgba(r,g,b,a)`. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** The translucent colours the screens use, as the prototype writes them. */
export const translucent = {
  /** Glass panels' fill. */
  glass: 'rgba(255,255,255,0.6)',
  /** Glass panels' edge. */
  glassEdge: 'rgba(255,255,255,0.9)',
  /** The back button's glass. */
  glassButton: 'rgba(255,255,255,0.62)',
  /** Buttons and inputs sitting on glass; the call bar's idle buttons. */
  frost: 'rgba(255,255,255,0.8)',
  /** Choices and rows sitting on glass. */
  frostStrong: 'rgba(255,255,255,0.85)',
  /** The hint card. */
  hint: 'rgba(255,255,255,0.88)',
  /** The learner's caption bubble. */
  caption: 'rgba(255,255,255,0.92)',
  /** A blurred scene washed towards paper behind a sheet. */
  paperWash: 'rgba(251,250,253,0.35)',
  /** The same wash behind a call with a blurred burrow. */
  paperWashCall: 'rgba(251,250,253,0.38)',
  /** Behind a sheet over the whole screen. */
  scrim: 'rgba(23,19,28,0.55)',
  /** An unselected choice's border. */
  inkBorder: 'rgba(23,19,28,0.14)',
  /** A chip's border on glass. */
  inkBorderSoft: 'rgba(23,19,28,0.15)',
  /** The dashed rule above a gloss. */
  glossRule: 'rgba(23,19,28,0.2)',
  /** The close button's circle on a bubble. */
  inkWash: 'rgba(23,19,28,0.1)',
  /** The dotted grid on the week and after-call pages. */
  dotGrid: 'rgba(23,19,28,0.12)',
  /** Waveform bars not yet played. */
  waveIdle: 'rgba(23,19,28,0.28)',
  /** The lock screen's tag and glass buttons. */
  lockGlass: 'rgba(255,255,255,0.2)',
  /** The splash tag's glass over the harbour. */
  harbourGlass: 'rgba(228,247,254,0.82)',
} as const;

/** Colours by role. */
export const colours = {
  background: palette.paper,
  surface: palette.white,
  surfaceSunken: palette.fog,
  surfacePaper: palette.cream,
  surfaceAccent: palette.lilacTint,
  text: palette.ink,
  textBody: palette.inkSoft,
  textMuted: palette.muted,
  textDisabled: palette.dim,
  textOnInk: palette.white,
  textGloss: palette.plum,
  textHand: palette.orchid,
  accent: palette.lilac,
  accentSoft: palette.lilacTint,
  secondary: palette.cyan,
  secondarySoft: palette.cyanTint,
  success: palette.mint,
  successSoft: palette.mintTint,
  highlight: palette.honey,
  bloom: palette.butter,
  outline: palette.ink,
  border: palette.hairline,
  divider: palette.mist,
  lineArt: palette.line,
  disabled: palette.line,
  /** Pip's speech bubble; every other character's is `surface`, the office's `secondarySoft`. */
  bubblePip: palette.lilac,
  bubbleOffice: palette.cyanTint,
  glass: translucent.glass,
  glassEdge: translucent.glassEdge,
  scrim: translucent.scrim,
} as const;

export type ColourRole = keyof typeof colours;
