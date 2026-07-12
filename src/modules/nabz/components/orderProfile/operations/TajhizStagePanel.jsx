import { useMemo, useRef, useState } from 'react';
import ResizableColGroup from '../../../../../components/table/ResizableColGroup';
import ResizableTh from '../../../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../../../hooks/useResizableColumns';
import {
  getFulfilledPurchaseRows,
  getTajhizExpertNotes,
  isTajhizStageLive,
  issueShippingVoucher,
} from '../../../tajhizStageService';
import {
  getQcInspectionForRow,
  getQcRowKey,
  getQcStatusMeta,
  isOrderQcComplete,
} from '../../../qcInspectionConfig';
import { OPERATIONAL_PHASES } from '../../../phase2Config';
import { advanceOperationalPhase, getOrderOperationalPhase } from '../../../phase2Service';
import { printShippingVoucher } from '../../../shippingPrint';
import QcDocumentModal from './QcDocumentModal';
import ShippingModal from './ShippingModal';

const TAJHIZ_COLUMNS = [
  { key: 'row', label: 'ردیف', defaultWidth: 56, resizable: false },
  { key: 'name', label: 'شرح کالا', defaultWidth: 140 },
  { key: 'description', label: 'توضیحات کالا', defaultWidth: 160 },
  { key: 'qcStatus', label: 'وضعیت کیفی', defaultWidth: 120 },
  { key: 'qty', label: 'مقدار', defaultWidth: 72 },
  { key: 'unit', label: 'واحد', defaultWidth: 64 },
  { key: 'supplyType', label: 'نوع تامین', defaultWidth: 90 },
  { key: 'supplier', label: 'نام تامین‌کننده', defaultWidth: 140 },
  { key: 'warehouseVoucher', label: 'حواله انبار', defaultWidth: 120 },
  { key: 'warehouseAddress', label: 'آدرس انبار', defaultWidth: 180 },
];

const QC_SOFT_GATE_MESSAGE = '⚠️ بازرسی کیفی تکمیل نشده است. عملیات بارگیری هم‌زمان آغاز شد.';

function QcStatusCell({ record, onOpen }) {
  if (!record?.itemStatus) {
    return <span className="qc-status qc-status--pending">در انتظار بازرسی</span>;
  }

  const meta = getQcStatusMeta(record.itemStatus);
  if (!meta) {
    return <span className="qc-status qc-status--pending">در انتظار بازرسی</span>;
  }

  return (
    <button
      type="button"
      className={`qc-status-badge qc-status-badge--${meta.tone}`}
      onClick={onOpen}
      title="مشاهده جزئیات کنترل کیفیت"
    >
      {meta.label}
    </button>
  );
}

export default function TajhizStagePanel({
  order,
  operationalViewPhase,
  onUpdateOrder,
  onOperationalPhaseChange,
  compact = false,
}) {
  const live = isTajhizStageLive(order, operationalViewPhase);
  const rows = useMemo(() => getFulfilledPurchaseRows(order), [order]);
  const expertNotes = useMemo(() => getTajhizExpertNotes(order), [order]);
  const isQcComplete = useMemo(() => isOrderQcComplete(order, rows), [order, rows]);
  const [qcOpen, setQcOpen] = useState(false);
  const [qcMode, setQcMode] = useState('inspect');
  const [qcFocusRowKey, setQcFocusRowKey] = useState(null);
  const [qcInitialRecord, setQcInitialRecord] = useState(null);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [toast, setToast] = useState('');
  const toastTimerRef = useRef(null);
  const { widths, startResize } = useResizableColumns('nabz-tajhiz-purchases-v2', TAJHIZ_COLUMNS);

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 3200);
  };

  const openInspectDrawer = () => {
    setQcMode('inspect');
    setQcFocusRowKey(null);
    setQcInitialRecord(null);
    setQcOpen(true);
  };

  const openReadonlyDrawer = (row) => {
    const record = getQcInspectionForRow(order, row);
    if (!record) return;
    setQcMode('readonly');
    setQcFocusRowKey(getQcRowKey(row));
    setQcInitialRecord(record);
    setQcOpen(true);
  };

  const closeQcDrawer = () => {
    setQcOpen(false);
    setQcMode('inspect');
    setQcFocusRowKey(null);
    setQcInitialRecord(null);
  };

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

  /** Soft gate: always advances to رهسپار; warns if QC incomplete, then continues. */
  const handleAdvanceToRahsepar = () => {
    if (!isQcComplete) {
      showToast(QC_SOFT_GATE_MESSAGE);
    }

    const result = advanceOperationalPhase(order, OPERATIONAL_PHASES.RAHESPAR);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان انتقال به رهسپار وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    onOperationalPhaseChange?.(getOrderOperationalPhase(result.order));
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
                  style={{ width: widths[col.key] }}
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
              rows.map((row) => {
                const qcRecord = getQcInspectionForRow(order, row);
                return (
                  <tr key={getQcRowKey(row)}>
                    <td>{row.rowNumber.toLocaleString('fa-IR')}</td>
                    <td>{row.name}</td>
                    <td>{row.description}</td>
                    <td>
                      <QcStatusCell
                        record={qcRecord}
                        onOpen={() => openReadonlyDrawer(row)}
                      />
                    </td>
                    <td>{row.qty.toLocaleString('fa-IR')}</td>
                    <td>{row.unit}</td>
                    <td>{row.supplyType}</td>
                    <td>{row.supplierName}</td>
                    <td>{row.warehouseVoucherCode}</td>
                    <td>{row.warehouseAddress}</td>
                  </tr>
                );
              })
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
          onClick={openInspectDrawer}
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

      <div className="tajhiz-stage__transition">
        <button
          type="button"
          className="tajhiz-stage__advance-btn"
          onClick={handleAdvanceToRahsepar}
        >
          صدور مجوز بارگیری (انتقال به رهسپار)
        </button>
      </div>

      {toast && (
        <div className="tajhiz-stage__toast" role="status">
          {toast}
        </div>
      )}

      {!live && (
        <p className="tajhiz-stage__readonly-hint">
          نمایش تاریخچه مرحله تجهیز — صدور اسناد فقط در مرحله فعال جاری مجاز است.
        </p>
      )}

      <QcDocumentModal
        open={qcOpen}
        order={order}
        onClose={closeQcDrawer}
        onUpdateOrder={onUpdateOrder}
        mode={qcMode}
        focusRowKey={qcFocusRowKey}
        initialRecord={qcInitialRecord}
      />
      <ShippingModal
        open={shippingOpen}
        order={order}
        onClose={() => setShippingOpen(false)}
        onGenerate={handleGenerateShipping}
      />
    </section>
  );
}
