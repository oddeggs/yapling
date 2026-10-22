import { CallRecord, type Progress } from '@yapling/contracts';
import type { TurnPass } from '@yapling/domain';

/*
 * Development builds only: a Visitor who just finished Settling-in Chapter 1, and one whose call
 * filled the first week's ring with most turns passed on their own, for looking at the Visitor's
 * after-call card and Linh's Newcomer card before a real learner gets there
 * (`yapling-dev://post?callId=preview&preview=visitor`,
 * `yapling-dev://keepsake?callId=preview&preview=stage-up`). Nothing is sent from a preview.
 */

export const PREVIEW_CALL_ID = 'preview';

/** The sample learner's name. */
export const PREVIEW_LEARNER = 'Lan';

const AT = Date.UTC(2026, 8, 28, 12, 0, 0);

/** Chapter 1 with Linh, as the server records it. */
export const PREVIEW_CHAPTER_ONE: CallRecord = CallRecord.parse({
  id: PREVIEW_CALL_ID,
  kind: 'settling',
  sceneId: 's1-set1',
  character: 'linh',
  startedAt: AT - 150_000,
  endedAt: AT,
  learnerSeconds: 40,
  characterSeconds: 90,
  endReason: 'scene_complete',
  summaryPending: false,
  summary: null,
});

/** What the call heard: the learner's three sentences. */
export const PREVIEW_HEARD: readonly string[] = ['Hi!', 'I’m Lan.', 'Nice to meet you, too.'];

const slot = (kind: 'episode' | 'real_week' | 'practice', id: string, doneAt: number) =>
  ({ kind, status: 'done', sceneId: null, callRecordId: id, doneAt }) as const;

/** Progress after the call that filled week 1's ring. */
export const PREVIEW_RING_FULL: Pick<Progress, 'canDos' | 'keepsakes' | 'weeks'> = {
  canDos: [],
  keepsakes: [
    { id: 'week-1', kind: 'week', canDoId: null, signedBy: 'pip', earnedOn: '2026-09-28' },
  ],
  weeks: [
    {
      week: 1,
      slots: [
        slot('episode', 'preview-a', AT - 3 * 86_400_000),
        slot('real_week', 'preview-b', AT - 86_400_000),
        slot('practice', PREVIEW_CALL_ID, AT),
      ],
    },
  ],
};

/** A week of turns, eight of ten passed on their own. */
export const PREVIEW_WEEK_TURNS: readonly TurnPass[] = [
  ...Array<TurnPass>(8).fill('match'),
  'generous',
  'skip',
];
