/**
 * Shared multi-column sort for Jarian list infrastructure.
 * Asc → Desc → None. Ctrl/Cmd keeps previous sorts.
 */

import { useCallback, useMemo, useState } from 'react';

export const SORT_DIR = Object.freeze({
  ASC: 'asc',
  DESC: 'desc',
});

/**
 * @typedef {{ key: string, dir: 'asc'|'desc' }} SortEntry
 * @typedef {{
 *   accessors?: Record<string, (row: any) => any>,
 *   types?: Record<string, 'string'|'number'|'date'|'auto'>,
 * }} SortDataOptions
 * @typedef {SortDataOptions & {
 *   resetKey?: string|number,
 * }} UseMultiSortOptions
 */

function defaultAccess(row, key) {
  if (row == null) return null;
  if (typeof row === 'object' && key in row) return row[key];
  return null;
}

function toComparable(value, type = 'auto') {
  if (value == null || value === '') return null;

  if (type === 'number' || (type === 'auto' && typeof value === 'number')) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  if (type === 'date' || (type === 'auto' && value instanceof Date)) {
    const t = value instanceof Date ? value.getTime() : Date.parse(String(value));
    return Number.isFinite(t) ? t : null;
  }

  if (type === 'auto') {
    if (/^-?\d+(\.\d+)?$/.test(String(value).trim())) {
      const asNum = Number(String(value).trim());
      if (Number.isFinite(asNum)) return asNum;
    }
  }

  return String(value).toLocaleLowerCase('fa');
}

function compareValues(a, b, dir) {
  const aNull = a == null;
  const bNull = b == null;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  let cmp = 0;
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), 'fa', { numeric: true, sensitivity: 'base' });
  }
  return dir === SORT_DIR.DESC ? -cmp : cmp;
}

/**
 * Pure multi-sort — used by the hook and unit tests.
 * @param {Array<any>} data
 * @param {SortEntry[]} sorts
 * @param {SortDataOptions} [options]
 */
export function applyMultiSort(data, sorts, options = {}) {
  const rows = Array.isArray(data) ? data : [];
  const list = Array.isArray(sorts) ? sorts : [];
  if (!list.length || !rows.length) return rows;

  const { accessors = {}, types = {} } = options;
  const decorated = rows.map((row, index) => ({ row, index }));
  decorated.sort((left, right) => {
    for (const entry of list) {
      const access = accessors[entry.key] || ((r) => defaultAccess(r, entry.key));
      const type = types[entry.key] || 'auto';
      const a = toComparable(access(left.row), type);
      const b = toComparable(access(right.row), type);
      const cmp = compareValues(a, b, entry.dir);
      if (cmp !== 0) return cmp;
    }
    return left.index - right.index;
  });
  return decorated.map((item) => item.row);
}

/**
 * Advance sort state for one column click.
 * @param {SortEntry[]} prev
 * @param {string} columnKey
 * @param {{ metaKey?: boolean, ctrlKey?: boolean }|null} event
 */
export function nextSorts(prev, columnKey, event) {
  if (!columnKey) return prev;
  const multi = Boolean(event?.metaKey || event?.ctrlKey);
  const existingIndex = prev.findIndex((entry) => entry.key === columnKey);
  const existing = existingIndex >= 0 ? prev[existingIndex] : null;

  if (!multi) {
    if (!existing) return [{ key: columnKey, dir: SORT_DIR.ASC }];
    if (existing.dir === SORT_DIR.ASC) return [{ key: columnKey, dir: SORT_DIR.DESC }];
    return [];
  }

  const next = [...prev];
  if (!existing) {
    next.push({ key: columnKey, dir: SORT_DIR.ASC });
    return next;
  }
  if (existing.dir === SORT_DIR.ASC) {
    next[existingIndex] = { key: columnKey, dir: SORT_DIR.DESC };
    return next;
  }
  next.splice(existingIndex, 1);
  return next;
}

/**
 * @param {UseMultiSortOptions} [options]
 */
export function useMultiSort(options = {}) {
  const { resetKey, accessors = {}, types = {} } = options;
  const [sorts, setSorts] = useState(/** @type {SortEntry[]} */ ([]));
  const [seenResetKey, setSeenResetKey] = useState(resetKey);

  if (seenResetKey !== resetKey) {
    setSeenResetKey(resetKey);
    setSorts([]);
  }

  const toggleSort = useCallback((columnKey, event) => {
    setSorts((prev) => nextSorts(prev, columnKey, event));
  }, []);

  const clearSort = useCallback(() => {
    setSorts([]);
  }, []);

  const getSortMeta = useCallback((columnKey) => {
    const index = sorts.findIndex((entry) => entry.key === columnKey);
    if (index < 0) return null;
    return {
      dir: sorts[index].dir,
      priority: index + 1,
    };
  }, [sorts]);

  const sortData = useCallback((data) => (
    applyMultiSort(data, sorts, { accessors, types })
  ), [sorts, accessors, types]);

  return useMemo(() => ({
    sorts,
    toggleSort,
    clearSort,
    sortData,
    getSortMeta,
  }), [sorts, toggleSort, clearSort, sortData, getSortMeta]);
}

export default useMultiSort;
