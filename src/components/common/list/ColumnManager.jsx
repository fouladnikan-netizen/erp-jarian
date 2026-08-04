import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Columns3, GripVertical, Lock, X } from 'lucide-react';
import './list-infra.css';

/**
 * Shared column show/hide + drag-and-drop reorder panel.
 */
export default function ColumnManager({
  columns = [],
  setColumnVisible,
  reorderColumns,
  resetColumns,
  className = '',
}) {
  const [open, setOpen] = useState(false);

  const visibleCount = useMemo(
    () => columns.filter((col) => col.visible).length,
    [columns],
  );

  const onDragEnd = (result) => {
    if (!result.destination) return;
    reorderColumns?.(result.source.index, result.destination.index);
  };

  return (
    <div className={`jarian-column-manager${className ? ` ${className}` : ''}`}>
      <button
        type="button"
        className={`jarian-list-chrome__btn font-meem${open ? ' is-active' : ''}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Columns3 size={16} strokeWidth={1.75} aria-hidden="true" />
        <span>ستون‌ها</span>
        <span className="jarian-list-chrome__badge font-yekan">{visibleCount}</span>
      </button>

      {open && createPortal(
        <div
          className="jarian-column-manager__backdrop"
          role="presentation"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="jarian-column-manager__panel kprofile-glass"
            role="dialog"
            aria-label="مدیریت ستون‌ها"
            dir="rtl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="jarian-column-manager__head">
              <div>
                <h3 className="jarian-column-manager__title font-meem">مدیریت ستون‌ها</h3>
                <p className="jarian-column-manager__hint font-meem">
                  نمایش/مخفی و ترتیب با کشیدن
                </p>
              </div>
              <button
                type="button"
                className="jarian-list-chrome__icon-btn"
                aria-label="بستن"
                onClick={() => setOpen(false)}
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
      )}
    </div>
  );
}
