/*
 * The phone's guard against waiting for a reply forever. After the learner's turn the phone waits
 * for the call to answer: the words it heard, the thinking head tilt, or the reply's audio. When
 * nothing comes (a press with no words in it, a provider that went quiet, a frame lost in a
 * reconnect), the wait ends and the learner gets their turn back with "didn't catch that",
 * instead of a mic that never comes back.
 */

export interface ReplyWatchLimits {
  /** After the turn ended, with no sign of an answer. */
  readonly nothingMs: number;
  /** After the call said it is thinking (or heard the words), with no audio yet. */
  readonly answeringMs: number;
}

export const REPLY_WATCH: ReplyWatchLimits = {
  // Scribe's final text takes up to 2.5 s, then the reply starts or the head tilts.
  nothingMs: 6_000,
  // The call gives up on a silent provider after 10 s and says so; this is the backstop.
  answeringMs: 15_000,
};

export type ReplyWatch =
  | { readonly state: 'idle' }
  | { readonly state: 'waiting' | 'answering'; readonly sinceMs: number };

export type ReplyWatchEvent =
  /** The learner's turn ended: an answer is due. */
  | { readonly type: 'turn_ended'; readonly atMs: number }
  /** The call heard the words or is thinking: the answer is on its way. */
  | { readonly type: 'answering'; readonly atMs: number }
  /** A character line became audible, the learner spoke again, or the call ended. */
  | { readonly type: 'settled' };

export const IDLE_WATCH: ReplyWatch = { state: 'idle' };

export function watchReply(watch: ReplyWatch, event: ReplyWatchEvent): ReplyWatch {
  switch (event.type) {
    case 'turn_ended':
      return { state: 'waiting', sinceMs: event.atMs };
    case 'answering':
      return { state: 'answering', sinceMs: event.atMs };
    case 'settled':
      return IDLE_WATCH;
  }
}

/** True when the wait has gone on too long and the learner should get their turn back. */
export function replyOverdue(
  watch: ReplyWatch,
  nowMs: number,
  limits: ReplyWatchLimits = REPLY_WATCH,
): boolean {
  if (watch.state === 'idle') return false;
  const limit = watch.state === 'waiting' ? limits.nothingMs : limits.answeringMs;
  return nowMs - watch.sinceMs >= limit;
}

/** The watch on a clock: tells the engine once when an awaited answer is overdue. */
export class ReplyWatcher {
  private watch: ReplyWatch = IDLE_WATCH;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly onOverdue: () => void,
    private readonly tickMs = 500,
    private readonly now: () => number = Date.now,
  ) {}

  /** An answer is awaited (or on its way). */
  get waiting(): boolean {
    return this.watch.state !== 'idle';
  }

  on(event: ReplyWatchEvent): void {
    this.watch = watchReply(this.watch, event);
    if (this.watch.state === 'idle') {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      return;
    }
    this.timer ??= setInterval(() => {
      if (!replyOverdue(this.watch, this.now())) return;
      this.on({ type: 'settled' });
      this.onOverdue();
    }, this.tickMs);
  }
}
