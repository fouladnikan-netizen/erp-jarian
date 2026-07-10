import { useMemo, useState } from 'react';
import ResizableColGroup from '../../../../../components/table/ResizableColGroup';
import ResizableTh from '../../../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../../../hooks/useResizableColumns';
import {
  getFulfilledPurchaseRows,
  getTajhizExpertNotes,
  isTajhizStageLive,
  issueShippingVoucher,
} from '../../../tajhizStageService';
import { printShippingVoucher } from '../../../shippingPrint';
import QcDocumentModal from './QcDocumentModal';
import ShippingModal from './ShippingModal';

const TAJHIZ_COLUMNS = [
  { key: 'row', label: 'ردیف', defaultWidth: 56, resizable: false },
  { key: 'name', label: 'شرح کالا', defaultWidth: 150 },
  { key: 'description', label: 'توضیحات کالا', defaultWidth: 180 },
  { key: 'qty', label: 'مقدار', defaultWidth: 72 },
  { key: 'unit', label: 'واحد', defaultWidth: 64 },
  { key: 'supplyType', label: 'نوع تامین', defaultWidth: 90 },
  { key: 'supplier', label: 'نام تامین‌کننده', defaultWidth: 140 },
  { key: 'warehouseVoucher', label: 'حواله انبار', defaultWidth: 120 },
  { key: 'warehouseAddress', label: 'آدرس انبار', defaultWidth: 200 },
];

export default function TajhizStagePanel({
  order,
  operationalViewPhase,
  onUpdateOrder,
  compact = false,
}) {
  const live = isTajhizStageLive(order, operationalViewPhase);
  const rows = useMemo(() => getFulfilledPurchaseRows(order), [order]);
  const expertNotes = useMemo(() => getTajhizExpertNotes(order), [order]);
  const [qcOpen, setQcOpen] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const { widths, startResize } = useResizableColumns('nabz-tajhiz-purchases', TAJHIZ_COLUMNS);

  const handleGenerateShipping = (carrierId) => {
    const result = issueShippingVoucher(order, carrierId);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان صدور حواله باربری وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    setShippingOpen(false);
    printShippingVoucher(result.order, carrierId);
  };

  return (
    <section className={`tajhiz-stage${compact ? ' tajhiz-stage--compact' : ''}`}>
      <header className="tajhiz-stage__head">
        <div>
          <h2 className="tajhiz-stage__title">تجهیز — خریدهای انجام‌شده و باربری</h2>
          <p className="tajhiz-stage__subtitle">نمایش جامع حواله‌های خرید و صدور حواله باربری</p>
        </div>
        {order.tajhizShipping?.voucherNumber && (
          <span className="tajhiz-stage__issued-badge">
            آخرین حواله باربری:
            {' '}
            {order.tajhizShipping.voucherNumber}
          </span>
        )}
      </header>

      <div className="tajhiz-stage__table-wrap">
        <table className="tajhiz-stage__table data-table--resizable">
          <ResizableColGroup columns={TAJHIZ_COLUMNS} widths={widths} />
          <thead>
            <tr>
              {TAJHIZ_COLUMNS.map((col) => (
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={TAJHIZ_COLUMNS.length} className="tajhiz-stage__empty">
                  خرید تکمیل‌شده‌ای ثبت نشده است.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.rowNumber}>
                  <td>{row.rowNumber.toLocaleString('fa-IR')}</td>
                  <td>{row.name}</td>
                  <td>{row.description}</td>
                  <td>{row.qty.toLocaleString('fa-IR')}</td>
                  <td>{row.unit}</td>
                  <td>{row.supplyType}</td>
                  <td>{row.supplierName}</td>
                  <td>{row.warehouseVoucherCode}</td>
                  <td>{row.warehouseAddress}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="tajhiz-stage__expert-notes">
        <span className="tajhiz-stage__expert-label">توضیحات کارشناس</span>
        <p>{expertNotes || 'توضیحی ثبت نشده است.'}</p>
      </div>

      <footer className="tajhiz-stage__actions">
        <button
          type="button"
          className="btn btn--outline"
          onClick={() => setQcOpen(true)}
        >
          فرم کنترل کیفیت
        </button>
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => setShippingOpen(true)}
          disabled={!live}
        >
          حواله باربری
        </button>
      </footer>

      {!live && (
        <p className="tajhiz-stage__readonly-hint">
          نمایش تاریخچه مرحله تجهیز — صدور اسناد فقط در مرحله فعال جاری مجاز است.
        </p>
      )}

      <QcDocumentModal open={qcOpen} order={order} onClose={() => setQcOpen(false)} />
      <ShippingModal
        open={shippingOpen}
        order={order}
        onClose={() => setShippingOpen(false)}
        onGenerate={handleGenerateShipping}
      />
    </section>
  );
}
