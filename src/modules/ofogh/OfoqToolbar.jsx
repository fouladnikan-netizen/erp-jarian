import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PIPELINE_STAGES } from './pipelineConfig';
import ListFilterBar from '../../components/module/ListFilterBar';

const DUE_FILTER_OPTIONS = [
  { id: 'overdue', label: 'پیگیری‌های عقب‌افتاده' },
  { id: 'today', label: 'پیگیری‌های امروز' },
  { id: 'future', label: 'پیگیری‌های آینده' },
];

function LinesFilterIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Ofogh Row 3 — stage / due filter controls (search + create live in ListActionBar).
 */
export default function OfoqToolbar({
  selectedStages, onStagesChange, dueFilter, onDueFilterChange,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 248 });

  useLayoutEffect(() => {
    if (!open) return undefined;
    const updatePosition = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = 248;
      const padding = 8;
      let left = rect.right - width;
      left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
      let top = rect.bottom + 6;
      const estimatedHeight = 380;
      if (top + estimatedHeight > window.innerHeight - padding) {
        top = Math.max(padding, rect.top - estimatedHeight - 6);
      }
      setCoords({ top, left, width });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (triggerRef.current?.contains(event.target)) return;
      if (panelRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const toggleStage = (stageId) => {
    onStagesChange(
      selectedStages.includes(stageId)
        ? selectedStages.filter((id) => id !== stageId)
        : [...selectedStages, stageId],
    );
  };

  const hasStageFilter = selectedStages.length > 0;
  const activeCount = selectedStages.length + (dueFilter ? 1 : 0);
  const hasAnyFilter = activeCount > 0;

  return (
    <ListFilterBar className="ofoq-filterbar ofoq-glass" ariaLabel="فیلتر پایپ‌لاین">
      <div className="ofoq-filterbar__stage-select">
        <button
          ref={triggerRef}
          type="button"
          className={`ofoq-filterbar__stage-trigger font-meem${hasAnyFilter ? ' is-active' : ''}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((value) => !value)}
        >
          <LinesFilterIcon />
          {hasAnyFilter
            ? `فیلترها (${activeCount.toLocaleString('fa-IR')})`
            : 'همه مراحل'}
          <ChevronDownIcon />
        </button>

        {open && createPortal(
          <div
            ref={panelRef}
            className="ofoq-filterbar__stage-popover"
            role="listbox"
            aria-label="فیلتر پایپ‌لاین"
            style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}
          >
            <span className="ofoq-filterbar__group-title font-meem">پیگیری‌ها</span>
            {DUE_FILTER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`ofoq-column-filter__option font-meem${dueFilter === option.id ? ' is-active' : ''}`}
                onClick={() => onDueFilterChange(dueFilter === option.id ? null : option.id)}
              >
                <span className={`ofoq-column-filter__option-dot ofoq-column-filter__option-dot--${option.id}`} aria-hidden="true" />
                {option.label}
              </button>
            ))}

            <div className="ofoq-column-filter__divider" aria-hidden="true" />

            <span className="ofoq-filterbar__group-title font-meem">مراحل</span>
            {PIPELINE_STAGES.map((stage) => (
              <label key={stage.id} className="ofoq-filterbar__stage-option font-meem">
                <input
                  type="checkbox"
                  checked={selectedStages.includes(stage.id)}
                  onChange={() => toggleStage(stage.id)}
                />
                <span
                  className="ofoq-filterbar__stage-swatch"
                  style={{ background: stage.color }}
                  aria-hidden="true"
                />
                <span>{stage.label}</span>
              </label>
            ))}

            {(hasStageFilter || dueFilter) && (
              <button
                type="button"
                className="ofoq-filterbar__stage-clear font-meem"
                onClick={() => {
                  onStagesChange([]);
                  onDueFilterChange(null);
                  setOpen(false);
                }}
              >
                پاک کردن فیلتر
              </button>
            )}
          </div>,
          document.body,
        )}
      </div>

      <span className="list-filter-bar__spacer" aria-hidden="true" />
    </ListFilterBar>
  );
}
