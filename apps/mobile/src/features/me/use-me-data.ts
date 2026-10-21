import { useEffect, useMemo } from 'react';

import { useAccount, useCalls, useMemory, useMinutes, useProfile, useProgress } from '../../data';
import type { MeActions } from './me-container';
import type { MeInputs } from './me-model';

/**
 * The Me sheet from the app's data: the profile and progress (cached first), the ledger and the
 * memory page fresh from the server, and the latest call's fluency numbers. Inputs are null until
 * there is a profile.
 */
export function useMeData(): { inputs: MeInputs | null; actions: MeActions } {
  const { profile } = useProfile();
  const { progress } = useProgress();
  const { minutes, refresh: refreshMinutes } = useMinutes();
  const { items, refresh: refreshMemory, editMemory, removeMemory } = useMemory();
  const { calls } = useCalls();
  const { deleteAccount } = useAccount();

  // The minutes and the notes change between visits: ask again each time the sheet opens.
  useEffect(() => {
    void refreshMinutes().catch(() => undefined);
    void refreshMemory().catch(() => undefined);
    // Once per opening: the refreshers change identity with every state change.
  }, []);

  const inputs = useMemo<MeInputs | null>(() => {
    if (profile === null) return null;
    const latest = calls.find((c) => c.summary !== null);
    return {
      displayName: profile.displayName,
      roommateName: profile.roommate.name,
      stage: profile.stage,
      track: profile.track,
      canDos: progress?.canDos ?? [],
      minutes,
      fluency: latest?.summary?.metrics ?? null,
      memory: items,
      quietHours: profile.quietHours,
    };
  }, [profile, progress, minutes, items, calls]);

  const actions = useMemo<MeActions>(
    () => ({
      updateMemory: (id, text) => editMemory(id, { text }),
      deleteMemory: (id) => removeMemory(id),
      deleteAccount: async () => {
        await deleteAccount();
      },
    }),
    [editMemory, removeMemory, deleteAccount],
  );

  return { inputs, actions };
}
