import { useState } from 'react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../hooks/useResizableColumns';

const CREATE_LINE_COLUMNS = [
  { key: 'drag', defaultWidth: 36, resizable: false },
  { key: 'name', defaultWidth: 140 },
  { key: 'description', defaultWidth: 300 },
  { key: 'qty', defaultWidth: 72 },
  { key: 'weight', defaultWidth: 88 },
  { key: 'unit', defaultWidth: 64, resizable: false },
  { key: 'remove', defaultWidth: 40, resizable: false },
];

const COLUMN_LABELS = {
  drag: '',
  name: 'نام کالا',
  description: 'توضیحات',
  qty: 'تعداد',
  weight: 'وزن',
  unit: 'واحد',
  remove: '',
};

function DragHandle() {
  return (
    <span className="nabz-create-table__drag" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="9" cy="7" r="1.5" />
        <circle cx="15" cy="7" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="17" r="1.5" />
        <circle cx="15" cy="17" r="1.5" />
      </svg>
    </span>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function reorderItems(items, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex == null || toIndex == null) return items;
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function OrderLineItemsTable({ items, onChange, onRemove }) {
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const { widths, startResize } = useResizableColumns('nabz-create-line-items', CREATE_LINE_COLUMNS);

  const updateLine = (lineId, key, value) => {
    onChange(items.map((item) => (item.lineId === lineId ? { ...item, [key]: value } : item)));
  };

  const finishDrag = (fromIndex, toIndex) => {
    if (fromIndex == null || toIndex == null || fromIndex === toIndex) return;
    onChange(reorderItems(items, fromIndex, toIndex));
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="nabz-create-table-wrap">
      <table className="nabz-create-table data-table--resizable">
        <ResizableColGroup columns={CREATE_LINE_COLUMNS} widths={widths} />
        <thead className="nabz-create-table__head">
          <tr>
            {CREATE_LINE_COLUMNS.map((col) => (
              <ResizableTh
                key={col.key}
                columnKey={col.key}
                resizable={col.resizable !== false}
                onResizeStart={startResize}
                className={`nabz-create-table__sticky-th${
                  col.key === 'drag' ? ' nabz-create-table__drag-col' : ''
                }${col.key === 'remove' ? ' nabz-create-table__remove-col' : ''}${
                  col.key === 'description' ? ' nabz-create-table__desc-col' : ''
                }`}
              >
                {COLUMN_LABELS[col.key]}
              </ResizableTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.lineId}
              className={`nabz-create-table__row-draggable${
                overIndex === index ? ' is-drag-over' : ''
              }${dragIndex === index ? ' is-dragging' : ''}`}
              draggable
              onDragStart={() => setDragIndex(index)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOverIndex(index);
              }}
              onDrop={(e) => {
                e.preventDefault();
                finishDrag(dragIndex, index);
              }}
            >
              <td className="nabz-create-table__drag-cell">
                <DragHandle />
              </td>
              <td className="nabz-create-table__name">{item.name}</td>
              <td className="nabz-create-table__desc-cell">
                <input
                  type="text"
                  className="nabz-create-table__input"
                  value={item.description}
                  onChange={(e) => updateLine(item.lineId, 'description', e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="1"
                  className="nabz-create-table__input nabz-create-table__input--qty"
                  value={item.qty}
                  onChange={(e) => updateLine(item.lineId, 'qty', Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="nabz-create-table__input"
                  value={item.weight}
                  onChange={(e) => updateLine(item.lineId, 'weight', e.target.value)}
                />
              </td>
              <td>{item.unit}</td>
              <td className="nabz-create-table__remove-col">
                <button
                  type="button"
                  className="nabz-create-table__trash"
                  onClick={() => onRemove(item.lineId)}
                  aria-label="حذف سطر"
                >
                  <TrashIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
