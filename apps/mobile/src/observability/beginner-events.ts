import type {
  CallEndReason,
  CallKind,
  CallRecord,
  Profile,
  SettlingChapterDone,
  TurnMode,
} from '@yapling/contracts';
import { SETTLING_SCENES } from '@yapling/domain';

import type { AnalyticsEvents, CallProperties } from './events';

/*
 * The beginner path's event payloads, from what the app already knows: the profile (how the
 * learner started, the stage placement left), a call's scene and turn mode, and the chapters done.
 * Pure, so each payload is tested. What the server's turn log keeps (each turn's outcome and pass
 * kind, "again" and "slowly" said aloud, first-word times) is never sent from here.
 */

/** The Settling-in chapter a scene plays, 1 to 6, or null for a scene outside Settling in. */
export const chapterOfScene = (sceneId: string): number | null => {
  const index = (SETTLING_SCENES as readonly string[]).indexOf(sceneId);
  return index < 0 ? null : index + 1;
};

/** Every call event's own properties. */
export const callPropertiesOf = (
  kind: CallKind,
  sceneId: string,
  turnMode: TurnMode | undefined,
): CallProperties => ({
  kind,
  scene_id: sceneId,
  chapter: chapterOfScene(sceneId),
  turn_mode: turnMode ?? null,
});

/** The onboarding answer, once the profile has it; null before (or for an older profile). */
export const pathChosenOf = (
  profile: Pick<Profile, 'startPath'> | null,
): AnalyticsEvents['path_chosen'] | null =>
  profile?.startPath == null ? null : { path: profile.startPath };

/** Where the placement call left the learner, from the server's profile after it. */
export const placementResultOf = (
  profile: Pick<Profile, 'stage' | 'startPath'>,
): AnalyticsEvents['placement_result'] => ({ stage: profile.stage, path: profile.startPath });

/** A chapter's start, or null when the call isn't a Settling-in chapter. */
export const chapterStartedOf = (
  call: CallProperties,
  doneBefore: readonly Pick<SettlingChapterDone, 'chapter'>[],
): AnalyticsEvents['chapter_started'] | null =>
  call.chapter === null
    ? null
    : {
        chapter: call.chapter,
        scene_id: call.scene_id,
        replay: doneBefore.some((d) => d.chapter === call.chapter),
        turn_mode: call.turn_mode,
      };

/** A chapter's end, from its start and the call's end (the record's times when it was read). */
export const chapterEndedOf = (
  started: AnalyticsEvents['chapter_started'],
  end: {
    readonly reason: CallEndReason;
    readonly measuredSeconds: number;
    readonly record: Pick<CallRecord, 'startedAt' | 'endedAt' | 'learnerSeconds'> | null;
  },
): AnalyticsEvents['chapter_ended'] => ({
  ...started,
  ended_reason: end.reason,
  complete: end.reason === 'scene_complete',
  duration_seconds:
    end.record === null
      ? end.measuredSeconds
      : Math.round((end.record.endedAt - end.record.startedAt) / 1_000),
  learner_seconds: end.record?.learnerSeconds ?? null,
});
