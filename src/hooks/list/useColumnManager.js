/**
 * Column visibility + order for shared lists.
 * Business data stays separate — only presentation config lives here.
 */

import { useCallback, useMemo, useState } from 'react';

function normalizeDefinitions(definitions = []) {
  return definitions.map((col, index) => {
    const locked = Boolean(col.locked || col.hideable === false);
    return {
      ...col,
      key: col.key,
      title: col.title || col.label || col.key,
      visible: col.visible !== false,
      order: Number.isFinite(col.order) ? col.order : index,
      locked,
    };
  });
}

function applyState(definitions, state) {
  const normalized = normalizeDefinitions(definitions);
  const next = normalized.map((col) => {
    const saved = state?.[col.key];
    const visible = col.locked
      ? true
      : (saved && typeof saved.visible === 'boolean' ? saved.visible : col.visible);
    const order = saved && Number.isFinite(saved.order) ? saved.order : col.order;
    return { ...col, visible, order };
  });
  next.sort((a, b) => a.order - b.order || String(a.title).localeCompare(String(b.title), 'fa'));
  return next.map((col, index) => ({ ...col, order: index }));
}

function toStateMap(columns) {
  const map = {};
  columns.forEach((col) => {
    map[col.key] = { visible: col.visible, order: col.order };
  });
  return map;
}

/**
 * @param {{
 *   definitions: Array<any>,
 *   initialState?: Record<string, { visible?: boolean, order?: number }>|null,
 *   onChange?: Function,
 * }} options
 */
export function useColumnManager(options = {}) {
  const { definitions = [], initialState = null, onChange } = options;
  const definitionSignature = useMemo(
    () => definitions.map((col) => col.key).join('|'),
    [definitions],
  );

  const [columns, setColumns] = useState(() => applyState(definitions, initialState));
  const [seenSignature, setSeenSignature] = useState(definitionSignature);
  const [hydratedFromPrefs, setHydratedFromPrefs] = useState(false);

  if (seenSignature !== definitionSignature) {
    setSeenSignature(definitionSignature);
    setHydratedFromPrefs(false);
    setColumns(applyState(definitions, null));
  }

  if (!hydratedFromPrefs && initialState) {
    setHydratedFromPrefs(true);
    setColumns(applyState(definitions, initialState));
  }

  const commit = useCallback((updater) => {
    setColumns((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const normalized = next.map((col, index) => ({
        ...col,
        visible: col.locked ? true : Boolean(col.visible),
        order: index,
      }));
      onChange?.(toStateMap(normalized), normalized);
      return normalized;
    });
  }, [onChange]);

  const setColumnVisible = useCallback((key, visible) => {
    commit((prev) => prev.map((col) => {
      if (col.key !== key || col.locked) return col;
      return { ...col, visible: Boolean(visible) };
    }));
  }, [commit]);

  const toggleColumn = useCallback((key) => {
    commit((prev) => prev.map((col) => {
      if (col.key !== key || col.locked) return col;
      return { ...col, visible: !col.visible };
    }));
  }, [commit]);

  const reorderColumns = useCallback((fromIndex, toIndex) => {
    commit((prev) => {
      if (
        fromIndex < 0
        || toIndex < 0
        || fromIndex >= prev.length
        || toIndex >= prev.length
        || fromIndex === toIndex
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, [commit]);

  const resetColumns = useCallback(() => {
    const next = applyState(definitions, null);
    onChange?.(toStateMap(next), next);
    setColumns(next);
  }, [definitions, onChange]);

  const visibleColumns = useMemo(
    () => columns.filter((col) => col.visible),
    [columns],
  );

  const isVisible = useCallback((key) => (
    visibleColumns.some((col) => col.key === key)
  ), [visibleColumns]);

  return {
    columns,
    visibleColumns,
    setColumnVisible,
    toggleColumn,
    reorderColumns,
    resetColumns,
    isVisible,
    columnState: toStateMap(columns),
  };
}

export default useColumnManager;
