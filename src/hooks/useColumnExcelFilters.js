/**
 * Shared Excel-style column filter state for module list tables.
 */

import { useCallback, useEffect, useState } from 'react';
import { isColumnFilterActive } from '../components/table/ColumnFilterHeader';

/**
 * @param {{ resetKey?: string|number }} [options]
 */
export function useColumnExcelFilters(options = {}) {
  const { resetKey } = options;
  const [columnFilters, setColumnFilters] = useState({});
  const [openFilterKey, setOpenFilterKey] = useState(null);

  useEffect(() => {
    setColumnFilters({});
    setOpenFilterKey(null);
  }, [resetKey]);

  const applyFilter = useCallback((columnKey, value) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (!value) delete next[columnKey];
      else next[columnKey] = value;
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setColumnFilters({});
    setOpenFilterKey(null);
  }, []);

  const filterRows = useCallback((rows, getRawValue) => {
    const entries = Object.entries(columnFilters).filter(([, value]) => isColumnFilterActive(value));
    if (!entries.length) return rows;
    return rows.filter((row) => (
      entries.every(([key, values]) => values.includes(getRawValue(row, key)))
    ));
  }, [columnFilters]);

  const buildOptions = useCallback((rows, keys, getRawValue) => {
    const map = {};
    keys.forEach((key) => {
      const values = new Set();
      rows.forEach((row) => {
        const value = getRawValue(row, key);
        if (value != null && value !== '') values.add(value);
      });
      map[key] = Array.from(values).sort((a, b) => String(a).localeCompare(String(b), 'fa'));
    });
    return map;
  }, []);

  return {
    columnFilters,
    openFilterKey,
    setOpenFilterKey,
    applyFilter,
    clearFilters,
    filterRows,
    buildOptions,
  };
}
