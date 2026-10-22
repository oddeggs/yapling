import type { Id } from '@yapling/contracts';
import type { WeekOneUnlock } from '@yapling/domain';
import { Storage } from 'expo-sqlite/kv-store';

/*
 * Which between-call moments the learner has been through (Pip's story, a postcard, a voicemail,
 * the season map). The app's data layer has no store for this yet, so the phone keeps it here;
 * the integration moves it into the data layer and the burrow reads it from there.
 */

const PREFIX = 'yapling.seen.';

/** The first week's unlock each between-call scene stands for, as the burrow's plan names them. */
const UNLOCK_OF_SCENE: Readonly<Record<Id, WeekOneUnlock>> = {
  's1-e1-story': 'pip_story',
  's1-e1-postcard': 'linh_postcard',
  's1-e1-voicemail': 'voicemail',
};

export const SEASON_MAP_SEEN = 'season-map';

const read = (key: string): string | null => {
  try {
    return Storage.getItemSync(PREFIX + key);
  } catch {
    return null;
  }
};

/** Marks scenes (or the season map) as seen; a mark is never taken back. */
export function markSeen(ids: readonly Id[], at = Date.now()): void {
  for (const id of ids) {
    if (read(id) !== null) continue;
    try {
      Storage.setItemSync(PREFIX + id, String(at));
    } catch {
      // A full or locked store only means the burrow offers the moment again.
    }
  }
}

export const isSeen = (id: Id): boolean => read(id) !== null;

/** The first week's unlocks the learner has been through, for the burrow's plan. */
export function seenUnlocks(): ReadonlySet<WeekOneUnlock> {
  const seen = new Set<WeekOneUnlock>();
  for (const [scene, unlock] of Object.entries(UNLOCK_OF_SCENE))
    if (isSeen(scene)) seen.add(unlock);
  if (isSeen(SEASON_MAP_SEEN)) seen.add('season_map');
  return seen;
}
