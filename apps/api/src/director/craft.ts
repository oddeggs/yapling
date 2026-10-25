import type { Arrival } from '@yapling/contracts';

import type { Learner } from './store';
import { countryName, LANGUAGE_NAMES, type Stage } from './world';

/*
 * How the director tells a story: the craft rules for a whole story (its shape, its twist, its
 * payoff, why it is this learner's story) and for one scene (a situation already happening, a
 * character who wants something, the learner as the one who can help by speaking, a turn, an
 * ending that changes something and leads on). Same for every learner, so it is cached.
 */

export const STORY_CRAFT = `HOW A NATTERWICK STORY WORKS
A story is five scenes (four for a Visitor) told one conversation at a time, across two to four places, with two or three neighbours. Pip is the learner's companion through all of it: Pip walks with them between scenes and says why they are going, so the learner always knows what is going on. The learner is not a student in a lesson; they are a new resident whose voice is what the story needs.

THE SHAPE
1. The problem lands. A neighbour has a real, specific, low-stakes problem that matters to them (the café's espresso machine dies the morning of the food critic's visit; Sol has to give a talk in English on Friday and is terrified; Hank's crew is a person short for the harbour race). The learner gets drawn in because they can help by talking.
2. The first try. The learner and the neighbour try something; it half works. We learn what the neighbour really feels.
3. The turn. Something recontextualises the problem: a kind twist the learner did not see coming, set up earlier and fair in hindsight (Hank has been buying all the beans because he is secretly saving the café; the critic is Mei's old teacher; the "lost" letter was never lost, Mags kept it on purpose). Never a betrayal, never a villain.
4. The hard conversation. The scene that stretches the learner most: they persuade, negotiate, explain, apologise for someone, or stand up for a friend. It is the one closest to the hard situation they told us about.
5. The payoff. The learner's words resolve it. Something they said or chose in scene 1 or 2 comes back and matters (a plant paid off). An emotional beat lands: pride, relief, a laugh, a thank-you that means something. Then one small loose thread that makes them curious about the next story.

WHY IT IS THIS LEARNER'S STORY
- Built on what they told us when they arrived. Their reason for English is the spine: someone learning for work gets a story where meetings, updates and proposals carry the plot; an interview gets "tell me about yourself" and a story with a point; travel gets directions, bookings and strangers; friends gets small talk that turns into a real friendship. The hard conversation and the payoff rehearse the exact situation they said is hard for them, inside the story.
- Their interests are the material: a gamer gets the arcade's high-score board or a board-game night; a cook gets a recipe contest at the noodle stall; a film lover gets the one-showing-a-night cinema. Use one or two, specifically, never a list.
- Their work or study can be the reason they are needed ("You work with numbers, right? Can you help me check this?").
- Their country and culture, at most once in a story, as something they are the expert on.

WHAT MAKES IT WORTH COMING BACK
- An emotional core: what the central neighbour secretly feels (proud and too stubborn to ask for help, scared of looking foolish, homesick, lonely after a friend moved away) and how the learner helps without fixing it for them.
- Pip has a small arc of its own in every story (learning to be brave on the phone, a first friend, missing home, a new word it finally uses right), told in the walks between scenes.
- Every scene ends with a pull into the next: a promise, a discovery, a question that the next scene answers. Nobody ever says "come back soon".
- Continuity: neighbours remember what the learner said and did, in this story and in earlier ones. Earlier stories' people and things come back.

THE LONG JOURNEY (every story is unique, and each one grows from the last)
- Never retell a story. Each new story is a different kind (mystery, mix-up, rescue, competition, big day, secret, journey, mentoring, rivals to friends, new arrival, repair, discovery, celebration), centred on a different neighbour from the last two, with a new premise, a new twist and a new feeling. A neighbour from before can come back in a new light.
- The learner's place in town grows. In the first stories they are the new resident who helps; later neighbours come to them for advice; later still they lead (they run the meeting, they speak for the café at the town hall, they welcome the next newcomer and teach them). Pip grows alongside them.
- The language grows. Each story asks for one kind of conversation the learner has not done yet, a little harder than the last: from saying what they want, to explaining, to persuading, to handling disagreement, to leading a group. The hard situation they told us about comes back at a higher level, never as a rerun.
- Relationships deepen. A neighbour who was gruff in one story can be a friend in the next; small running jokes and promises from earlier stories pay off later.
- The town widens. Early stories stay near home (the burrow, the bus stop, the café); later ones reach the rest of town and further places.`;

export const SCENE_CRAFT = `HOW A SCENE WORKS
A scene is one live voice conversation (about 5 minutes, 6–10 learner turns) with one neighbour in one place.

- Arrive in the middle of something. When the scene opens, the neighbour is already doing something with a concrete problem, and turns to the learner for a reason that follows from the last scene ("There you are! The critic just called. She's coming at eleven, not three."). Never "Hi! How are you?", never small talk for its own sake.
- The neighbour drives. They want something now, they have opinions and feelings, they share news, jokes and small confessions. It is two people talking, not an interview: in most turns the neighbour gives something of their own (a reaction, a feeling, a piece of news) before asking.
- The learner acts. Every beat asks the learner to DO something with English that the story needs: explain, describe, suggest, persuade, ask the right question, give directions, retell what happened, apologise, plan, choose and say why, comfort, negotiate, refuse kindly. The answer changes what happens next.
- Questions are real. Ask what a friend in that situation would really ask, because the story needs the answer. No quiz questions, no questions just to make the learner speak ("What colour is it?"), no "What do you think?" with nothing to think about. Offer two choices only at Visitor level or as a rescue when the learner is stuck; never as the default.
- The turn. Around the middle, something changes: news arrives, a hidden reason comes out, a plan goes sideways, the neighbour admits something. The learner has to react to it.
- The ending is a consequence. Close on what changed because of what the learner said, then the button: the next step of the story, said by the neighbour ("Go and find Mags before the boat leaves. Tell her I sent you."). Never "thanks for coming by", never "see you".
- A feeling. Each scene has one: tension, laughter, tenderness, triumph, a quiet moment. Write it into what happens, not into adjectives.
- Level shapes the language, not the story. A Visitor gets the same kind of story in short words, with things to repeat and choose; a Local gets fast talk, idioms and pushback.`;

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
