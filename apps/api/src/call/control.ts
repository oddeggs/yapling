import { z } from 'zod';

/*
 * The control line. Every generated turn is the spoken reply, then one last line that starts with
 * `§` and holds compact JSON about the learner's last turn:
 *
 *   §{"outcome":"fine","phrasesUsed":["whats-wrong"],"canDo":"ask-whats-wrong"}
 *
 * - `outcome`: how the learner's turn went: `fine` (it does what the beat hoped for),
 *   `target_error` (one of their active error targets, named by `targetId`), `unclear` (they
 *   don't know or understand, ask to repeat, answer in their own language, or the words make no
 *   sense), `question` (they ask the character something instead), `off_topic`, or `silent`
 *   (nothing usable was said). Every outcome but the first two keeps the beat: it counts as a
 *   silence for the runner (a hint or a nudge, then the fallback after the beat's tries).
 * - `phrasesUsed`: target phrase ids the learner used correctly in that turn.
 * - `canDo`: the can-do the turn evidences, if it does.
 * - `safety`: `crisis` when the learner seems distressed or unsafe.
 *
 * The call strips the line before text-to-speech; nothing after the marker is ever spoken.
 */

export const CONTROL_MARKER = '§';

export const OUTCOMES = [
  'fine',
  'target_error',
  'unclear',
  'question',
  'off_topic',
  'silent',
] as const;
export type Outcome = (typeof OUTCOMES)[number];

const ControlLine = z.object({
  outcome: z.enum(OUTCOMES).catch('fine'),
  targetId: z.string().max(64).nullish().catch(null),
  phrasesUsed: z.array(z.string().max(64)).max(10).catch([]).default([]),
  canDo: z.string().max(64).nullish().catch(null),
  safety: z.enum(['crisis']).nullish().catch(null),
});

export interface Control {
  readonly outcome: Outcome;
  readonly targetId: string | null;
  readonly phrasesUsed: readonly string[];
  readonly canDo: string | null;
  readonly crisis: boolean;
}

/** What a reply without a readable control line counts as. */
export const NO_CONTROL: Control = {
  outcome: 'fine',
  targetId: null,
  phrasesUsed: [],
  canDo: null,
  crisis: false,
};

/** Reads the control text after the marker. Never throws; unreadable text is `NO_CONTROL`. */
export function parseControl(text: string | null): Control {
  if (text === null) return NO_CONTROL;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) return NO_CONTROL;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return NO_CONTROL;
  }
  const parsed = ControlLine.safeParse(raw);
  if (!parsed.success) return NO_CONTROL;
  const c = parsed.data;
  return {
    outcome: c.outcome,
    targetId: c.targetId ?? null,
    phrasesUsed: c.phrasesUsed,
    canDo: c.canDo ?? null,
    crisis: c.safety === 'crisis',
  };
}

/** The output rule appended to every turn's direction. */
export const CONTROL_RULE = `After the spoken line, write one last line: ${CONTROL_MARKER} followed by compact JSON about the learner's last turn: {"outcome":"fine"|"target_error"|"unclear"|"question"|"off_topic","targetId":"<target id, only for target_error>","phrasesUsed":["<phrase ids they used correctly>"],"canDo":"<can-do id, if their turn shows it>","safety":"crisis" only if they seem distressed or unsafe}. Never speak the JSON.`;
