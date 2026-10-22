import type {
  FirstLanguage,
  HelloFrame,
  MemoryCategory,
  MemoryItem,
  Pace,
  Stage,
} from '@yapling/contracts';
import { duePhrases, errorTargetsApply, fromPhraseProgress } from '@yapling/domain';
import { findPhrase, type ErrorTargetBrief, type Scene } from '@yapling/story';

import type { Bindings } from '../env';
import { listMemory } from '../memory';
import { learnerTimeZone, readProgress } from '../progress';
import { targetBrief } from './targets';

/*
 * What the call knows about the learner when it starts: their name and timezone (profile), their
 * active error targets and the phrases due a chance (progress), and a few things Pip remembers
 * (the memory page), so a real-week call can ask about their job or last week's news. The stage,
 * first language and pace come from `hello`, which the app reads from the same profile.
 */

/** A memory item as the call's prompt carries it. */
export interface PromptMemory {
  readonly category: MemoryCategory;
  readonly text: string;
}

/**
 * How many memory items of each section a call is told, newest first: who the learner is (their
 * job), what's coming up or just happened, and one thing about the two of you. A few items only;
 * never a transcript.
 */
export const PROMPT_MEMORY_LIMITS: Readonly<Record<MemoryCategory, number>> = {
  about_you: 2,
  coming_up: 2,
  about_us: 1,
};
/** The longest memory item a call is told; a longer one is cut at a word. */
export const PROMPT_MEMORY_CHARS = 160;

/** One line, no markup, at most `PROMPT_MEMORY_CHARS` (cut at a word). */
const promptText = (text: string): string => {
  const flat = text
    .replace(/[\r\n\t<>{}[\]`*#|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (flat.length <= PROMPT_MEMORY_CHARS) return flat;
  const cut = flat.slice(0, PROMPT_MEMORY_CHARS);
  const space = cut.lastIndexOf(' ');
  return `${(space > PROMPT_MEMORY_CHARS / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

/** The memory items a call is told, from the page (newest first), by section. */
export function promptMemories(items: readonly MemoryItem[]): PromptMemory[] {
  const sections = Object.keys(PROMPT_MEMORY_LIMITS) as MemoryCategory[];
  return sections.flatMap((category) =>
    items
      .filter((item) => item.category === category)
      .map((item) => ({ category, text: promptText(item.text) }))
      .filter((item) => item.text.length > 0)
      .slice(0, PROMPT_MEMORY_LIMITS[category]),
  );
}

export interface LearnerContext {
  readonly name: string;
  readonly timezone: string;
  readonly stage: Stage;
  readonly firstLanguage: FirstLanguage;
  /** The pace the learner asked for; null (or missing in a call saved before) for the stage's. */
  readonly pace?: Pace | null;
  /** The two active error targets, prompted in the call. */
  readonly targets: readonly ErrorTargetBrief[];
  /** Phrase ids and text to give chances to use. */
  readonly duePhrases: readonly { readonly id: string; readonly text: string }[];
  /** A few things Pip remembers; missing in a call saved before, and empty in Pip's minute. */
  readonly memories?: readonly PromptMemory[];
}

export async function loadLearner(
  env: Bindings,
  userId: string,
  hello: Pick<HelloFrame, 'stage' | 'firstLanguage' | 'pace'>,
  scene: Scene,
  now: number,
  options: { readonly memories: boolean } = { memories: true },
): Promise<LearnerContext> {
  const profile = await env.DB.prepare('SELECT display_name FROM profiles WHERE user_id = ?')
    .bind(userId)
    .first<{ display_name: string }>();
  const timezone = await learnerTimeZone(env.DB, userId);
  const [progress, memory] = await Promise.all([
    readProgress(env.DB, userId, now),
    options.memories ? listMemory(env.DB, userId) : Promise.resolve([]),
  ]);
  // No corrections at Visitor, nor in a Settling-in chapter: everything there is recast.
  const corrects = errorTargetsApply(hello.stage) && scene.kind !== 'settling';
  const targets = progress.errorTargets
    .filter((t) => corrects && t.status === 'active')
    .slice(0, 2)
    .map((t) => targetBrief(t.id));
  const records = progress.phrases.map(fromPhraseProgress);
  const due = duePhrases(records, now, timezone, { always: [...scene.phrases] }).map((p) => ({
    id: p.id,
    text: p.text,
  }));
  // The scene's own phrases are always on offer, met or not.
  const sceneOwn = scene.phrases
    .filter((id) => !due.some((d) => d.id === id))
    .map((id) => findPhrase(id))
    .filter((p) => p !== undefined)
    .map((p) => ({ id: p.id, text: p.en }));
  return {
    name: profile?.display_name ?? '',
    timezone,
    stage: hello.stage,
    firstLanguage: hello.firstLanguage,
    pace: hello.pace ?? null,
    targets,
    duePhrases: [...due, ...sceneOwn].slice(0, 6),
    memories: promptMemories(memory),
  };
}
