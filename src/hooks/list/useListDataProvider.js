/**
 * Unified list data provider — Infinite Loading is the only strategy.
 * Optional onLoadMore enables server-driven batches; otherwise client window grows.
 * Virtual windowing may be layered internally later without changing this API.
 */

import { useMemo } from 'react';
import { useInfiniteLoading, useInfiniteScrollSentinel } from './useInfiniteLoading';

/** Default batch size for progressive reveal / server page requests. */
export const LIST_INFINITE_CHUNK_SIZE = 50;

/**
 * @param {{
 *   items?: Array<any>,
 *   chunkSize?: number,
 *   resetKey?: string|number,
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
    chunkSize = LIST_INFINITE_CHUNK_SIZE,
    resetKey,
    onLoadMore,
    hasMore,
    loadingMore = false,
    scrollRef,
    sentinelRef,
  } = options;

  const infinite = useInfiniteLoading({
    items,
    pageSize: chunkSize,
    enabled: true,
    hasMore,
    loading: loadingMore,
    onLoadMore,
    resetKey,
  });

  useInfiniteScrollSentinel(sentinelRef, {
    rootRef: scrollRef,
    enabled: true,
    loadMore: infinite.loadMore,
    hasMore: infinite.hasMore,
    loading: loadingMore,
  });

  const visibleRows = useMemo(
    () => infinite.visibleItems,
    [infinite.visibleItems],
  );

  return {
    visibleRows,
    totalItems: items.length,
    infinite: {
      hasMore: infinite.hasMore,
      loading: infinite.loading,
      loadMore: infinite.loadMore,
      visibleCount: infinite.visibleCount,
      chunkSize,
    },
    showInfiniteSentinel: true,
  };
}

export default useListDataProvider;
