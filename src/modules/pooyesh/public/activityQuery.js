/**
 * Pooyesh public Activity tick / read helpers for other modules.
 * Prefer interactionFacade for mutations.
 */
import { useActivitiesStore } from '../../../stores/useActivitiesStore.js';

export function useActivitiesVersion() {
  // `version` (not activities.length) — in-place mutations (complete/update)
  // don't change array length but must still invalidate memoized consumers.
  return useActivitiesStore((s) => s.version);
}

export function listCachedActivities() {
  return useActivitiesStore.getState().activities || [];
}
