import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Lock, X } from 'lucide-react';
import './list-infra.css';

/**
 * Shared column show/hide + drag-and-drop reorder panel (controlled).
 * Opened from ListChrome More menu — no standalone header button.
 */
export default function ColumnManager({
  open = false,
  onClose,
  columns = [],
  setColumnVisible,
  reorderColumns,
  resetColumns,
}) {
  if (!open) return null;

  const onDragEnd = (result) => {
    if (!result.destination) return;
    reorderColumns?.(result.source.index, result.destination.index);
  };

  return createPortal(
    <div
      className="jarian-column-manager__backdrop"
      role="presentation"
      onMouseDown={() => onClose?.()}
    >
      <div
        className="jarian-column-manager__panel kprofile-glass"
        role="dialog"
        aria-label="مدیریت ستون‌ها"
        aria-modal="true"
        dir="rtl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="jarian-column-manager__head">
          <div>
            <h3 className="jarian-column-manager__title font-meem">مدیریت ستون‌ها</h3>
            <p className="jarian-column-manager__hint font-meem">
              نمایش / مخفی کردن ستون‌ها · تغییر ترتیب با کشیدن
            </p>
          </div>
          <button
            type="button"
            className="jarian-list-chrome__icon-btn"
            aria-label="بستن"
            onClick={() => onClose?.()}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="jarian-list-columns">
            {(provided) => (
              <ul
                className="jarian-column-manager__list"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                {columns.map((col, index) => (
                  <Draggable key={col.key} draggableId={col.key} index={index}>
                    {(dragProvided, snapshot) => (
                      <li
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={`jarian-column-manager__item${snapshot.isDragging ? ' is-dragging' : ''}`}
                      >
                        <button
                          type="button"
                          className="jarian-column-manager__grip"
                          aria-label="جابه‌جایی ستون"
                          {...dragProvided.dragHandleProps}
                        >
                          <GripVertical size={14} strokeWidth={1.75} />
                        </button>
                        <label className="jarian-column-manager__label font-meem">
                          <input
                            type="checkbox"
                            checked={col.visible}
                            disabled={col.locked}
                            onChange={(event) => setColumnVisible?.(col.key, event.target.checked)}
                          />
                          <span>{col.title}</span>
                          {col.locked ? (
                            <Lock size={12} strokeWidth={1.75} aria-label="قفل" />
                          ) : null}
                        </label>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>

        <footer className="jarian-column-manager__foot">
          <button
            type="button"
            className="jarian-list-chrome__btn font-meem"
            onClick={() => resetColumns?.()}
          >
            بازنشانی ستون‌ها
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
