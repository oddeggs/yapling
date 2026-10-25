import { PLACES, openVariants, type PlaceId } from '@yapling/scene';
import { CAST } from '@yapling/story';

import { COMPANION, type CompanionId } from '../curriculum/companion';
import type { Beat, Brief, MomentPlan } from './moment';
import type { Stage } from './world';

/*
 * The moments nobody plans live, written to the same scene rules: the first one (the companion
 * meets the learner off the 45 and they introduce themselves), a short honest rehearsal of recent
 * phrases while the director is still writing, and a visit the learner chose from the menu.
 */

const beat = (
  kind: Beat['kind'],
  what_happens: string,
  goal: string,
  example_line: string,
  rescue: string,
): Beat => ({ kind, speaker: 'companion', what_happens, goal, example_line, rescue });

type Fixed = Pick<
  MomentPlan,
  | 'place'
  | 'variant'
  | 'stage_aimed'
  | 'companion'
  | 'unit_id'
  | 'episode'
  | 'knowledge_ledger'
  | 'guest'
  | 'guest_intro'
  | 'guest_how'
  | 'gap'
  | 'recycled_chunks'
  | 'prompt_forms'
  | 'culture_touch'
  | 'callbacks'
>;

const base = (
  companion: MomentPlan['companion'],
  stage: Stage,
  place: PlaceId,
  variant: number,
): Fixed => ({
  place,
  variant,
  stage_aimed: stage,
  companion,
  unit_id: '',
  episode: 0,
  knowledge_ledger: [],
  guest: 'none',
  guest_intro: '',
  guest_how: 'none',
  gap: 'The companion does not know the learner yet: everything they ask is about the learner’s own life.',
  recycled_chunks: [],
  prompt_forms: [],
  culture_touch: '',
  callbacks: [],
});

const low = (stage: Stage) => stage === 'visitor' || stage === 'newcomer';

/** What each companion says about themselves when they first meet the learner. */
const SELF: Readonly<Record<CompanionId, string>> = {
  sol: 'I work at the office in Hollowbrook',
  nell: 'I run the front desk at the Lantern Inn',
  mei: 'I run the Lantern Café',
  linh: 'I work at the library, next door to you',
  pip: 'I live in the burrow with you',
};

const SELF_VI: Readonly<Record<CompanionId, string>> = {
  sol: 'mình làm ở văn phòng Hollowbrook',
  nell: 'mình làm lễ tân ở nhà trọ Lantern',
  mei: 'mình mở quán Lantern Café',
  linh: 'mình làm ở thư viện, ngay cạnh nhà bạn',
  pip: 'mình ở chung nhà với bạn',
};

/** Where the first walk goes: two places, said aloud. */
const FIRST_STOP: Readonly<Record<CompanionId, string>> = {
  sol: 'the café for a coffee, or straight home',
  nell: 'the inn for a cup of tea, or straight home',
  mei: 'my café for a coffee, or straight home',
  linh: 'the library on the way, or straight home',
  pip: 'home, or the rooftop to see the town',
};

/** The first conversation: the companion meets the learner off the 45 at the bus stop. */
export function firstMoment(
  companion: CompanionId,
  name: string | null,
  stage: Stage,
  firstLanguage: string,
  hour: number,
): MomentPlan {
  const c = COMPANION[companion];
  const vi = firstLanguage === 'vi';
  const you = name ?? 'there';
  const variant = openVariants('bus', hour)[0] ?? 0;
  const brief: Brief = {
    recap: '',
    where: 'The bus stop',
    happening: `You just got off the 45. ${c.name} came to meet you.`,
    your_role: 'You are new in town.',
    tasks: ['Say hello and your name.', 'Say what you do.', 'Choose where to go first.'],
    try_saying: ['Nice to meet you.', 'I work at …'],
  };
  const opening = low(stage)
    ? `Hi ${you}! I'm ${c.name}. ${SELF[companion]}. Welcome! Long trip?`
    : `There you are! You must be ${you}. I'm ${c.name}, ${SELF[companion]}. Welcome to Natterwick! Was it a long trip?`;
  return {
    ...base(companion, stage, 'bus', variant),
    title_open: 'Off The 45, Finally',
    title_close: 'Somebody Was Waiting',
    brief,
    brief_gloss: vi
      ? `Trạm xe buýt. Bạn vừa xuống xe 45, ${c.name} ra đón bạn. Bạn mới đến thị trấn. Hãy chào và nói tên mình, nói bạn làm gì, rồi chọn đi đâu trước. Thử nói: "Nice to meet you." / "I work at …"`
      : '',
    situation: `The 45 has just left. ${c.name} is waiting at the stop to meet the learner, who has just moved to Natterwick.`,
    why_the_learner: `${c.name} wants to get to know the learner and show them around.`,
    opening_line: opening,
    opening_gloss: vi
      ? `Chào ${you}! Mình là ${c.name}, ${SELF_VI[companion]}. Chào mừng bạn! Đi đường có xa không?`
      : '',
    beats: [
      beat(
        'success_first',
        `${c.name} asks about the trip; any answer is fine, and ${c.name} says something of their own about arriving in a new town.`,
        'answer about the trip',
        low(stage) ? 'Long trip? Tired?' : 'Was it a long trip?',
        'Say: "Yes, long." or "No, OK."',
      ),
      beat(
        'open',
        `${c.name} says "Nice to meet you" and what they do, then asks what the learner does: a real question, because they just met.`,
        'say what they do (work or study)',
        low(stage)
          ? 'Nice to meet you! What do you do?'
          : 'Nice to meet you. So what do you do back home?',
        'Say: "I work at …" or "I study …". Work, or study?',
      ),
      beat(
        'task',
        `${c.name} is curious about it and asks one real follow-up about the learner's work or study (what they like about it, or what a normal day is like).`,
        'say one more thing about their work or study',
        low(stage) ? 'Do you like it?' : 'What do you like most about it?',
        'Say: "I like …" Yes, or no?',
      ),
      beat(
        'close',
        `${c.name} offers two places to go first (${FIRST_STOP[companion]}) and asks which; they go where the learner chose.`,
        'choose where to go first',
        `First: ${FIRST_STOP[companion]}?`,
        'Say: "Coffee, please." or "Home, please."',
      ),
    ],
    target_chunks: ['Hi, I’m …', 'Nice to meet you.', 'I work at …', 'And you?'],
    listening_task: `Catch ${c.name}'s name and what ${c.name} does.`,
    end_condition: 'The learner has said who they are and chosen where to go first.',
    ending: `${c.name} says they'll go where the learner chose, and that there's lots to show them.`,
    companion_learns: 'the learner’s name and what they do',
    director_notes: `The learner's very first conversation. ${c.name} is warm and a little excited; the learner should succeed at everything here.`,
  };
}

/**
 * A short, honest rehearsal while the director is still writing: the companion says plainly they
 * want to practise a couple of phrases, and uses each in a real question about the learner's life.
 */
export function freeMoment(
  companion: CompanionId,
  name: string | null,
  stage: Stage,
  firstLanguage: string,
  hour: number,
  chunks: readonly string[],
): MomentPlan {
  const c = COMPANION[companion];
  const place = (c.places.find((p) => openVariants(p as PlaceId, hour).length > 0) ??
    'room') as PlaceId;
  const variant = openVariants(place, hour)[0] ?? 0;
  const practise = chunks.length ? chunks.slice(0, 2) : ['I work at …', 'And you?'];
  const vi = firstLanguage === 'vi';
  const practiceBeats = practise.map((p, i) =>
    beat(
      i === 0 ? 'open' : 'task',
      `${c.name} uses "${p}" about their own life first, then asks the learner a real question that needs it about theirs.`,
      `use "${p}" about their own life`,
      `I'll go first: ${p.replace('…', 'something true')}. And you?`,
      `Say: "${p}" Then one word.`,
    ),
  );
  return {
    ...base(companion, stage, place, variant),
    title_open: 'A Minute, Between Things',
    title_close: 'Said It Twice, Remembered It',
    brief: {
      recap: '',
      where: PLACES[place].name,
      happening: `A quiet minute with ${c.name}.`,
      your_role: 'You are practising two phrases, out loud, for real.',
      tasks: practise.map((p) => `Use "${p}" about your own life.`),
      try_saying: [...practise],
    },
    brief_gloss: vi
      ? `Một phút yên tĩnh với ${c.name}. Luyện hai câu: ${practise.join(' / ')}, nói về cuộc sống của chính bạn.`
      : '',
    situation: `A quiet minute. ${c.name} suggests practising two phrases together, honestly, as practice.`,
    why_the_learner: 'They are practising for themselves.',
    gap: 'The companion asks about the learner’s own life: answers it cannot know.',
    opening_line: low(stage)
      ? `${name ? `${name}, ` : ''}quick practice? Two phrases. Ready?`
      : `${name ? `${name}, ` : ''}got a minute? Let's practise two phrases from last time, quickly. Ready?`,
    opening_gloss: vi ? 'Luyện nhanh hai câu nhé? Sẵn sàng chưa?' : '',
    beats: [
      ...practiceBeats,
      beat(
        'close',
        `${c.name} says back one thing the learner said, praises the phrase they used by name, and goes back to what they were doing.`,
        'none',
        'You used both. Nice.',
        '',
      ),
    ],
    target_chunks: [...practise],
    listening_task: `Catch what ${c.name} says about their own life.`,
    end_condition: 'The learner has used both phrases about their own life.',
    ending: `${c.name} thanks them and goes back to what they were doing.`,
    companion_learns: 'two small things about the learner’s life',
    director_notes: 'An honest practice minute, never a fake story. Short and light.',
  };
}

/**
 * A visit the learner chose from the menu: the neighbour is in, busy with something they describe
 * aloud, and asks the learner's honest opinion on it.
 */
export function visitMoment(
  place: PlaceId,
  variant: number,
  name: string | null,
  stage: Stage = 'newcomer',
): MomentPlan {
  const p = PLACES[place];
  const v = p.variants[variant] ?? p.variants[0];
  const resident = p.resident;
  const who = CAST[resident].name;
  const hello = name ? `Oh, ${name}! Good timing.` : 'Oh! Good timing.';
  return {
    ...base(resident as MomentPlan['companion'], stage, place, variant),
    title_open: v.title,
    title_close: `Dropped In On ${who}`.slice(0, 80),
    brief: {
      recap: '',
      where: p.name,
      happening: `${who} is busy here.`,
      your_role: 'You dropped in.',
      tasks: ['Ask what is going on.', 'Give your honest opinion and say why.'],
      try_saying: ['What happened?', 'I think … because …'],
    },
    brief_gloss: '',
    situation: `${p.story} ${who} is busy with ${v.prop}.`,
    why_the_learner: `${who} wants an honest outside opinion.`,
    gap: `${who} describes the problem aloud; only the learner can give their own opinion.`,
    opening_line: low(stage)
      ? `${hello} Can you help me?`
      : `${hello} I need an honest opinion. Got a minute?`,
    opening_gloss: '',
    beats: [
      beat(
        'success_first',
        `${who} says, in words, what they are busy with (${v.prop}) and what has gone wrong.`,
        'ask what happened or say yes',
        'Something went wrong here. Want to hear?',
        'Say: "Yes. What happened?"',
      ),
      beat(
        'task',
        `${who} describes two options aloud and asks which the learner would choose and why.`,
        'give an opinion with a reason',
        'Which would you do, and why?',
        'Say: "I think … because …" The first, or the second?',
      ),
      beat(
        'close',
        `${who} takes the learner's advice and says what they'll do now.`,
        'none',
        'Good. I’ll do that.',
        '',
      ),
    ],
    target_chunks: ['What happened?', 'I think … because …'],
    listening_task: `Catch the two options ${who} describes.`,
    end_condition: 'The learner has given an opinion with a reason.',
    ending: `${who} takes the learner's idea and gets back to work.`,
    companion_learns: 'what the learner would do',
    director_notes: `A visit the learner chose. ${who} is busy, true to the bible.`,
  };
}
