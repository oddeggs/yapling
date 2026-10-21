import { useEffect, useMemo, useRef } from 'react';

/*
 * A JS-thread function for a worklet to call back (`scheduleOnRN`). The worklets runtime keeps
 * every function a worklet calls back for as long as the UI thread keeps that worklet, and a
 * gesture or frame callback can outlive its component. A function made in a component's body
 * holds the whole body's scope; the relay holds nothing but a ref, emptied on unmount.
 */

/** A stable stand-in for `fn` that always calls the latest `fn`, and nothing once unmounted. */
export function useRelay<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
  const latest = useRef<((...args: A) => void) | null>(fn);
  useEffect(() => {
    latest.current = fn;
    return () => {
      latest.current = null;
    };
  });
  return useMemo(() => relayTo(latest), []);
}

/** The stand-in itself, made outside the hook's scope so it holds the ref alone. */
export function relayTo<A extends unknown[]>(latest: {
  readonly current: ((...args: A) => void) | null;
}): (...args: A) => void {
  return (...args: A) => latest.current?.(...args);
}
