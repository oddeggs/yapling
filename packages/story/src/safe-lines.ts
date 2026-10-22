import type { SceneEffect } from './runner';

/*
 * Lines a call speaks when a generated line had nothing safe left to say (the model wrote only
 * narration, which never reaches the voice). Each keeps the scene where it was: a nudge asks the
 * beat again, a beat line says its written example, a fallback says the words its intent quotes.
 */

type GenEffect = Extract<SceneEffect, { type: 'gen' }>;

/** The answer to a learner turn that came out as narration: a neutral, kind beat. */
export const SAFE_REPLY = 'Mm, okay.';

/** The kind close when minutes run out, if the generated one came out as narration. */
export const SAFE_WRAP_UP = "Let's carry on next time. Thank you!";

const NO_RUSH = 'No rush.';
const TAKE_YOUR_TIME = 'Take your time.';
const GO_ON = "That's okay. Let's go on.";

/** The first line a direction quotes ("Say \"We can do it!\" and …" → "We can do it!"). */
const quotedIn = (text: string): string | null => {
  const m = /["“]([^"“”]{2,120})["”]/.exec(text);
  return m?.[1]?.trim() || null;
};

/** The last question in a line ("Sit, sit. What's wrong?" → "What's wrong?"), or null. */
export const lastQuestion = (text: string): string | null => {
  const sentences = text.match(/[^.!?…]+[.!?…]+/g) ?? [];
  const q = [...sentences].reverse().find((s) => s.trim().endsWith('?'));
  return q?.trim() || null;
};

/**
 * The safe line for a generated line the runner asked for. `asked` is the speaker's last
 * question in the call, for a nudge to ask again.
 */
export const safeLineFor = (effect: GenEffect, asked: string | null): string => {
  switch (effect.purpose) {
    case 'nudge':
      return asked ? `${NO_RUSH} ${asked}` : `${NO_RUSH} ${TAKE_YOUR_TIME}`;
    case 'line':
      return effect.example ?? quotedIn(effect.intent) ?? TAKE_YOUR_TIME;
    case 'fallback':
      return quotedIn(effect.intent) ?? GO_ON;
    case 'meaning':
      return TAKE_YOUR_TIME;
  }
};
