import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ResizableColGroup from '../../components/table/ResizableColGroup';
import ResizableTh from '../../components/table/ResizableTh';
import { useResizableColumns } from '../../hooks/useResizableColumns';

const OFOQ_COLUMNS = [
  { key: 'row', defaultWidth: 64, resizable: false },
  { key: 'client', defaultWidth: 150 },
  { key: 'subject', defaultWidth: 240 },
  { key: 'source', defaultWidth: 120 },
  { key: 'priority', defaultWidth: 120 },
  { key: 'followUp', defaultWidth: 130 },
  { key: 'stage', defaultWidth: 150 },
  { key: 'actions', defaultWidth: 100, resizable: false },
];

const COLUMN_LABELS = {
  row: 'ردیف',
  client: 'نام مشتری / شرکت',
  subject: 'موضوع استعلام',
  source: 'منبع سرنخ',
  priority: 'درجه حرارت',
  followUp: 'وضعیت پیگیری',
  stage: 'مرحله فعلی',
  actions: 'عملیات',
};

const FILTERABLE_KEYS = new Set(['client', 'subject', 'source', 'priority', 'followUp', 'stage']);

const STAGE_LABELS = {
  new: 'استعلام جدید',
  negotiating: 'در حال مذاکره',
  quoted: 'ارسال پیش‌کش',
  closed: 'بایگانی / تعیین تکلیف',
};

const PRIORITY_META = {
  Hot: { label: 'داغ', emoji: '🔥', className: 'ofoq-priority ofoq-priority--hot' },
  Warm: { label: 'گرم', emoji: '☀️', className: 'ofoq-priority ofoq-priority--warm' },
  Cold: { label: 'سرد', emoji: '❄️', className: 'ofoq-priority ofoq-priority--cold' },
};

const FOLLOW_UP_META = {
  future: { label: 'آینده', className: 'ofoq-followup ofoq-followup--future' },
  today: { label: 'امروز', className: 'ofoq-followup ofoq-followup--today' },
  overdue: { label: 'عقب‌افتاده', className: 'ofoq-followup ofoq-followup--overdue' },
};

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getFollowUpStatus(nextActionAt) {
  if (!nextActionAt) return 'future';
  const due = startOfDay(new Date(nextActionAt));
  const today = startOfDay();
  if (due.getTime() < today.getTime()) return 'overdue';
  if (due.getTime() === today.getTime()) return 'today';
  return 'future';
}

function getColumnRawValue(item, key) {
  switch (key) {
    case 'client':
      return item.client || '';
    case 'subject':
      return item.subject || '';
    case 'source':
      return item.source || '';
    case 'priority':
      return PRIORITY_META[item.priority]?.label || item.priority || '';
    case 'followUp':
      return FOLLOW_UP_META[getFollowUpStatus(item.nextActionAt)]?.label || '';
    case 'stage':
      return STAGE_LABELS[item.stage] || item.stage || '';
    default:
      return '';
  }
}

function isFilterActive(selected) {
  return Array.isArray(selected) && selected.length > 0;
}

function LinesFilterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}

function SearchMiniIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.Warm;
  return (
    <span className={meta.className}>
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

function FollowUpIndicator({ status }) {
  const meta = FOLLOW_UP_META[status] || FOLLOW_UP_META.future;
  return (
    <span className={meta.className} title={meta.label}>
      <span className="ofoq-followup__dot" aria-hidden="true" />
      {meta.label}
    </span>
  );
}

function StageBadge({ stage }) {
  return <span className={`ofoq-stage ofoq-stage--${stage}`}>{STAGE_LABELS[stage] || stage}</span>;
}

function SourceTag({ source }) {
  return <span className="ofoq-source-tag">{source}</span>;
}

function ColumnFilterHeader({
  label,
  columnKey,
  options,
  selected,
  onApply,
  openKey,
  setOpenKey,
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const isOpen = openKey === columnKey;
  const hasFilter = isFilterActive(selected);

  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState([]);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 240 });

  const visibleOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => String(option).toLowerCase().includes(q));
  }, [options, query]);

  const allVisibleSelected = visibleOptions.length > 0
    && visibleOptions.every((option) => draft.includes(option));
  const someVisibleSelected = visibleOptions.some((option) => draft.includes(option));

  const updatePosition = () => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = 248;
    const padding = 8;
    let left = rect.right - width;
    left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
    let top = rect.bottom + 6;
    const estimatedHeight = 320;
    if (top + estimatedHeight > window.innerHeight - padding) {
      top = Math.max(padding, rect.top - estimatedHeight - 6);
    }
    setCoords({ top, left, width });
  };

  useLayoutEffect(() => {
    if (!isOpen) return undefined;
    setQuery('');
    setDraft(isFilterActive(selected) ? [...selected] : [...options]);
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener('resize', onScrollOrResize);
    window.addEventListener('scroll', onScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', onScrollOrResize);
      window.removeEventListener('scroll', onScrollOrResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDoc = (event) => {
      const target = event.target;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpenKey(null);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpenKey(null);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, setOpenKey]);

  const toggleOption = (option) => {
    setDraft((prev) => (
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    ));
  };

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setDraft((prev) => prev.filter((item) => !visibleOptions.includes(item)));
      return;
    }
    setDraft((prev) => Array.from(new Set([...prev, ...visibleOptions])));
  };

  const handleApply = () => {
    const next = draft.length === 0 || draft.length === options.length
      ? null
      : draft;
    onApply(next);
    setOpenKey(null);
  };

  const handleClear = () => {
    onApply(null);
    setOpenKey(null);
  };

  return (
    <div className="ofoq-col-filter">
      <span className="ofoq-col-filter__label">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        className={`ofoq-col-filter__trigger${hasFilter ? ' is-active' : ''}${isOpen ? ' is-open' : ''}`}
        aria-label={`فیلتر ${label}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          setOpenKey(isOpen ? null : columnKey);
        }}
      >
        <LinesFilterIcon />
      </button>

      {isOpen && createPortal(
        <div
          ref={panelRef}
          className="ofoq-excel-filter"
          role="dialog"
          aria-label={`فیلتر ستون ${label}`}
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            width: `${coords.width}px`,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="ofoq-excel-filter__search">
            <SearchMiniIcon />
            <input
              type="search"
              className="ofoq-excel-filter__search-input"
              placeholder="جستجو..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          <label className="ofoq-excel-filter__master">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
              }}
              onChange={toggleAllVisible}
            />
            <span>انتخاب همه</span>
          </label>

          <div className="ofoq-excel-filter__list">
            {visibleOptions.length === 0 ? (
              <p className="ofoq-excel-filter__empty">موردی یافت نشد</p>
            ) : (
              visibleOptions.map((option) => (
                <label key={option} className="ofoq-excel-filter__option">
                  <input
                    type="checkbox"
                    checked={draft.includes(option)}
                    onChange={() => toggleOption(option)}
                  />
                  <span>{option}</span>
                </label>
              ))
            )}
          </div>

          <div className="ofoq-excel-filter__footer">
            <button type="button" className="ofoq-excel-filter__clear" onClick={handleClear}>
              پاک کردن
            </button>
            <button type="button" className="ofoq-excel-filter__apply" onClick={handleApply}>
              اعمال
            </button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function OfoqListTable({
  opportunities,
  listTitle = 'فهرست فرصت‌های فروش',
  onOpen,
}) {
  const { widths, startResize } = useResizableColumns('ofoq-opportunities-v1', OFOQ_COLUMNS);
  const [columnFilters, setColumnFilters] = useState({});
  const [openFilterKey, setOpenFilterKey] = useState(null);

  const filterOptions = useMemo(() => {
    const map = {};
    FILTERABLE_KEYS.forEach((key) => {
      const values = new Set();
      opportunities.forEach((item) => {
        const value = getColumnRawValue(item, key);
        if (value) values.add(value);
      });
      map[key] = Array.from(values).sort((a, b) => String(a).localeCompare(String(b), 'fa'));
    });
    return map;
  }, [opportunities]);

  const visibleRows = useMemo(() => {
    const entries = Object.entries(columnFilters).filter(([, value]) => isFilterActive(value));
    if (!entries.length) return opportunities;
    return opportunities.filter((item) => (
      entries.every(([key, values]) => values.includes(getColumnRawValue(item, key)))
    ));
  }, [opportunities, columnFilters]);

  return (
    <section className="section-data ofoq-table-section" aria-label={listTitle}>
      <div className="data-table-header">
        <span className="data-table-header__title">{listTitle}</span>
        <span className="data-table-header__count">
          {visibleRows.length.toLocaleString('fa-IR')}
          {' '}
          رکورد
        </span>
      </div>

      <div className="data-table-wrap ofoq-table-wrap">
        <table className="data-table ofoq-table jarian-table data-table--resizable">
          <ResizableColGroup columns={OFOQ_COLUMNS} widths={widths} />
          <thead className="ofoq-table__head">
            <tr>
              {OFOQ_COLUMNS.map((col) => (
                <ResizableTh
                  key={col.key}
                  columnKey={col.key}
                  resizable={col.resizable !== false}
                  onResizeStart={startResize}
                  className={`ofoq-table__sticky-th${col.key === 'actions' ? ' ofoq-table__sticky-th--actions' : ''}`}
                >
                  {FILTERABLE_KEYS.has(col.key) ? (
                    <ColumnFilterHeader
                      label={COLUMN_LABELS[col.key]}
                      columnKey={col.key}
                      options={filterOptions[col.key] || []}
                      selected={columnFilters[col.key] || null}
                      openKey={openFilterKey}
                      setOpenKey={setOpenFilterKey}
                      onApply={(value) => {
                        setColumnFilters((prev) => {
                          const next = { ...prev };
                          if (!value) delete next[col.key];
                          else next[col.key] = value;
                          return next;
                        });
                      }}
                    />
                  ) : (
                    COLUMN_LABELS[col.key]
                  )}
                </ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={OFOQ_COLUMNS.length}>
                  <div className="empty-state">
                    <div className="empty-state__icon">📋</div>
                    <p>فرصتی در این نما یافت نشد.</p>
                  </div>
                </td>
              </tr>
            ) : (
              visibleRows.map((item, index) => {
                const followUp = getFollowUpStatus(item.nextActionAt);
                return (
                  <tr
                    key={item.id}
                    className="ofoq-table__row ofoq-table__row--clickable"
                    onClick={() => onOpen?.(item.id)}
                    onKeyDown={(e) => e.key === 'Enter' && onOpen?.(item.id)}
                    tabIndex={0}
                    role="button"
                  >
                    <td>{(index + 1).toLocaleString('fa-IR')}</td>
                    <td>
                      <button
                        type="button"
                        className="ofoq-table__client-link"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen?.(item.id);
                        }}
                      >
                        {item.client}
                      </button>
                    </td>
                    <td className="jarian-td-product">
                      <div className="ofoq-table__subject">
                        <span className="ofoq-table__subject-name">{item.subject}</span>
                        <span className="ofoq-table__subject-id">{item.id}</span>
                      </div>
                    </td>
                    <td><SourceTag source={item.source} /></td>
                    <td><PriorityBadge priority={item.priority} /></td>
                    <td><FollowUpIndicator status={followUp} /></td>
                    <td><StageBadge stage={item.stage} /></td>
                    <td className="ofoq-table__actions-cell">
                      <div className="ofoq-table__actions">
                        <button
                          type="button"
                          className="ofoq-table__action-btn"
                          title="جزئیات فرصت"
                          aria-label={`باز کردن جزئیات ${item.client}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpen?.(item.id);
                          }}
                        >
                          <ProfileIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
