import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Double-Shift spotlight trigger.
 * Presses Shift twice within `windowMs` toggles `isOpen`.
 * Escape closes when open.
 */
export default function useDoubleShift(windowMs = 500) {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(false);
  const lastShiftAt = useRef(0);

  const open = useCallback(() => {
    isOpenRef.current = true;
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    isOpenRef.current = false;
    setIsOpen(false);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      isOpenRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && isOpenRef.current) {
        event.preventDefault();
        isOpenRef.current = false;
        setIsOpen(false);
        return;
      }

      /* فقط Shift خالص — نه Shift+کلید دیگر و نه auto-repeat */
      if (event.key !== 'Shift' || event.repeat) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const now = performance.now();
      const delta = now - lastShiftAt.current;
      if (delta <= windowMs && lastShiftAt.current !== 0) {
        event.preventDefault();
        lastShiftAt.current = 0;
        setIsOpen((prev) => {
          const next = !prev;
          isOpenRef.current = next;
          return next;
        });
        return;
      }
      lastShiftAt.current = now;
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [windowMs]);

  return { isOpen, open, close, toggle, setIsOpen };
}
