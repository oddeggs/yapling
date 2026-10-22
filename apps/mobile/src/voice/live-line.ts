/*
 * The phone holds one live call at a time. A call engine takes the line when it is built; the
 * engine that held it before (a call screen mounted twice, pushed twice, or left without being
 * closed) is disposed, so its socket closes and its call never runs on unheard.
 */

export interface LineHolder {
  dispose(): Promise<void>;
}

let holder: LineHolder | null = null;

/** `engine` takes the line; the one that held it is disposed. */
export function takeLine(engine: LineHolder): void {
  const previous = holder;
  holder = engine;
  if (previous !== null && previous !== engine) void previous.dispose();
}

/** `engine` lets go of the line (its screen unmounted); a newer holder keeps it. */
export function releaseLine(engine: LineHolder): void {
  if (holder === engine) holder = null;
}
