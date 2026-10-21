import type { FirstLanguage, Stage } from '@yapling/contracts';

import { isStageAtLeast } from './stages';

/*
 * First-language help: tap to reveal, designed to fade, never a crutch. App chrome (paywall,
 * permissions, safety, billing, settings) is always in the learner's language: it's product UI,
 * and trust and consent must be understood. Learning content stays English with a gloss on tap.
 *
 * Never: a global "translate everything" toggle, automatic first-language subtitles while
 * listening, or translating the learner's own speech back to them. A tapped phrase becomes a seed
 * (see `meetPhrase`); tapping is never a penalty.
 */

/** The languages the app chrome ships in. */
export type ChromeLocale = 'vi' | 'en';

/** The chrome's language for a first language (English where no catalogue exists yet). */
export const chromeLocale = (firstLanguage: FirstLanguage): ChromeLocale =>
  firstLanguage === 'vi' ? 'vi' : 'en';

/** Where help is asked for. */
export type HelpSurface =
  /** Captions, Pip's lines, postcards, story text. */
  | 'captions'
  /** The "What does that mean?" chip in a live call (the screen itself stays English). */
  | 'live_call'
  /** The post-call card's "Your fixes". */
  | 'post_call_fixes'
  /** These measure comprehension and fluency: no first-language help. */
  | 'listening_checkpoint'
  | 'pass_it_on';

export type GlossLayer = 'english' | 'l1';

export interface GlossPolicy {
  /** What one tap explains; null when the surface offers no help. */
  readonly unit: 'line' | 'word' | null;
  /** What each further tap reveals, in order (simple English, then the first language). */
  readonly layers: readonly GlossLayer[];
  /**
   * `shown`: the first layer is visible without a tap. `marked`: every line shows it has a gloss.
   * `on_tap`: help appears only when tapped.
   */
  readonly reveal: 'shown' | 'marked' | 'on_tap';
}

const NO_HELP: GlossPolicy = { unit: null, layers: [], reveal: 'on_tap' };

export interface GlossOptions {
  readonly firstLanguage: FirstLanguage;
  /** The learner turned first-language help back on in settings (it fades out from Local). */
  readonly l1BackOn?: boolean;
}

const surfacePolicy = (stage: Stage, surface: HelpSurface): GlossPolicy => {
  switch (surface) {
    case 'listening_checkpoint':
    case 'pass_it_on':
      return NO_HELP;
    case 'live_call':
      return { unit: 'line', layers: ['english', 'l1'], reveal: 'on_tap' };
    case 'post_call_fixes':
      return isStageAtLeast(stage, 'regular')
        ? { unit: 'line', layers: ['english', 'l1'], reveal: 'shown' }
        : { unit: 'line', layers: ['l1'], reveal: 'shown' };
    case 'captions':
      if (stage === 'newcomer') return { unit: 'line', layers: ['l1'], reveal: 'marked' };
      if (stage === 'neighbour') return { unit: 'line', layers: ['l1'], reveal: 'on_tap' };
      return { unit: 'word', layers: ['english', 'l1'], reveal: 'on_tap' };
  }
};

/**
 * The help a surface gives at a stage. It fades: line glosses everywhere at Newcomer, line glosses
 * on tap at Neighbour, word-level English first from Regular, and English only from Local unless
 * the learner turns their first language back on. With no supported first language (`other`)
 * there is no first-language layer.
 */
export const glossPolicy = (
  stage: Stage,
  surface: HelpSurface,
  options: GlossOptions,
): GlossPolicy => {
  const policy = surfacePolicy(stage, surface);
  const fadedOut = isStageAtLeast(stage, 'local') && options.l1BackOn !== true;
  const dropL1 = options.firstLanguage === 'other' || fadedOut;
  if (!dropL1) return policy;
  const layers = policy.layers.filter((l) => l !== 'l1');
  return layers.length === 0 ? NO_HELP : { ...policy, layers };
};
