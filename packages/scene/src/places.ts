import type { CastId } from './cast';

/*
 * The places of Natterwick as data: who lives there, when they're in, the three small stories each
 * painting can tell, and its sound. The paintings themselves are in `paint/places.js`; the ids,
 * variants and hours here must match it (a test checks the ids).
 */

export interface PlaceVariant {
  /** The painting's label for it, as the atlas shows it. */
  readonly label: string;
  /** What is in the painting that the talk can use. */
  readonly prop: string;
  /** The painting's title when this variant is shown. */
  readonly title: string;
}

export interface Place {
  readonly id: PlaceId;
  readonly name: string;
  /** Who is painted there and speaks. */
  readonly resident: CastId;
  /** Plain words for the director and the menu. */
  readonly hours: string;
  readonly story: string;
  readonly variants: readonly [PlaceVariant, PlaceVariant, PlaceVariant];
  readonly music: string;
  readonly ambience: string;
  readonly interior: boolean;
}

export const PLACE_IDS = [
  'room',
  'bus',
  'cafe',
  'harbour',
  'noodles',
  'field',
  'cinema',
  'laundry',
  'roof',
  'platform',
  'library',
  'interview',
] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

const v = (label: string, prop: string, title: string): PlaceVariant => ({ label, prop, title });

export const PLACES: Readonly<Record<PlaceId, Place>> = {
  room: {
    id: 'room',
    name: 'The burrow',
    resident: 'pip',
    hours: 'Home. Pip sleeps from about 11 pm and wakes when you come in.',
    story: 'Your burrow, shared with Pip: a lamp, a red sofa and one window onto the field.',
    variants: [
      v('Home', 'nothing new: the lamp, the sofa, the window', 'Home, More Or Less'),
      v(
        'A burnt loaf',
        'a loaf of bread a shade too dark, still smoking, on a side table',
        'Pip Tried To Bake',
      ),
      v(
        'A postcard',
        'a postcard on the floor that came in the post',
        'Wish You Were Here, Roughly',
      ),
    ],
    music: 'room',
    ambience: 'room',
    interior: true,
  },
  bus: {
    id: 'bus',
    name: 'The bus stop',
    resident: 'pip',
    hours: 'The 45 comes at :00, :20 and :40. Pip waits here any time.',
    story:
      'The stop at the edge of town. Pip has never been on a bus and keeps asking where it goes.',
    variants: [
      v(
        'Waiting',
        'the shelter and the neon 45 sign; the bus comes every twenty minutes',
        'Waiting For The 45',
      ),
      v(
        'A red umbrella',
        'a red umbrella someone left leaning on the shelter',
        'Someone Forgot Their Umbrella',
      ),
      v(
        'Late bus',
        'a paper sign on the post: LATE, SORRY; the 45 sign flickers',
        'Nobody Told The Bus',
      ),
    ],
    music: 'bus',
    ambience: 'field',
    interior: false,
  },
  cafe: {
    id: 'cafe',
    name: 'The Lantern Café',
    resident: 'mei',
    hours: 'Open 7 am to 10 pm.',
    story:
      'Mei’s café, seen from across the street. The rent went up, and Mei hasn’t told anyone yet.',
    variants: [
      v('Open', 'a warm window, a cup steaming on the table outside', 'Kaya Toast, Probably'),
      v('Help wanted', 'a HELP WANTED sign in the window', 'Help Wanted, Ask Inside'),
      v(
        'Closed early',
        'a BACK SOON sign on the door in the middle of the day',
        'Closed For Thinking',
      ),
    ],
    music: 'cafe',
    ambience: 'street',
    interior: false,
  },
  harbour: {
    id: 'harbour',
    name: 'The harbour',
    resident: 'mags',
    hours: 'Mags walks the pier from 5 am to 10 pm.',
    story:
      'A long thin pier, a lighthouse, and Mags, who counts the boats twice before she goes home.',
    variants: [
      v(
        'Evening tide',
        'the tide, the lighthouse beam, one small boat',
        'The Tide Keeps Its Own Hours',
      ),
      v(
        'A crate with no label',
        'a wooden crate with no label at the end of the pier',
        'Still Life With Unlabelled Crate',
      ),
      v('Lantern boats', 'little paper lantern boats on the water', 'Somebody Has To Light Them'),
    ],
    music: 'harbour',
    ambience: 'sea',
    interior: false,
  },
  noodles: {
    id: 'noodles',
    name: 'The noodle stall',
    resident: 'hank',
    hours: 'Opens at dark. Hank eats here after his shift.',
    story:
      'A cart in an empty lot with one red lantern. Hank will haggle over anything, even soup.',
    variants: [
      v('Last bowl', 'one last bowl of noodles on the counter', 'Ten Percent And We’re Friends'),
      v('Sixty buns', 'a tower of steamed buns, far too many', 'Sixty Buns, Final Offer'),
      v('Saving you a seat', 'an empty stool next to Hank', 'Saving You A Seat'),
    ],
    music: 'noodles',
    ambience: 'stall',
    interior: false,
  },
  field: {
    id: 'field',
    name: 'The far field',
    resident: 'pip',
    hours: 'Pip comes out here to call nobody in particular, any time.',
    story:
      'A phone booth in the middle of a field. Nobody knows who put it there, but it still works.',
    variants: [
      v('Calling home', 'Pip inside the lit phone booth, holding the receiver', 'Long Distance'),
      v(
        'It’s ringing',
        'the phone in the booth is ringing and Pip is listening outside',
        'Somebody Is Ringing The Field',
      ),
      v('A red glove', 'one red glove in the grass, and nobody there', 'One Glove, Waiting'),
    ],
    music: 'field',
    ambience: 'field',
    interior: false,
  },
  cinema: {
    id: 'cinema',
    name: 'The empty cinema',
    resident: 'pip',
    hours: 'One showing a night. Nobody else ever comes.',
    story:
      'Rows of red seats and a film nobody else came to see. Pip likes to tell you the plot afterwards, wrongly.',
    variants: [
      v('The film', 'a film on the screen, dust in the projector beam', 'Front Row Was Taken'),
      v('A film about a bus', 'the film on screen is about a bus', 'It’s About A Bus, Mostly'),
      v('Intermission', 'the screen says INTERMISSION', 'Intermission, Alone'),
    ],
    music: 'cinema',
    ambience: 'cinema',
    interior: true,
  },
  laundry: {
    id: 'laundry',
    name: 'The laundromat',
    resident: 'nell',
    hours: 'Nell brings the inn’s towels at 8 pm and stays till 2 am.',
    story:
      'Open all night. The machines hum, and Nell folds towels for the inn and talks to whoever is waiting.',
    variants: [
      v(
        'Spin cycle',
        'one drum spinning, a stack of folded towels',
        'No Worries, It’s Only Towels',
      ),
      v('One red sock', 'one red sock in a load of white towels', 'Still Life With One Red Sock'),
      v('Out of order', 'an OUT OF ORDER sign on one machine', 'Out Of Order, Like Me'),
    ],
    music: 'laundry',
    ambience: 'laundry',
    interior: true,
  },
  roof: {
    id: 'roof',
    name: 'The rooftop',
    resident: 'pip',
    hours: 'Up the back stairs, any time.',
    story:
      'Above the burrow: a water tower, a washing line and the whole town in lights. Pip comes up here to think.',
    variants: [
      v('Washing day', 'washing on the line moving in the wind', 'Higher Than The 45'),
      v('A kite stuck', 'a red kite stuck on the water tower', 'The Kite Isn’t Mine'),
      v('Shooting stars', 'shooting stars over the town', 'Make One For Me'),
    ],
    music: 'roof',
    ambience: 'wind',
    interior: false,
  },
  platform: {
    id: 'platform',
    name: 'The train platform',
    resident: 'sol',
    hours: 'Sol takes the 6:40 home and arrives early, always; Sol is here any time you come.',
    story:
      'A long platform that runs into the distance. Sol checks the clock, then checks it again.',
    variants: [
      v('Waiting', 'the station clock with its red second hand', 'Just To Confirm, The 6:40'),
      v('Delayed', 'the board says DELAYED', 'Delayed, Politely'),
      v('A lost suitcase', 'a suitcase nobody has claimed', 'Whose Suitcase Is This?'),
    ],
    music: 'platform',
    ambience: 'platform',
    interior: false,
  },
  library: {
    id: 'library',
    name: 'The library',
    resident: 'linh',
    hours: 'Linh stays after closing, most nights; she is at the desk any time you come.',
    story:
      'Tall shelves and one lamp. Linh learned English as an adult, and she remembers every word she was afraid of.',
    variants: [
      v('Closing time', 'one lamp on the desk, a red book', 'I Used To Freeze Too'),
      v(
        'A note in a book',
        'a handwritten note found in a library book',
        'Somebody Wrote In The Margin',
      ),
      v('Power cut', 'the power is out; Linh reads by a candle', 'Reading By Candle, Quietly'),
    ],
    music: 'library',
    ambience: 'library',
    interior: true,
  },
  interview: {
    id: 'interview',
    name: 'The interview room',
    resident: 'dex',
    hours: 'Dex sees people from 8 am to 8 pm.',
    story:
      'A plain room with blinds and two chairs. Dex is fair, direct and secretly rooting for you.',
    variants: [
      v(
        'Your turn',
        'a red folder on the table, an empty chair for you',
        'Can You Give Me A Number?',
      ),
      v('Coffee gone cold', 'a cup of coffee gone cold', 'The Coffee Went Cold'),
      v('Tell me about a time', 'Dex leaning in, listening', 'Tell Me About A Time'),
    ],
    music: 'interview',
    ambience: 'office',
    interior: true,
  },
};

export const isPlaceId = (x: unknown): x is PlaceId =>
  typeof x === 'string' && (PLACE_IDS as readonly string[]).includes(x);

/** `a ≤ h < b` on a 24-hour clock, wrapping past midnight. */
export const between = (h: number, a: number, b: number): boolean =>
  a < b ? h >= a && h < b : h >= a || h < b;

/** Roughly when the painting is dark enough for the noodle stall's lantern (its light model's dusk). */
const isDark = (h: number): boolean => between(h, 18.75, 6.5);

/**
 * Whether the place's resident is painted there at this hour in this variant: the paintings follow
 * the same rules, so a conversation is only ever planned where someone is in.
 */
export function residentIn(place: PlaceId, variant: number, h: number): boolean {
  switch (place) {
    case 'cafe':
      return between(h, 7, 22) && variant !== 2;
    case 'harbour':
      return between(h, 5, 22) || variant !== 0;
    case 'noodles':
      return isDark(h);
    case 'field':
      return variant !== 2;
    case 'laundry':
      return between(h, 20, 2) || variant !== 0;
    case 'interview':
      return between(h, 8, 20) || variant !== 0;
    default:
      return true;
  }
}

/** The variants of a place someone is in at this hour. */
export const openVariants = (place: PlaceId, h: number): number[] =>
  [0, 1, 2].filter((v) => residentIn(place, v, h));

/** Pip sleeps on the sofa from 11 pm until about 6:30, in the plain burrow. */
export const pipAsleep = (place: PlaceId, variant: number, h: number): boolean =>
  place === 'room' && variant === 0 && (h >= 23 || h < 6.5);
