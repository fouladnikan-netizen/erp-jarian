import { useState } from 'react';
import TruncatedText from './TruncatedText';
import ResizableColGroup from '../../../components/table/ResizableColGroup';
import ResizableTh from '../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../hooks/useResizableColumns';

const CREATE_LINE_COLUMNS = [
  { key: 'drag', defaultWidth: 36, resizable: false },
  { key: 'row', defaultWidth: 48, resizable: false },
  { key: 'name', defaultWidth: 300 },
  { key: 'qty', defaultWidth: 88 },
  { key: 'unit', defaultWidth: 72, resizable: false },
  { key: 'remove', defaultWidth: 40, resizable: false },
];

const COLUMN_LABELS = {
  drag: '',
  row: 'ردیف',
  name: 'شرح کالا',
  qty: 'مقدار',
  unit: 'واحد',
  remove: '',
};

function DragHandle({ onDragStart, onDragEnd }) {
  return (
    <button
      type="button"
      className="nabz-create-table__drag-handle"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label="جابجایی سطر"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="9" cy="7" r="1.5" />
        <circle cx="15" cy="7" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="17" r="1.5" />
        <circle cx="15" cy="17" r="1.5" />
      </svg>
    </button>
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
  const { widths, startResize } = useResizableColumns('nabz-create-line-items-v5', CREATE_LINE_COLUMNS);

  const updateLine = (lineId, key, value) => {
    onChange(items.map((item) => (item.lineId === lineId ? { ...item, [key]: value } : item)));
  };

  const finishDrag = (fromIndex, toIndex) => {
    if (fromIndex == null || toIndex == null || fromIndex === toIndex) return;
    onChange(reorderItems(items, fromIndex, toIndex));
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragStart = (index) => (event) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const handleDragOver = (index) => (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (overIndex !== index) setOverIndex(index);
  };

  const handleDrop = (index) => (event) => {
    event.preventDefault();
    const fromRaw = event.dataTransfer.getData('text/plain');
    const fromIndex = fromRaw !== '' ? Number(fromRaw) : dragIndex;
    finishDrag(fromIndex, index);
  };

  return (
    <div className="nabz-create-table-wrap nabz-create-table-wrap--premium">
      <table className="nabz-create-table jarian-table data-table--resizable">
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
              onDragOver={handleDragOver(index)}
              onDrop={handleDrop(index)}
            >
              <td className="nabz-create-table__drag-cell">
                <DragHandle
                  onDragStart={handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                />
              </td>
              <td className="jarian-td-row">{(index + 1).toLocaleString('fa-IR')}</td>
              <td className="nabz-create-table__name jarian-td-product">
                <div className="jarian-product-cell">
                  <span className="jarian-product-name">
                    <TruncatedText text={item.name} empty="—" />
                  </span>
                  <input
                    type="text"
                    className="nabz-create-table__input jarian-product-desc"
                    value={item.description || ''}
                    onChange={(e) => updateLine(item.lineId, 'description', e.target.value)}
                    placeholder="توضیحات"
                    title={item.description || undefined}
                    aria-label="توضیحات کالا"
                  />
                </div>
              </td>
              <td>
                <input
                  type="number"
                  min="1"
                  className="nabz-create-table__input nabz-create-table__input--qty font-vazir"
                  value={item.qty}
                  onChange={(e) => updateLine(item.lineId, 'qty', Number(e.target.value))}
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
