/**
 * Shared read facade for the Shirazeh-owned Activity Type Registry (Gap 1).
 * Any module's Activity-creation UI (Pooyesh, Ofogh, Nabz) must read the
 * canonical type list from here — never keep a local hardcoded array.
 *
 * `src/domain/**` is importable from any module per jarian-frontend-boundaries.
 */
import { useActivityTypesStore } from '../../stores/useActivityTypesStore.js';

/** Hydrate the cache (idempotent — call once per surface mount). */
export async function fetchActivityTypes() {
  return useActivityTypesStore.getState().fetchAll();
}

/** All known types (active + inactive) — for label lookups on historical Activities. */
export function listAllActivityTypes() {
  return useActivityTypesStore.getState().listCached();
}

/** Only active types — for "choose type of a NEW activity" pickers. */
export function listActiveActivityTypes() {
  return listAllActivityTypes().filter((t) => t.isActive);
}

/** Resolve a (possibly inactive/deactivated) type's Persian label for display. */
export function resolveActivityTypeLabel(key, fallback = key) {
  const found = listAllActivityTypes().find((t) => t.key === key);
  return found?.labelFa || fallback;
}

/** React subscription tick for consumers that only need to re-render on change. */
export function useActivityTypesVersion() {
  return useActivityTypesStore((s) => s.version);
}

export const activityTypesFacade = {
  fetchActivityTypes,
  listAllActivityTypes,
  listActiveActivityTypes,
  resolveActivityTypeLabel,
  useActivityTypesVersion,
};

export default activityTypesFacade;
