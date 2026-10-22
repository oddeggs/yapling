import { useCallback, useEffect, useState } from 'react';

import { sqliteCache } from '../../data/sqlite-cache';

/*
 * The weeks whose Newcomer card the learner has answered on this phone, so Linh doesn't knock with
 * it twice for the same ring (after "Ở lại thêm" she offers again at the end of the next one). The
 * answer itself goes to the server as a stage request.
 */

const KEY = 'stage-up-answered';

let cached: readonly number[] | null = null;

async function read(): Promise<readonly number[]> {
  if (cached !== null) return cached;
  const raw = await sqliteCache.get(KEY).catch(() => null);
  try {
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    cached = Array.isArray(parsed) ? parsed.filter((w): w is number => Number.isInteger(w)) : [];
  } catch {
    cached = [];
  }
  return cached;
}

/** The answered weeks (null while they load) and a way to add one. */
export function useAnsweredStageUps(): {
  readonly weeks: readonly number[] | null;
  readonly answer: (week: number) => void;
} {
  const [weeks, setWeeks] = useState<readonly number[] | null>(cached);
  useEffect(() => {
    let live = true;
    void read().then((w) => {
      if (live) setWeeks(w);
    });
    return () => {
      live = false;
    };
  }, []);
  const answer = useCallback((week: number) => {
    const next = [...new Set([...(cached ?? []), week])].sort((a, b) => a - b);
    cached = next;
    setWeeks(next);
    void sqliteCache.set(KEY, JSON.stringify(next)).catch(() => undefined);
  }, []);
  return { weeks, answer };
}
