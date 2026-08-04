/**
 * Persistent user list preferences — widths, columns, sorts, filters, pageSize, viewMode.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createEmptyPreferences,
  loadPreferences,
  resetPreferences as resetPreferencesService,
  savePreferences,
} from '../../services/listPreferencesService';

const DEFAULT_USER = 'current-user';

/**
 * @param {{
 *   listKey: string,
 *   userId?: string,
 *   defaults?: object,
 *   debounceMs?: number,
 * }} options
 */
export function useListPreferences(options = {}) {
  const {
    listKey,
    userId = DEFAULT_USER,
    defaults = {},
    debounceMs = 280,
  } = options;

  const empty = useMemo(
    () => ({ ...createEmptyPreferences(), ...defaults }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [listKey],
  );

  const [preferences, setPreferences] = useState(empty);
  const [ready, setReady] = useState(false);
  const [loadToken, setLoadToken] = useState({ userId, listKey });
  const saveTimer = useRef(null);

  if (loadToken.userId !== userId || loadToken.listKey !== listKey) {
    setLoadToken({ userId, listKey });
    setReady(false);
    setPreferences(empty);
  }

  useEffect(() => {
    let cancelled = false;
    loadPreferences(userId, listKey).then((loaded) => {
      if (cancelled) return;
      setPreferences({
        ...createEmptyPreferences(),
        ...defaults,
        ...(loaded || {}),
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, listKey]);

  const persist = useCallback((next) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      savePreferences(userId, listKey, next);
    }, debounceMs);
  }, [userId, listKey, debounceMs]);

  const updatePreferences = useCallback((patch) => {
    setPreferences((prev) => {
      const next = typeof patch === 'function' ? patch(prev) : { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetPreferences = useCallback(async () => {
    await resetPreferencesService(userId, listKey);
    const next = { ...createEmptyPreferences(), ...defaults };
    setPreferences(next);
    return next;
  }, [userId, listKey, defaults]);

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  return {
    listKey,
    userId,
    preferences,
    ready,
    updatePreferences,
    resetPreferences,
    savePreferences: () => savePreferences(userId, listKey, preferences),
    loadPreferences: () => loadPreferences(userId, listKey),
  };
}

export default useListPreferences;
