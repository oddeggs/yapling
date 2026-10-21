import type { FirstLanguage, Stage } from '@yapling/contracts';

import { STAGE_SPEECH } from './stage';
import type { Glosses, GlossedText } from './types';

/** A Vietnamese gloss taken verbatim from the approved design prototype. */
export const viDesign = (text: string): Glosses => ({ vi: { text, reviewed: true } });

/** A Vietnamese gloss written here, awaiting native review. */
export const viDraft = (text: string): Glosses => ({ vi: { text, reviewed: false } });

export const NO_GLOSS: Glosses = {};

export const glossed = (en: string, glosses: Glosses): GlossedText => ({ en, glosses });

/** The gloss text for a learner's first language, or null (`other`, or none written). */
export const glossFor = (glosses: Glosses, language: FirstLanguage): string | null =>
  language === 'other' ? null : (glosses[language]?.text ?? null);

/** The gloss to show under a hint at this stage: line-level glosses fade from Regular. */
export const hintGlossFor = (
  glosses: Glosses,
  language: FirstLanguage,
  stage: Stage,
): string | null => (STAGE_SPEECH[stage].glossHints ? glossFor(glosses, language) : null);
