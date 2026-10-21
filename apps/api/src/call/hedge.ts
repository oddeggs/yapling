/*
 * Hedged streaming: start `n` identical requests, keep whichever streams text first, abort the
 * rest. The model is about 1% of a call's cost, so paying twice for its input trims the slow tail
 * (first-token P90 1.8 s → 0.6 s in the voice spike) cheaply.
 */

interface StreamEvent {
  readonly type: string;
}

export async function* hedged<E extends StreamEvent>(
  start: (signal: AbortSignal) => AsyncIterable<E>,
  n: number,
  signal: AbortSignal,
  /** The event that marks a lane as the winner (its first text). */
  isText: (event: E) => boolean = (event) => event.type === 'content_block_delta',
): AsyncGenerator<E> {
  if (n <= 1) {
    yield* start(signal);
    return;
  }
  const controllers = Array.from({ length: n }, () => new AbortController());
  signal.addEventListener('abort', () => controllers.forEach((c) => c.abort()), { once: true });
  interface Lane {
    readonly buffer: E[];
    done: boolean;
    error: unknown;
  }
  const lanes: Lane[] = controllers.map(() => ({ buffer: [], done: false, error: undefined }));
  let winner = -1;
  let wake: (() => void) | null = null;
  const poke = (): void => {
    const w = wake;
    wake = null;
    w?.();
  };
  controllers.forEach((controller, i) => {
    const lane = lanes[i];
    if (lane === undefined) return;
    void (async () => {
      try {
        for await (const event of start(controller.signal)) {
          if (winner === -1 && isText(event)) {
            winner = i;
            controllers.forEach((other, j) => {
              if (j !== i) other.abort();
            });
          }
          if (winner === -1 || winner === i) lane.buffer.push(event);
          poke();
        }
      } catch (error) {
        lane.error = error;
      } finally {
        lane.done = true;
        poke();
      }
    })();
  });
  while (winner === -1) {
    if (lanes.every((l) => l.done)) {
      // Nobody produced text: surface the first lane's events or error.
      winner = 0;
      break;
    }
    await new Promise<void>((resolve) => (wake = resolve));
  }
  const lane = lanes[winner];
  if (lane === undefined) return;
  for (;;) {
    while (lane.buffer.length > 0) {
      const event = lane.buffer.shift();
      if (event !== undefined) yield event;
    }
    if (lane.done) {
      if (lane.error !== undefined && !signal.aborted) {
        throw lane.error instanceof Error ? lane.error : new Error(JSON.stringify(lane.error));
      }
      return;
    }
    await new Promise<void>((resolve) => (wake = resolve));
  }
}
