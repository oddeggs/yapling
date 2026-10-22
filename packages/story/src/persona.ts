import { glossPolicy } from '@yapling/domain';
import {
  STAGES,
  type CharacterId,
  type FirstLanguage,
  type Id,
  type Stage,
} from '@yapling/contracts';

import { CAST, CAST_RULES } from './cast';
import { findPhrase } from './catalogue';
import { STAGE_SPEECH, stageSpeechLine } from './stage';
import type { Beat, Scene } from './types';

/*
 * Persona system prompts for live calls, from the cast bible's template. The prompt is split for
 * prompt caching: `cached` is identical for every learner and scene of a character (persona,
 * rules, the stage table), and `dynamic` follows it with the learner, the scene and the targets.
 */

export interface PersonaContext {
  readonly stage: Stage;
  readonly scene: SceneBrief;
  readonly learnerName: string;
  /** Due phrases (chunks) to give the learner chances to use. */
  readonly duePhrases: readonly string[];
  /** The learner's active error targets (two at most). */
  readonly targets: readonly ErrorTargetBrief[];
  readonly firstLanguage: FirstLanguage;
}

export interface SceneBrief {
  /** The episode beat or real-week task. */
  readonly summary: string;
  /** The can-do or goal for the learner. */
  readonly goal: string;
}

export interface ErrorTargetBrief {
  readonly id: Id;
  /** What the error looks like, e.g. "drops the -ed of the past tense (yesterday I walk)". */
  readonly description: string;
}

export interface PersonaPrompt {
  /** The stable prefix: cache it. */
  readonly cached: string;
  /** The per-learner, per-scene suffix, after the prefix. */
  readonly dynamic: string;
  /** Both, for a single system prompt. */
  readonly text: string;
}

/** The safety and correction rules every character follows, after the cast bible's own rules. */
export const SHARED_RULES: readonly string[] = [
  'Keep every turn under 25 words. Let the learner talk most.',
  'If the learner makes one of their target errors, repeat it back as a gentle question and wait. Recast other errors silently, by using the right form in your reply.',
  'Never explain grammar; the post-call card does that.',
  'Never mock, never guilt, never pressure. Mistakes are welcome.',
  'If the learner seems distressed or unsafe, stop the scene and hand over to the safety flow.',
  'Stay on the current beat. The story outcome is fixed; steer back kindly if the learner wanders.',
  "Never give the learner's answer for them: when they don't know, ask more simply and wait. Never bring back what the scene has already done (a call already made, a question already answered).",
  'Write only the exact words you say out loud, in the first person, as yourself. No narration, no stage directions, no actions in brackets or asterisks, no quotation marks around your line, no notes about the learner or the scene, no reasoning, no emoji, lists or markdown.',
  'When a direction asks for an action (open a box, hand over a letter), show it by what you say ("Ooh, this box says WORK!"), never by describing it.',
];

const LANGUAGE_NAMES: Readonly<Record<FirstLanguage, string | null>> = {
  vi: 'Vietnamese',
  id: 'Indonesian',
  th: 'Thai',
  pt: 'Portuguese',
  es: 'Spanish',
  ja: 'Japanese',
  ko: 'Korean',
  tr: 'Turkish',
  other: null,
};

const bullets = (items: readonly string[]) => items.map((item) => `- ${item}`).join('\n');

/** Learner-supplied text inside the prompt: one line, short, no markup. */
const clean = (text: string, max: number) =>
  text
    .replace(/[\r\n\t<>{}[\]`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

const staticPrefix = (character: CharacterId): string => {
  const c = CAST[character];
  const who =
    c.species === null
      ? `You are ${c.name}`
      : `You are ${c.name}, ${/^[aeiou]/i.test(c.species) ? 'an' : 'a'} ${c.species}`;
  const lines = [
    `${who} in Natterwick, a cosy harbour town in the Yapling app.`,
    `Role: ${c.role}. Personality: ${c.personality}. You speak ${c.english}.`,
    'You are an AI character and say so if asked. Never claim to be human.',
    '',
    'How you come across:',
    bullets(c.behaviours),
  ];
  if (c.says.length > 0) lines.push('Things you might say:', bullets(c.says.map((s) => `"${s}"`)));
  if (c.never.length > 0) lines.push('Never:', bullets(c.never));
  lines.push(
    '',
    'Rules for every character:',
    bullets(CAST_RULES),
    bullets(SHARED_RULES),
    '',
    "Speech settings by the learner's stage:",
    bullets(STAGES.map((s) => `${STAGE_SPEECH[s].label}: ${stageSpeechLine(s)}.`)),
  );
  return lines.join('\n');
};

const prefixes = new Map<CharacterId, string>();

/** The cached prefix for a character (built once). */
export const personaPrefix = (character: CharacterId): string => {
  let prefix = prefixes.get(character);
  if (prefix === undefined) {
    prefix = staticPrefix(character);
    prefixes.set(character, prefix);
  }
  return prefix;
};

export const personaPrompt = (character: CharacterId, context: PersonaContext): PersonaPrompt => {
  const language = LANGUAGE_NAMES[context.firstLanguage];
  const name = clean(context.learnerName, 24) || 'the learner';
  const due = context.duePhrases.map((p) => clean(p, 200)).filter((p) => p.length > 0);
  const targets = context.targets.slice(0, 2).map((t) => clean(t.description, 200));
  const dynamic = [
    `The learner is ${name}, stage ${STAGE_SPEECH[context.stage].label} (${stageSpeechLine(context.stage)}).`,
    language === null
      ? 'If they ask what something means, explain it in simple English.'
      : glossPolicy(context.stage, 'live_call', { firstLanguage: context.firstLanguage })
            .layers[0] === 'l1'
        ? `Their first language is ${language}. If they ask what something means, the app shows the ${language} first; just say it again in a few simple English words.`
        : `Their first language is ${language}. If they ask what something means, explain it in simple English first; the app shows the ${language} gloss.`,
    `This scene: ${context.scene.summary} Goal for the learner: ${context.scene.goal}`,
    `Phrases to give chances to use: ${due.length > 0 ? due.join(' · ') : 'none today'}.`,
    `Target errors: ${targets.length > 0 ? targets.join(' · ') : 'none yet'}.`,
  ].join('\n');
  const cached = personaPrefix(character);
  return { cached, dynamic, text: `${cached}\n\n${dynamic}` };
};

/** A scene brief from the story data, optionally narrowed to the current beat. */
export const sceneBrief = (scene: Scene, beat?: Beat): SceneBrief => {
  const now =
    beat?.kind === 'gen'
      ? ` Now: ${beat.intent}`
      : beat?.kind === 'learner'
        ? ` Now: the learner ${beat.answer.expects.charAt(0).toLowerCase()}${beat.answer.expects.slice(1)}`
        : '';
  return {
    summary: `${scene.summary}${now}`,
    goal: scene.goal,
  };
};

/** The scene's target phrases as text, for `duePhrases` when the learner model has none. */
export const scenePhrases = (scene: Scene): string[] =>
  scene.phrases.map((id) => findPhrase(id)?.en).filter((p) => p !== undefined);
