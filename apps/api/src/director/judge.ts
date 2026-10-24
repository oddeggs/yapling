import type Anthropic from '@anthropic-ai/sdk';
import { CAST } from '@yapling/story';

import { structured, words, SONNET } from './llm';
import { speakerOf, type MomentPlan } from './moment';
import type { LearnerModel, SessionRecord } from './store';
import { LANGUAGE_NAMES, LEVEL_GUIDE, STAGES } from './world';

/*
 * After each conversation: what the town now knows about the learner (the learner model), what
 * the story should remember, and what goes on the kept painting (can-dos seen, the words they used
 * well, what the resident learned from them). Code counts what a model would miscount.
 */

export interface JudgedLine {
  readonly who: 'learner' | 'character';
  readonly text: string;
}

const CEFR = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1'] as const;

const JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['learner_model', 'session', 'painting', 'name', 'facts'],
  properties: {
    learner_model: {
      type: 'object',
      additionalProperties: false,
      required: [
        'cefr',
        'stage',
        'confidence',
        'level_evidence',
        'errors',
        'interests',
        'life_context',
        'culture',
        'personality',
        'what_engages',
      ],
      properties: {
        cefr: { type: 'string', enum: [...CEFR] },
        stage: { type: 'string', enum: [...STAGES] },
        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        level_evidence: { type: 'array', items: { type: 'string' } },
        errors: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['pattern', 'example'],
            properties: { pattern: { type: 'string' }, example: { type: 'string' } },
          },
        },
        interests: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['topic', 'evidence'],
            properties: { topic: { type: 'string' }, evidence: { type: 'string' } },
          },
        },
        life_context: { type: 'string' },
        culture: {
          type: 'string',
          description:
            'What we know of where they live and their culture from what they said (city, foods, festivals, customs), or empty.',
        },
        personality: { type: 'string' },
        what_engages: { type: 'string' },
      },
    },
    session: {
      type: 'object',
      additionalProperties: false,
      required: ['level_this_session', 'summary', 'remember', 'threads_open', 'engagement'],
      properties: {
        level_this_session: {
          type: 'string',
          enum: [...CEFR],
          description: 'CEFR from this transcript alone, before looking at the previous model.',
        },
        summary: { type: 'string', description: 'Two or three sentences: what happened.' },
        remember: {
          type: 'array',
          items: { type: 'string' },
          description: 'Things the learner said or chose that later moments should call back.',
        },
        threads_open: {
          type: 'array',
          items: { type: 'string' },
          description: 'At most 2: the story threads that matter most now.',
        },
        engagement: { type: 'integer', description: '1–5' },
      },
    },
    painting: {
      type: 'object',
      additionalProperties: false,
      required: ['can_dos', 'learned', 'words'],
      properties: {
        can_dos: {
          type: 'array',
          items: { type: 'string' },
          description:
            'At most two things the learner actually did in English, in plain words to them, starting "You": "You ordered and changed an order". Only what the transcript shows. Empty when nothing clear.',
        },
        learned: {
          type: 'string',
          description:
            'One short line on what the resident learned from the learner, in plain words ("your name, and that you study nursing", "how to make egg coffee"). Empty when nothing.',
        },
        words: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['phrase', 'line'],
            properties: {
              phrase: { type: 'string', description: 'A useful English chunk the learner said.' },
              line: { type: 'string', description: 'Their whole line it came from, as heard.' },
            },
          },
          description: 'Up to four useful phrases the learner used well.',
        },
      },
    },
    name: {
      type: ['string', 'null'],
      description: 'The name the learner said they want to be called, or null if they did not say.',
    },
    facts: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'category'],
        properties: {
          text: {
            type: 'string',
            description: 'A short note written to the learner ("You work in a bank").',
          },
          category: { type: 'string', enum: ['about_you', 'coming_up', 'about_us'] },
        },
      },
      description:
        'Up to three new facts about the learner worth remembering, that they told us themselves. Nothing sensitive (health, money trouble, religion, politics).',
    },
  },
} as const;

export interface Judged {
  readonly model: LearnerModel;
  readonly record: SessionRecord;
  readonly canDos: string[];
  readonly learned: string | null;
  readonly words: { phrase: string; line: string }[];
  readonly name: string | null;
  readonly facts: { text: string; category: 'about_you' | 'coming_up' | 'about_us' }[];
  readonly costUsd: number;
}

/** A fact about the learner's name ("You'd like to be called John"), kept only while none is known. */
export const isNameFact = (text: string): boolean =>
  /\b(called|call you|call me|your name|name is|named)\b/i.test(text);

const OTHER_SCRIPT = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ฀-๿぀-ヿ一-鿿가-힯]/gi;

/** Plain counts the judge can't miscount: how long the learner's turns are and how often they got lost. */
export function talkStats(lines: readonly JudgedLine[]) {
  const ls = lines.filter((l) => l.who === 'learner').map((l) => l.text);
  const ws = ls.map((t) => words(t)).sort((a, b) => b - a);
  return {
    turns: ls.length,
    mean_words: Math.round(ws.reduce((a, b) => a + b, 0) / Math.max(1, ws.length)),
    longest_three: ws.slice(0, 3),
    turns_25_plus: ws.filter((w) => w >= 25).length,
    own_language_turns: ls.filter((t) => (t.match(OTHER_SCRIPT)?.length ?? 0) >= 3).length,
    lost_turns: ls.filter((t) => /\b(sorry\?|again|slowly|không hiểu)/i.test(t) && words(t) <= 8)
      .length,
  };
}

const SYSTEM = `You maintain the learner model for Yapling, an English speaking app. You read a conversation transcript (speech recognition text) between the learner and a Natterwick character and update what we know about the learner. Infer only from what the learner actually said and how; never invent.

LEVEL: judge by what the learner CAN do (range, turn length, complexity, comprehension), using their longest spontaneous turns, not by accuracy alone. Learners keep dropping -s, articles and past endings even at B1–B2, so those errors alone never lower the level. Short answers to an easy either/or question are not evidence of a low level. B1 or B2 is decided by control, not length. B1: talks a lot and keeps going, but basic grammar breaks often (missing "be", bare verbs, wrong question order). B2: basic grammar mostly holds AND complex structures appear (conditionals, relative clauses, passive, "I would rather…"), plus hedging, abstract topics, or self-correction.

USE THE MEASURED COUNTS, CAREFULLY: length only counts when the words form connected sentences. Long strings of 1–4 word fragments are A1–A2 however long the turn. A mean under 6 words with lost or own-language turns means A0–A1. Asking to slow down, apologising and asking "was that okay?" are personality, not level.

HOW TO UPDATE: first judge THIS transcript on its own (level_this_session), as if you had never seen the learner. Then set learner_model.cefr: if this conversation gave the learner real chances to talk and its level differs from the previous model, move towards it (one band at a time, two if the evidence is strong); if it only asked easy either/or questions, keep the previous level. Stage follows CEFR: A0–A1 visitor, A2 newcomer, A2+/B1 neighbour, B1+ regular, B2 local, C1 voice.

Keep everything from the previous model that this conversation didn't contradict (interests, life, culture), and add what's new. Can-dos and facts must be things the transcript shows; when the conversation was short or the learner said little, say less.

${LEVEL_GUIDE}`;

export async function judgeMoment(
  client: Anthropic,
  input: {
    readonly previous: LearnerModel | null;
    readonly plan: MomentPlan;
    readonly lines: readonly JudgedLine[];
    readonly firstLanguage: string;
    readonly openThreads: readonly string[];
    /** The name the town already calls them; null when not known yet. */
    readonly name: string | null;
  },
): Promise<Judged | null> {
  const speaker = CAST[speakerOf(input.plan)].name;
  const transcript = input.lines
    .map((l) => (l.who === 'learner' ? `LEARNER: ${l.text}` : `${speaker}: ${l.text}`))
    .join('\n');
  const r = await structured<{
    learner_model: LearnerModel;
    session: SessionRecord;
    painting: { can_dos: string[]; learned: string; words: { phrase: string; line: string }[] };
    name: string | null;
    facts: Judged['facts'];
  }>(client, {
    model: SONNET,
    system: [SYSTEM],
    effort: 'low',
    maxTokens: 6_000,
    schema: JUDGE_SCHEMA,
    user: [
      `THE LEARNER'S FIRST LANGUAGE: ${LANGUAGE_NAMES[input.firstLanguage] ?? input.firstLanguage}`,
      input.name
        ? `THE LEARNER'S NAME: ${input.name}. It is known: return name null, and no fact about their name or what to call them (speech recognition mishears names).`
        : "THE LEARNER'S NAME: not known yet.",
      `PREVIOUS LEARNER MODEL:\n${input.previous ? JSON.stringify(input.previous, null, 1) : '(none: first conversation)'}`,
      `THE MOMENT: "${input.plan.title_open}" at ${input.plan.place} with ${speaker} (aimed at ${input.plan.stage_aimed}). Open threads before: ${input.openThreads.join(' | ') || 'none'}. It was meant to end on: ${input.plan.cliffhanger}`,
      `MEASURED (by code, trust these): ${JSON.stringify(talkStats(input.lines))}`,
      `TRANSCRIPT:\n${transcript || '(nothing was said)'}`,
      'Return the full updated learner model, the session record, the painting notes, the name and new facts.',
    ].join('\n\n'),
  });
  const j = r.json;
  if (j === null) return null;
  const known = input.name !== null;
  return {
    model: j.learner_model,
    record: { ...j.session, threads_open: j.session.threads_open.slice(0, 2) },
    canDos: j.painting.can_dos.slice(0, 2),
    learned: j.painting.learned.trim() || null,
    words: j.painting.words.slice(0, 4),
    name: !known && j.name?.trim() ? j.name.trim().slice(0, 40) : null,
    facts: j.facts.filter((f) => !(known && isNameFact(f.text))).slice(0, 3),
    costUsd: r.costUsd,
  };
}
