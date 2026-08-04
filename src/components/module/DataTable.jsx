import { useMemo } from 'react';
import StatusTag from './StatusTag';
import ResizableColGroup from '../table/ResizableColGroup';
import ResizableTh from '../table/ResizableTh';
import { useResizableColumns } from '../../hooks/useResizableColumns';

function isMoneyColumn(columnLabel = '') {
  return /ریال|مبلغ|ارزش|قیمت/.test(columnLabel);
}

/** سلول جدول: بدون پسوند ریال */
function stripRialSuffix(value) {
  const text = String(value ?? '').trim();
  if (!text || text === '—') return text;
  return text.replace(/\s*ریال\s*$/u, '').trim();
}

function TableRow({ row, columns, rowNumber }) {
  return (
    <tr data-id={row.id}>
      <td className="jarian-td-row font-yekan">{rowNumber.toLocaleString('fa-IR')}</td>
      {row.cells.map((cell, index) => {
        const moneyCol = isMoneyColumn(columns[index]);
        return (
          <td
            key={index}
            className={moneyCol ? 'jarian-td-money' : undefined}
          >
            {String(cell).startsWith('tag:') ? (
              <StatusTag value={cell} />
            ) : moneyCol ? (
              <span className="jarian-money font-vazir">{stripRialSuffix(cell)}</span>
            ) : (
              <span className="font-meem">{cell}</span>
            )}
          </td>
        );
      })}
      <td>
        <div className="data-table__actions">
          <button type="button" className="font-meem">نمایش</button>
          <button type="button" className="font-meem">ویرایش</button>
        </div>
      </td>
    </tr>
  );
}

function EmptyState({ data, colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <div className="empty-state">
          <p className="font-meem">هنوز رکوردی ثبت نشده است.</p>
          <button type="button" className="btn btn--primary font-meem">
            {data.primaryAction}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function DataTable({ data }) {
  const columnDefs = useMemo(() => [
    { key: 'row', defaultWidth: 56, resizable: false },
    ...data.columns.map((column, index) => ({
      key: `col-${index}`,
      defaultWidth: isMoneyColumn(column) ? 120 : 140,
    })),
    { key: 'actions', defaultWidth: 120, resizable: false },
  ], [data.columns]);

  const storageKey = `module-table-${data.tableTitle || 'generic'}`;
  const { widths, startResize } = useResizableColumns(storageKey, columnDefs);

  return (
    <section className="section-data" aria-label="فهرست داده">
      <div className="data-table-header">
        <span className="data-table-header__title font-meem">{data.tableTitle}</span>
      </div>
      <div className="data-table-wrap">
        <table className="data-table jarian-table data-table--resizable">
          <ResizableColGroup columns={columnDefs} widths={widths} />
          <thead>
            <tr>
              {columnDefs.map((col, index) => (
                <ResizableTh
                  key={col.key}
                  columnKey={col.key}
                  resizable={col.resizable !== false}
                  onResizeStart={startResize}
                  className="font-meem"
                >
                  {col.key === 'row'
                    ? 'ردیف'
                    : col.key === 'actions'
                      ? 'عملیات'
                      : data.columns[index - 1]}
                </ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.length > 0
              ? data.rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    row={row}
                    columns={data.columns}
                    rowNumber={index + 1}
                  />
                ))
              : <EmptyState data={data} colSpan={columnDefs.length} />}
          </tbody>
        </table>
      </div>
    </section>
  );
}
