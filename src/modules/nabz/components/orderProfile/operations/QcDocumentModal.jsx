import { useMemo } from 'react';
import ResizableColGroup from '../../../../../components/table/ResizableColGroup';
import ResizableTh from '../../../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../../../hooks/useResizableColumns';
import { QC_CHECKLIST_ITEMS } from '../../../tajhizStageConfig';
import { getFulfilledPurchaseRows } from '../../../tajhizStageService';

const QC_COLUMNS = [
  { key: 'row', label: 'ردیف', defaultWidth: 56, resizable: false },
  { key: 'name', label: 'شرح کالا', defaultWidth: 180 },
  { key: 'qty', label: 'مقدار', defaultWidth: 80 },
  { key: 'unit', label: 'واحد', defaultWidth: 64 },
  { key: 'supplier', label: 'تامین‌کننده', defaultWidth: 150 },
];

export default function QcDocumentModal({ open, order, onClose }) {
  const rows = useMemo(
    () => (order ? getFulfilledPurchaseRows(order) : []),
    [order],
  );
  const { widths, startResize } = useResizableColumns('nabz-tajhiz-qc', QC_COLUMNS);

  if (!open || !order) return null;

  return (
    <div className="tadarok-modal" role="presentation">
      <button type="button" className="tadarok-modal__backdrop" aria-label="بستن" onClick={onClose} />
      <div className="tadarok-modal__panel" role="dialog" aria-modal="true" aria-labelledby="qc-modal-title">
        <header className="tadarok-modal__header">
          <div>
            <h2 id="qc-modal-title" className="tadarok-modal__title">فرم کنترل کیفیت</h2>
            <p className="tadarok-modal__subtitle">
              سفارش
              {' '}
              {order.code}
            </p>
          </div>
          <button type="button" className="tadarok-modal__close" onClick={onClose} aria-label="بستن">×</button>
        </header>

        <div className="tadarok-modal__form qc-doc">
          <div className="tajhiz-stage__table-wrap">
            <table className="tajhiz-stage__table data-table--resizable">
              <ResizableColGroup columns={QC_COLUMNS} widths={widths} />
              <thead>
                <tr>
                  {QC_COLUMNS.map((col) => (
                    <ResizableTh
                      key={col.key}
                      columnKey={col.key}
                      resizable={col.resizable !== false}
                      onResizeStart={startResize}
                    >
                      {col.label}
                    </ResizableTh>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber.toLocaleString('fa-IR')}</td>
                    <td>{row.name}</td>
                    <td>{row.qty.toLocaleString('fa-IR')}</td>
                    <td>{row.unit}</td>
                    <td>{row.supplierName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="qc-doc__checklist">
            <h3>چک‌لیست کنترل کیفیت</h3>
            <ul>
              {QC_CHECKLIST_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <footer className="tadarok-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>بستن</button>
            <button type="button" className="btn btn--primary" onClick={() => window.print()}>چاپ فرم</button>
          </footer>
        </div>
      </div>
    </div>
  );
}
