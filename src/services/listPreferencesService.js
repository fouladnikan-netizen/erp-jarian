/**
 * List preferences persistence — local now, backend-ready adapter later.
 * Keys are scoped per user + list (e.g. nabz.orders.table).
 * Stores column/sort/filter prefs only — not rendering strategy.
 */

const STORAGE_PREFIX = 'jarian:list-prefs:';

/** @typedef {{
 *   version: number,
 *   columns?: Record<string, { visible?: boolean, order?: number }>,
 *   widths?: Record<string, number>,
 *   sorts?: Array<{ key: string, dir: 'asc'|'desc' }>,
 *   filters?: Record<string, string[]|null>,
 * }} ListPreferences
 */

function storageKey(userId, listKey) {
  return `${STORAGE_PREFIX}${userId || 'anonymous'}:${listKey}`;
}

/** Strip legacy rendering-strategy fields from older saved prefs. */
function sanitizePreferences(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const {
    viewMode: _viewMode,
    pageSize: _pageSize,
    ...rest
  } = raw;
  return rest;
}

const localAdapter = {
  async load(userId, listKey) {
    try {
      const raw = localStorage.getItem(storageKey(userId, listKey));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return sanitizePreferences(parsed);
    } catch {
      return null;
    }
  },
  async save(userId, listKey, prefs) {
    try {
      const clean = sanitizePreferences(prefs) || prefs;
      localStorage.setItem(storageKey(userId, listKey), JSON.stringify(clean));
      return true;
    } catch {
      return false;
    }
  },
  async reset(userId, listKey) {
    try {
      localStorage.removeItem(storageKey(userId, listKey));
      return true;
    } catch {
      return false;
    }
  },
};

let adapter = localAdapter;

/** Swap for API/backend storage without changing hook consumers. */
export function setListPreferencesAdapter(nextAdapter) {
  if (nextAdapter && typeof nextAdapter.load === 'function') {
    adapter = nextAdapter;
  }
}

export function getListPreferencesAdapter() {
  return adapter;
}

export async function loadPreferences(userId, listKey) {
  if (!listKey) return null;
  return adapter.load(userId, listKey);
}

export async function savePreferences(userId, listKey, prefs) {
  if (!listKey || !prefs) return false;
  const payload = {
    version: 1,
    ...sanitizePreferences(prefs),
    updatedAt: new Date().toISOString(),
  };
  return adapter.save(userId, listKey, payload);
}

export async function resetPreferences(userId, listKey) {
  if (!listKey) return false;
  return adapter.reset(userId, listKey);
}

export function createEmptyPreferences() {
  return {
    version: 1,
    columns: {},
    widths: {},
    sorts: [],
    filters: {},
  };
}
