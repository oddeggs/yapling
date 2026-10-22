/**
 * Recording off the first frame. Recording a rig takes a frame or several on the JS thread (more
 * in a debug build), so it never runs while a screen mounts: a critter first draws today's picture
 * at rest, its rig is recorded after the first frame (while the screen's transition plays on the UI
 * thread), and one rig is recorded per task, so a screen of critters never blocks touches for long.
 */

type Job = () => void;

const queue: Job[] = [];
let running = false;

const raf = (globalThis as { requestAnimationFrame?: (run: () => void) => unknown })
  .requestAnimationFrame;
const nextFrame = (run: () => void): void => {
  if (raf) raf(() => setTimeout(run, 0));
  else setTimeout(run, 0);
};

function drain(): void {
  const job = queue.shift();
  if (!job) {
    running = false;
    return;
  }
  try {
    job();
  } finally {
    // The next one in its own task, after the frame this one may have delayed.
    nextFrame(drain);
  }
}

/** Runs `job` after the next frame, one job per task, in order; the returned function cancels it. */
export function afterFirstFrame(job: Job): () => void {
  queue.push(job);
  if (!running) {
    running = true;
    nextFrame(drain);
  }
  return () => {
    const i = queue.indexOf(job);
    if (i >= 0) queue.splice(i, 1);
  };
}
