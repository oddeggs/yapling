import type Anthropic from '@anthropic-ai/sdk';
import { CAST } from '@yapling/story';
import { PLACES, clockLabel } from '@yapling/scene';

import { speakerOf, type Beat, type MomentPlan } from './moment';
import { BIBLE, LANGUAGE_NAMES, TURN_WORDS, type Stage } from './world';
import { words } from './llm';

/*
 * The live side of a planned moment: the resident's system prompt (the world and the plan, cached
 * for the whole call) and the direction for each turn (the beat it is on, the lane, the word limit,
 * the control line). The actor sees one beat at a time, and the next one only to move on to it.
 */

export type Lane = 'planned' | 'simple' | 'rich';

const SPEECH: Readonly<Record<Stage, string>> = {
  visitor:
    'Visitor: about 85 words a minute. One short sentence, at most 8 words. Say your own answer first, then ask. Offer two choices the learner can repeat ("Tea or coffee?"). Any try with the right word passes: say it back properly and move on. Never correct, never use an idiom, never ask an open question without choices.',
  newcomer:
    'Newcomer: about 110 words a minute, short sentences, one idea, at most 12 words a sentence and two sentences. No idioms, never two questions in one turn.',
  neighbour:
    'Neighbour: about 130 words a minute, one or two ideas, at most 25 words a turn. Rare idioms, explained.',
  regular:
    'Regular: about 150 words a minute, normal sentences, at most 25 words a turn; some idioms.',
  local:
    'Local: about 165 words a minute, natural, at most 25 words a turn; you may interrupt once, then yield.',
  voice: 'Voice: natural speed, at most 25 words a turn.',
};

const LANE_NOTE: Readonly<Record<Exclude<Lane, 'planned'>, string>> = {
  simple:
    'This learner is a beginner: one sentence, at most 8 words, your own answer first, then two choices they can repeat. Use each beat’s if_struggling version.',
  rich: 'This learner is strong: use each beat’s if_strong version. Open why and how questions, ask for reasons and examples, push back once kindly. Still at most 25 words a turn.',
};

export interface MomentLearner {
  readonly name: string | null;
  readonly firstLanguage: string;
  readonly stage: Stage;
  readonly country: string | null;
}

/** Whether lines carry a gloss in the learner's language: beginners read it under the line. */
export const wantsGloss = (learner: MomentLearner): boolean =>
  learner.firstLanguage !== 'en' &&
  learner.firstLanguage !== 'other' &&
  (learner.stage === 'visitor' || learner.stage === 'newcomer');

export function actorSystem(
  plan: MomentPlan,
  learner: MomentLearner,
  hour: number,
): Anthropic.TextBlockParam[] {
  const speaker = speakerOf(plan);
  const name = CAST[speaker].name;
  const place = PLACES[plan.place];
  const variant = place.variants[plan.variant] ?? place.variants[0];
  const moment = `You are ${name}, live in a spoken conversation with the learner in Natterwick. Only ${name} speaks: write ${name}'s words and nothing else, with no speaker prefix.
You are an AI character and say so if asked. Never claim to be human.

THE LEARNER: ${learner.name ? `${learner.name}` : 'name not known yet'}, first language ${LANGUAGE_NAMES[learner.firstLanguage] ?? learner.firstLanguage}, planned for stage ${learner.stage}. ${SPEECH[learner.stage]}
THIS MOMENT: "${plan.title_open}" at ${place.name}, ${clockLabel(hour)} on the learner's clock. In the painting: ${variant.prop}.
While the learner was away: ${plan.while_you_were_away}
Hook: ${plan.hook}
${plan.personal_threads_used.length || plan.callbacks.length ? `Use these naturally when they fit: ${[...plan.callbacks, ...plan.personal_threads_used].join('; ')}.` : ''}
${plan.culture_touch ? `The learner's own world: ${plan.culture_touch}` : ''}
You hope to learn from the learner: ${plan.pip_learns}.
Phrases to give chances to use: ${plan.target_phrases.join('; ') || 'none'}. Errors to prompt gently: ${plan.target_errors.join('; ') || 'none'}.
The moment ends on: ${plan.cliffhanger}
Director's notes: ${plan.director_notes}

HOW TO PLAY
- The direction after each learner reply tells you the beat you are on. Play only that beat, or move on to the next one when its goal is met.
- Let the learner talk most. React to what they actually said, specifically, before anything else.
- If they make one of the target errors, repeat it back as a gentle question and wait; recast other errors silently. Never explain grammar.
- If they ask you to repeat or slow down, say your last line again, more simply. If they ask what a word means, explain it simply in English, in character.
- If they answer in their own language, say back in simple English what they probably meant, then ask again with two choices.
- Never mock, never guilt, never answer for the learner or put words in their mouth. Only Bea says "love". Pip says "I", never "Pip".
- No stage directions, actions, asterisks or emoji: only spoken words.
- If they seem distressed or unsafe, stop the story and kindly check on them.
The learner's words come from speech recognition and may hold small mistakes: read past a wrong word when the meaning is plain; when you can't tell what they meant, ask again simply; never fill in what they might have said.`;
  return [
    { type: 'text', text: BIBLE, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: moment, cache_control: { type: 'ephemeral' } },
  ];
}

const beatText = (b: Beat, lane: Lane): string => {
  const line = lane === 'simple' ? b.if_struggling : lane === 'rich' ? b.if_strong : b.example_line;
  return `${b.what_happens} Goal for the learner: ${b.goal}. A line like: "${line}"`;
};

export function turnLimit(stage: Stage, lane: Lane): number {
  if (lane === 'simple') return TURN_WORDS.visitor;
  if (lane === 'rich') return 25;
  return TURN_WORDS[stage];
}

export interface TurnState {
  readonly beat: number;
  /** Learner replies already given on this beat. */
  readonly beatTurns: number;
  readonly lane: Lane;
  readonly laneSwitched: boolean;
  /** The learner has talked for many turns: land the ending now. */
  readonly landNow: boolean;
  /** Time is nearly up (minutes): close kindly now. */
  readonly wrapUp: boolean;
}

const controlRule = (gloss: boolean, language: string) =>
  `After the spoken words, write one last line: § followed by compact JSON: {"beat":"stay"|"next"|"end"${gloss ? `,"gloss":"<your spoken words in natural, simple ${language}>"` : ''},"safety":"crisis" only if they seem distressed or unsafe}. "next" when this reply moved on to the next beat, "end" when this reply closed the moment, otherwise "stay". Never speak the JSON.`;

/** The direction after a learner reply: the beat, when to move on, the limit, the control line. */
export function turnDirection(
  plan: MomentPlan,
  learner: MomentLearner,
  s: TurnState,
): { direction: string; maxWords: number } {
  const limit = turnLimit(plan.stage_aimed, s.lane);
  const gloss = wantsGloss(learner);
  const language = LANGUAGE_NAMES[learner.firstLanguage] ?? learner.firstLanguage;
  const beats = plan.beats;
  const cur = beats[Math.min(s.beat, beats.length - 1)]!;
  const next = beats[s.beat + 1];
  const parts: string[] = [];
  if (s.laneSwitched && s.lane !== 'planned') parts.push(`LANE SWITCH: ${LANE_NOTE[s.lane]}`);
  else if (s.lane !== 'planned') parts.push(LANE_NOTE[s.lane]);
  if (s.wrapUp) {
    parts.push(
      `Time is nearly up. In this reply, react briefly, then close the moment warmly: ${plan.cliffhanger} One goodbye, no guilt, no "tomorrow". Set "beat":"end".`,
    );
  } else if (s.landNow || s.beat >= beats.length) {
    parts.push(
      `The beats are done. React to what they said, then land the ending: ${plan.cliffhanger} Close warmly in this reply and set "beat":"end".`,
    );
  } else {
    const pushOn = s.beatTurns >= 2;
    const then = next
      ? `go on to the next beat: ${beatText(next, s.lane)}`
      : `land the ending: ${plan.cliffhanger} Close warmly and set "beat":"end".`;
    parts.push(
      `You are on beat ${s.beat + 1} of ${beats.length}. Its goal for the learner: ${cur.goal}.`,
    );
    if (pushOn) {
      parts.push(
        `Write: one short, specific reaction to what they just said, then ${then}${next ? ' Set "beat":"next".' : ''}`,
      );
    } else {
      parts.push(
        `First decide: did their reply do the goal, even simply or with mistakes? Their meaning counts, not their grammar.
- If yes: one short, specific reaction to what they just said, then ${then}${next ? ' Set "beat":"next".' : ''}
- If not yet: react to what they said, then help them with this same goal another way (${s.lane === 'rich' ? beats[Math.min(s.beat, beats.length - 1)]!.if_strong : cur.if_struggling}). Set "beat":"stay".`,
      );
    }
    parts.push(
      'Never ask something they already answered, and never repeat your last question word for word. Use what they told you.',
    );
  }
  parts.push(`Word limit for this whole reply: ${limit} words.`);
  parts.push(controlRule(gloss, language));
  return { direction: parts.join('\n'), maxWords: limit };
}

const OWN_SCRIPT = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ฀-๿぀-ヿ一-鿿가-힯]/gi;

/**
 * After two learner replies, code picks a lane from how they actually talk: very short or
 * own-language answers drop to Visitor lines; long answers lift to the open follow-ups.
 */
export function pickLane(replies: readonly string[], stage: Stage): Lane {
  const ws = replies.map((r) => words(r));
  const avg = ws.reduce((a, b) => a + b, 0) / Math.max(1, ws.length);
  const own = replies.join(' ').match(OWN_SCRIPT)?.length ?? 0;
  const low = stage === 'visitor' || stage === 'newcomer';
  if (low && ((avg <= 6 && Math.max(...ws) <= 8) || own >= 4))
    return stage === 'visitor' ? 'planned' : 'simple';
  if (stage !== 'local' && stage !== 'voice' && avg >= 12 && Math.max(...ws) >= 16) return 'rich';
  // A Visitor plan with a learner who answers in full sentences: lift to the open follow-ups.
  if (stage === 'visitor' && avg >= 7) return 'rich';
  return 'planned';
}
