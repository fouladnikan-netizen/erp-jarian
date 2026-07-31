import { useEffect, useMemo, useRef, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useContactsStore } from '../../stores/useContactsStore';
import OfoqLeadModal from './OfoqLeadModal';
import {
  PIPELINE_STAGES,
  PULSE_META,
  getPulseStatus,
  getContactDisplayName,
  getContactTag,
} from './pipelineConfig';

const DUE_FILTER_OPTIONS = [
  { id: 'today', label: 'پیگیری‌های امروز' },
  { id: 'overdue', label: 'پیگیری‌های عقب‌افتاده' },
];

const EMPTY_FILTER = { query: '', due: null };

function FunnelIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
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

function ContactCard({ contact, index, onOpen }) {
  const name = getContactDisplayName(contact);
  const tag = getContactTag(contact);

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
          className={`ofoq-lead-card${snapshot.isDragging ? ' is-dragging' : ''}`}
          style={provided.draggableProps.style}
          onClick={handleClick}
        >
          <div className="ofoq-lead-card__row">
            <h3 className="ofoq-lead-card__name">{name}</h3>
            <PulseDot nextFollowUpDate={contact.next_follow_up_date} />
          </div>
          {tag ? <span className="ofoq-lead-card__tag">{tag}</span> : null}
        </article>
      )}
    </Draggable>
  );
}

/** پاپ‌اور گلس فیلتر ستون — جستجو + سررسید. state محلی ستون است و به استور دست نمی‌زند. */
function ColumnFilterPopover({ filter, onChange, onClose }) {
  return (
    <div className="ofoq-column-filter__popover" role="menu">
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
      <button
        type="button"
        className="ofoq-column-filter__clear"
        onClick={() => {
          onChange(EMPTY_FILTER);
          onClose();
        }}
      >
        پاک کردن فیلتر
      </button>
    </div>
  );
}

function PipelineColumn({ stage, contacts, onOpenContact }) {
  const [filter, setFilter] = useState(EMPTY_FILTER);
  const [filterOpen, setFilterOpen] = useState(false);
  const columnRef = useRef(null);

  const isFiltered = Boolean(filter.query.trim() || filter.due);

  const visibleContacts = useMemo(() => {
    if (!isFiltered) return contacts;
    const query = filter.query.trim();
    return contacts.filter((contact) => {
      if (query) {
        const haystack = `${getContactDisplayName(contact)} ${getContactTag(contact)}`;
        if (!haystack.includes(query)) return false;
      }
      if (filter.due && getPulseStatus(contact.next_follow_up_date) !== filter.due) {
        return false;
      }
      return true;
    });
  }, [contacts, filter, isFiltered]);

  useEffect(() => {
    if (!filterOpen) return undefined;
    const handlePointerDown = (event) => {
      if (columnRef.current && !columnRef.current.contains(event.target)) {
        setFilterOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setFilterOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [filterOpen]);

  return (
    <section
      ref={columnRef}
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
            type="button"
            className={`ofoq-column-filter__btn${isFiltered ? ' is-active' : ''}`}
            aria-label={`فیلتر ستون ${stage.label}`}
            aria-expanded={filterOpen}
            onClick={() => setFilterOpen((open) => !open)}
          >
            <FunnelIcon />
          </button>
        </div>
      </header>

      {filterOpen && (
        <ColumnFilterPopover
          filter={filter}
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

/** بورد کانبان افق — فیلترهای سراسری (جستجو/مراحل) از تولبار ماژول به‌صورت props می‌آیند. */
export default function OfoqPipelineBoard({ globalQuery = '', selectedStages = [] }) {
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
      (map[contact.lifecycle_stage] || map[PIPELINE_STAGES[0].id]).push(contact);
    });
    return map;
  }, [contacts, globalQuery]);

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
