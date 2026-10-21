/**
 * Spacing, radii, layout and control sizes, as the prototype's screens set them. All values are
 * points on the prototype's 390 × 844 phone.
 */

/** The gaps and paddings the screens use, smallest to largest. */
export const spacing = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 46,
] as const;
export type Spacing = (typeof spacing)[number];

/** Screen margins and insets. */
export const layout = {
  /** The prototype's phone, in points. */
  screen: { width: 390, height: 844 },
  /** The top of the top bar (pill, back button), below the status bar. */
  topBar: 58,
  /** Margin beside the back button and most floating content. */
  marginScreen: 14,
  /** Margin beside cards and stickers on a scene. */
  marginCard: 16,
  /** A page title's margin (the week, after a call). */
  marginTitle: 22,
  /** The inset of a bottom glass sheet from the screen's edges. */
  sheetInset: 10,
  /** The inset of an info sheet (AI disclosure, notifications, paywall, errors). */
  infoSheetInset: 8,
  /** The call bar's distance from the bottom. */
  callBarBottom: 24,
} as const;

/** Corner radii, named by what wears them. A pill's or a circle's is half its height (`pill`). */
export const radii = {
  /** The box's flap, the letter slipping under the door. */
  flap: 2,
  /** The mic's bars. */
  bar: 3,
  /** Paper: the letter, the keepsake's card, the unpacked box. */
  paper: 4,
  /** The AI tag, a highlighted fix, the postcard. */
  aiTag: 6,
  /** Small tags (HINT, Intro, a map pin's name), the aim checkbox. */
  tag: 7,
  /** The voicemail card, the keepsake's frame. */
  frame: 8,
  /** Medium tags (WEEK 1, the ring tag, "Show translation"). */
  tagLarge: 9,
  /** Notes on a tag ("No live minutes used"), the lock screen's day tag. */
  note: 10,
  /** A notification's app icon. */
  appIcon: 11,
  /** "You fixed it". */
  badge: 12,
  /** The correction badges, a face tile. */
  sticker: 13,
  /** Rows of a list, the roommate's name tiles, a call slot's picture. */
  tile: 14,
  /** The meaning chip. */
  chip: 15,
  /** Phrase tiles, the paywall's table. */
  tileLarge: 16,
  /** Rows on a sheet, plan cards, story lines, the fix row. */
  row: 18,
  /** Hint and you bubbles, the new leaf. */
  bubbleSmall: 20,
  /** Speech bubbles, the residency card, toasts, the top pill, call slots, the peek card. */
  bubble: 22,
  /** The fluency mirror, the rounds bar. */
  panel: 24,
  /** A lock-screen notification, the story's player, the splash tag. */
  notification: 26,
  /** The season map's next-episode bar. */
  bar32: 32,
  /** Bottom glass bars (the week, after a call, the keepsake, the listen bar). */
  sheetBar: 40,
  /** Info and residency sheets. */
  sheet: 42,
  /** The splash and roommate sheets. */
  sheetLarge: 44,
} as const;

/** Shapes with uneven corners (top-left, top-right, bottom-right, bottom-left): bubbles with a tail. */
export const corners = {
  /** Pip's whispered meaning: the tail at the bottom left. */
  whisper: [20, 20, 20, 6],
  /** The learner's caption: the tail at the bottom right. */
  caption: [20, 20, 6, 20],
  /** Pip's note beside the keepsake. */
  note: [18, 18, 6, 18],
  /** The brand sheet's neighbour bubble. */
  neighbour: [22, 22, 22, 6],
  /** The brand sheet's Pip bubble. */
  pip: [22, 22, 6, 22],
  /** The arched dusk window. */
  archedWindow: [165, 165, 10, 10],
} as const satisfies Record<string, readonly [number, number, number, number]>;

/** A pill's radius: half its height. */
export function pill(height: number): number {
  return height / 2;
}

/** Control sizes. Every control is a pill unless it says otherwise. */
export const controls = {
  /** The primary button: 56 tall, a 3-point outline on a 4-point sticker shadow, 17 ExtraBold. */
  button: { height: 56, outline: 3, shadow: 4 },
  /** A button in an equal pair (the paywall). */
  buttonPair: { height: 54, outline: 3, shadow: 4 },
  /** The roommate picker's move-in button and name field. */
  buttonTall: { height: 60, outline: 3, shadow: 4 },
  /** A glass secondary button under a primary one. */
  buttonGlass: { height: 48, outline: 0, shadow: 0 },
  /** The listen bar's buttons. */
  buttonListen: { height: 52, outline: 0, shadow: 0 },
  /** The call bar's side buttons. */
  callButton: { width: 96, height: 50 },
  /** The call bar: a 104-tall glass pill. */
  callBar: { height: 104 },
  /** The mic: a 72-point circle with a 3-point outline. */
  mic: { size: 72, outline: 3 },
  /** A first-language choice. */
  choice: { height: 38, outline: 2 },
  /** "Too easy" and "Too hard". */
  chip: { height: 34 },
  /** The back button: a 40-point glass circle. */
  back: { size: 40 },
  /** The top pill with the speaker's face. */
  topPill: { height: 40, face: 30 },
  /** A toggle: 46 × 28, a 20-point knob. */
  toggle: { width: 46, height: 28, knob: 20 },
  /** The timer ring. */
  timer: { size: 96 },
  /** Hit targets never go below this. */
  minHitTarget: 44,
} as const;
