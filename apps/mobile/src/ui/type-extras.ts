import { type, type TypeStyle } from '@yapling/theme';

/**
 * Type the prototype sets that `@yapling/theme`'s scale does not name yet, each derived from the
 * nearest theme style. They belong in the theme; until then they live here, once.
 */
export const typeExtras = {
  /** "Chạm để xem nghĩa" under a line in a bubble: 11, Bold, at 60 % (the label without capitals). */
  tapHint: { ...type.label, weight: 700, uppercase: false, tracking: 0 },
  /** The AI tag inside a speech bubble, a half point under the pill's. */
  aiTagSmall: { ...type.aiTag, size: 9.5 },
  /** The episode tag beside the top pill ("S1 · E1"): the label without capitals or tracking. */
  episodeTag: { ...type.label, uppercase: false, tracking: 0 },
  /** The call bar's exit button: 13, ExtraBold, set tight for two lines. */
  callExit: { ...type.buttonSmall, size: 13, lineHeight: 1.05 },
  /** The seed packet's phrase: 14, ExtraBold, set tight. */
  phrase: { ...type.buttonSmall, lineHeight: 1.1 },
  /** A sheet's subtitle under its title (the splash): 13.5, SemiBold. */
  sheetSub: { ...type.body, size: 13.5, lineHeight: null },
  /** The count inside the full weekly ring ("3/3"). */
  ringCount: { ...type.timer, size: 20, tracking: 0 },
  /** "now" on a notification. */
  notificationTime: { ...type.notification, size: 14, lineHeight: null },
  /** The sprout tile's phrase after a call: 11, ExtraBold. */
  tileLabel: { ...type.label, uppercase: false, tracking: 0, lineHeight: 1.1 },
  /** The sprout tile's stage: 10, Bold. */
  tileStage: { ...type.aiTag, weight: 700 },
  /** The meaning chip ("What does that mean?"): 13, ExtraBold. */
  meaningChip: { ...type.buttonSmall, size: 13 },
  /** Small sticker tags (HINT, the residency card's stage): 11 and 10.5, ExtraBold, no capitals. */
  tagSmall: { ...type.label, uppercase: false, tracking: 0 },
  tagTiny: { ...type.labelSmall, tracking: 0 },
  /** A win after a call: the list item at 13.5, set a little tight. */
  win: { ...type.item, size: 13.5, lineHeight: 1.15 },
  /** A toast's line: 14, ExtraBold, set a little tight. */
  toast: { ...type.buttonSmall, lineHeight: 1.15 },
  /** A short note beside a picture ("Một thùng trong hang đã được dỡ"): 14, Bold. */
  boxNote: { ...type.buttonSmall, weight: 700 },
} as const satisfies Record<string, TypeStyle>;
