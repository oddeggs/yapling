// Hedged streaming: start n identical requests, keep whichever streams text first, abort the rest.
// The LLM is about 1% of a call's cost, so paying twice for its input trims the slow tail cheaply.

type Event = { type: string };

export async function* hedged<E extends Event>(
  start: (signal: AbortSignal) => AsyncIterable<E>,
  n: number,
  signal: AbortSignal,
): AsyncGenerator<E> {
  if (n <= 1) {
    yield* start(signal);
    return;
  }
  const ctrls = Array.from({ length: n }, () => new AbortController());
  signal.addEventListener("abort", () => ctrls.forEach((c) => c.abort()), { once: true });
  type Lane = { buf: E[]; done: boolean; err: unknown };
  const lanes: Lane[] = ctrls.map(() => ({ buf: [], done: false, err: undefined }));
  let winner = -1;
  let wake: (() => void) | null = null;
  const poke = (): void => {
    const w = wake;
    wake = null;
    w?.();
  };
  ctrls.forEach((ctrl, i) => {
    const lane = lanes[i]!;
    void (async () => {
      try {
        for await (const ev of start(ctrl.signal)) {
          if (winner === -1 && ev.type === "content_block_delta") {
            winner = i;
            ctrls.forEach((other, j) => j !== i && other.abort());
          }
          if (winner === -1 || winner === i) lane.buf.push(ev);
          poke();
        }
      } catch (err) {
        lane.err = err;
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
    await new Promise<void>((r) => (wake = r));
  }
  const lane = lanes[winner]!;
  for (;;) {
    while (lane.buf.length) yield lane.buf.shift()!;
    if (lane.done) {
      if (lane.err && !signal.aborted) throw lane.err;
      return;
    }
    await new Promise<void>((r) => (wake = r));
  }
}
