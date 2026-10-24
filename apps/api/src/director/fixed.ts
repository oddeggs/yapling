import { PLACES, pipAsleep, type PlaceId } from '@yapling/scene';
import { CAST } from '@yapling/story';

import type { MomentPlan } from './moment';

/*
 * The two moments nobody plans: the very first one (Pip in the burrow asks the learner's name and
 * one easy question, so the director has something to start from), and Pip's free moment in the
 * burrow, played while the director is still writing the next one.
 */

/** The first conversation: the app opens straight into the burrow at the real time, with Pip. */
export function firstMoment(hour: number, firstLanguage: string): MomentPlan {
  const asleep = pipAsleep('room', 0, hour);
  return {
    title_open: asleep ? 'Out Like A Light' : 'Moved In, More Or Less',
    title_close: 'Somebody Finally Said Hello',
    place: 'room',
    variant: 0,
    stage_aimed: 'visitor',
    while_you_were_away: asleep
      ? 'Pip fell asleep on the sofa waiting for the learner and wakes up with a yawn when they come in.'
      : 'Pip has just moved into the burrow and has been waiting on the sofa to meet the learner.',
    hook: 'Pip has a new notebook with one empty page, and wants the learner’s name to be the first word in it.',
    opening_line: asleep
      ? 'Oh! Hello! I was sleeping. I’m Pip. What’s your name?'
      : 'Oh! Hello! You’re here! I’m Pip. What’s your name?',
    opening_gloss:
      firstLanguage === 'vi'
        ? asleep
          ? 'Ồ! Chào bạn! Mình ngủ quên mất. Mình là Pip. Bạn tên gì?'
          : 'Ồ! Chào bạn! Bạn đến rồi! Mình là Pip. Bạn tên gì?'
        : '',
    beats: [
      {
        what_happens:
          'Pip says hello and asks the learner’s name, modelling it first. Pip writes the name in its new notebook and says it back.',
        goal: 'say their name',
        is_door: false,
        example_line: 'I’m Pip. What’s your name?',
        if_struggling: 'My name is Pip. Your name?',
        if_strong: 'I’m Pip, your new roommate. What should I call you?',
      },
      {
        what_happens:
          'Pip offers the learner something to drink, the way a new roommate would, with two easy choices.',
        goal: 'choose one of two things',
        is_door: false,
        example_line: 'Tea or coffee? I have both!',
        if_struggling: 'Tea or coffee?',
        if_strong: 'I can make tea or coffee. What do you usually drink?',
      },
      {
        what_happens:
          'Pip wants to know what the learner does all day, so it knows when they come home. A door: work or study, or something else.',
        goal: 'say if they work or study, and one thing about it',
        is_door: true,
        example_line: 'Do you work or study?',
        if_struggling: 'Work or study?',
        if_strong: 'What do you do all day? Work, study, something else?',
      },
      {
        what_happens:
          'Pip thanks the learner, reads its notebook page back proudly, and asks if next time they could show it the bus stop: Pip has never been on a bus.',
        goal: 'answer yes or no to a plan',
        is_door: false,
        example_line: 'Next time, the bus stop? Yes?',
        if_struggling: 'Bus stop, next time? Yes?',
        if_strong: 'I’ve never been on a bus. Could you show me the bus stop next time?',
      },
    ],
    target_phrases: ['My name is …', 'I work …', 'I study …', 'Yes, please.'],
    target_errors: [],
    personal_threads_used: [],
    callbacks: [],
    culture_touch: '',
    pip_learns: 'the learner’s name, as the first word in its notebook',
    cliffhanger: 'Pip has never been on a bus and wants the learner to show it the bus stop.',
    open_threads_after: ['Pip wants to see the bus stop and ride the 45.'],
    director_notes:
      'This is the learner’s very first conversation: we know nothing yet. Keep every line short and warm, say your own answer first, and offer two choices. Listen for how much English they use, and whether they answer in another language.',
  };
}

/**
 * Pip's free moment in the burrow: no plan needed, a little time together while the director
 * writes the next story. It still has a door, so the town keeps learning about the learner.
 */
export function freeMoment(hour: number, name: string | null, firstLanguage: string): MomentPlan {
  const asleep = pipAsleep('room', 0, hour);
  const evening = hour >= 17 || hour < 4;
  return {
    title_open: asleep ? 'Out Like A Light' : 'Home, More Or Less',
    title_close: evening ? 'Nothing Much, Together' : 'A Small Day, Told Twice',
    place: 'room',
    variant: 0,
    stage_aimed: 'newcomer',
    while_you_were_away: asleep
      ? 'Pip dozed off on the sofa and wakes up happy to see the learner.'
      : 'Pip has been practising words from its notebook all day.',
    hook: `Pip wants to hear about the learner's day${name ? `, ${name}` : ''}, and to learn one new word from it for the notebook.`,
    opening_line: asleep
      ? 'Oh! Hi! I fell asleep. How was your day?'
      : 'Hi! You’re back. How was your day?',
    opening_gloss:
      firstLanguage === 'vi'
        ? asleep
          ? 'Ồ! Chào! Mình ngủ quên. Hôm nay của bạn thế nào?'
          : 'Chào! Bạn về rồi. Hôm nay của bạn thế nào?'
        : '',
    beats: [
      {
        what_happens: 'Pip asks how the learner’s day was, with two easy choices for a beginner.',
        goal: 'say how their day was',
        is_door: false,
        example_line: 'How was your day? Good or busy?',
        if_struggling: 'Your day: good or busy?',
        if_strong: 'Tell me about your day. What was the best part?',
      },
      {
        what_happens:
          'Pip asks one thing the learner did or ate today, curious about their life where they live.',
        goal: 'say one thing they did or ate today',
        is_door: true,
        example_line: 'What did you eat today? I had toast.',
        if_struggling: 'Rice or noodles today?',
        if_strong: 'What did you eat today? Is it a food from your home?',
      },
      {
        what_happens:
          'Pip picks one word the learner just used and asks what it means, then writes it in its notebook and tries to use it.',
        goal: 'explain one word to Pip',
        is_door: false,
        example_line: 'Ooh, new word! What does it mean?',
        if_struggling: 'New word! Say it again?',
        if_strong: 'Wait, let me write that. Can you explain it simply?',
      },
    ],
    target_phrases: ['It was …', 'I had …', 'It means …'],
    target_errors: [],
    personal_threads_used: [],
    callbacks: [],
    culture_touch: 'If the learner names a dish from home, Pip wants to know how it tastes.',
    pip_learns: 'one word from the learner’s day',
    cliffhanger: 'Pip says it will try the new word on the next neighbour it meets.',
    open_threads_after: [],
    director_notes:
      'A free moment: no big story. Keep it light, follow the learner, use their name if known, and find one word to learn from them.',
  };
}

/**
 * A visit the learner chose from the menu: the resident is in, doing what they do at this hour,
 * and glad of the company. A short chat with a door, and one small thing they need a hand with.
 */
export function visitMoment(
  place: PlaceId,
  variant: number,
  hour: number,
  name: string | null,
): MomentPlan {
  const p = PLACES[place];
  const v = p.variants[variant] ?? p.variants[0];
  const resident = CAST[p.resident].name;
  const hello = name ? `Oh, hi ${name}!` : 'Oh, hi!';
  return {
    title_open: v.title,
    title_close: `Company At ${p.name.replace(/^The /, 'The ')}`.slice(0, 80),
    place,
    variant,
    stage_aimed: 'newcomer',
    while_you_were_away: `${resident} is at ${p.name} as usual at this hour. ${p.story}`,
    hook: `The learner dropped by. In the painting: ${v.prop}. ${resident} could use a hand with something small about it.`,
    opening_line: `${hello} You came by! ${hour >= 18 || hour < 5 ? 'Long day?' : 'Busy day?'}`,
    opening_gloss: '',
    beats: [
      {
        what_happens: `${resident} asks how the learner is and what brings them here, with two easy choices.`,
        goal: 'say how they are and why they came',
        is_door: false,
        example_line: 'Just passing, or looking for me?',
        if_struggling: 'Just passing? Yes or no?',
        if_strong: 'What brings you here at this hour?',
      },
      {
        what_happens: `${resident} mentions ${v.prop} and asks for the learner's idea or help with it.`,
        goal: 'give a simple idea or opinion',
        is_door: false,
        example_line: 'Can I ask you something? What would you do?',
        if_struggling: 'This or that? You choose.',
        if_strong: 'What would you do, and why?',
      },
      {
        what_happens: `${resident} asks one thing about the learner's own life that fits the place (what they eat, how they travel, what they do after work), with "or something else?".`,
        goal: 'tell one thing about their own life',
        is_door: true,
        example_line: 'And you? What do you usually do after work?',
        if_struggling: 'After work: rest or cook?',
        if_strong: 'Tell me about your evenings. What do you like doing?',
      },
    ],
    target_phrases: ['I came to …', 'I think you should …', 'Usually I …'],
    target_errors: [],
    personal_threads_used: [],
    callbacks: [],
    culture_touch: 'If the learner mentions something from home, the resident is curious about it.',
    pip_learns: 'one thing about the learner’s everyday life',
    cliffhanger: `${resident} thanks the learner and says to come by again, there is always something going on here.`,
    open_threads_after: [],
    director_notes: `A visit the learner chose. Keep it warm and light, play ${resident} true to the bible, and follow the learner.`,
  };
}
