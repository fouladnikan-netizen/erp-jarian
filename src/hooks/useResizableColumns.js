import { useCallback, useEffect, useMemo, useState } from 'react';

const MIN_COL_WIDTH = 56;
const STORAGE_PREFIX = 'jaryan:col-widths:';

function buildDefaults(columns) {
  return Object.fromEntries(
    columns.map((col) => [col.key, col.defaultWidth ?? col.width ?? 120]),
  );
}

function loadWidths(tableId, columns) {
  const defaults = buildDefaults(columns);
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${tableId}`);
    if (!raw) return defaults;
    const saved = JSON.parse(raw);
    return { ...defaults, ...saved };
  } catch {
    return defaults;
  }
}

export function useResizableColumns(tableId, columns) {
  const columnSignature = useMemo(
    () => columns.map((col) => col.key).join('|'),
    [columns],
  );

  const [widths, setWidths] = useState(() => loadWidths(tableId, columns));

  useEffect(() => {
    setWidths(loadWidths(tableId, columns));
  }, [tableId, columnSignature]);

  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${tableId}`, JSON.stringify(widths));
    } catch {
      /* ignore quota errors */
    }
  }, [tableId, widths]);

  const startResize = useCallback((key, startX) => {
    const startWidth = widths[key] ?? MIN_COL_WIDTH;

    const onMove = (e) => {
      setWidths((prev) => ({
        ...prev,
        [key]: Math.max(MIN_COL_WIDTH, startWidth + (startX - e.clientX)),
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
  }, [widths]);

  return { widths, startResize };
}
