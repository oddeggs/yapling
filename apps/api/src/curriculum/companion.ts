import type { Arrival } from '@yapling/contracts';

import type { Stage } from '../director/world';

/*
 * The one neighbour who goes through every story with the learner. Matched first on the learner's
 * reason for English (whose working life is where their hard situations happen), then given a
 * stance from their confidence, then chosen by the learner from the top two. The companion is
 * always an ally; pressure comes from guests. Its personality never changes, only its stance as
 * the learner grows.
 */

export const COMPANIONS = ['sol', 'nell', 'mei', 'linh', 'pip'] as const;
export type CompanionId = (typeof COMPANIONS)[number];

export interface Companion {
  readonly id: CompanionId;
  readonly name: string;
  /** Who they are, for the director and the actor. */
  readonly who: string;
  /** Where their stories happen: the situations in their life. */
  readonly world: string;
  /** The places they are painted into most naturally, in order. */
  readonly places: readonly string[];
  /** The guests who bring pressure in their stories. */
  readonly guests: readonly string[];
  /** How they speak and carry themselves (never changes). */
  readonly manner: string;
  /** Who they are, short, for the choice ("a tarsier who coordinates a team at the office"). */
  readonly short: string;
  /** How they introduce themselves when the learner chooses (their recorded voice says it). */
  readonly intro: string;
  readonly introVi: string;
}

export const COMPANION: Readonly<Record<CompanionId, Companion>> = {
  sol: {
    id: 'sol',
    name: 'Sol',
    who: 'Sol, a tarsier, team coordinator at the Hollowbrook office; takes the 6:40 home',
    world: 'stand-ups, updates, colleagues, the office, the train platform after work',
    places: ['platform', 'interview', 'cafe', 'library', 'bus'],
    guests: ['dex', 'hank', 'mei'],
    manner:
      'Filipino English; polite, organised, quietly funny; "Just to confirm…"; remembers her own first meetings, when she froze',
    short: 'a tarsier who coordinates a team at the office',
    intro:
      "Hi, I'm Sol. I coordinate a small team at the office in Hollowbrook. I still remember my first meetings in English. I froze! So let's practise together.",
    introVi:
      'Chào bạn, mình là Sol. Mình điều phối một nhóm nhỏ ở văn phòng Hollowbrook. Mình vẫn nhớ những cuộc họp tiếng Anh đầu tiên: mình đứng hình luôn! Nên mình cùng luyện nhé.',
  },
  nell: {
    id: 'nell',
    name: 'Nell',
    who: 'Nell, a koala, runs the front desk of the Lantern Inn; does the inn’s towels at the laundromat at night',
    world:
      'guests arriving, bookings, rooms and flats, travel, fixing problems with a list and a cup of tea',
    places: ['laundry', 'harbour', 'bus', 'cafe', 'platform'],
    guests: ['mags', 'hank', 'bea'],
    manner: 'Australian English; relaxed, wry, practical; "No worries, we’ll sort it"',
    short: 'a koala who runs the front desk at the inn',
    intro:
      "G'day, I'm Nell. I run the front desk at the Lantern Inn, so every day someone arrives with a problem. No worries, we'll sort it. Come along with me.",
    introVi:
      'Chào, mình là Nell. Mình làm lễ tân ở nhà trọ Lantern, ngày nào cũng có người đến với một rắc rối. Đừng lo, mình sẽ xử lý được. Đi cùng mình nhé.',
  },
  mei: {
    id: 'mei',
    name: 'Mei',
    who: 'Mei, an otter, owns the Lantern Café',
    world: 'café regulars, small talk that turns real, films and music nights, friends',
    places: ['cafe', 'roof', 'cinema', 'noodles', 'bus'],
    guests: ['hank', 'nell', 'linh'],
    manner:
      'Singaporean English, one light "lah" at most; funny, generous, proud, hates asking for help, so the learner gets to help her',
    short: 'an otter who runs the café',
    intro:
      "Hi, I'm Mei. I run the Lantern Café. The whole town comes in to chat, and I always need a hand. Coffee first, then we talk, okay?",
    introVi:
      'Chào, mình là Mei. Mình mở quán Lantern Café. Cả thị trấn ghé quán để trò chuyện, và mình lúc nào cũng cần người giúp. Uống cà phê đã rồi nói chuyện nhé?',
  },
  linh: {
    id: 'linh',
    name: 'Linh',
    who: 'Linh, a pangolin, works the library desk and lives next door; learned English as an adult',
    world:
      'studying, exams, finding words, nerves, the library after closing, people learning things',
    places: ['library', 'cafe', 'room', 'roof', 'bus'],
    guests: ['dex', 'mei', 'sol'],
    manner:
      'fluent English with an accent from the learner’s part of the world; calm, been-there; shares strategies ("When I forget a word, I describe it")',
    short: 'a pangolin who works at the library next door',
    intro:
      "Hi, I'm Linh. I work at the library, right next door to you. I learned English as an adult too, so I know how it feels. We'll go slowly, together.",
    introVi:
      'Chào bạn, mình là Linh. Mình làm ở thư viện, ngay cạnh nhà bạn. Mình cũng học tiếng Anh khi đã lớn, nên mình hiểu cảm giác đó. Mình sẽ đi từ từ, cùng nhau.',
  },
  pip: {
    id: 'pip',
    name: 'Pip',
    who: 'Pip, a red panda, the learner’s roommate in the burrow, new in town and learning English from the learner',
    world: 'home, the bus stop, Pip’s first everythings in town; the learner teaches Pip',
    places: ['room', 'bus', 'roof', 'field', 'cinema'],
    guests: ['mei', 'nell', 'hank'],
    manner:
      'curious, brave, a little clumsy, easily delighted; Pip’s English is one step below the learner’s, so the learner is the expert',
    short: 'a red panda, your roommate, new in town too',
    intro:
      "Hi! I'm Pip, your roommate. I'm new here too, and my English is still small. You can teach me, and I'll show you the town!",
    introVi:
      'Chào! Mình là Pip, bạn cùng nhà. Mình cũng mới đến, tiếng Anh của mình còn bé xíu. Bạn dạy mình nhé, mình sẽ dẫn bạn đi xem thị trấn!',
  },
};

/** The companion's stance: how much they lean on the learner or push them. */
export type Stance = 'peer' | 'colleague' | 'challenger';

export const STANCE_TEXT: Readonly<Record<Stance, string>> = {
  peer: 'a peer a few steps ahead: shares their own nerves and mistakes, never shows off, makes the learner the one who helps',
  colleague: 'a candid colleague: treats the learner as capable, asks for their real view',
  challenger:
    'a friendly challenger: expects a lot, plays devil’s advocate once in a while, still always on the learner’s side',
};

/** The companion's stance from the learner's confidence and stage. */
export function stanceFor(arrival: Arrival | null, stage: Stage): Stance {
  const level = arrival?.level ?? 1;
  if (level <= 2 || arrival?.hard.includes('nerves')) return 'peer';
  if (level >= 4 && (stage === 'regular' || stage === 'local' || stage === 'voice'))
    return 'challenger';
  return 'colleague';
}

/** The two best companions for the learner, best first. */
export function matchCompanions(arrival: Arrival): [CompanionId, CompanionId] {
  const score: Record<CompanionId, number> = { sol: 0, nell: 0, mei: 0, linh: 0, pip: 0 };
  const why = new Set(arrival.why);
  const hard = new Set(arrival.hard);
  if (why.has('work')) score.sol += 3;
  if (why.has('interview')) {
    if (arrival.level <= 3 || hard.has('nerves')) score.linh += 3;
    else score.sol += 3;
  }
  if (why.has('travel') || why.has('move')) score.nell += 3;
  if (why.has('friends') || why.has('media')) score.mei += 3;
  if (why.has('study') || why.has('exam')) score.linh += 3;
  if (why.has('family') || why.has('me')) {
    if (arrival.level >= 2) score.pip += 2;
    score.mei += 1;
  }
  if (hard.has('meetings')) score.sol += 2;
  if (hard.has('phone')) score.nell += 1;
  if (hard.has('small_talk')) score.mei += 2;
  if (hard.has('nerves') || hard.has('words') || hard.has('pronunciation')) score.linh += 2;
  if (hard.has('fast_speech') && arrival.level >= 3) score.nell += 1;
  if (hard.has('interviews')) score.linh += 1;
  // The lowest levels: Linh's accent is the learner's region's, the easiest to follow; Pip can't
  // model the language at Visitor.
  if (arrival.level <= 1) {
    score.linh += 2;
    score.pip -= 5;
  }
  const [first = 'linh', second = 'mei'] = [...COMPANIONS].sort((a, b) => score[b] - score[a]);
  return [first, second];
}

export const isCompanion = (x: unknown): x is CompanionId =>
  typeof x === 'string' && (COMPANIONS as readonly string[]).includes(x);
