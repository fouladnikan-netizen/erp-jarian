import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useContactsStore } from '../../stores/useContactsStore';
import { getJalaliMonthLength, getTodayJalaliParts, toPersianDigits } from '../../modules/nabz/dateUtils';
import { withReturnParams } from '../navigation/SmartBackButton';
import {
  CALENDAR_LAYERS,
  CALENDAR_ROLES,
  PRIORITY_META,
  WEEKDAY_LABELS,
  JALALI_MONTHS,
  buildCalendarEvents,
  filterEventsByRole,
  dayKey,
  shiftJalali,
  jalaliWeekIndex,
  formatPartsLong,
} from './calendarEvents';
import './unified-calendar.css';

const VIEWS = [
  { id: 'day', label: 'روزانه' },
  { id: 'week', label: 'هفتگی' },
  { id: 'month', label: 'ماهانه' },
];

function samePart(a, b) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function ChevronIcon({ flip }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/* ——— پاپ‌اور جزئیات رویداد (پرتال، گلس) ——— */
function EventPopover({ popover, onClose, onNavigate, returnTo, returnName }) {
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!popover) return;
    const { anchorRect } = popover;
    const panel = panelRef.current;
    if (!panel) return;
    const width = panel.offsetWidth || 300;
    const height = panel.offsetHeight || 220;
    let left = anchorRect.left + anchorRect.width / 2 - width / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    let top = anchorRect.bottom + 10;
    if (top + height > window.innerHeight - 12) {
      top = Math.max(12, anchorRect.top - height - 10);
    }
    setPos({ left, top });
  }, [popover]);

  useEffect(() => {
    if (!popover) return undefined;
    const handlePointer = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [popover, onClose]);

  if (!popover) return null;
  const { event } = popover;
  const layer = CALENDAR_LAYERS.find((l) => l.id === event.layer);
  const priority = PRIORITY_META[event.priority] || PRIORITY_META.normal;

  return createPortal(
    <div
      ref={panelRef}
      className={`jcal-popover jcal-popover--${event.layer}`}
      style={pos ? { left: pos.left, top: pos.top, visibility: 'visible' } : { visibility: 'hidden' }}
      role="dialog"
      aria-label={event.title}
      dir="rtl"
    >
      <div className="jcal-popover__head">
        <span className="jcal-popover__layer">{layer?.emoji} {layer?.label}</span>
        <span className={`jcal-popover__priority ${priority.className}`}>{priority.label}</span>
      </div>
      <h4 className="jcal-popover__title font-meem">{event.title}</h4>
      <dl className="jcal-popover__meta">
        <div>
          <dt>مسئول</dt>
          <dd>{event.owner}</dd>
        </div>
        <div>
          <dt>طرف حساب</dt>
          <dd>{event.party}</dd>
        </div>
        <div>
          <dt>تاریخ</dt>
          <dd className="font-yekan">{formatPartsLong(event.parts)}{event.overdue ? ' — معوق' : ''}</dd>
        </div>
      </dl>
      <Link
        to={withReturnParams(event.link, returnTo, returnName)}
        className="jcal-popover__link"
        onClick={onNavigate}
      >
        مشاهده پرونده
        <ExternalIcon />
      </Link>
    </div>,
    document.body,
  );
}

/* ——— چیپ رویداد داخل سلول‌های تقویم ——— */
function EventChip({ event, onOpen, compact = false }) {
  return (
    <button
      type="button"
      className={`jcal-event jcal-event--${event.layer}${event.tone === 'gold' ? ' jcal-event--gold' : ''}${event.overdue ? ' is-overdue' : ''}${compact ? ' jcal-event--compact' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(event, e.currentTarget.getBoundingClientRect());
      }}
      title={event.title}
    >
      <span className="jcal-event__dot" aria-hidden="true" />
      <span className="jcal-event__label">{event.title}</span>
    </button>
  );
}

export default function UnifiedJarianCalendar({ open = true, onClose, variant = 'overlay' }) {
  const location = useLocation();
  const contacts = useContactsStore((state) => state.contacts);
  const today = useMemo(() => getTodayJalaliParts(), []);
  const returnTo = location.pathname + location.search || '/';
  const returnName = 'تقویم سیستم';

  const [view, setView] = useState('month');
  const [anchor, setAnchor] = useState(today);
  const [activeLayers, setActiveLayers] = useState(() => new Set(CALENDAR_LAYERS.map((l) => l.id)));
  const [role, setRole] = useState('rahbar');
  const [popover, setPopover] = useState(null);

  const allEvents = useMemo(() => buildCalendarEvents(contacts, today), [contacts, today]);

  const visibleEvents = useMemo(() => (
    filterEventsByRole(allEvents, role).filter((event) => activeLayers.has(event.layer))
  ), [allEvents, role, activeLayers]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    visibleEvents.forEach((event) => {
      const key = dayKey(event.parts.year, event.parts.month, event.parts.day);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [visibleEvents]);

  /* Esc: اول پاپ‌اور، بعد خود تقویم */
  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key !== 'Escape') return;
      setPopover((current) => {
        if (current) return null;
        if (variant === 'overlay') onClose?.();
        return null;
      });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, variant]);

  /* قفل اسکرول بدنه در حالت اورلی */
  useEffect(() => {
    if (!open || variant !== 'overlay') return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, variant]);

  if (!open) return null;

  const toggleLayer = (layerId) => {
    setActiveLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layerId)) next.delete(layerId);
      else next.add(layerId);
      return next;
    });
  };

  const navigate = (dir) => {
    setPopover(null);
    if (view === 'day') {
      setAnchor((prev) => shiftJalali(prev, dir));
    } else if (view === 'week') {
      setAnchor((prev) => shiftJalali(prev, dir * 7));
    } else {
      setAnchor((prev) => {
        let { year, month } = prev;
        month += dir;
        if (month < 1) { month = 12; year -= 1; }
        if (month > 12) { month = 1; year += 1; }
        const day = Math.min(prev.day, getJalaliMonthLength(year, month));
        return { year, month, day };
      });
    }
  };

  const goToday = () => {
    setPopover(null);
    setAnchor(today);
  };

  const openPopover = (event, anchorRect) => {
    setPopover({ event, anchorRect });
  };

  const handleNavigateAway = () => {
    setPopover(null);
    if (variant === 'overlay') onClose?.();
  };

  const openDay = (parts) => {
    setAnchor(parts);
    setView('day');
  };

  /* ——— عنوان دوره جاری ——— */
  let periodTitle = '';
  if (view === 'month') {
    periodTitle = `${JALALI_MONTHS[anchor.month - 1]} ${toPersianDigits(anchor.year)}`;
  } else if (view === 'week') {
    const start = shiftJalali(anchor, -jalaliWeekIndex(anchor));
    const end = shiftJalali(start, 6);
    periodTitle = start.month === end.month
      ? `${toPersianDigits(start.day)} تا ${toPersianDigits(end.day)} ${JALALI_MONTHS[start.month - 1]} ${toPersianDigits(start.year)}`
      : `${toPersianDigits(start.day)} ${JALALI_MONTHS[start.month - 1]} تا ${toPersianDigits(end.day)} ${JALALI_MONTHS[end.month - 1]} ${toPersianDigits(end.year)}`;
  } else {
    periodTitle = `${WEEKDAY_LABELS[jalaliWeekIndex(anchor)]} ${formatPartsLong(anchor)}`;
  }

  /* ——— بدنه نماها ——— */
  let body = null;

  if (view === 'month') {
    const monthLength = getJalaliMonthLength(anchor.year, anchor.month);
    const firstIndex = jalaliWeekIndex({ year: anchor.year, month: anchor.month, day: 1 });
    const cells = [];
    for (let i = 0; i < firstIndex; i += 1) cells.push(null);
    for (let d = 1; d <= monthLength; d += 1) {
      cells.push({ year: anchor.year, month: anchor.month, day: d });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    body = (
      <div className="jcal-month" key={`month-${anchor.year}-${anchor.month}`}>
        <div className="jcal-month__weekdays">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="font-meem">{label}</span>
          ))}
        </div>
        <div className="jcal-month__grid">
          {cells.map((cell, idx) => {
            if (!cell) return <div key={`empty-${idx}`} className="jcal-month__cell is-empty" />;
            const key = dayKey(cell.year, cell.month, cell.day);
            const dayEvents = eventsByDay.get(key) || [];
            const isToday = samePart(cell, today);
            return (
              <div
                key={key}
                className={`jcal-month__cell${isToday ? ' is-today' : ''}${dayEvents.length ? ' has-events' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => openDay(cell)}
                onKeyDown={(e) => { if (e.key === 'Enter') openDay(cell); }}
              >
                <span className="jcal-month__daynum font-yekan">{toPersianDigits(cell.day)}</span>
                <div className="jcal-month__events">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventChip key={event.id} event={event} onOpen={openPopover} compact />
                  ))}
                  {dayEvents.length > 3 ? (
                    <span className="jcal-month__more font-yekan">+{toPersianDigits(dayEvents.length - 3)} مورد</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  } else if (view === 'week') {
    const start = shiftJalali(anchor, -jalaliWeekIndex(anchor));
    const days = Array.from({ length: 7 }, (_, i) => shiftJalali(start, i));
    body = (
      <div className="jcal-week" key={`week-${dayKey(start.year, start.month, start.day)}`}>
        {days.map((parts, i) => {
          const key = dayKey(parts.year, parts.month, parts.day);
          const dayEvents = eventsByDay.get(key) || [];
          const isToday = samePart(parts, today);
          return (
            <div key={key} className={`jcal-week__col${isToday ? ' is-today' : ''}`}>
              <button type="button" className="jcal-week__head" onClick={() => openDay(parts)}>
                <span className="font-meem">{WEEKDAY_LABELS[i]}</span>
                <span className="font-yekan">{toPersianDigits(parts.day)} {JALALI_MONTHS[parts.month - 1]}</span>
              </button>
              <div className="jcal-week__events">
                {dayEvents.length
                  ? dayEvents.map((event) => (
                    <EventChip key={event.id} event={event} onOpen={openPopover} />
                  ))
                  : <span className="jcal-empty-hint">—</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    const key = dayKey(anchor.year, anchor.month, anchor.day);
    const dayEvents = eventsByDay.get(key) || [];
    body = (
      <div className="jcal-day" key={`day-${key}`}>
        {dayEvents.length ? (
          dayEvents.map((event) => {
            const layer = CALENDAR_LAYERS.find((l) => l.id === event.layer);
            const priority = PRIORITY_META[event.priority] || PRIORITY_META.normal;
            return (
              <button
                type="button"
                key={event.id}
                className={`jcal-day__card jcal-day__card--${event.layer}${event.tone === 'gold' ? ' jcal-day__card--gold' : ''}`}
                onClick={(e) => openPopover(event, e.currentTarget.getBoundingClientRect())}
              >
                <span className="jcal-day__emoji" aria-hidden="true">{layer?.emoji}</span>
                <span className="jcal-day__body">
                  <span className="jcal-day__title font-meem">{event.title}</span>
                  <span className="jcal-day__sub">{event.owner} · {event.party}</span>
                </span>
                <span className={`jcal-popover__priority ${priority.className}`}>{priority.label}</span>
              </button>
            );
          })
        ) : (
          <div className="jcal-day__empty">
            <span aria-hidden="true">🍃</span>
            <p className="font-meem">برای این روز رویدادی ثبت نشده است.</p>
          </div>
        )}
      </div>
    );
  }

  const panel = (
    <div className={`jcal-panel${variant === 'page' ? ' jcal-panel--page' : ''}`} dir="rtl" role="dialog" aria-modal={variant === 'overlay'} aria-label="تقویم یکپارچه جریان">
      <header className="jcal-header">
        <div className="jcal-header__titles">
          <h2 className="font-meem">تقویم یکپارچه جریان</h2>
          <p className="font-meem">تعهدات مالی، پویش‌های فروش و لجستیک — در یک نگاه</p>
        </div>

        <div className="jcal-header__controls">
          <div className="jcal-views" role="tablist" aria-label="نمای تقویم">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={view === v.id}
                className={`jcal-views__btn${view === v.id ? ' is-active' : ''}`}
                onClick={() => { setPopover(null); setView(v.id); }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {variant === 'overlay' ? (
            <button type="button" className="jcal-close" aria-label="بستن تقویم" onClick={onClose}>
              <CloseIcon />
            </button>
          ) : null}
        </div>
      </header>

      <div className="jcal-toolbar">
        <div className="jcal-nav">
          <button type="button" className="jcal-nav__btn" aria-label="دوره بعد" onClick={() => navigate(1)}>
            <ChevronIcon flip />
          </button>
          <button type="button" className="jcal-nav__today font-meem" onClick={goToday}>امروز</button>
          <button type="button" className="jcal-nav__btn" aria-label="دوره قبل" onClick={() => navigate(-1)}>
            <ChevronIcon />
          </button>
          <span className="jcal-nav__title font-yekan">{periodTitle}</span>
        </div>

        <div className="jcal-filters">
          <div className="jcal-chips" role="group" aria-label="لایه‌های رویداد">
            {CALENDAR_LAYERS.map((layer) => (
              <button
                key={layer.id}
                type="button"
                className={`jcal-chip jcal-chip--${layer.id}${activeLayers.has(layer.id) ? ' is-active' : ''}`}
                aria-pressed={activeLayers.has(layer.id)}
                onClick={() => toggleLayer(layer.id)}
              >
                <span aria-hidden="true">{layer.emoji}</span>
                {layer.label}
              </button>
            ))}
          </div>

          <label className="jcal-role">
            <span className="font-meem">نمایش از نگاه</span>
            <select value={role} onChange={(e) => { setPopover(null); setRole(e.target.value); }}>
              {CALENDAR_ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="jcal-body">
        {body}
      </div>

      <EventPopover
        popover={popover}
        onClose={() => setPopover(null)}
        onNavigate={handleNavigateAway}
        returnTo={returnTo}
        returnName={returnName}
      />
    </div>
  );

  if (variant === 'page') {
    return panel;
  }

  return createPortal(
    <div
      className="jcal-overlay"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {panel}
    </div>,
    document.body,
  );
}
