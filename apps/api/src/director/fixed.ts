import { PLACES, pipAsleep, type PlaceId } from '@yapling/scene';
import { CAST } from '@yapling/story';

import type { Beat, MomentPlan } from './moment';
import type { StoryOutline } from './story';
import type { Stage } from './world';

/*
 * The moments nobody plans live: the first one (Pip, nervous about meeting the town, asks the
 * learner to show it how to introduce itself; the story begins as they go out), Pip's own small
 * stories at home while the director is still writing, and a visit the learner chose from the menu
 * (the neighbour is busy with their part of the story). Each has a reason to talk and an ending.
 */

const empty = () => ({
  card: [] as string[],
  card_gloss: '',
  bridge_card: '',
  bridge_line: '',
  recap_line: '',
  target_errors: [] as string[],
  personal_threads_used: [] as string[],
  callbacks: [] as string[],
  culture_touch: '',
  open_threads_after: [] as string[],
});

const beat = (
  what_happens: string,
  goal: string,
  example_line: string,
  if_struggling: string,
  if_strong: string,
  is_door = false,
): Beat => ({ what_happens, goal, is_door, example_line, if_struggling, if_strong });

const low = (stage: Stage) => stage === 'visitor' || stage === 'newcomer';

/** The first conversation, right after arriving: the burrow at the real time, with Pip. */
export function firstMoment(
  hour: number,
  firstLanguage: string,
  name: string | null = null,
  stage: Stage = 'visitor',
): MomentPlan {
  const asleep = pipAsleep('room', 0, hour);
  const vi = firstLanguage === 'vi';
  const you = name ? `${name}` : 'you';
  const opening = asleep
    ? stage === 'visitor'
      ? `Oh! Hi ${you}! I'm Pip. Can you help me?`
      : `Oh! You're here! Sorry, I fell asleep waiting. I'm Pip. ${name ? `${name}, right? ` : ''}Can you help me with something?`
    : stage === 'visitor'
      ? `Hi ${you}! I'm Pip. Can you help me?`
      : `You're here! ${name ? `You must be ${name}. ` : ''}I'm Pip, your roommate. Can you help me with something scary?`;
  return {
    ...empty(),
    title_open: asleep ? 'Out Like A Light' : 'Moved In, More Or Less',
    title_close: 'Somebody Finally Said Hello',
    place: 'room',
    variant: 0,
    stage_aimed: stage,
    situation: asleep
      ? 'Pip fell asleep on the sofa waiting for the learner, its notebook open on its chest.'
      : 'Pip has just moved into the burrow too and has been pacing by the door with its notebook.',
    character_wants:
      'Pip wants to go out and meet the neighbours, but is scared: it does not know how to introduce itself in English. It is too shy to say so at first.',
    dramatic_question: 'Will Pip be brave enough to go out and meet the town?',
    hook: 'Pip has a page in its notebook called "How to say hello to a whole town", and it is empty.',
    opening_line: opening,
    opening_gloss: vi
      ? stage === 'visitor'
        ? `Chào ${you}! Mình là Pip. Bạn giúp mình được không?`
        : 'Bạn đến rồi! Mình là Pip, bạn cùng nhà. Bạn giúp mình một việc đáng sợ được không?'
      : '',
    beats: [
      beat(
        'Pip admits the scary thing: it has to meet all the neighbours today and does not know what to say. It asks the learner how they would introduce themselves.',
        'introduce themselves: their name and one thing about them',
        'I meet the neighbours today. How do I say hello? Show me?',
        'Say: "Hi, I’m…" Your name?',
        'If you met a whole town today, what would you say first?',
      ),
      beat(
        'Pip copies the learner’s introduction proudly, then asks what else people say: what they do. Pip already knows a little from the learner’s arrival and asks about it with real curiosity.',
        'say what they do (work or study) and one thing about it',
        'And then? People ask "What do you do?" What do you say?',
        'Work or study? Tell me.',
        'What do you actually do all day? What’s the best part?',
        true,
      ),
      beat(
        'Pip tries its own introduction on the learner, with one small mistake ("I am live here"), and asks if it was okay.',
        'help Pip fix its line, or tell Pip it was good',
        'Okay. "Hi, I am Pip. I am live here." Good?',
        '"I live here." Can you say it?',
        'Be honest. What would you change?',
      ),
      beat(
        'Pip feels brave now and wants to go out right away, with the learner. It asks where they should go first.',
        'agree to go out and say where to start',
        'I feel brave! Let’s go out. Where first?',
        'Go out now? Yes?',
        'Where should we go first, and why?',
      ),
    ],
    the_turn:
      'When Pip tries its own introduction, it gets it a little wrong and is embarrassed; the learner’s kindness turns it brave.',
    target_phrases: ['Hi, I’m …', 'I work …', 'I study …', 'Nice to meet you.', 'Let’s go.'],
    pip_learns: 'how to introduce itself, from the learner',
    ending:
      'Pip writes the learner’s introduction in its notebook, says it once more, and pulls the learner out of the door to meet the town.',
    open_threads_after: ['Pip is going out to meet the town for the first time.'],
    director_notes: low(stage)
      ? 'The learner’s very first conversation. Short warm lines, your own answer first, lots of praise for any try. Pip is the nervous one, not the learner.'
      : 'The learner’s very first conversation. Pip is nervous and funny about it; let the learner be the confident one. Listen to how much English they use.',
  };
}

interface PipStory {
  readonly title_open: string;
  readonly title_close: string;
  readonly situation: string;
  readonly wants: string;
  readonly question: string;
  readonly opening: string;
  readonly opening_vi: string;
  readonly beats: readonly Beat[];
  readonly turn: string;
  readonly phrases: readonly string[];
  readonly learns: string;
  readonly ending: string;
}

/** Pip's own small stories at home: one is played while the director writes the next scene. */
const PIP_STORIES: readonly PipStory[] = [
  {
    title_open: 'A Postcard With No Words',
    title_close: 'Wish You Were Here, Probably',
    situation:
      'Pip is at the table with a postcard for its family far away. The front is a painting of the harbour. The back is empty.',
    wants: 'Pip wants to send its first postcard home in English, and is a little homesick.',
    question: 'What will Pip tell its family about its new life?',
    opening: 'Help! My first postcard home. In English! What do I write?',
    opening_vi: 'Cứu! Tấm bưu thiếp đầu tiên gửi về nhà. Bằng tiếng Anh! Mình viết gì đây?',
    beats: [
      beat(
        'Pip asks how postcards start in English.',
        'suggest how to start a postcard',
        'How do people start a postcard?',
        '"Dear Mum"? Or "Hi"?',
        'How would you start it, to sound warm?',
      ),
      beat(
        'Pip wants to say one good thing about Natterwick. It asks the learner what the best thing here is so far.',
        'say one good thing and why',
        'What is the best thing here, for you?',
        'Café or harbour? Which is best?',
        'What would you tell them about this town?',
      ),
      beat(
        'Pip goes quiet and admits it misses home. It asks what the learner does when they miss someone.',
        'comfort Pip or share what they do',
        'I miss them. What do you do when you miss people?',
        'Call them? Or write?',
        'What helps you when you miss someone?',
        true,
      ),
    ],
    turn: 'Pip admits the postcard is hard because it misses its family.',
    phrases: ['Dear …', 'I miss you.', 'The best thing is …'],
    learns: 'how to end a postcard warmly',
    ending:
      'Pip signs the postcard, reads it out proudly, and says it will post it at the bus stop on the way out.',
  },
  {
    title_open: 'Rehearsal For A Phone Call',
    title_close: 'Hello, Is This The Bakery',
    situation:
      'Pip is holding the burrow phone and putting it down again. The bakery number is written on its paw.',
    wants:
      'Pip wants to order a cake by phone for Mei’s café party, and is terrified of phone calls.',
    question: 'Will Pip make the call?',
    opening: 'Phone calls scare me. Can we practise? You are the bakery.',
    opening_vi: 'Mình sợ gọi điện lắm. Mình tập nhé? Bạn làm tiệm bánh nha.',
    beats: [
      beat(
        'Pip asks the learner to answer like the bakery would.',
        'answer the phone like a shop',
        'Ring ring! You are the bakery. What do you say?',
        '"Hello, bakery!" Say it?',
        'How does a shop answer the phone where you live?',
      ),
      beat(
        'Pip orders a cake, too fast and too quietly, then asks how it sounded.',
        'tell Pip how to say it better',
        'I want a cake for Friday. Was that okay?',
        'Slower? Or louder?',
        'What would make me sound more confident?',
      ),
      beat(
        'Pip asks the learner what they say when they do not hear something on the phone.',
        'say how to ask someone to repeat',
        'What if I don’t hear them? What do I say?',
        '"Sorry?" Or "Again, please?"',
        'What do you say when a call gets confusing?',
        true,
      ),
    ],
    turn: 'Halfway through the practice, the real phone rings and Pip panics.',
    phrases: ['Hello, this is …', 'Could you say that again?', 'I’d like to order …'],
    learns: 'what to say when you don’t hear someone on the phone',
    ending: 'Pip takes a breath, picks up the real phone, and says the learner’s line perfectly.',
  },
  {
    title_open: 'A Recipe Nobody Can Read',
    title_close: 'Close Enough To Soup',
    situation:
      'The burrow smells of onions. Pip found an old recipe card in the cupboard and has started cooking, but the card is half in pencil.',
    wants: 'Pip wants to cook a real dinner for the two of them and not burn anything this time.',
    question: 'Will dinner be edible?',
    opening: 'I am cooking! But this recipe card is old. Can you help?',
    opening_vi: 'Mình đang nấu ăn! Nhưng công thức này cũ quá. Bạn giúp mình nhé?',
    beats: [
      beat(
        'Pip reads a step it does not understand ("simmer") and asks what it means.',
        'explain a cooking word or guess it',
        'It says "simmer". What does simmer mean?',
        'Hot or cold? You guess!',
        'How would you explain "simmer" to someone who never cooked?',
      ),
      beat(
        'Pip asks what the learner would add to make it taste good.',
        'suggest an ingredient and why',
        'It needs something. What would you add?',
        'Salt or chilli?',
        'What would you add, and why?',
      ),
      beat(
        'Pip asks what dish the learner grew up eating, so it can try making it one day.',
        'describe a dish from home',
        'What did you eat at home, growing up?',
        'Rice or noodles at home?',
        'Tell me about a dish from home. How is it made?',
        true,
      ),
    ],
    turn: 'Pip realises the card is not a recipe for soup at all, it is for a cake, and they have made something new.',
    phrases: ['It means …', 'You should add …', 'At home we eat …'],
    learns: 'a dish from the learner’s home',
    ending: 'Pip tastes it, declares it a brand-new dish, and names it after the learner.',
  },
  {
    title_open: 'The Dream With The Upside-Down Bus',
    title_close: 'Dreams Are Mostly Buses',
    situation:
      'Pip is wrapped in a blanket on the sofa, eyes wide, holding its notebook with a drawing of a bus on its roof.',
    wants:
      'Pip had the strangest dream and needs to tell someone, but does not know the words for half of it.',
    question: 'What did the dream mean?',
    opening: 'I had the strangest dream. Can I tell you? I need words!',
    opening_vi: 'Mình vừa mơ một giấc mơ kỳ lạ lắm. Kể bạn nghe nhé? Mình cần từ!',
    beats: [
      beat(
        'Pip tells the dream in pieces: the bus 45 was upside down and flying. It asks how to say it properly.',
        'help Pip tell what happened, in the past',
        'The bus is... was... flying? How do I say it?',
        '"The bus flew." Say it?',
        'How would you tell this dream to a friend?',
      ),
      beat(
        'Pip asks if the learner remembers their dreams.',
        'tell a dream or say they don’t remember',
        'Do you remember your dreams?',
        'Yes or no? Dreams?',
        'What is the strangest dream you remember?',
        true,
      ),
      beat(
        'Pip asks what the learner thinks the dream means.',
        'give an opinion and a reason',
        'What do you think it means?',
        'Good dream or bad dream?',
        'If you had to guess what it means, what would you say?',
      ),
    ],
    turn: 'Pip remembers the end of the dream: the learner was the one driving the bus.',
    phrases: ['It was …', 'I dreamed that …', 'I think it means …'],
    learns: 'how to tell a story in the past',
    ending:
      'Pip writes the dream down with the learner’s words and decides it means they will have an adventure soon.',
  },
  {
    title_open: 'The List Of Good Things',
    title_close: 'Ten Good Things, Roughly',
    situation:
      'Pip is lying on the rug with a long piece of paper titled "Good Things About Living Here". It has two items.',
    wants:
      'Pip wants to fill its list to ten before bedtime, and wants the learner’s good things on it too.',
    question: 'Can they fill the list together?',
    opening: 'My list of good things only has two. Help me add more?',
    opening_vi: 'Danh sách điều tốt của mình mới có hai thôi. Thêm giúp mình nhé?',
    beats: [
      beat(
        'Pip reads its two items (the lamp, the bus driver waving). It asks for one good thing from the learner’s day.',
        'say one good thing from their day',
        'What was one good thing today?',
        'Good food? Or good news?',
        'What was the best moment of your day, and why?',
        true,
      ),
      beat(
        'Pip asks for a small good thing people forget about.',
        'name a small pleasure and say why',
        'What is a small good thing people forget?',
        'Coffee? Or sleep?',
        'What small thing makes you happy that nobody notices?',
      ),
      beat(
        'Pip asks what the learner is looking forward to.',
        'talk about something coming up',
        'What are you looking forward to?',
        'The weekend? Yes?',
        'What are you looking forward to this week, and why?',
      ),
    ],
    turn: 'Pip adds a secret item at the top of the list and won’t say what it is at first: it is the learner.',
    phrases: ['One good thing was …', 'I’m looking forward to …', 'It makes me happy.'],
    learns: 'one thing that makes the learner happy',
    ending:
      'Pip pins the list on the wall where both of them can see it, and adds one blank line for tomorrow’s good thing.',
  },
];

/**
 * Pip's free moment in the burrow while the director writes: one of Pip's own small stories,
 * never the same as the last few.
 */
export function freeMoment(
  hour: number,
  name: string | null,
  firstLanguage: string,
  played: number,
  stage: Stage = 'newcomer',
): MomentPlan {
  const asleep = pipAsleep('room', 0, hour);
  const s = PIP_STORIES[played % PIP_STORIES.length]!;
  const opening = asleep ? `Oh! I dozed off. ${s.opening}` : s.opening;
  return {
    ...empty(),
    title_open: s.title_open,
    title_close: s.title_close,
    place: 'room',
    variant: 0,
    stage_aimed: stage,
    situation: asleep ? `Pip had dozed off on the sofa. ${s.situation}` : s.situation,
    character_wants: s.wants,
    dramatic_question: s.question,
    hook: s.wants,
    opening_line: opening,
    opening_gloss: firstLanguage === 'vi' ? s.opening_vi : '',
    beats: [...s.beats],
    the_turn: s.turn,
    target_phrases: [...s.phrases],
    pip_learns: s.learns,
    ending: s.ending,
    director_notes: `A small story of Pip's own, at home${name ? ` with ${name}` : ''}. Keep it warm and funny; Pip needs the learner's help for real.`,
  };
}

/**
 * A visit the learner chose from the menu: the neighbour is in, busy with their part of the
 * learner's story (or their own evening), and needs a hand with one small thing.
 */
export function visitMoment(
  place: PlaceId,
  variant: number,
  hour: number,
  name: string | null,
  story: StoryOutline | null = null,
  stage: Stage = 'newcomer',
): MomentPlan {
  const p = PLACES[place];
  const v = p.variants[variant] ?? p.variants[0];
  const resident = CAST[p.resident].name;
  const doing =
    story?.town_now.find((t) => t.who === p.resident)?.doing ??
    `${resident} is busy with ${v.prop}.`;
  const hello = name ? `Oh, ${name}! Good timing.` : 'Oh! Good timing.';
  return {
    ...empty(),
    title_open: v.title,
    title_close: `Dropped In On ${resident}`.slice(0, 80),
    place,
    variant,
    stage_aimed: stage,
    situation: `${p.story} ${doing}`,
    character_wants: `${resident} needs a second opinion or a hand with what they are doing right now.`,
    dramatic_question: `Can the learner help ${resident} with it?`,
    hook: `In the painting: ${v.prop}. ${doing}`,
    opening_line:
      stage === 'visitor'
        ? `${hello} Can you help me?`
        : `${hello} I need a second opinion. Got a minute?`,
    opening_gloss: '',
    beats: [
      beat(
        `${resident} explains what they are in the middle of (${doing}) and what has gone wrong.`,
        'ask what happened or what they need',
        'Look at this. What would you do?',
        'This one, or that one?',
        'What would you do in my place?',
      ),
      beat(
        `${resident} asks for the learner’s idea, and pushes back on it once, kindly.`,
        'suggest an idea and give a reason',
        'Hm. Why that one?',
        'Good idea? Yes?',
        'Convince me. Why is that better?',
      ),
      beat(
        `${resident} asks how the learner would handle something like this in their own life or work.`,
        'tell how they handle something similar',
        'Do you have this problem at work?',
        'At work too? Yes or no?',
        'How do you deal with this kind of thing in your life?',
        true,
      ),
    ],
    the_turn: `${resident} admits why it matters to them more than it seems.`,
    target_phrases: ['What happened?', 'I think you should …', 'Because …'],
    pip_learns: 'how the learner would solve it',
    ending: story
      ? `${resident} takes the learner’s idea, then mentions what is going on in "${story.title}" and sends them back to it.`
      : `${resident} takes the learner’s idea and gets back to work, pleased.`,
    director_notes: `A visit the learner chose. ${resident} is busy, true to the bible, and the learner’s idea really helps.`,
  };
}
