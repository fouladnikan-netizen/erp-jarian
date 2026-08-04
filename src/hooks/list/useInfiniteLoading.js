/**
 * Infinite / progressive loading for shared lists.
 * Client mode grows a local window; server mode calls onLoadMore near bottom.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * @param {{
 *   items?: Array<any>,
 *   pageSize?: number,
 *   enabled?: boolean,
 *   hasMore?: boolean,
 *   loading?: boolean,
 *   onLoadMore?: () => void | Promise<void>,
 *   resetKey?: string|number,
 * }} options
 */
export function useInfiniteLoading(options = {}) {
  const {
    items = [],
    pageSize = 50,
    enabled = true,
    hasMore: hasMoreProp,
    loading = false,
    onLoadMore,
    resetKey,
  } = options;

  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [seenReset, setSeenReset] = useState(resetKey);

  if (seenReset !== resetKey) {
    setSeenReset(resetKey);
    setVisibleCount(pageSize);
  }

  const isServerDriven = typeof onLoadMore === 'function';

  const visibleItems = useMemo(() => {
    if (!enabled) return items;
    if (isServerDriven) return items;
    return items.slice(0, visibleCount);
  }, [enabled, isServerDriven, items, visibleCount]);

  const hasMore = isServerDriven
    ? Boolean(hasMoreProp)
    : visibleCount < items.length;

  const loadMore = useCallback(() => {
    if (!enabled || loading || !hasMore) return;
    if (isServerDriven) {
      onLoadMore?.();
      return;
    }
    setVisibleCount((prev) => Math.min(items.length, prev + pageSize));
  }, [enabled, loading, hasMore, isServerDriven, onLoadMore, items.length, pageSize]);

  return {
    visibleItems,
    visibleCount: visibleItems.length,
    totalItems: isServerDriven ? (items.length + (hasMore ? 1 : 0)) : items.length,
    hasMore,
    loading,
    loadMore,
    isInfinite: enabled,
  };
}

/**
 * Attach a sentinel observer to trigger loadMore near list bottom.
 * @param {React.RefObject<HTMLElement|null>} sentinelRef
 * @param {{ rootRef?: React.RefObject<HTMLElement|null>, enabled?: boolean, loadMore: () => void, hasMore?: boolean, loading?: boolean }} options
 */
export function useInfiniteScrollSentinel(sentinelRef, options = {}) {
  const {
    rootRef = null,
    enabled = true,
    loadMore,
    hasMore = false,
    loading = false,
  } = options;

  useEffect(() => {
    const node = sentinelRef?.current;
    if (!node || !enabled || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !loading) {
          loadMore?.();
        }
      },
      { root: rootRef?.current || null, rootMargin: '240px', threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [sentinelRef, rootRef, enabled, hasMore, loading, loadMore]);
}

export default useInfiniteLoading;
