import {
  CALL_SUMMARY_VERSION,
  CallSummary,
  type PhraseEvent,
  type Progress,
} from '@yapling/contracts';
import {
  fluencyMetrics,
  fromPhraseProgress,
  recordPipsMinute,
  seedPhrase,
  toPhraseProgress,
  type PhraseRecord,
} from '@yapling/domain';
import { findPhrase } from '@yapling/story';

import type { PipsMinuteOutcome } from '../call/daily';
import { isLearnerLine, type TranscriptFile } from '../call/transcript';
import { storeSummary } from '../calls/store';
import { updateProgressOnce } from '../progress';

/*
 * The end of Pip's minute: no model reads it. The turns' outcomes (written when the call ended)
 * become prompted uses of their phrases by the learning model's rule (`recordPipsMinute`): the due
 * phrase sprouts or leafs, the fixed phrase is used and marked as reused by Pip so it rests a
 * week. The call record's summary carries the phrase events for the small after-call card; there
 * are no wins, fix, can-dos or memories. Applied once per call, so a retry changes nothing.
 */

/** A daily call's transcript: it carries its minute's outcome. */
export type DailyTranscript = TranscriptFile & { readonly pipsMinute: PipsMinuteOutcome };

export const isDailyTranscript = (file: TranscriptFile): file is DailyTranscript =>
  file.pipsMinute !== undefined;

type Lists = Pick<Progress, 'phrases' | 'errorTargets' | 'canDos' | 'keepsakes' | 'weeks'>;

export interface PipsMinuteChange {
  readonly lists: Lists;
  readonly phraseEvents: PhraseEvent[];
}

/** The minute's change to the learner's progress: phrases only. */
export function applyPipsMinute(
  current: Progress,
  facts: {
    readonly sceneId: string;
    readonly endedAt: number;
    readonly timezone: string;
    readonly outcome: PipsMinuteOutcome;
  },
): PipsMinuteChange {
  const { outcome, endedAt } = facts;
  const phrases = current.phrases.map(fromPhraseProgress);
  const recordOf = (id: string): PhraseRecord | null => {
    const known = phrases.find((p) => p.id === id);
    if (known) return known;
    const phrase = findPhrase(id);
    return phrase ? seedPhrase(phrase.id, phrase.en, endedAt) : null;
  };
  const lists = (next: Lists['phrases']): Lists => ({
    phrases: next,
    errorTargets: current.errorTargets,
    canDos: current.canDos,
    keepsakes: current.keepsakes,
    weeks: current.weeks,
  });
  const due = recordOf(outcome.due);
  if (due === null) return { lists: lists(current.phrases), phraseEvents: [] };
  const reuse = outcome.reuse === null ? null : recordOf(outcome.reuse);
  const result = recordPipsMinute(
    phrases,
    { due, reuse },
    {
      at: endedAt,
      sceneId: facts.sceneId,
      dueSaid: outcome.dueSaid,
      reuseFixed: reuse === null ? null : outcome.reuseFixed,
    },
    facts.timezone,
  );
  const textOf = (id: string) => result.phrases.find((p) => p.id === id)?.text ?? id;
  const phraseEvents = result.events.flatMap(({ phraseId, events }) =>
    events.map((event): PhraseEvent => ({ phraseId, text: textOf(phraseId), event })),
  );
  return {
    lists: lists(result.phrases.map(toPhraseProgress)),
    phraseEvents: phraseEvents.slice(0, 50),
  };
}

/** What the minute's progress change left, for a retry to finish from. */
interface AppliedMinute {
  readonly phraseEvents: PhraseEvent[];
}

/**
 * Writes a finished Pip's minute: the phrase uses into progress (once per call) and its summary
 * onto the call record, which stops being pending.
 */
export async function recordDailyCall(
  db: D1Database,
  userId: string,
  file: DailyTranscript,
  now: number,
): Promise<void> {
  const outcome = await updateProgressOnce<AppliedMinute>(
    db,
    userId,
    file.callId,
    (current) => {
      const change = applyPipsMinute(current, {
        sceneId: file.sceneId,
        endedAt: file.endedAt,
        timezone: file.timezone,
        outcome: file.pipsMinute,
      });
      return { lists: change.lists, data: { phraseEvents: change.phraseEvents } };
    },
    now,
  );
  const words = file.lines.filter(isLearnerLine).map((l) => l.words);
  const summary = CallSummary.parse({
    version: CALL_SUMMARY_VERSION,
    wins: [],
    fix: null,
    phraseEvents: outcome.data.phraseEvents,
    canDoEvidence: [],
    metrics: fluencyMetrics(words),
    memoryItemIds: [],
  });
  await storeSummary(db, userId, file.callId, summary, null);
}
