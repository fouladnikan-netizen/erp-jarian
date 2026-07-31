import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PIPELINE_STAGES } from './pipelineConfig';

const DUE_FILTER_OPTIONS = [
  { id: 'overdue', label: 'پیگیری‌های عقب‌افتاده' },
  { id: 'today', label: 'پیگیری‌های امروز' },
  { id: 'future', label: 'پیگیری‌های آینده' },
];

function SearchIcon() {
  return (
    <svg className="actions-bar__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

/** آیکون سه‌خط فیلتر — عین فهرست نبض (وحدت رویه). */
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

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * تولبار استاندارد افق — هم‌ساختار تولبار نبض (section-actions / nabz-toolbar)
 * با فینیش گلس: جستجوی سراسری + فیلتر سررسید/مراحل + CTA ثبت سرنخ (سمت چپ، مثل نبض).
 */
export default function OfoqToolbar({
  query, onQueryChange, selectedStages, onStagesChange, dueFilter, onDueFilterChange, onAddLead,
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 248 });

  // پرتال روی body با مختصات fixed — تا زیر بورد کانبان (stacking context گلس) نرود
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
    <section className="section-actions nabz-toolbar ofoq-filterbar ofoq-glass" aria-label="فیلتر پایپ‌لاین">
      <div className="actions-bar__search nabz-toolbar__search">
        <input
          type="search"
          placeholder="جستجو در سرنخ‌ها..."
          aria-label="جستجوی سراسری"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
        <SearchIcon />
      </div>

      <div className="ofoq-filterbar__stage-select">
        <button
          ref={triggerRef}
          type="button"
          className={`ofoq-filterbar__stage-trigger${hasAnyFilter ? ' is-active' : ''}`}
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
            <span className="ofoq-filterbar__group-title">پیگیری‌ها</span>
            {DUE_FILTER_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`ofoq-column-filter__option${dueFilter === option.id ? ' is-active' : ''}`}
                onClick={() => onDueFilterChange(dueFilter === option.id ? null : option.id)}
              >
                <span className={`ofoq-column-filter__option-dot ofoq-column-filter__option-dot--${option.id}`} aria-hidden="true" />
                {option.label}
              </button>
            ))}

            <div className="ofoq-column-filter__divider" aria-hidden="true" />

            <span className="ofoq-filterbar__group-title">مراحل</span>
            {PIPELINE_STAGES.map((stage) => (
              <label key={stage.id} className="ofoq-filterbar__stage-option">
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
                className="ofoq-filterbar__stage-clear"
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

      <div className="nabz-toolbar__spacer" aria-hidden="true" />

      {/* آخر DOM → منتهی‌الیه چپ در RTL، مثل CTA نبض */}
      <button
        type="button"
        className="btn btn--primary nabz-cta ofoq-pipeline__add-lead"
        onClick={onAddLead}
      >
        <PlusIcon />
        فرصت جدید
      </button>
    </section>
  );
}
