/**
 * Shared list pagination — client today, server/infinite/virtual tomorrow.
 * Modules keep using the same API; swap data provider later without module edits.
 */

import { useCallback, useMemo, useState } from 'react';

export const LIST_PAGE_SIZES = Object.freeze([25, 50, 100, 200]);

export const LIST_PAGINATION_MODE = Object.freeze({
  /** Slice local arrays (default). */
  CLIENT: 'client',
  /** Items are already one page; totalItems comes from server. */
  SERVER: 'server',
  /** Reserved — infinite / lazy loading. */
  INFINITE: 'infinite',
  /** Reserved — virtual windowing. */
  VIRTUAL: 'virtual',
});

/**
 * Pure page slice helper (client mode). Future virtual provider can replace this.
 * @param {Array<any>} items
 * @param {number} currentPage
 * @param {number} pageSize
 * @param {'client'|'server'|'infinite'|'virtual'} [mode]
 */
export function slicePage(items, currentPage, pageSize, mode = LIST_PAGINATION_MODE.CLIENT) {
  const rows = Array.isArray(items) ? items : [];
  if (mode !== LIST_PAGINATION_MODE.CLIENT) return rows;
  const start = (Math.max(1, currentPage) - 1) * pageSize;
  return rows.slice(start, start + pageSize);
}

/**
 * @param {{
 *   items?: Array<any>,
 *   totalItems?: number,
 *   pageSize?: number,
 *   initialPage?: number,
 *   mode?: 'client'|'server'|'infinite'|'virtual',
 *   resetKey?: string|number,
 *   onPageChange?: (page: number, pageSize: number) => void,
 * }} [options]
 */
export function usePagination(options = {}) {
  const {
    items = [],
    totalItems: totalItemsProp,
    pageSize: initialPageSize = 50,
    initialPage = 1,
    mode = LIST_PAGINATION_MODE.CLIENT,
    resetKey,
    onPageChange,
  } = options;

  const safeInitialSize = LIST_PAGE_SIZES.includes(initialPageSize)
    ? initialPageSize
    : 50;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(safeInitialSize);
  const [epoch, setEpoch] = useState({ resetKey, pageSize: safeInitialSize, mode });

  if (
    epoch.resetKey !== resetKey
    || epoch.pageSize !== pageSize
    || epoch.mode !== mode
  ) {
    setEpoch({ resetKey, pageSize, mode });
    if (currentPage !== 1) setCurrentPage(1);
  }

  const isClient = mode === LIST_PAGINATION_MODE.CLIENT;
  const totalItems = isClient
    ? items.length
    : (Number(totalItemsProp) >= 0 ? Number(totalItemsProp) : items.length);

  const pageCount = Math.max(1, Math.ceil(Math.max(totalItems, 0) / pageSize) || 1);
  const safePage = Math.min(Math.max(1, currentPage), pageCount);

  if (safePage !== currentPage) {
    setCurrentPage(safePage);
  }

  const setPage = useCallback((page) => {
    const next = Math.min(Math.max(1, Number(page) || 1), pageCount);
    setCurrentPage(next);
    onPageChange?.(next, pageSize);
  }, [pageCount, onPageChange, pageSize]);

  const setPageSize = useCallback((size) => {
    const next = LIST_PAGE_SIZES.includes(Number(size)) ? Number(size) : 50;
    setPageSizeState(next);
    setCurrentPage(1);
    onPageChange?.(1, next);
  }, [onPageChange]);

  const pagedData = useMemo(
    () => slicePage(items, safePage, pageSize, mode),
    [items, safePage, pageSize, mode],
  );

  const rangeStart = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalItems);

  return useMemo(() => ({
    mode,
    currentPage: safePage,
    pageSize,
    pageCount,
    totalItems,
    pagedData,
    rangeStart,
    rangeEnd,
    pageSizes: LIST_PAGE_SIZES,
    setPage,
    setPageSize,
    isClientMode: isClient,
  }), [
    mode,
    safePage,
    pageSize,
    pageCount,
    totalItems,
    pagedData,
    rangeStart,
    rangeEnd,
    setPage,
    setPageSize,
    isClient,
  ]);
}

export default usePagination;
