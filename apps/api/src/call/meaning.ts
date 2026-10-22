import type Anthropic from '@anthropic-ai/sdk';
import type { FirstLanguage, MeaningSubject, Stage } from '@yapling/contracts';
import { getLine, glossFor, PHRASES } from '@yapling/story';

import type { GenEffect } from './director';
import { explain, type Usage } from './llm';
import { isLearnerLine, type TranscriptLine } from './transcript';

/*
 * "What does that mean?": simple English first, the learner's first language one tap deeper
 * (journey §1.10). A hand-written meaning is used when the story has one; otherwise Haiku
 * explains the line. From Local the gloss fades to English only.
 *
 * At Visitor the meaning is the first language first: the written line's own gloss when it has one
 * (no model call), and the call says no English explanation after it.
 */

export interface MeaningAnswer {
  readonly about: string;
  readonly simple: string;
  readonly gloss: string | null;
}

export async function meaningFor(
  effect: GenEffect,
  subject: MeaningSubject | null,
  ctx: {
    readonly transcript: readonly TranscriptLine[];
    readonly firstLanguage: FirstLanguage;
    readonly stage: Stage;
    readonly llm: Anthropic;
    readonly usage: Usage;
  },
): Promise<MeaningAnswer | null> {
  const asked = effect.meaning?.lineId ? getLine(effect.meaning.lineId) : null;
  const lastLine = asked?.caption ?? null;
  const lastSaid = [...ctx.transcript].reverse().find((l) => !isLearnerLine(l))?.text ?? null;
  const about = subject?.kind === 'phrase' ? subject.text : (lastLine ?? lastSaid);
  if (!about) return null;
  const fade = ctx.stage === 'local' || ctx.stage === 'voice';
  const known = subject?.kind === 'phrase' ? null : (effect.meaning?.known ?? null);
  const lineGloss =
    subject?.kind === 'phrase' || asked === null
      ? null
      : glossFor(asked.glosses, ctx.firstLanguage);
  if (known) {
    return {
      about,
      simple: known.simple,
      gloss: fade ? null : (glossFor(known.glosses, ctx.firstLanguage) ?? lineGloss),
    };
  }
  if (ctx.stage === 'visitor' && lineGloss !== null) {
    return { about, simple: about, gloss: lineGloss };
  }
  const phrase =
    subject?.kind === 'phrase' ? PHRASES.find((p) => p.en === subject.text) : undefined;
  const explained = await explain(ctx.llm, about, ctx.firstLanguage, ctx.usage);
  const written = phrase ? glossFor(phrase.glosses, ctx.firstLanguage) : null;
  return { about, simple: explained.simple, gloss: fade ? null : (written ?? explained.gloss) };
}
