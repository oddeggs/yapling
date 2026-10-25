import type { Arrival } from '@yapling/contracts';

import type { Learner } from './store';
import { countryName, LANGUAGE_NAMES, type Stage } from './world';

/*
 * How the director tells a story: the craft rules for a whole story (its shape, its twist, its
 * payoff, why it is this learner's story) and for one scene (a situation already happening, a
 * character who wants something, the learner as the one who can help by speaking, a turn, an
 * ending that changes something and leads on). Same for every learner, so it is cached.
 */

export const STORY_CRAFT = `HOW A YAPLING STORY WORKS
The curriculum writes every story. Each story is one unit of the syllabus: the unit fixes what the learner can do by the end (the can-do), the function, 3–5 target chunks and one conversation strategy. You invent only the situation, the twist and the feeling, so that using the unit's language is the natural way to get through the story.

ONE COMPANION
The learner has one companion, who is with them in every scene: their friend and ally in Natterwick, matched to their reason for learning English. The companion never changes personality and is never the source of pressure. Pressure and difficulty come from a guest, used sparingly. The learner always knows who is speaking beside them.

THE FIVE EPISODES (four at Visitor, where the first two merge)
1. The problem lands: the situation, and the companion models the target chunks so the learner notices them. A first question the learner can surely answer, then the chunks in controlled use, framed honestly as rehearsal.
2. The first try: the learner uses the chunks for a small goal; an information gap from their own life or job.
3. The turn: news arrives as audio (a voice message, a phone call, the companion reading something aloud). The learner catches the gist, a detail, and one inference, reacts, and uses the unit's strategy.
4. The hard conversation: the free task, in the situation the learner said is hard, with a clear outcome (an agreement, a booking, a refund). A moment to plan first. Nobody corrects them during it.
5. The payoff: the outcome lands because of what they said; they retell it to someone who missed it, once, then once more and shorter; the companion looks back at two or three phrases.

WHY IT IS THEIR STORY
- Their reason for English decides where the story happens (an office for work, a hotel or flat for travel and moving, a café for friends). The hard conversation in episode 4 is the situation they said is hard.
- Their job or study makes them needed ("You do accounts, can you check these figures?"). Their interests flavour the props and the payoff, one or two, never a list.
- Their country comes in at most once a story, as something they are the expert on.

WHAT KEEPS IT CLEAR
- One simple, concrete situation a newcomer would really meet, low stakes and warm. No mysteries the learner has to piece together, no secret plots, no in-world facts they would have to remember from nowhere.
- The cast: the companion, plus at most one guest per scene (none at Visitor, only in episode 4 at Newcomer), and at most one new named character in the whole story, always introduced by name, role and relation.
- Every scene ends on a consequence of what the learner said and a clear next step.
- A kind turn in episode 3 (news that changes the plan, a hidden reason that makes someone more human), never a betrayal or a villain.`;

export const SCENE_RULES = `THE RULES EVERY SCENE KEEPS (a checker reads your plan against them)
1. Genuine questions. Every question the companion or guest asks passes three checks: the asker does not already know the answer; a real person in this situation would ask it; the answer changes what happens next. No quiz questions, no questions just to make the learner talk ("What colour is it?", "What do you think?" about nothing).
2. An honest practice frame. Repeating or drilling a line is allowed only when the story says so truthfully ("Be my first customer. Ask me the price.").
3. The knowledge ledger. The learner is only asked about: their own life (L), what was told aloud in this scene or its brief (B), what was said in an earlier scene (S), everyday world knowledge (W), or their opinion and feelings. Never anything else: no "Pip's note says you're our speaker", no shared past they never heard.
4. Say it or it doesn't exist. The learner hears this; they may not see anything. Nothing they need is only visible: no "look at this", "which one?", "what does the board say?" unless it was said aloud first. The painting is mood, never information.
5. The cast budget. The companion, plus at most one guest, introduced by name and role the first time.
6. Talk to the learner. At Visitor and Newcomer nobody talks to anyone but the learner.
7. The brief. Before the scene the learner reads and hears: where, what is happening, their role, 1–3 tasks, the facts they hold, and 1–2 phrases to try. The brief holds every fact the tasks need.
8. Model before you ask. The companion uses each target chunk naturally at least twice before the learner needs it.
9. Success first. The first thing the learner is asked is something they can surely answer (about themselves, or straight from the brief).
10. Correct like a friend. Prompt in character only on the 1–2 target forms ("Two coin… or two coins?"); quietly say the rest back correctly; never correct during the episode-4 task; save explanations for the look-back.
11. Earned praise only. Praise names what the learner just did ("You asked the price and checked it."), never empty praise.
12. Wait, then rescue. Give time. If the learner is stuck: offer a model sentence they can copy, then two short choices. Never answer for them.
13. End on a consequence: the scene ends when its outcome happens, because of what the learner said.
14. Voice-friendly situations: phone calls, voice messages, walking and talking, the companion reading something aloud, ordering at a counter.`;

/** The old name, kept for the scene planner's prompt. */
export const SCENE_CRAFT = SCENE_RULES;

export const ARRIVAL_LABELS = {
  why: {
    work: 'work (meetings, emails, calls with colleagues)',
    interview: 'a job interview',
    travel: 'travel',
    study: 'studying',
    exam: 'an English exam (speaking test)',
    move: 'moving abroad',
    friends: 'making friends',
    media: 'films, music and the internet without subtitles',
    family: 'family',
    me: 'just for themselves',
  },
  interests: {
    food: 'food and cooking',
    music: 'music',
    films: 'films and series',
    games: 'games',
    sport: 'sport',
    travel: 'travel',
    tech: 'tech',
    books: 'books',
    fitness: 'fitness',
    pets: 'pets',
    fashion: 'fashion',
    nature: 'nature',
    art: 'art and design',
    business: 'business',
    photos: 'photography',
    cars: 'cars',
  },
  hard: {
    meetings: 'speaking up in meetings',
    small_talk: 'small talk',
    phone: 'phone calls',
    fast_speech: 'understanding fast speech',
    words: 'finding the right words',
    pronunciation: 'pronunciation',
    interviews: 'interviews',
    nerves: 'freezing up and nerves',
  },
  doing: {
    work: 'works',
    study: 'studies',
    both: 'works and studies',
    neither: 'between things right now',
  },
} as const;

const SELF_LEVEL: Readonly<Record<number, string>> = {
  1: '1/5, "I know a few words"',
  2: '2/5, "I can say simple things, slowly"',
  3: '3/5, "I can handle everyday talk but I get stuck"',
  4: '4/5, "I can talk about most things, but not fluently"',
  5: '5/5, "I am fluent and want to sound natural"',
};

/** The stage the learner's own feel for their level points to, before any conversation. */
export const ARRIVAL_STAGE: Readonly<Record<number, Stage>> = {
  1: 'visitor',
  2: 'newcomer',
  3: 'neighbour',
  4: 'regular',
  5: 'local',
};

/** The learner as they introduced themselves, in plain words for the director. */
export function arrivalText(learner: Learner): string {
  const a: Arrival | null = learner.arrival;
  const language = LANGUAGE_NAMES[learner.firstLanguage] ?? learner.firstLanguage;
  const home = countryName(learner.country) ?? 'a country we do not know yet';
  if (a === null) {
    return `${learner.name ?? 'Name not known yet'}; first language ${language}; lives in ${home}. They have not told the town anything else yet.`;
  }
  const work =
    a.doing === 'neither'
      ? ARRIVAL_LABELS.doing.neither
      : `${ARRIVAL_LABELS.doing[a.doing]}${a.field ? ` (in their words: "${a.field}")` : ''}`;
  return [
    `${a.name}; first language ${language}; lives in ${home}.`,
    `Learning English for: ${a.why.map((w) => ARRIVAL_LABELS.why[w]).join('; ')}.`,
    `Work or study: ${work}.`,
    a.interests.length
      ? `They love: ${a.interests.map((i) => ARRIVAL_LABELS.interests[i]).join('; ')}.`
      : 'They did not pick any interests.',
    a.hard.length
      ? `What is hard for them in English: ${a.hard.map((h) => ARRIVAL_LABELS.hard[h]).join('; ')}.`
      : '',
    `Their own feel for their spoken English: ${SELF_LEVEL[a.level] ?? a.level}.`,
  ]
    .filter(Boolean)
    .join('\n');
}
