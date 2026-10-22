import { Picture, Skia } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef } from 'react';
import {
  isSharedValue,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import type { Mouth } from '../critter';
import { drawRig, REST_POSE } from '../rig/draw';
import { actIndex, livePose, startAct, type ActRequest, type LiveState } from '../rig/live';
import type { ActName } from '../rig/acts';
import type { RigPictures } from '../rig/pictures';
import type { PoseOptions, Tune } from '../rig/pose';

export interface RigArtProps {
  pics: RigPictures;
  mouth: Mouth | SharedValue<Mouth>;
  act: ActName;
  /** Changing it plays the act again. */
  play: number;
  /** Toward the speaker: 1 the viewer's right, −1 the left. */
  side: 1 | -1;
  /** False holds the rest pose (Reduce Motion, or a still critter): the generator's own drawing. */
  live: boolean;
  seed: number;
  tune: Tune;
  raised: readonly [boolean, boolean];
  size: number;
  x: number;
  y: number;
  /** For measuring: the UI-thread time of the last frame's pose and drawing (ms). */
  cost?: SharedValue<number> | undefined;
}

/** How fast the talking bob follows the lipsync starting and stopping (ms). */
const TALK_EASE_MS = 160;

/**
 * A rigged critter: each part a cached picture moved about its own joint, the pose computed and
 * drawn on the UI thread each frame from one live clock. Asking for another act (or side, or the
 * same act again) melts what is on screen into it (see `startAct`).
 */
export function RigArt({
  pics,
  mouth,
  act,
  play,
  side,
  live,
  seed,
  tune,
  raised,
  size,
  x,
  y,
  cost,
}: RigArtProps) {
  const mouthShared = isSharedValue<Mouth>(mouth) ? mouth : null;
  const mouthFixed: Mouth = isSharedValue<Mouth>(mouth) ? 'rest' : mouth;
  const bounds = useMemo(() => Skia.XYWHRect(-size, -size, size * 3, size * 3.4), [size]);
  const [raisedL, raisedR] = raised;

  const now = useSharedValue(0);
  const origin = useSharedValue(-1);
  const talk = useSharedValue(0);
  const state = useSharedValue<LiveState | null>(null);
  const turn = useRef(0);
  const request = useSharedValue<ActRequest>({ act: actIndex(act), side, turn: 0 });
  useEffect(() => {
    turn.current += 1;
    request.value = { act: actIndex(act), side, turn: turn.current };
  }, [act, side, play, request]);
  // Held still, it starts again from rest (where it is drawn) when it moves again.
  useEffect(() => {
    if (!live) state.value = null;
  }, [live, state]);

  const frames = useFrameCallback((frame) => {
    if (origin.value < 0) origin.value = frame.timestamp;
    const n = frame.timestamp - origin.value;
    const dt = frame.timeSincePreviousFrame ?? 16;
    const talking = (mouthShared ? mouthShared.value : mouthFixed) !== 'rest' ? 1 : 0;
    talk.value += (talking - talk.value) * (1 - Math.exp(-dt / TALK_EASE_MS));
    const req = request.value;
    const st = state.value;
    if (!st || st.turn !== req.turn) {
      const o: PoseOptions = { tune, raised: [raisedL, raisedR], talk: talk.value };
      state.value = startAct(st, req, n, seed, o);
    }
    now.value = n;
  }, live);
  // `autostart` only counts on the first render: follow `live` after it.
  useEffect(() => frames.setActive(live), [frames, live]);

  const picture = useDerivedValue(() => {
    const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const start = cost ? clock() : 0;
    const st = state.value;
    const o: PoseOptions = { tune, raised: [raisedL, raisedR], talk: talk.value };
    // Still, or before its first frame: every part at rest, exactly the generator's drawing.
    const pose = live && st ? livePose(st, now.value, seed, o) : REST_POSE;
    const m = pics.mouths[mouthShared ? mouthShared.value : mouthFixed];
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(bounds);
    canvas.translate(x, y);
    drawRig(canvas, pics, pose, m);
    const out = recorder.finishRecordingAsPicture();
    if (cost) cost.value = clock() - start;
    return out;
  });

  return <Picture picture={picture} />;
}
