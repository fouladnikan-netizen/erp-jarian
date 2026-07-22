import { useState } from 'react';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../hooks/useResizableColumns';

const CREATE_LINE_COLUMNS = [
  { key: 'drag', defaultWidth: 36, resizable: false },
  { key: 'name', defaultWidth: 150 },
  { key: 'size', defaultWidth: 100 },
  { key: 'preferredMill', defaultWidth: 130 },
  { key: 'qty', defaultWidth: 78 },
  { key: 'weight', defaultWidth: 110 },
  { key: 'unit', defaultWidth: 64, resizable: false },
  { key: 'remove', defaultWidth: 40, resizable: false },
];

const COLUMN_LABELS = {
  drag: '',
  name: 'نوع محصول',
  size: 'سایز',
  preferredMill: 'کارخانه ترجیحی',
  qty: 'مقدار',
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
  const { widths, startResize } = useResizableColumns('nabz-create-line-items-v2', CREATE_LINE_COLUMNS);

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
    <div className="nabz-create-table-wrap nabz-create-table-wrap--premium">
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
                }${col.key === 'remove' ? ' nabz-create-table__remove-col' : ''}`}
              >
                <span className="font-meem">{COLUMN_LABELS[col.key]}</span>
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
              <td className="nabz-create-table__name font-meem">{item.name}</td>
              <td>
                <input
                  type="text"
                  className="nabz-create-table__input font-yekan"
                  value={item.size || ''}
                  onChange={(e) => updateLine(item.lineId, 'size', e.target.value)}
                  placeholder="سایز"
                />
              </td>
              <td>
                <input
                  type="text"
                  className="nabz-create-table__input font-meem"
                  value={item.preferredMill || ''}
                  onChange={(e) => updateLine(item.lineId, 'preferredMill', e.target.value)}
                  placeholder="کارخانه"
                />
              </td>
              <td>
                <input
                  type="number"
                  min="1"
                  className="nabz-create-table__input nabz-create-table__input--qty font-yekan"
                  value={item.qty}
                  onChange={(e) => updateLine(item.lineId, 'qty', Number(e.target.value))}
                />
              </td>
              <td>
                <input
                  type="text"
                  className="nabz-create-table__input font-yekan"
                  value={item.weight || ''}
                  onChange={(e) => updateLine(item.lineId, 'weight', e.target.value)}
                  placeholder="وزن"
                />
              </td>
              <td className="font-meem">{item.unit}</td>
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
