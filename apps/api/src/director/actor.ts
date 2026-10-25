import type Anthropic from '@anthropic-ai/sdk';
import { CAST } from '@yapling/story';
import { PLACES, clockLabel } from '@yapling/scene';

import { COMPANION, STANCE_TEXT, isCompanion, type Stance } from '../curriculum/companion';
import { STAGE_DIALS } from '../curriculum/units';
import type { Beat, MomentPlan } from './moment';
import { BIBLE, LANGUAGE_NAMES, type Stage } from './world';
import { words } from './llm';

/*
 * The live side of a planned moment: the companion's system prompt (the world, the scene's brief
 * and ledger, the rules, cached for the whole call) and the direction for each turn (the beat it
 * is on, how to give feedback in it, the rescue, the word limit, the control line). A guest, when
 * the scene has one, speaks in replies that start with the `[guest]` tag, in their own voice.
 */

export type Lane = 'planned' | 'simple' | 'rich';

const LANE_NOTE: Readonly<Record<Exclude<Lane, 'planned'>, string>> = {
  simple:
    'This learner is struggling: one short sentence, at most 8 words, model the line first, then offer two short choices they can repeat (the beat’s rescue).',
  rich: 'This learner is strong: ask for reasons and examples, follow up on what they said, push back once kindly, talk at natural speed. Still within the word limit.',
};

export interface MomentLearner {
  readonly name: string | null;
  readonly firstLanguage: string;
  readonly stage: Stage;
  readonly country: string | null;
}

/** Where this scene sits in the learner's story, for the actor. */
export interface MomentStory {
  readonly title: string;
  readonly logline: string;
  readonly sceneNo: number;
  readonly scenes: number;
  /** What happened in the episodes before, oldest first. */
  readonly before: readonly string[];
  /** What the learner told the town on arrival, in plain words. */
  readonly about: string;
  /** The companion's stance with this learner. */
  readonly stance: Stance;
}

/** Whether lines carry a gloss in the learner's language: beginners read it under the line. */
export const wantsGloss = (learner: MomentLearner): boolean =>
  learner.firstLanguage !== 'en' &&
  learner.firstLanguage !== 'other' &&
  (learner.stage === 'visitor' || learner.stage === 'newcomer');

const LIVE_RULES = `HOW TO PLAY (these never bend)
- Every question is a real one: you don't already know the answer, a real person here would ask it, and the answer changes what happens next. Never a quiz, never a question just to make them talk.
- Only ask about what the learner can know: their own life, what was said aloud in this scene or its brief, the earlier scenes listed, everyday knowledge, or their opinion. Never assume a shared past they never heard.
- They hear this; they may see nothing. Never "look at this", "which one?" or "what does it say?": say aloud whatever they need.
- Talk to the learner. Use each target chunk yourself before you need them to use it.
- React to what they actually said, specifically, then give something of your own (news, a feeling, a joke) before you ask. One question per reply, at the end.
- Feedback like a friend: if they get one of the prompt forms wrong, ask it back gently in character ("Two coin… or two coins?") and wait; say other mistakes back correctly without comment. Never correct during the task beat. Never explain grammar.
- React like a friend, not a teacher: no "You said it clearly" or "Good answer" after their turns. Praise once at most, at the end of the scene, and only for something they really did ("You cut in politely, and it worked.").
- If they're stuck, say "I don't know" or say nothing useful: give them a model sentence to copy, then two short choices. Never answer for them.
- If they ask you to repeat or slow down, say it again more simply. If they ask what a word means, explain it simply in English.
- If they answer in their own language, say back in simple English what they probably meant, then ask again.
- Their words come from speech recognition and are often misheard: read them against your last question and take the nearest sensible meaning; if nothing fits, say you didn't catch that and ask again. Never comment on it.
- Write only spoken words: no notes about the learner, the beat or the plan, no stage directions, asterisks or emoji. Only Bea says "love". Say "I", never your own name.
- Always AI if asked. No romance, no guilt, no "come back soon". If they seem distressed or unsafe, stop the story and kindly check on them.`;

const briefText = (plan: MomentPlan) => {
  const b = plan.brief;
  return [
    b.recap,
    `${b.where}. ${b.happening}`,
    b.your_role,
    `Tasks: ${b.tasks.join('; ')}.`,
    `Try saying: ${b.try_saying.join(' / ')}`,
  ]
    .filter(Boolean)
    .join(' ');
};

export function actorSystem(
  plan: MomentPlan,
  learner: MomentLearner,
  hour: number,
  story: MomentStory | null = null,
): Anthropic.TextBlockParam[] {
  const name = CAST[plan.companion].name;
  const companion = isCompanion(plan.companion) ? COMPANION[plan.companion] : null;
  const place = PLACES[plan.place];
  const dials = STAGE_DIALS[learner.stage];
  const guest = plan.guest !== 'none' ? CAST[plan.guest].name : null;
  const scene = `You are ${name}${companion ? `, the learner's companion: ${companion.who}` : ''}. ${
    companion ? `Manner: ${companion.manner}. ` : ''
  }${story ? `With this learner you are ${STANCE_TEXT[story.stance]}. ` : ''}You are always on the learner's side.
${guest ? `You also play the guest, ${plan.guest_intro || guest} (${plan.guest_how === 'phone' ? 'on the phone' : plan.guest_how === 'voicemail' ? 'in a voice message' : 'here in person'}). Whatever the guest says follows the tag [guest]: either a whole reply that starts with [guest], or after your own words when you play their voice message or hand them the phone ("Okay, pressing play. [guest] Hi Sol, it's Dex…"). After [guest], only the guest speaks until the end of that reply. The guest brings the pressure; you stay the ally.` : 'Only you speak in this scene.'}
You are an AI character and say so if asked.

THE LEARNER: ${learner.name ? `${learner.name} (written exactly so; speech recognition often mishears names, so always use this spelling, never what you hear)` : 'name not known yet'}, first language ${LANGUAGE_NAMES[learner.firstLanguage] ?? learner.firstLanguage}, stage ${learner.stage}. Speak ${dials.speech}. At most ${dials.turnWords} words a reply. Two-choice questions: ${dials.choices === 'allowed' ? 'yes, as the way to ask' : 'only as a rescue'}.
${story ? `ABOUT THEM: ${story.about}\nTHE STORY: "${story.title}", episode ${story.sceneNo} of ${story.scenes}. ${story.logline}${story.before.length ? `\nThe episodes before: ${story.before.join(' ')}` : ''}\n` : ''}THE SCENE: "${plan.title_open}" at ${place.name}, ${clockLabel(hour)} on the learner's clock.
What the learner has just read and heard (the brief): ${briefText(plan)}
What is happening: ${plan.situation}
Why they are needed: ${plan.why_the_learner}
What the learner knows (only these, plus their own life and opinions): ${plan.knowledge_ledger.map((f) => f.fact).join('; ') || '(the brief)'}
The gap that makes the questions real: ${plan.gap}
What they must catch by ear: ${plan.listening_task}
Target chunks (model them first, then give chances to use them): ${plan.target_chunks.join(' | ')}${plan.recycled_chunks.length ? `. Bring these back too: ${plan.recycled_chunks.join(' | ')}` : ''}.
Prompt only on: ${plan.prompt_forms.join('; ') || 'nothing'}.
The scene ends when: ${plan.end_condition}. Then: ${plan.ending}
${plan.callbacks.length ? `Bring back naturally: ${plan.callbacks.join('; ')}.` : ''}
${plan.culture_touch ? `The learner's own world: ${plan.culture_touch}` : ''}
You hope to learn from them: ${plan.companion_learns}.
Director's notes: ${plan.director_notes}

${LIVE_RULES}`;
  return [
    { type: 'text', text: BIBLE, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: scene, cache_control: { type: 'ephemeral' } },
  ];
}

const FEEDBACK_BY_KIND: Readonly<Record<Beat['kind'], string>> = {
  open: 'Specific praise only if they did something; no corrections.',
  success_first: 'Make sure they succeed; praise what they did by name.',
  task: 'This is the task: do not correct anything now; only ask to clarify if you truly did not understand.',
  turn: 'If they skip the unit’s strategy (checking, clarifying, asking to wait), prompt it once.',
  close: 'Land the consequence of what they said; name one thing they did well.',
};

const beatText = (b: Beat, lane: Lane, guest: boolean): string => {
  const who = b.speaker === 'guest' && guest ? ' (the guest speaks: start with [guest])' : '';
  return `${b.what_happens}${who} The learner's goal: ${b.goal}. A line like: "${b.example_line}"${lane === 'simple' ? ` Rescue: ${b.rescue}` : ''}`;
};

export function turnLimit(stage: Stage, lane: Lane): number {
  if (lane === 'simple') return STAGE_DIALS.visitor.turnWords;
  return STAGE_DIALS[stage].turnWords;
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
  /** The last line was already said again once, word for word. */
  readonly saidAgain?: boolean;
}

const controlRule = (gloss: boolean, language: string) =>
  `After the spoken words, write one last line: § followed by compact JSON: {"beat":"stay"|"next"|"end"${gloss ? `,"gloss":"<your spoken words in natural, simple ${language}>"` : ''},"safety":"crisis" only if they seem distressed or unsafe}. "next" when this reply moved on to the next beat, "end" when this reply closed the scene, otherwise "stay". Never speak the JSON.`;

/** The direction after a learner reply: the beat, when to move on, feedback, the limit. */
export function turnDirection(
  plan: MomentPlan,
  learner: MomentLearner,
  s: TurnState,
): { direction: string; maxWords: number } {
  const limit = turnLimit(learner.stage, s.lane);
  const gloss = wantsGloss(learner);
  const language = LANGUAGE_NAMES[learner.firstLanguage] ?? learner.firstLanguage;
  const guest = plan.guest !== 'none';
  const beats = plan.beats;
  const cur = beats[Math.min(s.beat, beats.length - 1)]!;
  const next = beats[s.beat + 1];
  const parts: string[] = [];
  if (s.lane !== 'planned')
    parts.push(`${s.laneSwitched ? 'LANE SWITCH: ' : ''}${LANE_NOTE[s.lane]}`);
  if (s.wrapUp) {
    parts.push(
      `Time is nearly up. React briefly, then close the scene: ${plan.ending} One goodbye, no guilt. Set "beat":"end".`,
    );
  } else if (s.landNow || s.beat >= beats.length) {
    parts.push(
      `The beats are done. React to what they said, then close: ${plan.ending} Set "beat":"end".`,
    );
  } else {
    const then = next
      ? `go on to the next beat: ${beatText(next, s.lane, guest)}`
      : `close: ${plan.ending} Set "beat":"end".`;
    parts.push(
      `You are on beat ${s.beat + 1} of ${beats.length} (${cur.kind}). Feedback here: ${FEEDBACK_BY_KIND[cur.kind]}`,
    );
    if (s.beatTurns >= 2) {
      parts.push(
        `They have had two tries here. Give them the rescue (${cur.rescue}) or, if they managed it, react and ${then}${next ? ' Set "beat":"next".' : ''}`,
      );
    } else {
      parts.push(
        `Decide silently whether their reply did the beat's goal (${cur.goal}), even simply or with mistakes; meaning counts, not grammar.
- If yes: one short, specific reaction to what they said, then ${then}${next ? ' Set "beat":"next".' : ''}
- If not yet: react to what they said, then help them with the same goal another way (a model sentence to copy first). Set "beat":"stay".`,
      );
    }
    parts.push(
      'Never ask something they already answered or could not know, and never repeat your last question word for word.',
    );
  }
  if (s.saidAgain) {
    parts.push(
      'They have heard your last line twice. If they ask again or seem lost, say the same thing in fewer, simpler words.',
    );
  }
  parts.push(
    'Write only the spoken reply, then the control line: never notes about the learner, the beat or the plan.',
  );
  parts.push(`Word limit for this whole reply: ${limit} words.`);
  parts.push(controlRule(gloss, language));
  return { direction: parts.join('\n'), maxWords: limit };
}

const CONFUSED =
  /\b(sorry\??|again|slowly|slower|what\?|what do you mean|don'?t understand|không hiểu|hả)\b/i;

const OWN_SCRIPT = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ฀-๿぀-ヿ一-鿿가-힯]/gi;

/**
 * After two learner replies, code picks a lane from how they actually talk: own-language,
 * one-word or lost answers get the rescues; long answers get the follow-ups.
 */
export function pickLane(replies: readonly string[], stage: Stage): Lane {
  const ws = replies.map((r) => words(r));
  const avg = ws.reduce((a, b) => a + b, 0) / Math.max(1, ws.length);
  const own = replies.join(' ').match(OWN_SCRIPT)?.length ?? 0;
  const low = stage === 'visitor' || stage === 'newcomer';
  // Short is not lost: "It's good." is a fine answer to a closed question. Only real signs of
  // struggle (their own language, asking again, one-word answers) bring in the rescues.
  const confused = replies.filter((r) => CONFUSED.test(r)).length;
  const struggling = own >= 4 || avg < 1.5 || (confused >= 1 && avg <= 5);
  if (low && struggling) return stage === 'visitor' ? 'planned' : 'simple';
  if (stage !== 'local' && stage !== 'voice' && avg >= 12 && Math.max(...ws) >= 16) return 'rich';
  if (stage === 'visitor' && avg >= 7) return 'rich';
  return 'planned';
}
