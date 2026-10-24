import type { StageHandle } from './stage';
import { Sound } from './sound';
import { Talk } from './talk';
import { world, type World } from './world';

/*
 * The app's few long-lived pieces, made once: the world (data), the sound, the stage handle the
 * scene mounts, and the talk that ties a conversation to them. The menu sheet reads the same ones.
 */

export interface App {
  readonly world: World;
  readonly sound: Sound;
  readonly talk: Talk;
  /** The stage the scene mounted, for messages and still paintings. */
  stage: StageHandle | null;
}

let shared: App | null = null;

export function app(): App {
  if (shared) return shared;
  const w = world();
  const sound = new Sound();
  const made: App = {
    world: w,
    sound,
    stage: null,
    talk: null as unknown as Talk,
  };
  (made as { talk: Talk }).talk = new Talk(w, () => made.stage, sound);
  shared = made;
  return made;
}
