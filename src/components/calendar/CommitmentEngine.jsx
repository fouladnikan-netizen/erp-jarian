import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useContactsStore } from '../../stores/useContactsStore';
import { getTodayJalaliParts, toPersianDigits } from '../../modules/nabz/dateUtils';
import { withReturnParams } from '../navigation/SmartBackButton';
import {
  COMMITMENT_TYPES,
  TYPE_ORDER,
  PRIORITY_META,
  buildCommitments,
  groupCommitments,
  buildTodayMetrics,
  formatDayLabel,
  formatPartsLong,
} from './commitmentsData';
import './commitment-engine.css';

const RETURN_TO = '/gahshomar';
const RETURN_NAME = 'گاه‌شمار';

/* آیکن‌های outline هم‌سبک سایدبار (stroke / slate) */
const iconProps = {
  width: 15,
  height: 15,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function IconPhone() {
  return (
    <svg {...iconProps}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg {...iconProps}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg {...iconProps}>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg {...iconProps}>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <path d="M14 2v6h6M8 13h8M8 17h6" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function IconInbox() {
  return (
    <svg {...{ ...iconProps, width: 28, height: 28 }}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function DiveIcon() {
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

const TYPE_ICONS = {
  followup: IconPhone,
  finance: IconCard,
  logistics: IconTruck,
  contract: IconFile,
};

function TypeIcon({ type }) {
  const Icon = TYPE_ICONS[type] || IconFile;
  return <Icon />;
}

function TypeBadge({ type, label }) {
  return (
    <span className="cmt-badge">
      <span className={`cmt-dot cmt-dot--${type}`} aria-hidden="true" />
      <TypeIcon type={type} />
      {label}
    </span>
  );
}

function OwnerAvatar({ owner }) {
  const initial = (owner?.name || '؟').trim().charAt(0);
  return (
    <span
      className="cmt-avatar"
      title={owner?.name ? `${owner.role || ''} ${owner.name}`.trim() : undefined}
    >
      {initial}
    </span>
  );
}

function CommitmentCard({ item, onOpen, overdue = false }) {
  const meta = COMMITMENT_TYPES[item.type];
  return (
    <button
      type="button"
      className={`cmt-card${overdue ? ' is-overdue' : ''}`}
      onClick={() => onOpen(item)}
    >
      <span className={`cmt-card__dot cmt-dot--${overdue ? 'overdue' : item.type}`} aria-hidden="true" />
      <span className="cmt-card__time font-yekan">
        {overdue ? formatDayLabel(item.parts) : (item.time || 'طی روز')}
      </span>
      <span className="cmt-card__body">
        <span className="cmt-card__title font-meem">{item.title}</span>
        <span className="cmt-card__target">{item.target}</span>
      </span>
      <span className="cmt-card__side">
        <TypeBadge type={item.type} label={meta.label} />
        <OwnerAvatar owner={item.owner} />
        <span className="cmt-card__dive" aria-hidden="true">
          شیرجه
          <DiveIcon />
        </span>
      </span>
    </button>
  );
}

function CommitmentDrawer({ item, onClose }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const meta = COMMITMENT_TYPES[item.type];
  const priority = PRIORITY_META[item.priority] || PRIORITY_META.normal;

  return createPortal(
    <div
      className="cmt-drawer-overlay"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="cmt-drawer" dir="rtl" role="dialog" aria-label={item.title}>
        <header className="cmt-drawer__head">
          <div className="cmt-drawer__head-row">
            <TypeBadge type={item.type} label={meta.label} />
            <span className={`cmt-priority ${priority.className}`}>{priority.label}</span>
            <button type="button" className="cmt-drawer__close" aria-label="بستن" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
          <h3 className="cmt-drawer__title font-meem">{item.title}</h3>
          <p className="cmt-drawer__target">{item.target}</p>
        </header>

        <div className="cmt-drawer__body">
          <dl className="cmt-drawer__meta">
            <div>
              <dt>تاریخ</dt>
              <dd className="font-yekan">{formatPartsLong(item.parts)}</dd>
            </div>
            <div>
              <dt>ساعت</dt>
              <dd className="font-yekan">{item.time || 'در طول روز'}</dd>
            </div>
            <div>
              <dt>مسئول</dt>
              <dd>
                <span className="cmt-drawer__owner">
                  <OwnerAvatar owner={item.owner} />
                  {item.owner?.role ? `${item.owner.role} — ` : ''}{item.owner?.name || '—'}
                </span>
              </dd>
            </div>
            <div>
              <dt>ماژول مبدأ</dt>
              <dd>{meta.source}</dd>
            </div>
            {(item.details || []).map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>

          {item.note ? (
            <p className="cmt-drawer__note">{item.note}</p>
          ) : null}

          <p className="cmt-drawer__readonly">
            این تعهد از ماژول مبدأ تجمیع شده و در گاه‌شمار قابل ویرایش نیست.
          </p>
        </div>

        <footer className="cmt-drawer__foot">
          <Link
            to={withReturnParams(item.link, RETURN_TO, RETURN_NAME)}
            className="cmt-drawer__dive"
          >
            شیرجه به پرونده
            <DiveIcon />
          </Link>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

export default function CommitmentEngine() {
  const contacts = useContactsStore((state) => state.contacts);
  const today = useMemo(() => getTodayJalaliParts(), []);
  const [activeTypes, setActiveTypes] = useState(() => new Set(TYPE_ORDER));
  const [selected, setSelected] = useState(null);

  const allItems = useMemo(() => buildCommitments(contacts, today), [contacts, today]);
  const metrics = useMemo(() => buildTodayMetrics(allItems, today), [allItems, today]);

  const visibleItems = useMemo(
    () => allItems.filter((item) => activeTypes.has(item.type)),
    [allItems, activeTypes],
  );

  const { overdue, days } = useMemo(
    () => groupCommitments(visibleItems, today),
    [visibleItems, today],
  );

  const allActive = activeTypes.size === TYPE_ORDER.length;

  const toggleType = (typeId) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeId)) next.delete(typeId);
      else next.add(typeId);
      return next;
    });
  };

  const openItem = (item) => setSelected(item);

  return (
    <div className="cmt-engine" dir="rtl">
      <header className="cmt-today">
        <div className="cmt-today__titles">
          <h2 className="font-meem">موتور تعهدات</h2>
          <p className="font-meem">
            نمای تجمیعی تعهدات زمان‌دار از نبض، افق و مالی — امروز {formatDayLabel(today)}
          </p>
        </div>
        <div className="cmt-today__metrics">
          <span className="cmt-metric">
            <span className="cmt-dot cmt-dot--meeting" aria-hidden="true" />
            {toPersianDigits(metrics.meetings)} جلسه
          </span>
          <span className="cmt-metric">
            <span className="cmt-dot cmt-dot--followup" aria-hidden="true" />
            {toPersianDigits(metrics.followups)} پیگیری
          </span>
          <span className="cmt-metric">
            <span className="cmt-dot cmt-dot--finance" aria-hidden="true" />
            {toPersianDigits(metrics.settlements)} تسویه
          </span>
          <span className="cmt-metric">
            <span className="cmt-dot cmt-dot--overdue" aria-hidden="true" />
            {toPersianDigits(metrics.overdue)} تاخیر
          </span>
        </div>
      </header>

      <div className="cmt-chips" role="group" aria-label="فیلتر نوع تعهد">
        <button
          type="button"
          className={`cmt-chip${allActive ? ' is-active' : ''}`}
          aria-pressed={allActive}
          onClick={() => setActiveTypes(new Set(allActive ? [] : TYPE_ORDER))}
        >
          همه
        </button>
        {TYPE_ORDER.map((typeId) => {
          const meta = COMMITMENT_TYPES[typeId];
          const active = activeTypes.has(typeId);
          return (
            <button
              key={typeId}
              type="button"
              className={`cmt-chip${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => toggleType(typeId)}
            >
              <TypeIcon type={typeId} />
              {meta.label}
              <span className="cmt-chip__src">({meta.source})</span>
            </button>
          );
        })}
      </div>

      <div className="cmt-timeline">
        {overdue.length ? (
          <section className="cmt-group cmt-group--overdue">
            <h3 className="cmt-group__head cmt-group__head--overdue font-meem">
              <IconAlert />
              تأخیر و نیازمند توجه
              <span className="cmt-group__count font-yekan">{toPersianDigits(overdue.length)}</span>
            </h3>
            <div className="cmt-group__items">
              {overdue.map((item) => (
                <CommitmentCard key={item.id} item={item} onOpen={openItem} overdue />
              ))}
            </div>
          </section>
        ) : null}

        {days.map((day) => (
          <section key={day.label} className="cmt-group">
            <h3 className="cmt-group__head font-meem">
              {day.relative ? <span className="cmt-group__relative">{day.relative}</span> : null}
              {day.label}
              <span className="cmt-group__count font-yekan">{toPersianDigits(day.items.length)}</span>
            </h3>
            <div className="cmt-group__items">
              {day.items.map((item) => (
                <CommitmentCard key={item.id} item={item} onOpen={openItem} />
              ))}
            </div>
          </section>
        ))}

        {!overdue.length && !days.length ? (
          <div className="cmt-empty">
            <IconInbox />
            <p className="font-meem">با فیلترهای فعلی تعهدی برای نمایش نیست.</p>
          </div>
        ) : null}
      </div>

      {selected ? <CommitmentDrawer item={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
