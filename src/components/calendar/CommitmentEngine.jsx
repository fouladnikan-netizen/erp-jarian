import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  Phone,
  CreditCard,
  Truck,
  FileText,
  AlertCircle,
  Inbox,
  ExternalLink,
  X,
  Users,
} from 'lucide-react';
import { useContactsStore } from '../../stores/useContactsStore';
import { getTodayJalaliParts, toPersianDigits } from '../../modules/nabz/dateUtils';
import { withReturnParams } from '../navigation/SmartBackButton';
import { useCompanyCompletionGate } from '../customerCompletion';
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

const RETURN_TO = '/pooyesh';
const RETURN_NAME = 'پویش';

const ICON_SIZE = 16;
const ICON_STROKE = 1.75;

const TYPE_ICONS = {
  followup: Phone,
  finance: CreditCard,
  logistics: Truck,
  contract: FileText,
};

function TypeIcon({ type, size = ICON_SIZE }) {
  const Icon = TYPE_ICONS[type] || FileText;
  return <Icon size={size} strokeWidth={ICON_STROKE} className="cmt-icon" aria-hidden="true" />;
}

function TypeBadge({ type, label }) {
  return (
    <span className="cmt-badge">
      <TypeIcon type={type} size={14} />
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
          <ExternalLink size={12} strokeWidth={ICON_STROKE} />
        </span>
      </span>
    </button>
  );
}

function CommitmentDrawer({ item, onClose, onDive }) {
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
  const diveHref = withReturnParams(item.link, RETURN_TO, RETURN_NAME);

  const handleDiveClick = (event) => {
    if (!item.contactId || typeof onDive !== 'function') return;
    event.preventDefault();
    onDive(item);
  };

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
              <X size={18} strokeWidth={ICON_STROKE} />
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

          {item.note ? <p className="cmt-drawer__note">{item.note}</p> : null}

          <p className="cmt-drawer__readonly">
            این تعهد از ماژول مبدأ تجمیع شده و در پویش قابل ویرایش نیست.
          </p>
        </div>

        <footer className="cmt-drawer__foot">
          <Link
            to={diveHref}
            className="cmt-drawer__dive"
            onClick={handleDiveClick}
          >
            شیرجه به پرونده
            <ExternalLink size={14} strokeWidth={ICON_STROKE} />
          </Link>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

export default function CommitmentEngine() {
  const contacts = useContactsStore((state) => state.contacts);
  const navigate = useNavigate();
  const today = useMemo(() => getTodayJalaliParts(), []);
  const [activeTypes, setActiveTypes] = useState(() => new Set(TYPE_ORDER));
  const [selected, setSelected] = useState(null);
  const { ensureOperational, gateDialog } = useCompanyCompletionGate();

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

  const handleDive = (item) => {
    const href = withReturnParams(item.link, RETURN_TO, RETURN_NAME);
    if (!item.contactId) {
      navigate(href);
      return;
    }
    ensureOperational(item.contactId, () => {
      setSelected(null);
      navigate(href);
    });
  };
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
            <Users size={14} strokeWidth={ICON_STROKE} className="cmt-icon" aria-hidden="true" />
            {toPersianDigits(metrics.meetings)} جلسه
          </span>
          <span className="cmt-metric">
            <span className="cmt-dot cmt-dot--followup" aria-hidden="true" />
            <Phone size={14} strokeWidth={ICON_STROKE} className="cmt-icon" aria-hidden="true" />
            {toPersianDigits(metrics.followups)} پیگیری
          </span>
          <span className="cmt-metric">
            <span className="cmt-dot cmt-dot--finance" aria-hidden="true" />
            <CreditCard size={14} strokeWidth={ICON_STROKE} className="cmt-icon" aria-hidden="true" />
            {toPersianDigits(metrics.settlements)} تسویه
          </span>
          <span className="cmt-metric">
            <span className="cmt-dot cmt-dot--overdue" aria-hidden="true" />
            <AlertCircle size={14} strokeWidth={ICON_STROKE} className="cmt-icon" aria-hidden="true" />
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
              <AlertCircle size={15} strokeWidth={ICON_STROKE} className="cmt-icon" aria-hidden="true" />
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
            <Inbox size={28} strokeWidth={ICON_STROKE} className="cmt-icon" aria-hidden="true" />
            <p className="font-meem">با فیلترهای فعلی تعهدی برای نمایش نیست.</p>
          </div>
        ) : null}
      </div>

      {selected ? (
        <CommitmentDrawer
          item={selected}
          onClose={() => setSelected(null)}
          onDive={handleDive}
        />
      ) : null}
      {gateDialog}
    </div>
  );
}
