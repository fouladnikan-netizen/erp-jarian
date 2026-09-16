/**
 * Pooyesh public Task tick / read helpers for other modules.
 * Prefer taskFacade for mutations.
 */
import { useTasksStore } from '../../../stores/useTasksStore.js';

export function useTasksVersion() {
  // `version` (not tasks.length) — in-place mutations (complete/update) don't
  // change array length but must still invalidate memoized consumers.
  return useTasksStore((s) => s.version);
}

export function listCachedTasks() {
  return useTasksStore.getState().tasks || [];
}
