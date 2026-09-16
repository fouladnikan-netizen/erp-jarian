/**
 * Windowed virtual list for large tables — keeps table API unchanged via spacers.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * @param {{
 *   items?: Array<any>,
 *   rowHeight?: number,
 *   overscan?: number,
 *   scrollOffset?: number,
 *   viewportHeight?: number,
 *   enabled?: boolean,
 * }} options
 */
export function useVirtualList(options = {}) {
  const {
    items = [],
    rowHeight = 44,
    overscan = 10,
    scrollOffset = 0,
    viewportHeight = 480,
    enabled = true,
  } = options;

  const total = items.length;
  const totalHeight = total * rowHeight;

  const window = useMemo(() => {
    if (!enabled) {
      return {
        startIndex: 0,
        endIndex: total,
        offsetTop: 0,
        offsetBottom: 0,
        visibleItems: items,
        totalHeight,
      };
    }

    const startIndex = Math.max(0, Math.floor(scrollOffset / rowHeight) - overscan);
    const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
    const endIndex = Math.min(total, startIndex + visibleCount);
    const offsetTop = startIndex * rowHeight;
    const offsetBottom = Math.max(0, (total - endIndex) * rowHeight);
    return {
      startIndex,
      endIndex,
      offsetTop,
      offsetBottom,
      visibleItems: items.slice(startIndex, endIndex),
      totalHeight,
    };
  }, [enabled, items, scrollOffset, viewportHeight, rowHeight, overscan, total, totalHeight]);

  return {
    ...window,
    rowHeight,
    totalItems: total,
    isVirtual: enabled,
  };
}

/**
 * Bind virtual window to a scrollable element (table wrap).
 * @param {React.RefObject<HTMLElement|null>} scrollRef
 * @param {{
 *   items?: Array<any>,
 *   rowHeight?: number,
 *   overscan?: number,
 *   enabled?: boolean,
 * }} options
 */
export function useVirtualListController(scrollRef, options = {}) {
  const { items = [], rowHeight = 44, overscan = 10, enabled = true } = options;
  const [scrollOffset, setScrollOffset] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(480);

  const onScroll = useCallback(() => {
    const el = scrollRef?.current;
    if (!el) return;
    setScrollOffset(el.scrollTop);
    setViewportHeight(el.clientHeight || 480);
  }, [scrollRef]);

  useEffect(() => {
    const el = scrollRef?.current;
    if (!el || !enabled) return undefined;
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => onScroll())
      : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
    };
  }, [scrollRef, enabled, onScroll, items.length]);

  const virtual = useVirtualList({
    items,
    rowHeight,
    overscan,
    scrollOffset,
    viewportHeight,
    enabled,
  });

  return { ...virtual, onScroll };
}

export default useVirtualList;
