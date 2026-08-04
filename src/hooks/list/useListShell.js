/**
 * High-level shared list shell — preferences, columns, widths, infinite loading.
 * Modules pass listKey + column definitions + scroll/sentinel refs.
 * Rendering strategy is fixed: Filter → Sort → Infinite Loading → Render.
 */

import { useCallback, useMemo, useState } from 'react';
import { useColumnManager } from './useColumnManager';
import { useListPreferences } from './useListPreferences';
import { useListDataProvider, LIST_INFINITE_CHUNK_SIZE } from './useListDataProvider';
import { applyMultiSort, nextSorts } from './useMultiSort';

const MIN_COL_WIDTH = 56;

/**
 * @param {{
 *   listKey: string,
 *   userId?: string,
 *   columnDefinitions: Array<any>,
 *   rows?: Array<any>,
 *   sortAccessors?: Record<string, Function>,
 *   sortTypes?: Record<string, string>,
 *   resetKey?: string|number,
 *   chunkSize?: number,
 *   onLoadMore?: Function,
 *   hasMore?: boolean,
 *   loadingMore?: boolean,
 *   scrollRef: React.RefObject<HTMLElement|null>,
 *   sentinelRef: React.RefObject<HTMLElement|null>,
 * }} options
 */
export function useListShell(options = {}) {
  const {
    listKey,
    userId,
    columnDefinitions = [],
    rows = [],
    sortAccessors,
    sortTypes,
    resetKey,
    chunkSize = LIST_INFINITE_CHUNK_SIZE,
    onLoadMore,
    hasMore,
    loadingMore,
    scrollRef,
    sentinelRef,
  } = options;

  const {
    preferences,
    ready,
    updatePreferences,
    resetPreferences,
  } = useListPreferences({ listKey, userId });

  const onColumnStateChange = useCallback((state) => {
    updatePreferences((prev) => ({
      ...prev,
      columns: state,
    }));
  }, [updatePreferences]);

  const columnManager = useColumnManager({
    definitions: columnDefinitions,
    initialState: ready ? (preferences.columns || null) : null,
    onChange: onColumnStateChange,
  });

  const [sorts, setSorts] = useState([]);
  const [sortsHydrated, setSortsHydrated] = useState(false);
  const [seenResetKey, setSeenResetKey] = useState(resetKey);

  if (seenResetKey !== resetKey) {
    setSeenResetKey(resetKey);
    setSorts([]);
    setSortsHydrated(false);
  }

  if (ready && !sortsHydrated) {
    setSorts(Array.isArray(preferences.sorts) ? preferences.sorts : []);
    setSortsHydrated(true);
  }

  const toggleSort = useCallback((columnKey, event) => {
    setSorts((prev) => {
      const next = nextSorts(prev, columnKey, event);
      updatePreferences((prefs) => ({ ...prefs, sorts: next }));
      return next;
    });
  }, [updatePreferences]);

  const clearSort = useCallback(() => {
    setSorts([]);
    updatePreferences((prefs) => ({ ...prefs, sorts: [] }));
  }, [updatePreferences]);

  const sortedRows = useMemo(
    () => applyMultiSort(rows, sorts, { accessors: sortAccessors, types: sortTypes }),
    [rows, sorts, sortAccessors, sortTypes],
  );

  const widths = useMemo(() => {
    const map = {};
    columnDefinitions.forEach((col) => {
      map[col.key] = preferences.widths?.[col.key]
        ?? col.defaultWidth
        ?? col.width
        ?? 120;
    });
    return map;
  }, [columnDefinitions, preferences.widths]);

  const startResize = useCallback((key, startX) => {
    const startWidth = widths[key] ?? MIN_COL_WIDTH;
    const onMove = (event) => {
      const nextWidth = Math.max(MIN_COL_WIDTH, startWidth + (startX - event.clientX));
      updatePreferences((prev) => ({
        ...prev,
        widths: { ...(prev.widths || {}), [key]: nextWidth },
      }));
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [widths, updatePreferences]);

  const data = useListDataProvider({
    items: sortedRows,
    chunkSize,
    resetKey,
    onLoadMore,
    hasMore,
    loadingMore,
    scrollRef,
    sentinelRef,
  });

  const setFilters = useCallback((filters) => {
    updatePreferences((prev) => ({ ...prev, filters }));
  }, [updatePreferences]);

  const { resetColumns } = columnManager;

  const handleResetPreferences = useCallback(async () => {
    const next = await resetPreferences();
    resetColumns();
    setSorts([]);
    setSortsHydrated(true);
    return next;
  }, [resetPreferences, resetColumns]);

  return {
    listKey,
    ready,
    preferences,
    updatePreferences,
    resetPreferences: handleResetPreferences,
    columns: columnManager.columns,
    visibleColumns: columnManager.visibleColumns,
    setColumnVisible: columnManager.setColumnVisible,
    toggleColumn: columnManager.toggleColumn,
    reorderColumns: columnManager.reorderColumns,
    resetColumns,
    isColumnVisible: columnManager.isVisible,
    widths,
    startResize,
    sorts,
    toggleSort,
    clearSort,
    sortedRows,
    savedFilters: preferences.filters || {},
    setFilters,
    visibleRows: data.visibleRows,
    totalItems: data.totalItems,
    infinite: data.infinite,
    showInfiniteSentinel: data.showInfiniteSentinel,
  };
}

export default useListShell;
