import {
  CHARACTER_IDS,
  RING_SLOT_KINDS,
  type CallCanDoEvidence,
  type CallKind,
  type CharacterId,
  type Keepsake,
  type PhraseEvent,
  type Progress,
} from '@yapling/contracts';
import {
  canDoById,
  fillRingSlot,
  meetPhrase,
  newCanDo,
  noteRecurringError,
  recordPhraseUse,
  recordSelfCorrection,
  seasonRingWeeks,
  tickCanDo,
  fromErrorTargetProgress,
  fromPhraseProgress,
  toErrorTargetProgress,
  toPhraseProgress,
  weekKeepsakeToWire,
  type ErrorTargetRecord,
  type SeasonWeeks,
} from '@yapling/domain';
import { findPhrase, SEASON_1, seasonWeeks, VISITOR_VERSIONS } from '@yapling/story';

import { ERROR_TARGETS } from '../call/targets';
import type { LearnerLine } from '../call/transcript';
import type { Draft } from './summary';

/*
 * What a finished call changes in the learner's progress, by the learning model's rules: the
 * scene's phrases met and the ones used growing, self-corrections on active error targets (and
 * recurring errors queued), can-dos ticked with their witness and keepsake, and the week's ring
 * slot filled.
 *
 * The ring follows the learning model's rule: the rings are opened to the story day the call ended
 * on, each slot tied to its week's scene, and a call fills the open slot whose scene it played (a
 * slot the story names no scene for takes any call of its kind, oldest first). So Episode 3
 * played in week 4 fills ring 3, and a replay of Episode 1 finishes nothing.
 */

/** The season's weeks the rings are read from, week 1 first: the episodes, then Bunting Week. */
export const SEASON_WEEKS: SeasonWeeks = seasonWeeks(SEASON_1);

/** A Visitor version stands in for its scene: it fills that scene's slot. */
const STANDS_IN_FOR: ReadonlyMap<string, string> = new Map(
  Object.entries(VISITOR_VERSIONS).map(([scene, version]) => [version, scene]),
);

/** The scene a call's slot is named by. */
export const ringSceneOf = (sceneId: string): string => STANDS_IN_FOR.get(sceneId) ?? sceneId;

export interface CallFacts {
  readonly callId: string;
  readonly sceneId: string;
  readonly kind: CallKind;
  readonly endedAt: number;
  readonly timezone: string;
  /** The day of the story the call ended on (day 1 is the story's first), for the rings. */
  readonly storyDay: number;
  readonly scenePhrases: readonly string[];
  readonly sceneCast: readonly CharacterId[];
  readonly learnerLines: readonly LearnerLine[];
  readonly draft: Draft | null;
}

type Lists = Pick<Progress, 'phrases' | 'errorTargets' | 'canDos' | 'keepsakes' | 'weeks'>;

export interface ProgressChange {
  readonly lists: Lists;
  readonly phraseEvents: PhraseEvent[];
  readonly canDoEvidence: CallCanDoEvidence[];
}

const isCharacter = (id: string): id is CharacterId =>
  (CHARACTER_IDS as readonly string[]).includes(id);

export function applyCall(current: Progress, facts: CallFacts): ProgressChange {
  const { timezone, endedAt } = facts;
  const events: PhraseEvent[] = [];

  // Phrases: the scene's phrases are met; each correct use grows its phrase one step.
  let phrases = current.phrases.map(fromPhraseProgress);
  for (const id of facts.scenePhrases) {
    const phrase = findPhrase(id);
    if (!phrase) continue;
    const met = meetPhrase(phrases, { id, text: phrase.en, at: endedAt });
    phrases = [...met.phrases];
    if (met.met) events.push({ phraseId: id, text: phrase.en, event: 'met' });
  }
  const uses = new Map<string, number>();
  for (const line of facts.learnerLines) {
    for (const id of line.phrasesUsed) if (!uses.has(id)) uses.set(id, line.at);
  }
  for (const id of facts.draft?.phrasesUsed ?? []) if (!uses.has(id)) uses.set(id, endedAt);
  for (const [id, at] of uses) {
    const phrase = findPhrase(id);
    if (!phrase) continue;
    const used = recordPhraseUse(
      phrases,
      { id, text: phrase.en },
      { at, correct: true, prompted: false, contextId: facts.sceneId },
      timezone,
    );
    phrases = [...used.phrases];
    for (const event of used.events)
      if (event !== 'met') events.push({ phraseId: id, text: phrase.en, event });
  }

  // Error targets: second tries that fixed an active target count; recurring errors queue up.
  let targets: readonly ErrorTargetRecord[] = current.errorTargets.map(fromErrorTargetProgress);
  for (const line of facts.learnerLines) {
    if (line.correctionFixed === true) {
      const prompted = [...facts.learnerLines]
        .reverse()
        .find((l) => l.turn < line.turn && l.targetId !== null);
      if (prompted?.targetId)
        targets = recordSelfCorrection(targets, prompted.targetId, line.at, timezone).targets;
    }
  }
  for (const id of facts.draft?.recurringErrors ?? []) {
    if (ERROR_TARGETS[id] !== undefined) targets = noteRecurringError(targets, id, endedAt).targets;
  }

  // Can-dos: evidence ticks them, signed by the neighbour who heard it.
  const canDos = [...current.canDos];
  const keepsakes: Keepsake[] = [...current.keepsakes];
  const evidence: CallCanDoEvidence[] = [];
  const addKeepsake = (k: Keepsake) => {
    if (!keepsakes.some((existing) => existing.id === k.id)) keepsakes.push(k);
  };
  for (const item of facts.draft?.canDoEvidence ?? []) {
    const definition = canDoById(item.canDoId);
    const witness =
      isCharacter(item.witness) && facts.sceneCast.includes(item.witness)
        ? item.witness
        : facts.sceneCast[0];
    if (!definition || !witness) continue;
    const index = canDos.findIndex((c) => c.id === definition.id);
    const before = index >= 0 ? canDos[index] : newCanDo(definition);
    if (!before) continue;
    const ticked = tickCanDo(
      before,
      {
        canDoId: definition.id,
        callRecordId: facts.callId,
        quote: item.quote,
        witness,
        at: endedAt,
      },
      timezone,
    );
    if (index >= 0) canDos[index] = ticked.canDo;
    else canDos.push(ticked.canDo);
    if (ticked.keepsake) addKeepsake(ticked.keepsake);
    evidence.push({ canDoId: definition.id, quote: item.quote, witness });
  }

  // The ring: an episode, real-week or practice call fills its scene's slot.
  let weeks = seasonRingWeeks(current.weeks, facts.storyDay, SEASON_WEEKS);
  const kind = (RING_SLOT_KINDS as readonly string[]).includes(facts.kind)
    ? (facts.kind as (typeof RING_SLOT_KINDS)[number])
    : null;
  if (kind !== null) {
    const filled = fillRingSlot(
      weeks,
      { kind, callRecordId: facts.callId, doneAt: endedAt, sceneId: ringSceneOf(facts.sceneId) },
      timezone,
    );
    weeks = filled.weeks;
    if (filled.ringFull) addKeepsake(weekKeepsakeToWire(filled.ringFull));
  }

  return {
    lists: {
      phrases: phrases.map(toPhraseProgress),
      errorTargets: targets.map(toErrorTargetProgress),
      canDos,
      keepsakes,
      weeks: [...weeks],
    },
    phraseEvents: events.slice(0, 50),
    canDoEvidence: evidence.slice(0, 20),
  };
}
