import StatusTag from './StatusTag';

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
      <td className="jarian-td-row">{rowNumber.toLocaleString('fa-IR')}</td>
      {row.cells.map((cell, index) => {
        const moneyCol = isMoneyColumn(columns[index]);
        return (
          <td
            key={index}
            className={moneyCol ? 'jarian-td-money' : undefined}
          >
            {cell.startsWith('tag:') ? (
              <StatusTag value={cell} />
            ) : moneyCol ? (
              <span className="jarian-money font-vazir">{stripRialSuffix(cell)}</span>
            ) : (
              cell
            )}
          </td>
        );
      })}
      <td>
        <div className="data-table__actions">
          <button type="button">نمایش</button>
          <button type="button">ویرایش</button>
        </div>
      </td>
    </tr>
  );
}

function EmptyState({ data }) {
  return (
    <tr>
      <td colSpan={data.columns.length + 2}>
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <p>هنوز رکوردی ثبت نشده است.</p>
          <button type="button" className="btn btn--primary">
            {data.primaryAction}
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function DataTable({ data }) {
  return (
    <section className="section-data" aria-label="فهرست داده">
      <div className="data-table-header">
        <span className="data-table-header__title">{data.tableTitle}</span>
        <span className="data-table-header__count">
          {data.rows.length.toLocaleString('fa-IR')} رکورد
        </span>
      </div>
      <div className="data-table-wrap">
        <table className="data-table jarian-table">
          <thead>
            <tr>
              <th>ردیف</th>
              {data.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
              <th>عملیات</th>
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
              : <EmptyState data={data} />}
          </tbody>
        </table>
      </div>
    </section>
  );
}
