import { useMemo, useState } from 'react';
import KpiCard from '../../components/module/KpiCard';
import { moduleData } from '../registry';
import OfoqListTable, { getFollowUpStatus } from './OfoqListTable';
import './ofoq.css';

const ofoghData = moduleData.ofogh;

const STAGES = [
  { id: 'new', label: 'استعلام جدید' },
  { id: 'negotiating', label: 'در حال مذاکره' },
  { id: 'quoted', label: 'ارسال پیش‌کش' },
  { id: 'closed', label: 'بایگانی / تعیین تکلیف' },
];

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

function addDays(base, days) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function stageLabel(stageId) {
  return STAGES.find((stage) => stage.id === stageId)?.label || stageId;
}

function formatFaDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('fa-IR');
  } catch {
    return '—';
  }
}

const INITIAL_OPPORTUNITIES = [
  {
    id: 'OFQ-1405-001',
    client: 'فولاد پارس',
    subject: 'استعلام تیرآهن ۱۸ ذوب‌آهن — ۲۰۰ تن',
    source: 'تماس ورودی',
    priority: 'Hot',
    stage: 'new',
    nextActionAt: addDays(new Date(), -1).toISOString(),
  },
  {
    id: 'OFQ-1405-002',
    client: 'صنایع فلزی کرمان',
    subject: 'قرارداد سالانه ورق سیاه',
    source: 'معرفی',
    priority: 'Warm',
    stage: 'negotiating',
    nextActionAt: new Date().toISOString(),
  },
  {
    id: 'OFQ-1405-003',
    client: 'بازرگانی آذر',
    subject: 'پیش‌کش میلگرد ۱۴ و ۱۶',
    source: 'واتساپ',
    priority: 'Cold',
    stage: 'quoted',
    nextActionAt: addDays(new Date(), 4).toISOString(),
  },
  {
    id: 'OFQ-1405-004',
    client: 'ذوب آهن اصفهان',
    subject: 'پروژه نبشی و ناودانی',
    source: 'نمایشگاه',
    priority: 'Warm',
    stage: 'new',
    nextActionAt: addDays(new Date(), 2).toISOString(),
  },
  {
    id: 'OFQ-1405-005',
    client: 'فولاد مبارکه',
    subject: 'بسته ورق گالوانیزه — تعیین تکلیف',
    source: 'وب‌سایت',
    priority: 'Cold',
    stage: 'closed',
    nextActionAt: addDays(new Date(), 10).toISOString(),
  },
  {
    id: 'OFQ-1405-006',
    client: 'آهن‌آلات شرق',
    subject: 'استعلام لوله درزدار ۸ اینچ',
    source: 'مراجعه حضوری',
    priority: 'Hot',
    stage: 'negotiating',
    nextActionAt: addDays(new Date(), -2).toISOString(),
  },
];

function SearchIcon() {
  return (
    <svg className="actions-bar__search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function LayoutGridIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
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
  return <span className={`ofoq-stage ofoq-stage--${stage}`}>{stageLabel(stage)}</span>;
}

function SourceTag({ source }) {
  return <span className="ofoq-source-tag">{source}</span>;
}

function OpportunityCard({ opportunity, onDragStart }) {
  const followUp = getFollowUpStatus(opportunity.nextActionAt);

  return (
    <article
      className="ofoq-card"
      draggable
      onDragStart={(event) => onDragStart(event, opportunity.id)}
    >
      <div className="ofoq-card__top">
        <PriorityBadge priority={opportunity.priority} />
      </div>
      <h3 className="ofoq-card__client">{opportunity.client}</h3>
      <p className="ofoq-card__subject">{opportunity.subject}</p>
      <div className="ofoq-card__footer">
        <FollowUpIndicator status={followUp} />
      </div>
    </article>
  );
}

function OfoqKanbanBoard({ opportunities, onMove }) {
  const [draggedId, setDraggedId] = useState(null);
  const [dropStage, setDropStage] = useState(null);

  const cardsByStage = useMemo(() => {
    const map = Object.fromEntries(STAGES.map((stage) => [stage.id, []]));
    opportunities.forEach((item) => {
      if (map[item.stage]) map[item.stage].push(item);
    });
    return map;
  }, [opportunities]);

  const handleDragStart = (event, id) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (stageId) => {
    if (!draggedId) return;
    onMove(draggedId, stageId);
    setDraggedId(null);
    setDropStage(null);
  };

  return (
    <section className="ofoq-kanban" aria-label="کانبان فرصت‌ها">
      <div className="ofoq-kanban__scroller">
        {STAGES.map((stage) => {
          const cards = cardsByStage[stage.id] || [];
          const isActiveDrop = dropStage === stage.id;
          return (
            <div
              key={stage.id}
              className={`ofoq-column${isActiveDrop ? ' is-drop-target' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDropStage(stage.id);
              }}
              onDragLeave={() => setDropStage((prev) => (prev === stage.id ? null : prev))}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(stage.id);
              }}
            >
              <header className="ofoq-column__head">
                <h2 className="ofoq-column__title">{stage.label}</h2>
                <span className="ofoq-column__count">
                  {cards.length.toLocaleString('fa-IR')}
                </span>
              </header>
              <div className="ofoq-column__body">
                {cards.length === 0 ? (
                  <p className="ofoq-column__empty">کارتی نیست</p>
                ) : (
                  cards.map((opportunity) => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      onDragStart={handleDragStart}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function OfoqDrawer({ opportunity, onClose }) {
  if (!opportunity) return null;
  const followUp = getFollowUpStatus(opportunity.nextActionAt);

  return (
    <div className="ofoq-drawer" role="presentation">
      <button type="button" className="ofoq-drawer__backdrop" aria-label="بستن کشو" onClick={onClose} />
      <aside
        className="ofoq-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ofoq-drawer-title"
      >
        <header className="ofoq-drawer__head">
          <div>
            <div className="ofoq-drawer__meta">
              <PriorityBadge priority={opportunity.priority} />
              <FollowUpIndicator status={followUp} />
              <span className="ofoq-drawer__code">{opportunity.id}</span>
            </div>
            <h2 id="ofoq-drawer-title" className="ofoq-drawer__title">{opportunity.client}</h2>
          </div>
          <button type="button" className="ofoq-drawer__close" onClick={onClose} aria-label="بستن">
            <CloseIcon />
          </button>
        </header>

        <div className="ofoq-drawer__body">
          <dl className="ofoq-drawer__details">
            <div>
              <dt>موضوع استعلام</dt>
              <dd>{opportunity.subject}</dd>
            </div>
            <div>
              <dt>منبع سرنخ</dt>
              <dd><SourceTag source={opportunity.source} /></dd>
            </div>
            <div>
              <dt>مرحله فعلی</dt>
              <dd><StageBadge stage={opportunity.stage} /></dd>
            </div>
            <div>
              <dt>تاریخ اقدام بعدی</dt>
              <dd>{formatFaDate(opportunity.nextActionAt)}</dd>
            </div>
          </dl>
          <p className="ofoq-drawer__hint">
            جزئیات پیگیری و ثبت اقدام بعدی در مرحله بعد فعال می‌شود.
          </p>
        </div>
      </aside>
    </div>
  );
}

function OfoqActionBar({
  data,
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  viewMode,
  onViewModeChange,
}) {
  return (
    <section className="section-actions ofoq-actions" aria-label="عملیات">
      <div className="section-label">نوار عملیات</div>
      <div className="actions-bar">
        <div className="actions-bar__search">
          <input
            type="search"
            placeholder={data.searchPlaceholder}
            aria-label="جستجو"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <SearchIcon />
        </div>

        <div className="actions-bar__filters">
          {data.filters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`chip${activeFilter === filter ? ' is-active' : ''}`}
              onClick={() => onFilterChange(filter)}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="ofoq-view-switch" role="group" aria-label="تعویض نما">
          <button
            type="button"
            className={`ofoq-view-switch__btn${viewMode === 'kanban' ? ' is-active' : ''}`}
            onClick={() => onViewModeChange('kanban')}
            title="نمای کانبان"
          >
            <LayoutGridIcon />
            <span>نمای کانبان</span>
          </button>
          <button
            type="button"
            className={`ofoq-view-switch__btn${viewMode === 'list' ? ' is-active' : ''}`}
            onClick={() => onViewModeChange('list')}
            title="نمای لیستی"
          >
            <ListIcon />
            <span>نمای لیستی</span>
          </button>
        </div>

        <div className="actions-bar__buttons">
          <button type="button" className="btn btn--primary">
            {data.primaryAction}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function OfoqModule() {
  const [opportunities, setOpportunities] = useState(INITIAL_OPPORTUNITIES);
  const [viewMode, setViewMode] = useState('kanban');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(ofoghData.filters[0]);
  const [selectedId, setSelectedId] = useState(null);

  const selectedOpportunity = useMemo(
    () => opportunities.find((item) => item.id === selectedId) || null,
    [opportunities, selectedId],
  );

  const filteredOpportunities = useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities.filter((item) => {
      const stageOk = activeFilter === 'همه'
        || (activeFilter === 'جدید' && item.stage === 'new')
        || (activeFilter === 'در مذاکره' && item.stage === 'negotiating')
        || (activeFilter === 'پیشنهاد' && item.stage === 'quoted')
        || (activeFilter === 'بسته شده' && item.stage === 'closed');

      if (!stageOk) return false;
      if (!q) return true;
      return [item.client, item.subject, item.source, item.id]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [opportunities, search, activeFilter]);

  const handleMove = (id, stageId) => {
    setOpportunities((prev) => prev.map((item) => (
      item.id === id ? { ...item, stage: stageId } : item
    )));
  };

  return (
    <div className="module-page ofoq-page" data-module="ofogh" dir="rtl">
      <section className="section-kpis" aria-label="شاخص‌های کلیدی">
        <div className="section-label">شاخص‌های کلیدی عملکرد</div>
        <div className="kpi-grid">
          {ofoghData.kpis.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))}
        </div>
      </section>

      <OfoqActionBar
        data={ofoghData}
        search={search}
        onSearchChange={setSearch}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {viewMode === 'kanban' ? (
        <OfoqKanbanBoard
          opportunities={filteredOpportunities}
          onMove={handleMove}
        />
      ) : (
        <OfoqListTable
          opportunities={filteredOpportunities}
          listTitle={ofoghData.tableTitle}
          onOpen={setSelectedId}
        />
      )}

      <OfoqDrawer
        opportunity={selectedOpportunity}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
