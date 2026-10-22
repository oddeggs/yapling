import type { Episode, Season } from '../types';
import { S1_E1_CALL } from './episode-1';
import { S1_E2 } from './episode-2';
import { S1_E3 } from './episode-3';
import { S1_E4 } from './episode-4';
import { S1_E5 } from './episode-5';
import { S1_E6 } from './episode-6';
import { S1_FESTIVAL } from './festival';
import { PROLOGUE_KNOCK, PROLOGUE_UNPACK } from './prologue';
import { S1_SET1, S1_SET2, S1_SET3 } from './settling-1-3';
import { S1_SET4, S1_SET5, S1_SET6 } from './settling-4-6';
import {
  S1_E1_POSTCARD,
  S1_E1_POSTCARD_VISITOR,
  S1_E1_PRACTICE,
  S1_E1_REAL_WEEK,
  S1_E1_STORY,
  S1_E1_VOICEMAIL,
  S1_E1_VOICEMAIL_VISITOR,
} from './week-1';

export const S1_E1: Episode = {
  id: 's1-e1',
  number: 1,
  title: 'The Letter',
  place: 'lantern-cafe',
  cast: ['mei', 'pip', 'linh'],
  logline:
    "Mei's rent doubles overnight. You help her read the letter, call the landlord, and decide what to do.",
  learningFocus:
    "Asking what's wrong, offering help, giving simple advice; self-introduction (when calling the landlord's office).",
  canDos: { life: 'ask-whats-wrong', work: 'introduce-yourself-30s' },
  phrases: ['whats-wrong', 'i-need-a-plan', 'can-i-help', 'i-think-you-should'],
  realWeek: 'Introduce yourself / your job (30 seconds), rehearsed with Pip.',
  practice: 'First "Pass it on" with Bea: tell Pip about your day (90 s), Linh (60 s), Bea (45 s).',
  stageScaling:
    'Neighbour+: Mei deflects twice and the learner has to read her mood; the receptionist asks follow-up questions (account number, reason for the call). Regular+: the learner negotiates a delay ("Could we have until the end of the month?").',
  lines: [
    's1-e1-01',
    's1-e1-02',
    's1-e1-03',
    's1-e1-04',
    's1-e1-05',
    's1-e1-06',
    's1-e1-07',
    's1-e1-08',
    's1-e1-09',
    's1-e1-10',
    's1-e1-11',
    's1-e1-story-seagull',
    's1-e1-vm-oops',
    's1-e1-vm-thanks',
  ],
  cliffhanger: 's1-e1-10',
  recap: 's1-e1-11',
  draft: false,
  // The first week: day 1 is the prologue, so the episode call comes on day 2.
  week: [
    { day: 2, scene: 's1-e1' },
    { day: 3, scene: 's1-e1-story' },
    { day: 3, scene: 's1-e1-postcard' },
    { day: 4, scene: 's1-e1-real-week' },
    { day: 5, scene: 's1-e1-practice' },
    { day: 6, scene: 's1-e1-voicemail' },
  ],
  scenes: [
    S1_E1_CALL,
    S1_E1_STORY,
    S1_E1_POSTCARD,
    S1_E1_REAL_WEEK,
    S1_E1_PRACTICE,
    S1_E1_VOICEMAIL,
    // Played in place of the scene of the same kind for a Visitor (`VISITOR_VERSIONS`).
    S1_E1_POSTCARD_VISITOR,
    S1_E1_VOICEMAIL_VISITOR,
  ],
};

/**
 * Scenes with a Visitor version of their own, played instead of them at Visitor. Live calls keep
 * one scene and switch beats by stage; these play on the phone, which reads every beat.
 */
export const S1_VISITOR_VERSIONS: Readonly<Record<string, string>> = {
  [S1_E1_POSTCARD.id]: S1_E1_POSTCARD_VISITOR.id,
  [S1_E1_VOICEMAIL.id]: S1_E1_VOICEMAIL_VISITOR.id,
};

export const SEASON_1: Season = {
  id: 's1',
  number: 1,
  title: 'The Café Might Close',
  prologue: [PROLOGUE_UNPACK, PROLOGUE_KNOCK],
  settling: [S1_SET1, S1_SET2, S1_SET3, S1_SET4, S1_SET5, S1_SET6],
  episodes: [S1_E1, S1_E2, S1_E3, S1_E4, S1_E5, S1_E6],
  festival: S1_FESTIVAL,
};

export { S1_E1_LETTER } from './episode-1';
export { S1_FESTIVAL } from './festival';
export { S1_PHRASES } from './phrases';
export { S1_PIPS_MINUTE } from './pips-minute';
export type { PipsMinutePhrase, PipsMinuteTurn } from './pips-minute';
export type { S1PhraseId } from './phrases';
