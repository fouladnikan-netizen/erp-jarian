/**
 * Unified list data provider — client / server / infinite / virtual.
 * Modules keep the same row API; only mode + provider options change.
 * Pass scrollRef + sentinelRef from the module (do not read refs from the return value).
 */

import { useMemo } from 'react';
import { usePagination, LIST_PAGINATION_MODE, LIST_PAGE_SIZES } from './usePagination';
import { useInfiniteLoading, useInfiniteScrollSentinel } from './useInfiniteLoading';
import { useVirtualListController } from './useVirtualList';

export { LIST_PAGINATION_MODE as LIST_VIEW_MODE };

/**
 * @param {{
 *   items?: Array<any>,
 *   mode?: 'client'|'server'|'infinite'|'virtual',
 *   pageSize?: number,
 *   totalItems?: number,
 *   resetKey?: string|number,
 *   rowHeight?: number,
 *   onPageChange?: (page: number, pageSize: number) => void,
 *   onLoadMore?: () => void | Promise<void>,
 *   hasMore?: boolean,
 *   loadingMore?: boolean,
 *   scrollRef: React.RefObject<HTMLElement|null>,
 *   sentinelRef: React.RefObject<HTMLElement|null>,
 * }} options
 */
export function useListDataProvider(options = {}) {
  const {
    items = [],
    mode = LIST_PAGINATION_MODE.CLIENT,
    pageSize = 50,
    totalItems,
    resetKey,
    rowHeight = 44,
    onPageChange,
    onLoadMore,
    hasMore,
    loadingMore = false,
    scrollRef,
    sentinelRef,
  } = options;

  const isClient = mode === LIST_PAGINATION_MODE.CLIENT;
  const isServer = mode === LIST_PAGINATION_MODE.SERVER;
  const isInfinite = mode === LIST_PAGINATION_MODE.INFINITE;
  const isVirtual = mode === LIST_PAGINATION_MODE.VIRTUAL;

  const pagination = usePagination({
    items,
    totalItems,
    pageSize,
    mode: isServer ? LIST_PAGINATION_MODE.SERVER : LIST_PAGINATION_MODE.CLIENT,
    resetKey,
    onPageChange,
  });

  const infinite = useInfiniteLoading({
    items,
    pageSize,
    enabled: isInfinite,
    hasMore,
    loading: loadingMore,
    onLoadMore,
    resetKey,
  });

  useInfiniteScrollSentinel(sentinelRef, {
    rootRef: scrollRef,
    enabled: isInfinite,
    loadMore: infinite.loadMore,
    hasMore: infinite.hasMore,
    loading: loadingMore,
  });

  const virtual = useVirtualListController(scrollRef, {
    items: isVirtual ? items : [],
    rowHeight,
    enabled: isVirtual,
  });

  const visibleRows = useMemo(() => {
    if (isVirtual) return virtual.visibleItems;
    if (isInfinite) return infinite.visibleItems;
    return pagination.pagedData;
  }, [isVirtual, isInfinite, virtual.visibleItems, infinite.visibleItems, pagination.pagedData]);

  return {
    mode,
    visibleRows,
    totalItems: isVirtual || isInfinite
      ? items.length
      : pagination.totalItems,
    pagination: (isClient || isServer) ? pagination : null,
    infinite: isInfinite ? {
      hasMore: infinite.hasMore,
      loading: infinite.loading,
      loadMore: infinite.loadMore,
      visibleCount: infinite.visibleCount,
    } : null,
    virtual: isVirtual ? {
      offsetTop: virtual.offsetTop,
      offsetBottom: virtual.offsetBottom,
      startIndex: virtual.startIndex,
      rowHeight: virtual.rowHeight,
      totalHeight: virtual.totalHeight,
    } : null,
    pageSizes: LIST_PAGE_SIZES,
    showPagination: isClient || isServer,
    showInfiniteSentinel: isInfinite,
  };
}

export default useListDataProvider;
