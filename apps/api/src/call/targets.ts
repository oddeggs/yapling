import type { ErrorTargetBrief } from '@yapling/story';

/*
 * The recurring errors the call knows how to prompt, with the description the persona prompt and
 * the post-call summary use. For Vietnamese speakers these are the usual ones (journey §1.6):
 * final -s and -ed, past tense, articles, final consonants, missing prepositions.
 */

export const ERROR_TARGETS: Readonly<Record<string, string>> = {
  past_ed: 'drops the past tense (yesterday I go, instead of yesterday I went)',
  final_s: 'drops the -s of he/she verbs and plurals (he work, two box)',
  articles: 'drops or mixes up a, an and the (I am teacher)',
  final_consonants: 'drops final consonants in words (wha for what, ca for cat)',
  prepositions: 'drops a preposition (listening music, instead of listening to music)',
  be_verb: 'drops am, is or are (I happy, she my friend)',
  word_order: 'puts question words in statement order (where you are going?)',
};

export const ERROR_TARGET_IDS = Object.keys(ERROR_TARGETS);

/** A target as the persona prompt names it; unknown ids are described by their name. */
export function targetBrief(id: string): ErrorTargetBrief {
  return { id, description: ERROR_TARGETS[id] ?? id.replace(/[_-]+/g, ' ') };
}
