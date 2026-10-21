/*
 * The jitter buffer for streamed TTS. Chunks of one stream are held in `seq` order until a little
 * audio is buffered (or the stream is known to be complete), then scheduled back to back on the
 * audio clock, so playout is seamless as long as audio arrives faster than it plays. When a chunk
 * arrives after its slot has passed (an underrun), it is scheduled a short lead from now and the
 * gap is kept in the timeline, so captions and mouths stay on the audio.
 *
 * Times: `ctx` values are seconds on the audio context clock; stream positions are milliseconds
 * from the stream's first sample (the clock the alignment frames use).
 */

export interface PlayoutConfig {
  /** Audio to hold before the first chunk starts, absorbing network jitter. */
  readonly prebufferMs: number;
  /** Start at least this far ahead of the context clock (render quantum and scheduling slack). */
  readonly leadMs: number;
  /** Start anyway once the first chunk has waited this long. */
  readonly maxWaitMs: number;
}

export const DEFAULT_PLAYOUT: PlayoutConfig = { prebufferMs: 120, leadMs: 30, maxWaitMs: 150 };

/** One chunk placed on the audio clock. */
export interface Segment {
  readonly seq: number;
  /** Context time its first sample plays. */
  readonly ctxStart: number;
  /** Stream position of its first sample. */
  readonly streamMs: number;
  readonly durationMs: number;
}

export interface PendingChunk<T> {
  readonly seq: number;
  readonly durationMs: number;
  readonly data: T;
}

export interface Placement<T> extends Segment {
  readonly data: T;
}

export class StreamPlayout<T> {
  private pending: PendingChunk<T>[] = [];
  private started = false;
  private nextCtx = 0;
  private nextStreamMs = 0;
  private lastSeq = 0;
  private firstArrivalCtx: number | null = null;
  private readonly placed: Segment[] = [];
  private complete = false;
  /** Chunks that arrived after a later one had already played. */
  lateDrops = 0;
  /** Times playout ran dry and a gap was inserted. */
  underruns = 0;

  constructor(
    private readonly config: PlayoutConfig = DEFAULT_PLAYOUT,
    /** The earliest the stream may start (after the line before it). */
    private notBeforeCtx = 0,
  ) {}

  get segments(): readonly Segment[] {
    return this.placed;
  }

  get hasStarted(): boolean {
    return this.started;
  }

  /** Context time the last scheduled sample ends, or null before any. */
  get endCtx(): number | null {
    return this.placed.length > 0 ? this.nextCtx : null;
  }

  get bufferedMs(): number {
    return this.pending.reduce((n, c) => n + c.durationMs, 0);
  }

  /** Moves the earliest start later (the line before ran longer). Only before playout starts. */
  delayUntil(ctx: number): void {
    if (!this.started) this.notBeforeCtx = Math.max(this.notBeforeCtx, ctx);
  }

  /** A chunk arrived; returns the chunks to schedule now, in order. */
  push(chunk: PendingChunk<T>, nowCtx: number): Placement<T>[] {
    this.enqueue(chunk, nowCtx);
    return this.release(nowCtx);
  }

  /** A chunk arrived; hold it for the next `tick` or `finish` (which release in order). */
  enqueue(chunk: PendingChunk<T>, nowCtx: number): void {
    if (this.started && chunk.seq <= this.lastSeq) {
      this.lateDrops += 1;
      return;
    }
    this.firstArrivalCtx ??= nowCtx;
    const at = this.pending.findIndex((c) => c.seq > chunk.seq);
    if (at === -1) this.pending.push(chunk);
    else this.pending.splice(at, 0, chunk);
  }

  /** No more chunks will come (`say_end`): play what is held. */
  finish(nowCtx: number): Placement<T>[] {
    this.complete = true;
    return this.release(nowCtx);
  }

  /** Call on a timer while waiting to start: releases once the wait is over. */
  tick(nowCtx: number): Placement<T>[] {
    return this.release(nowCtx);
  }

  private shouldStart(nowCtx: number): boolean {
    if (this.pending.length === 0) return false;
    if (this.complete) return true;
    if (this.bufferedMs >= this.config.prebufferMs) return true;
    const waited = (nowCtx - (this.firstArrivalCtx ?? nowCtx)) * 1000;
    return waited >= this.config.maxWaitMs;
  }

  private release(nowCtx: number): Placement<T>[] {
    if (!this.started) {
      if (!this.shouldStart(nowCtx)) return [];
      this.started = true;
      this.nextCtx = Math.max(this.notBeforeCtx, nowCtx + this.config.leadMs / 1000);
    }
    const out: Placement<T>[] = [];
    const earliest = nowCtx + this.config.leadMs / 1000;
    for (const chunk of this.pending) {
      if (this.nextCtx < earliest) {
        if (this.placed.length > 0) this.underruns += 1;
        this.nextCtx = earliest;
      }
      const seg: Placement<T> = {
        seq: chunk.seq,
        ctxStart: this.nextCtx,
        streamMs: this.nextStreamMs,
        durationMs: chunk.durationMs,
        data: chunk.data,
      };
      out.push(seg);
      this.placed.push({
        seq: seg.seq,
        ctxStart: seg.ctxStart,
        streamMs: seg.streamMs,
        durationMs: seg.durationMs,
      });
      this.nextCtx += chunk.durationMs / 1000;
      this.nextStreamMs += chunk.durationMs;
      this.lastSeq = chunk.seq;
    }
    this.pending = [];
    return out;
  }
}
