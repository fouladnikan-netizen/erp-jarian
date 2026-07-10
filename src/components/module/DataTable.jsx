import StatusTag from './StatusTag';

function TableRow({ row }) {
  return (
    <tr data-id={row.id}>
      {row.cells.map((cell, index) => (
        <td key={index}>
          {cell.startsWith('tag:') ? <StatusTag value={cell} /> : cell}
        </td>
      ))}
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
      <td colSpan={data.columns.length + 1}>
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
        <table className="data-table">
          <thead>
            <tr>
              {data.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
              <th>عملیات</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length > 0
              ? data.rows.map((row) => (
                  <TableRow key={row.id} row={row} />
                ))
              : <EmptyState data={data} />}
          </tbody>
        </table>
      </div>
    </section>
  );
}
