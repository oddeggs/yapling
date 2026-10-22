import type { CallEndReason } from '@yapling/contracts';
import {
  PLACEMENT_OPEN_BOXES,
  placementSkipsLastBox,
  placementStage,
  type TurnPass,
} from '@yapling/domain';
import type { RunnerState, Scene } from '@yapling/story';

import type { Bindings } from '../env';
import { applyPlacement } from '../profile';
import type { CallData, TurnPassRecord } from './finalize';

/*
 * How each turn left its beat (the runner's pass kind), kept on the call, and the placement call's
 * end: the open boxes (the scored turns; the warm-up box is not) set the learner's stage by the
 * placement rule (`placementStage`), through the profile's `applyPlacement`.
 */

/** The pass this turn made: the runner's last pass when it is new and on the turn's beat. */
export function passOf(
  before: RunnerState['lastTurn'],
  after: RunnerState['lastTurn'],
  beatId: string,
): TurnPass | null {
  if (after === undefined || after === before || after.beatId !== beatId) return null;
  if (before !== undefined && before.beatId === after.beatId && before.pass === after.pass)
    return null;
  return after.pass;
}

/** Records the pass the runner's last turn made, once per beat (beats only move forward). */
export function notePass(data: CallData, state: RunnerState): void {
  const last = state.lastTurn;
  if (last === undefined) return;
  const passes = (data.passes ??= []);
  if (passes.some((p) => p.beatId === last.beatId)) return;
  passes.push({ beatId: last.beatId, pass: last.pass });
}

const scoredBeats = (scene: Scene): Set<string> =>
  new Set(
    scene.beats.flatMap((b) => {
      const answer = b.kind === 'learner' || b.kind === 'gen' ? b.answer : null;
      return answer?.scored ? [b.id] : [];
    }),
  );

/** The placement ladder: a placement scene with its open boxes (the knock at the door isn't). */
export const isPlacementLadder = (scene: Scene): boolean =>
  scene.kind === 'placement' && scoredBeats(scene).size >= PLACEMENT_OPEN_BOXES;

/** One flag per open box played, in order: fine when the turn passed on its own. */
export function openBoxesFine(scene: Scene, passes: readonly TurnPassRecord[]): boolean[] {
  const scored = scoredBeats(scene);
  return passes.filter((p) => scored.has(p.beatId)).map((p) => p.pass === 'match');
}

/**
 * The end of a placement call: the stage set by the rule once the ladder is done (the scene
 * complete, every open box played, or the early stop after two misses). A call that ends sooner
 * sets nothing, so the next placement call still can. Every outcome is logged.
 */
export async function placementDone(
  env: Bindings,
  data: CallData,
  scene: Scene,
  reason: CallEndReason,
): Promise<void> {
  if (!isPlacementLadder(scene)) return;
  const boxes = openBoxesFine(scene, data.passes ?? []);
  const done =
    reason === 'scene_complete' ||
    boxes.length >= PLACEMENT_OPEN_BOXES ||
    placementSkipsLastBox(boxes);
  const log = {
    msg: 'call placement',
    callId: data.meta.callId,
    boxes,
    rule: placementStage(boxes),
  };
  if (!done) {
    console.log({ ...log, applied: false, reason: 'not_finished' });
    return;
  }
  try {
    const outcome = await applyPlacement(
      env.DB,
      data.meta.userId,
      { callId: data.meta.callId, openBoxesFine: boxes },
      Date.now(),
    );
    console.log({ ...log, ...outcome });
  } catch (error) {
    console.error('call placement failed', {
      callId: data.meta.callId,
      error: String(error).slice(0, 200),
    });
  }
}
