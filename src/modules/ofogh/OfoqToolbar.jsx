import { useEffect, useRef, useState } from 'react';
import { PIPELINE_STAGES } from './pipelineConfig';

function SearchIcon() {
  return (
    <svg className="actions-bar__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function FunnelIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
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
 * با فینیش گلس: جستجوی سراسری + چندانتخابی مراحل + CTA ثبت سرنخ (سمت چپ، مثل نبض).
 */
export default function OfoqToolbar({
  query, onQueryChange, selectedStages, onStagesChange, onAddLead,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
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

      <div className="ofoq-filterbar__stage-select" ref={rootRef}>
        <button
          type="button"
          className={`ofoq-filterbar__stage-trigger${hasStageFilter ? ' is-active' : ''}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((value) => !value)}
        >
          <FunnelIcon />
          {hasStageFilter
            ? `مراحل (${selectedStages.length.toLocaleString('fa-IR')})`
            : 'همه مراحل'}
          <ChevronDownIcon />
        </button>

        {open && (
          <div className="ofoq-filterbar__stage-popover" role="listbox" aria-label="انتخاب مراحل">
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
            {hasStageFilter && (
              <button
                type="button"
                className="ofoq-filterbar__stage-clear"
                onClick={() => {
                  onStagesChange([]);
                  setOpen(false);
                }}
              >
                پاک کردن فیلتر
              </button>
            )}
          </div>
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
        ثبت سرنخ جدید
      </button>
    </section>
  );
}
