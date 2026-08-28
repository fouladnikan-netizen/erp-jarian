/**
 * Shared read facade for the Shirazeh-owned Correspondence Type Registry
 * (DDL-23d). Every Correspondence-creation surface (Gahshomar drawer today,
 * future Kanoon/Nabz composers) must read the canonical type list from here
 * — never hardcode a local type list (product rule 7/8).
 *
 * `src/domain/**` is importable from any module per jarian-frontend-boundaries.
 */
import { useCorrespondenceTypesStore } from '../../stores/useCorrespondenceTypesStore.js';

/** Hydrate the cache (idempotent — call once per surface mount). */
export async function fetchCorrespondenceTypes() {
  return useCorrespondenceTypesStore.getState().fetchAll();
}

/** All known types (active + inactive) — for label lookups on historical Correspondence. */
export function listAllCorrespondenceTypes() {
  return useCorrespondenceTypesStore.getState().listCached();
}

/** Only active types — for "choose type of a NEW correspondence" pickers. */
export function listActiveCorrespondenceTypes() {
  return listAllCorrespondenceTypes().filter((t) => t.isActive);
}

/** Resolve a (possibly inactive/deactivated) type's Persian label for display. */
export function resolveCorrespondenceTypeLabel(key, fallback = key) {
  const found = listAllCorrespondenceTypes().find((t) => t.key === key);
  return found?.labelFa || fallback;
}

/** React subscription tick for consumers that only need to re-render on change. */
export function useCorrespondenceTypesVersion() {
  return useCorrespondenceTypesStore((s) => s.version);
}

export const correspondenceTypesFacade = {
  fetchCorrespondenceTypes,
  listAllCorrespondenceTypes,
  listActiveCorrespondenceTypes,
  resolveCorrespondenceTypeLabel,
  useCorrespondenceTypesVersion,
};

export default correspondenceTypesFacade;
