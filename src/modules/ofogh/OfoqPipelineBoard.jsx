import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useCompanies, useUpdateContactStage, CONTACT_RECORD_TYPES } from '../kanoon/public/index.js';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { isOpenLeadStatus } from './domain/lead.constants.js';
import OfoqLeadModal from './OfoqLeadModal';
import OfoqRawLeadDetailModal from './OfoqRawLeadDetailModal';
import OfoqPersonalLeadBoard from './OfoqPersonalLeadBoard';
import LifecycleIndicator from '../../components/common/LifecycleIndicator';
import {
  resolveCompanyLifecycleVisual,
  resolveRawLeadVisual,
} from './lifecycleVisualRegistry.js';
import {
  PIPELINE_STAGES,
  PULSE_META,
  ROTTING_INACTIVITY_DAYS,
  getPulseStatus,
  getContactDisplayName,
  getContactTag,
  getEngagementLabel,
  isCardRotting,
} from './pipelineConfig';
import { ENTITY_TYPES } from '../kanoon/config.js';
import { normalizeLifecycleKey } from '../../domain/customerLifecycle/index.js';

const DUE_FILTER_OPTIONS = [
  { id: 'overdue', label: 'پیگیری‌های عقب‌افتاده' },
  { id: 'today', label: 'پیگیری‌های امروز' },
  { id: 'future', label: 'پیگیری‌های آینده' },
];

const EMPTY_FILTER = { query: '', due: null, selected: null };

/** آیکون سه‌خط فیلتر — عین هدر ستون‌های فهرست نبض (وحدت رویه). */
function LinesFilterIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M7 12h10" />
      <path d="M10 17h4" />
    </svg>
  );
}

function formatFaDate(isoDate) {
  if (!isoDate) return '';
  try {
    return new Date(isoDate).toLocaleDateString('fa-IR');
  } catch {
    return '';
  }
}

function PulseDot({ nextFollowUpDate }) {
  const status = getPulseStatus(nextFollowUpDate);
  const meta = PULSE_META[status];
  const dateLabel = formatFaDate(nextFollowUpDate);

  return (
    <span
      className={`ofoq-pulse ${meta.className}`}
      title={dateLabel ? `${meta.label} — ${dateLabel}` : meta.label}
    >
      <span className="ofoq-pulse__dot" aria-hidden="true" />
      <span className="ofoq-pulse__label">{dateLabel || 'بدون پیگیری'}</span>
    </span>
  );
}

/** نشان بات صیاد — ساعت شنی کوچک کنار نقطه نبض کارت‌های راکد. */
function RottingBadge() {
  return (
    <span
      className="ofoq-rotting-badge"
      title={`بیش از ${ROTTING_INACTIVITY_DAYS.toLocaleString('fa-IR')} روز بدون پیگیری`}
      aria-label="فرصت راکد"
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 2h12" />
        <path d="M6 22h12" />
        <path d="M7 2v4a5 5 0 0 0 10 0V2" />
        <path d="M7 22v-4a5 5 0 0 1 10 0v4" />
      </svg>
    </span>
  );
}

function ContactCard({ contact, index, onOpen, systemControlled = false }) {
  const name = getContactDisplayName(contact);
  const tag = getContactTag(contact);
  const rotting = isCardRotting(contact.last_interaction_date, contact.lifecycle_stage);
  const visual = resolveCompanyLifecycleVisual(contact);
  const engagement = contact.engagementStatus || 'normal';
  const engagementLabel = getEngagementLabel(engagement);

  const handleClick = (event) => {
    if (event.defaultPrevented) return;
    onOpen(contact.id);
  };

  const cardInner = (
    <>
      <div className="ofoq-lead-card__row">
        <h3 className="ofoq-lead-card__name">
          <LifecycleIndicator visual={visual.kind} label={visual.label} size={12} />
          {name}
        </h3>
        <span className="ofoq-lead-card__signals">
          {rotting ? <RottingBadge /> : null}
          <PulseDot nextFollowUpDate={contact.next_follow_up_date} />
        </span>
      </div>
      {tag ? <span className="ofoq-lead-card__tag">{tag}</span> : null}
      {systemControlled && engagement !== 'normal' ? (
        <span
          className={`ofoq-engagement-chip ofoq-engagement-chip--${engagement}`}
          data-testid="ofogh-engagement-chip"
        >
          {engagementLabel}
        </span>
      ) : null}
    </>
  );

  if (systemControlled) {
    return (
      <article
        className={`ofoq-lead-card ofoq-lead-card--static${rotting ? ' is-rotting' : ''}`}
        data-testid={`ofogh-customer-card-${contact.id}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen(contact.id);
          }
        }}
      >
        {cardInner}
      </article>
    );
  }

  return (
    <Draggable draggableId={String(contact.id)} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`ofoq-lead-card${snapshot.isDragging ? ' is-dragging' : ''}${rotting ? ' is-rotting' : ''}`}
          style={provided.draggableProps.style}
          onClick={handleClick}
        >
          {cardInner}
        </article>
      )}
    </Draggable>
  );
}

function RawLeadCard({ lead, onOpen }) {
  const visual = resolveRawLeadVisual(lead.status);
  const handleClick = () => onOpen(lead.id);
  return (
    <article
      className="ofoq-lead-card ofoq-lead-card--raw"
      onClick={handleClick}
      data-entity-type="RAW_LEAD"
    >
      <div className="ofoq-lead-card__row">
        <h3 className="ofoq-lead-card__name">
          <LifecycleIndicator visual={visual.kind} label={visual.label} size={12} />
          {lead.companyName}
        </h3>
        <PulseDot nextFollowUpDate={lead.next_follow_up_date} />
      </div>
      {lead.personName ? (
        <span className="ofoq-lead-card__tag">{lead.personName}</span>
      ) : null}
      {(lead.leadSource || lead.mobile) ? (
        <span className="ofoq-lead-card__meta font-yekan">
          {[lead.leadSource, lead.mobile].filter(Boolean).join(' · ')}
        </span>
      ) : null}
    </article>
  );
}

function RawLeadColumn({ leads, onOpenLead }) {
  const columnVisual = resolveRawLeadVisual();
  return (
    <section
      className="ofoq-pipeline__column ofoq-pipeline__column--raw-lead"
      style={{
        '--stage-color': 'var(--text-muted)',
        '--stage-glow': 'color-mix(in srgb, var(--text-muted) 25%, transparent)',
      }}
      aria-label="سرنخ خام"
    >
      <header className="ofoq-pipeline__column-head">
        <h2 className="ofoq-pipeline__column-title">
          <LifecycleIndicator visual={columnVisual.kind} label={columnVisual.label} size={14} />
          سرنخ خام
        </h2>
        <div className="ofoq-pipeline__column-tools">
          <span className="ofoq-pipeline__column-count">
            {leads.length.toLocaleString('fa-IR')}
          </span>
        </div>
      </header>
      <div className="ofoq-pipeline__column-body">
        {leads.map((lead) => (
          <RawLeadCard key={lead.id} lead={lead} onOpen={onOpenLead} />
        ))}
        {leads.length === 0 && (
          <div className="ofoq-pipeline__empty" aria-hidden="true">
            سرنخ خامی ثبت نشده
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * پاپ‌اور گلس فیلتر ستون — جستجو + سررسید + فیلتر اکسلی آیتم‌های ستون
 * (انتخاب همه/بخشی با اعمال/پاک کردن، عین فیلتر ستون‌های فهرست نبض).
 * state محلی ستون است و به استور دست نمی‌زند.
 */
function ColumnFilterPopover({ filter, options, triggerRef, onChange, onClose }) {
  const panelRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 248 });

  // پیش‌نویس انتخاب اکسلی — فقط با «اعمال» روی ستون می‌نشیند (الگوی نبض)
  const [draft, setDraft] = useState(
    filter.selected && filter.selected.length ? [...filter.selected] : [...options],
  );

  // موقعیت‌دهی fixed زیر دکمه فیلتر (پرتال به body، عین فیلتر اکسلی نبض) تا بورد آن را کلیپ نکند
  useLayoutEffect(() => {
    const updatePosition = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = 248;
      const padding = 8;
      let left = rect.right - width;
      left = Math.max(padding, Math.min(left, window.innerWidth - width - padding));
      let top = rect.bottom + 6;
      const estimatedHeight = 340;
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
  }, [triggerRef]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (panelRef.current?.contains(event.target)) return;
      if (triggerRef.current?.contains(event.target)) return;
      onClose();
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [triggerRef, onClose]);

  const query = filter.query.trim();
  const visibleOptions = useMemo(() => {
    if (!query) return options;
    return options.filter((option) => option.includes(query));
  }, [options, query]);

  const allVisibleSelected = visibleOptions.length > 0
    && visibleOptions.every((option) => draft.includes(option));
  const someVisibleSelected = visibleOptions.some((option) => draft.includes(option));

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
    const selected = draft.length === 0 || draft.length === options.length ? null : draft;
    onChange({ ...filter, selected });
    onClose();
  };

  const handleClear = () => {
    onChange(EMPTY_FILTER);
    onClose();
  };

  return createPortal(
    <div
      ref={panelRef}
      className="ofoq-column-filter__popover"
      role="menu"
      style={{ top: `${coords.top}px`, left: `${coords.left}px`, width: `${coords.width}px` }}
    >
      <input
        type="search"
        className="ofoq-column-filter__search"
        placeholder="جستجو..."
        value={filter.query}
        autoFocus
        onChange={(event) => onChange({ ...filter, query: event.target.value })}
      />

      <div className="ofoq-column-filter__options">
        {DUE_FILTER_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`ofoq-column-filter__option${filter.due === option.id ? ' is-active' : ''}`}
            onClick={() => onChange({ ...filter, due: filter.due === option.id ? null : option.id })}
          >
            <span className={`ofoq-column-filter__option-dot ofoq-column-filter__option-dot--${option.id}`} aria-hidden="true" />
            {option.label}
          </button>
        ))}
      </div>

      <div className="ofoq-column-filter__divider" aria-hidden="true" />

      <label className="ofoq-column-filter__master">
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

      <div className="ofoq-column-filter__list">
        {visibleOptions.length === 0 ? (
          <p className="ofoq-column-filter__list-empty">موردی یافت نشد</p>
        ) : (
          visibleOptions.map((option) => (
            <label key={option} className="ofoq-column-filter__item">
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

      <div className="ofoq-column-filter__footer">
        <button type="button" className="ofoq-column-filter__clear" onClick={handleClear}>
          پاک کردن
        </button>
        <button type="button" className="ofoq-column-filter__apply" onClick={handleApply}>
          اعمال
        </button>
      </div>
    </div>,
    document.body,
  );
}

function PipelineColumn({ stage, contacts, onOpenContact, systemControlled = false }) {
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterBtnRef = useRef(null);

  const isFiltered = Boolean(
    filter.query.trim() || filter.due || (filter.selected && filter.selected.length),
  );

  /** آیتم‌های اکسلی ستون: نام نمایشی کارت‌های همین ستون (یکتا، مرتب فارسی) */
  const itemOptions = useMemo(() => {
    const names = new Set(contacts.map((contact) => getContactDisplayName(contact)));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'fa'));
  }, [contacts]);

  const visibleContacts = useMemo(() => {
    if (!isFiltered) return contacts;
    const query = filter.query.trim();
    return contacts.filter((contact) => {
      const name = getContactDisplayName(contact);
      if (query) {
        const haystack = `${name} ${getContactTag(contact)} ${contact.nationalId || ''} ${contact.phone || ''} ${contact.mobile || ''}`;
        if (!haystack.includes(query)) return false;
      }
      if (filter.due && getPulseStatus(contact.next_follow_up_date) !== filter.due) {
        return false;
      }
      if (filter.selected && filter.selected.length && !filter.selected.includes(name)) {
        return false;
      }
      return true;
    });
  }, [contacts, filter, isFiltered]);

  return (
    <section
      className="ofoq-pipeline__column"
      style={{ '--stage-color': stage.color, '--stage-glow': stage.glow }}
      aria-label={stage.label}
      data-testid={`ofogh-lifecycle-col-${stage.id}`}
    >
      <header className="ofoq-pipeline__column-head">
        <h2 className="ofoq-pipeline__column-title">{stage.label}</h2>
        <div className="ofoq-pipeline__column-tools">
          <span className="ofoq-pipeline__column-count" data-testid={`ofogh-lifecycle-count-${stage.id}`}>
            {isFiltered
              ? `${visibleContacts.length.toLocaleString('fa-IR')}/${contacts.length.toLocaleString('fa-IR')}`
              : contacts.length.toLocaleString('fa-IR')}
          </span>
          <button
            ref={filterBtnRef}
            type="button"
            className={`ofoq-column-filter__btn${isFiltered ? ' is-active' : ''}`}
            aria-label={`فیلتر ستون ${stage.label}`}
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((open) => !open)}
          >
            <LinesFilterIcon />
          </button>
        </div>
      </header>

      {filterOpen && (
        <ColumnFilterPopover
          filter={filter}
          options={itemOptions}
          triggerRef={filterBtnRef}
          onChange={setFilter}
          onClose={() => setFilterOpen(false)}
        />
      )}

      <Droppable droppableId={stage.id} isDropDisabled={systemControlled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`ofoq-pipeline__column-body${snapshot.isDraggingOver ? ' is-dragging-over' : ''}${systemControlled ? ' is-system-controlled' : ''}`}
          >
            {visibleContacts.map((contact, index) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                index={index}
                onOpen={onOpenContact}
                systemControlled={systemControlled}
              />
            ))}
            {provided.placeholder}
            {visibleContacts.length === 0 && (
              <div className="ofoq-pipeline__empty" aria-hidden="true">
                {isFiltered
                  ? 'موردی مطابق فیلتر نیست'
                  : (systemControlled ? 'مشتری در این مرحله نیست' : 'لید را اینجا رها کنید')}
              </div>
            )}
          </div>
        )}
      </Droppable>
    </section>
  );
}

/** بورد کانبان افق — فیلترهای سراسری (جستجو/مراحل/سررسید) از تولبار ماژول به‌صورت props می‌آیند. */
export default function OfoqPipelineBoard({
  globalQuery = '',
  selectedStages = [],
  globalDue = null,
  selectedLeadId = null,
  onSelectLead,
  entityScope = 'all',
  boardMode = 'all',
}) {
  const contacts = useCompanies();
  const updateContactStage = useUpdateContactStage();
  const leads = useLeadsStore((state) => state.leads);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [internalLeadId, setInternalLeadId] = useState(null);

  const systemControlled = boardMode === 'customers' || entityScope === 'companies';

  const activeLeadId = selectedLeadId != null ? selectedLeadId : internalLeadId;
  const openLead = (id) => {
    if (typeof onSelectLead === 'function') onSelectLead(id);
    else setInternalLeadId(id);
  };
  const closeLead = () => {
    if (typeof onSelectLead === 'function') onSelectLead(null);
    else setInternalLeadId(null);
  };

  const openLeads = useMemo(() => {
    if (entityScope === 'companies' || boardMode === 'customers') return [];
    const query = globalQuery.trim();
    return leads.filter((lead) => {
      if (!isOpenLeadStatus(lead.status)) return false;
      if (query) {
        const haystack = `${lead.companyName} ${lead.personName || ''} ${lead.leadSource || ''} ${lead.mobile || ''} ${lead.nationalId || lead.payload?.nationalId || ''}`;
        if (!haystack.includes(query)) return false;
      }
      if (globalDue && getPulseStatus(lead.next_follow_up_date) !== globalDue) return false;
      return true;
    });
  }, [leads, globalQuery, globalDue, entityScope, boardMode]);

  const showRawLeadColumn = !systemControlled
    && (entityScope === 'raw' || entityScope === 'all' || boardMode === 'leads')
    && (entityScope === 'raw' || boardMode === 'leads' || selectedStages.length === 0);

  const showCompanyColumns = systemControlled || (entityScope !== 'raw' && boardMode !== 'leads');

  const contactsByStage = useMemo(() => {
    const query = globalQuery.trim();
    const map = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage.id, []]));
    if (!showCompanyColumns) return map;
    contacts.forEach((contact) => {
      if (contact.recordType === CONTACT_RECORD_TYPES.LEAD) return;
      // Suppliers never appear on Customer Lifecycle
      if (contact.entityType === ENTITY_TYPES.SUPPLIER || contact.entityType === 'SUPPLIER') return;
      const stageKey = normalizeLifecycleKey(contact.lifecycle_stage || contact.lifecycleStage);
      if (!stageKey) return;
      if (query) {
        const haystack = `${getContactDisplayName(contact)} ${contact.personName || ''} ${getContactTag(contact)} ${contact.nationalId || ''} ${contact.phone || ''}`;
        if (!haystack.includes(query)) return;
      }
      if (globalDue && getPulseStatus(contact.next_follow_up_date) !== globalDue) return;
      if (!map[stageKey]) return;
      map[stageKey].push(contact);
    });
    return map;
  }, [contacts, globalQuery, globalDue, showCompanyColumns]);

  const visibleStages = useMemo(() => {
    if (!showCompanyColumns) return [];
    return selectedStages.length
      ? PIPELINE_STAGES.filter((stage) => selectedStages.includes(stage.id))
      : PIPELINE_STAGES;
  }, [selectedStages, showCompanyColumns]);

  const handleDragEnd = (result) => {
    if (systemControlled) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    if (String(draggableId).startsWith('lead-') || String(draggableId).startsWith('lead_')) return;
    updateContactStage(Number(draggableId) || draggableId, destination.droppableId);
  };

  if (boardMode === 'leads' || entityScope === 'raw') {
    return (
      <>
        <OfoqPersonalLeadBoard
          globalQuery={globalQuery}
          globalDue={globalDue}
          onSelectLead={openLead}
        />
        {activeLeadId != null && (
          <OfoqRawLeadDetailModal
            leadId={activeLeadId}
            onClose={closeLead}
          />
        )}
      </>
    );
  }

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="ofoq-pipeline__board" dir="rtl" data-testid={systemControlled ? 'ofogh-customer-lifecycle-board' : 'ofogh-lead-board'}>
          {showRawLeadColumn ? (
            <RawLeadColumn leads={openLeads} onOpenLead={openLead} />
          ) : null}
          {visibleStages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              contacts={contactsByStage[stage.id] || []}
              onOpenContact={setSelectedContactId}
              systemControlled={systemControlled}
            />
          ))}
        </div>
      </DragDropContext>

      {selectedContactId != null && (
        <OfoqLeadModal
          contactId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
        />
      )}

      {activeLeadId != null && (
        <OfoqRawLeadDetailModal
          leadId={activeLeadId}
          onClose={closeLead}
        />
      )}
    </>
  );
}
