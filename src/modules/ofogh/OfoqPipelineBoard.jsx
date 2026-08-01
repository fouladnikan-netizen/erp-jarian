import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useContactsStore } from '../../stores/useContactsStore';
import OfoqLeadModal from './OfoqLeadModal';
import {
  PIPELINE_STAGES,
  PULSE_META,
  ROTTING_INACTIVITY_DAYS,
  getPulseStatus,
  getContactDisplayName,
  getContactTag,
  isCardRotting,
} from './pipelineConfig';

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

function ContactCard({ contact, index, onOpen }) {
  const name = getContactDisplayName(contact);
  const tag = getContactTag(contact);
  const rotting = isCardRotting(contact.last_interaction_date, contact.lifecycle_stage);

  const handleClick = (event) => {
    // بعد از درگ، کتابخانه کلیک را defaultPrevented می‌کند؛ فقط کلیک واقعی کشو را باز کند.
    if (event.defaultPrevented) return;
    onOpen(contact.id);
  };

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
          <div className="ofoq-lead-card__row">
            <h3 className="ofoq-lead-card__name">{name}</h3>
            <span className="ofoq-lead-card__signals">
              {rotting ? <RottingBadge /> : null}
              <PulseDot nextFollowUpDate={contact.next_follow_up_date} />
            </span>
          </div>
          {tag ? <span className="ofoq-lead-card__tag">{tag}</span> : null}
        </article>
      )}
    </Draggable>
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

function PipelineColumn({ stage, contacts, onOpenContact }) {
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
        const haystack = `${name} ${getContactTag(contact)}`;
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
    >
      <header className="ofoq-pipeline__column-head">
        <h2 className="ofoq-pipeline__column-title">{stage.label}</h2>
        <div className="ofoq-pipeline__column-tools">
          <span className="ofoq-pipeline__column-count">
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

      <Droppable droppableId={stage.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`ofoq-pipeline__column-body${snapshot.isDraggingOver ? ' is-dragging-over' : ''}`}
          >
            {visibleContacts.map((contact, index) => (
              <ContactCard key={contact.id} contact={contact} index={index} onOpen={onOpenContact} />
            ))}
            {provided.placeholder}
            {visibleContacts.length === 0 && (
              <div className="ofoq-pipeline__empty" aria-hidden="true">
                {isFiltered ? 'موردی مطابق فیلتر نیست' : 'لید را اینجا رها کنید'}
              </div>
            )}
          </div>
        )}
      </Droppable>
    </section>
  );
}

/** بورد کانبان افق — فیلترهای سراسری (جستجو/مراحل/سررسید) از تولبار ماژول به‌صورت props می‌آیند. */
export default function OfoqPipelineBoard({ globalQuery = '', selectedStages = [], globalDue = null }) {
  const contacts = useContactsStore((state) => state.contacts);
  const updateContactStage = useContactsStore((state) => state.updateContactStage);
  const [selectedContactId, setSelectedContactId] = useState(null);

  const contactsByStage = useMemo(() => {
    const query = globalQuery.trim();
    const map = Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage.id, []]));
    contacts.forEach((contact) => {
      if (query) {
        const haystack = `${getContactDisplayName(contact)} ${contact.personName || ''} ${getContactTag(contact)}`;
        if (!haystack.includes(query)) return;
      }
      if (globalDue && getPulseStatus(contact.next_follow_up_date) !== globalDue) return;
      (map[contact.lifecycle_stage] || map[PIPELINE_STAGES[0].id]).push(contact);
    });
    return map;
  }, [contacts, globalQuery, globalDue]);

  const visibleStages = useMemo(() => (
    selectedStages.length
      ? PIPELINE_STAGES.filter((stage) => selectedStages.includes(stage.id))
      : PIPELINE_STAGES
  ), [selectedStages]);

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;
    updateContactStage(Number(draggableId), destination.droppableId);
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="ofoq-pipeline__board" dir="rtl">
          {visibleStages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              contacts={contactsByStage[stage.id] || []}
              onOpenContact={setSelectedContactId}
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
    </>
  );
}
