import { cards, type CardSpec } from '../build';
import { glossed, viDraft } from '../gloss';
import type { Answer, GlossedText } from '../types';
import { praiseFor } from './shared-lines';

/*
 * Builders for the Visitor's turns (Settling in and the week-1 Visitor beats): say-this cards up
 * from the start, passed by their words, with the listener's praise after a pass unless the
 * script says otherwise. Card and task texts are the script's, Vietnamese drafts under each.
 */

/** A card to read aloud, with its Vietnamese. */
export const card = (en: string, vi: string): GlossedText => glossed(en, viDraft(vi));

/** A task card: what to do, in Vietnamese (English for learners without a gloss). */
export const task = (en: string, vi: string): GlossedText => glossed(en, viDraft(vi));

/** A Visitor card turn; praise from the listener's pool unless `praise` is given. */
export const visitorCards = (spec: CardSpec): Answer =>
  cards({ praise: praiseFor(spec.listener), ...spec });

/** Words that pass a thank-you card. */
export const THANKS = ['thank', 'thanks'] as const;
/** Words that pass the lifesaver cards. */
export const AGAIN_WORDS = ['sorry', 'again', 'pardon', 'repeat'] as const;
export const SLOWLY_WORDS = ['slow', 'slowly'] as const;
/** Words that pass a yes-or-no card pair. */
export const YES_NO = ['yes', 'yeah', 'yep', 'no', 'nope'] as const;
