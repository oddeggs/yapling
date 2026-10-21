import type { Roommate } from '@yapling/contracts';
import { CAST } from '@yapling/story';

import { useProfile } from '../../data';

/**
 * The learner's roommate from the profile; before a profile loads, the cast's own roommate (Pip,
 * the red panda), whom onboarding offers by default.
 */
export function useRoommate(): Roommate {
  const { profile } = useProfile();
  return profile?.roommate ?? { species: 'redpanda', name: CAST.pip.name };
}
