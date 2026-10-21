import { useCallback, useRef, useSyncExternalStore } from 'react';

/**
 * A tiny subscription store (no state library, by decision): a value, a setter and listeners,
 * read in React through `useSyncExternalStore`.
 */
export interface Store<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      const v = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      if (Object.is(v, value)) return;
      value = v;
      for (const l of [...listeners]) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** A slice of a store; the component re-renders only when the slice changes (`Object.is`). */
export function useStore<T, S = T>(store: Store<T>, select?: (value: T) => S): S {
  const selectRef = useRef(select);
  selectRef.current = select;
  const get = useCallback(() => {
    const value = store.get();
    return selectRef.current ? selectRef.current(value) : (value as unknown as S);
  }, [store]);
  const subscribe = useCallback((l: () => void) => store.subscribe(l), [store]);
  return useSyncExternalStore(subscribe, get, get);
}
