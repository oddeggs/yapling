import type { BurrowObjectId, Character, Mood, TimeOfDay } from '@yapling/art';
import type {
  CanDoProgress,
  CharacterId,
  FirstLanguage,
  Keepsake,
  PhraseProgress,
  PhraseState,
  RingSlotKind,
  Roommate,
  WeekRing,
} from '@yapling/contracts';
import { ringWeeks, weekOfDay, type Welcome, type WeekOneUnlock } from '@yapling/domain';
import type { StringKey } from '@yapling/i18n';
import type { Href } from 'expo-router';

import { hungKeepsakes } from '../payoff/keepsake-model';
import { copy, text, type Copy } from './copy';
import { planFor } from './day-plan';
import { timeOfDayAt } from './time-of-day';

/*
 * The burrow as data. A container gathers the learner's profile, progress and what they have
 * already seen into a `BurrowInput`; the builders here turn it into what each burrow screen shows.
 * Nothing here reads the clock or the network, so every state can be built and tested.
 */

/** The parts of the learner's progress the burrow shows (`Progress` from the app's data). */
export interface BurrowProgress {
  readonly phrases: readonly PhraseProgress[];
  readonly keepsakes: readonly Keepsake[];
  readonly weeks: readonly WeekRing[];
  readonly canDos: readonly CanDoProgress[];
}

/** What the burrow needs to know about the learner, from the app's data. */
export interface BurrowInput {
  /** Days since install in the learner's timezone (day 1 is the install day). */
  readonly day: number;
  /** The learner's local hour, for the burrow's light. */
  readonly hour: number;
  readonly roommate: Roommate;
  /** The learner's name, for the keepsake ("Lan can now…"). */
  readonly learnerName: string;
  readonly firstLanguage: FirstLanguage;
  readonly progress: BurrowProgress;
  /** Between-call moments the learner has been through (placement, Linh's knock, the story…). */
  readonly seen: ReadonlySet<WeekOneUnlock>;
  /** How the burrow greets this open: normal, or back after a few days away. */
  readonly welcome: Welcome;
}

/** Which burrow screen the home shows. */
export type BurrowVariant = 'day-one' | 'door' | 'back' | 'home';

/** A face from `@yapling/art`; Pip is drawn as the learner's species by the screen. */
export interface FaceSpec {
  readonly character: Character;
  readonly mood: Mood;
}

/** A character's line in a speech bubble. */
export interface LineModel {
  readonly speaker: CharacterId;
  readonly name: string;
  /** The caption: English, from the story or a character's own knock line. */
  readonly text: string;
  /** The gloss in the learner's first language, or null when the line has none. */
  readonly gloss: string | null;
  /** The recorded line to play (the voice engine), or null for a line without a recording. */
  readonly lineId: string | null;
}

/** A word object on a shelf: its art and the phrase written under it. */
export interface ShelfItem {
  readonly id: string;
  readonly art: BurrowObjectId;
  readonly label: Copy;
  /** For VoiceOver: the phrase's stage ("Gói hạt", "Mầm"), or null for a gift. */
  readonly stage: Copy | null;
}

/** A keepsake hanging on the burrow wall, in Pip's handwriting (always English). */
export interface HungKeepsake {
  readonly id: string;
  readonly heading: string;
  readonly canDo: string;
  readonly witnessed: string;
  readonly witness: Character | null;
}

/** The card at the top of the burrow: always one new thing. */
export interface DeltaCard {
  /** Stable per card, so a card never repeats two days running. */
  readonly id: string;
  /** "SINCE YOU WERE AWAY", "TODAY", or the first day's "DAY 1" tag. */
  readonly kicker: Copy;
  /** The first day's card is a sticker tag and a line, with no face or button. */
  readonly style: 'news' | 'day-tag';
  readonly title: Copy;
  readonly sub: Copy | null;
  readonly face: FaceSpec | null;
  readonly target: Href | null;
}

export interface PrimaryAction {
  readonly label: Copy;
  readonly target: Href;
}

export interface BurrowHomeModel {
  readonly scene: 'burrow' | 'burrow-day1';
  readonly timeOfDay: TimeOfDay;
  readonly roommate: Roommate;
  readonly pipMood: Mood;
  readonly shelves: { readonly left: readonly ShelfItem[]; readonly right: readonly ShelfItem[] };
  /** The mailbox by the door: a letter in it while there is post to open. */
  readonly mailbox: 'empty' | 'letter' | null;
  readonly keepsake: HungKeepsake | null;
  readonly delta: DeltaCard;
  readonly line: LineModel | null;
  readonly action: PrimaryAction | null;
  /** This week's calls, once the week view has opened. */
  readonly ring: { readonly done: number; readonly total: number } | null;
}

/** Calls that fill the ring, in the ring's order. */
const SLOT_KINDS: readonly RingSlotKind[] = ['episode', 'real_week', 'practice'];

/** The current week's ring, with the slots whose day has come opened. */
export function currentRing(input: Pick<BurrowInput, 'day' | 'progress'>): WeekRing {
  const weeks = ringWeeks(input.progress.weeks, input.day);
  const ring = weeks[weekOfDay(input.day) - 1];
  if (ring === undefined) throw new Error('no ring for the current week');
  return ring;
}

export const slotDone = (ring: WeekRing, kind: RingSlotKind): boolean =>
  ring.slots[SLOT_KINDS.indexOf(kind)]?.status === 'done';

/** Week 1's episode, the first call: until it is done, the last box is still unpacked. */
const firstEpisodeDone = (progress: BurrowInput['progress']): boolean =>
  progress.weeks[0]?.slots[0]?.status === 'done';

/**
 * Which screen the burrow opens on. Before the placement chat it is the day-one burrow under
 * onboarding; then Linh knocks once; a learner back after days away, or on day 8, is welcomed
 * once; every other open is the burrow home.
 */
export function burrowVariant(input: BurrowInput): BurrowVariant {
  if (!input.seen.has('placement_chat')) return 'day-one';
  if (!input.seen.has('linh_welcome')) return 'door';
  if (input.welcome.kind === 'back_after_away') return 'back';
  if (input.day >= 8 && !input.seen.has('next_episode_peek')) return 'back';
  return 'home';
}

const PHRASE_ART: Readonly<Record<PhraseState, BurrowObjectId>> = {
  seed: 'seed',
  sprout: 'plant-0',
  leaf: 'plant-1',
  bloom: 'plant-2',
};

const STAGE_KEY: Readonly<Record<PhraseState, StringKey>> = {
  seed: 'burrow.stage.seed',
  sprout: 'burrow.stage.sprout',
  leaf: 'burrow.stage.leaf',
  bloom: 'burrow.stage.bloom',
};

/** Each shelf holds three objects, as the scene's shelves are drawn. */
export const SHELF_SLOTS = 3;

/**
 * The shelves: every phrase the learner has met, as the object its stage has grown into (seed
 * packet, sprout, leaf, bloom), newest six in the order they were met, and the gifts from the
 * week's stories after them. Nothing ever wilts or leaves the shelf because of time.
 */
export function shelvesFor(
  phrases: readonly PhraseProgress[],
  seen: ReadonlySet<WeekOneUnlock>,
): BurrowHomeModel['shelves'] {
  const gifts: ShelfItem[] = seen.has('pip_story')
    ? [
        {
          id: 'gift-seagull-feather',
          art: 'plant-0',
          label: copy('burrow.object.seagullFeather'),
          stage: null,
        },
      ]
    : [];
  const room = SHELF_SLOTS * 2 - gifts.length;
  const items: ShelfItem[] = [...phrases]
    .sort((a, b) => a.seedAt - b.seedAt)
    .slice(-room)
    .map((p) => ({
      id: p.id,
      art: PHRASE_ART[p.state],
      label: text(p.text),
      stage: copy(STAGE_KEY[p.state] as 'burrow.stage.seed'),
    }));
  const all = [...items, ...gifts];
  return { left: all.slice(0, SHELF_SLOTS), right: all.slice(SHELF_SLOTS, SHELF_SLOTS * 2) };
}

/** The art's character for a keepsake's witness; a voice with no face has none. */
const asArtCharacter = (id: CharacterId | null): Character | null =>
  id !== null && id !== 'mags' && id !== 'office' ? id : null;

/**
 * The newest keepsake on the wall, as the payoff drew it and hung it: the can-do in the learner's
 * own words, signed by its witness on the day it was earned.
 */
export function keepsakeFor(
  progress: Pick<BurrowProgress, 'keepsakes' | 'canDos'>,
  learner: { readonly name: string; readonly roommateName: string },
): HungKeepsake | null {
  const newest = hungKeepsakes(progress, learner).at(-1);
  if (newest === undefined) return null;
  return {
    id: newest.id,
    heading: newest.heading,
    canDo: newest.canDo,
    witnessed: newest.witnessed,
    witness: asArtCharacter(newest.witness),
  };
}

/** The mailbox appears with the first postcard and holds a letter while there is post unopened. */
function mailboxFor(day: number, seen: ReadonlySet<WeekOneUnlock>): BurrowHomeModel['mailbox'] {
  if (day < 3) return null;
  const unopened = (!seen.has('linh_postcard') && day >= 3) || (!seen.has('voicemail') && day >= 6);
  return unopened ? 'letter' : 'empty';
}

/** The burrow home: the room by the time of day, what has grown on the shelves, and today. */
export function burrowHomeModel(input: BurrowInput): BurrowHomeModel {
  const ring = currentRing(input);
  const plan = planFor(input, ring);
  return {
    scene: firstEpisodeDone(input.progress) ? 'burrow' : 'burrow-day1',
    timeOfDay: timeOfDayAt(input.hour),
    roommate: input.roommate,
    pipMood: plan.pipMood,
    shelves: shelvesFor(input.progress.phrases, input.seen),
    mailbox: mailboxFor(input.day, input.seen),
    keepsake: keepsakeFor(input.progress, {
      name: input.learnerName,
      roommateName: input.roommate.name,
    }),
    delta: plan.delta,
    line: plan.line,
    action: plan.action,
    ring:
      input.day >= 2
        ? { done: ring.slots.filter((s) => s.status === 'done').length, total: ring.slots.length }
        : null,
  };
}
