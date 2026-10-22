import { LIMITS } from '@yapling/contracts';
import { findPhrase, PHRASES, type TargetPhrase } from '@yapling/story';

/*
 * A phrase the learner opened (a line's gloss, a letter word, "what does that mean?") becomes a
 * seed packet in the burrow: met in progress, by the story's own phrase when the tap holds one,
 * or by the word itself when it is a short one of its own (a letter's "notice").
 */

const normal = (s: string) =>
  ` ${s
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

/** A word of a few letters at most, kept as its own seed. */
const SHORT_SEED_WORDS = 4;

const slug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, LIMITS.idMax);

/**
 * The phrase to meet for an opened seed: the story phrase given, else the first of `among` (then
 * any story phrase) said inside the text, else the text itself when it is a short phrase; null
 * when there is nothing worth keeping (a whole sentence with no target phrase in it).
 */
export function phraseForSeed(
  seed: { readonly phraseId?: string | null; readonly text: string },
  among: readonly string[] = [],
): { readonly id: string; readonly text: string } | null {
  const given = seed.phraseId ? findPhrase(seed.phraseId) : undefined;
  if (given) return { id: given.id, text: given.en };
  const said = normal(seed.text);
  const inside = (p: TargetPhrase | undefined) => p !== undefined && said.includes(normal(p.en));
  const scenePhrase = among.map((id) => findPhrase(id)).find(inside);
  const found = scenePhrase ?? PHRASES.find(inside);
  if (found) return { id: found.id, text: found.en };
  const words = seed.text.trim().split(/\s+/).filter(Boolean);
  const id = slug(seed.text);
  if (words.length === 0 || words.length > SHORT_SEED_WORDS || id === '') return null;
  return { id, text: seed.text.trim().slice(0, LIMITS.phraseMax) };
}
