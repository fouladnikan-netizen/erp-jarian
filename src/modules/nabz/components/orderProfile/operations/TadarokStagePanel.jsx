import { useMemo, useState } from 'react';
import ResizableColGroup from '../../../../../components/table/ResizableColGroup';
import ResizableTh from '../../../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../../../hooks/useResizableColumns';
import { DEFAULT_SALE_TYPE } from '../../../constants';
import { formatAmountRial } from '../../../orderCode';
import { canEditProfitMargin } from '../../../orderEditPermissions';
import { getOrderOperationalPhase } from '../../../phase2Service';
import { calculateQuotingPreview, updateOrderQuoting } from '../../../quotingService';
import { TADAROK_LINE_STATUS } from '../../../tadarokStageConfig';
import {
  completeTadarokProcurement,
  getDefaultSupplierIdForLine,
  getTadarokProcurementRows,
  getTadarokProgress,
  isTadarokStageLive,
  issuePurchaseOrder,
  splitTadarokLine,
  updatePurchaseOrder,
} from '../../../tadarokStageService';
import { SalePriceColumnHeader } from '../../quickInquiryParts';
import PurchaseOrderModal from './PurchaseOrderModal';
import SplitLineModal from './SplitLineModal';

const TADAROK_COLUMNS = [
  { key: 'row', label: 'ردیف', defaultWidth: 56, resizable: false },
  { key: 'name', label: 'شرح کالا', defaultWidth: 150 },
  { key: 'description', label: 'توضیحات کالا', defaultWidth: 180 },
  { key: 'qty', label: 'مقدار', defaultWidth: 80 },
  { key: 'unit', label: 'واحد', defaultWidth: 64 },
  { key: 'salePrice', label: 'قیمت فروش', defaultWidth: 160 },
  { key: 'estimatedPrice', label: 'قیمت تأمین', defaultWidth: 160 },
  { key: 'status', label: 'وضعیت', defaultWidth: 120 },
  { key: 'actions', label: 'عملیات', defaultWidth: 96, resizable: false },
];

function SplitRowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="nabz-action-icon"
      aria-hidden="true"
    >
      <path d="M6 3v12" />
      <path d="M18 3v12" />
      <path d="M6 15l4 4" />
      <path d="M6 15l-4 4" />
      <path d="M18 15l4 4" />
      <path d="M18 15l-4 4" />
      <path d="M6 3h12" />
    </svg>
  );
}

function PurchaseOrderIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="nabz-action-icon"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M12 18v-6" />
      <path d="M9 15h6" />
    </svg>
  );
}

function ViewPurchaseOrderIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="nabz-action-icon"
      aria-hidden="true"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function formatSupplyPrice(amount, supplierName) {
  if (!amount) return '—';
  const name = supplierName?.trim() || '—';
  return `${formatAmountRial(amount)} ${name}`;
}

export default function TadarokStagePanel({
  order,
  operationalViewPhase,
  onUpdateOrder,
  onOperationalPhaseChange,
  compact = false,
}) {
  const live = isTadarokStageLive(order, operationalViewPhase);
  const rows = useMemo(() => getTadarokProcurementRows(order), [order]);
  const progress = useMemo(() => getTadarokProgress(order), [order]);
  const preview = useMemo(() => calculateQuotingPreview(order), [order]);
  const saleType = preview.saleType || order.saleType || DEFAULT_SALE_TYPE;
  const isOfficialSale = saleType === 'رسمی';
  const vatInclusive = Boolean(preview.vatInclusive);
  const canToggleVat = canEditProfitMargin() && isOfficialSale;
  const [splitLine, setSplitLine] = useState(null);
  const [poModal, setPoModal] = useState({ open: false, line: null, mode: 'create' });
  const { widths, startResize } = useResizableColumns('nabz-tadarok-lines-v4', TADAROK_COLUMNS);

  const handleVatInclusiveChange = (next) => {
    if (!canToggleVat) return;
    onUpdateOrder?.((current) => updateOrderQuoting(current, { vatInclusive: next }));
  };

  const handleSplitSubmit = (quantities) => {
    const result = splitTadarokLine(order, splitLine.id, quantities);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان تفکیک وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    setSplitLine(null);
  };

  const openCreatePo = (row) => {
    setPoModal({ open: true, line: row, mode: 'create' });
  };

  const openViewPo = (row) => {
    setPoModal({ open: true, line: row, mode: 'edit' });
  };

  const closePoModal = () => {
    setPoModal({ open: false, line: null, mode: 'create' });
  };

  const handlePoSubmit = (draft) => {
    const result = poModal.mode === 'edit'
      ? updatePurchaseOrder(order, poModal.line.id, draft)
      : issuePurchaseOrder(order, poModal.line.id, draft);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان ذخیره سفارش خرید وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    closePoModal();
  };

  const handleComplete = () => {
    const result = completeTadarokProcurement(order);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان تکمیل تدارک وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    onOperationalPhaseChange?.(getOrderOperationalPhase(result.order));
  };

  return (
    <section className={`tadarok-stage${compact ? ' tadarok-stage--compact' : ''}`}>
      <header className="tadarok-stage__head">
        <div>
          <h2 className="tadarok-stage__title">تدارک — مدیریت خرید و صدور سفارش خرید</h2>
          <p className="tadarok-stage__subtitle">تفکیک اقلام و صدور سفارش خرید برای کاشف</p>
        </div>
        <div className="tadarok-stage__progress">
          <span className="tadarok-stage__progress-label">پیشرفت سفارش‌های خرید</span>
          <strong>
            {progress.issued.toLocaleString('fa-IR')}
            /
            {progress.total.toLocaleString('fa-IR')}
          </strong>
        </div>
      </header>

      {order.parvaneDriverNotes && (
        <p className="tadarok-stage__driver-notes">
          <span>دستور راهبر:</span>
          {order.parvaneDriverNotes}
        </p>
      )}

      <div className="tadarok-stage__table-wrap">
        <table className="tadarok-stage__table data-table--resizable">
          <ResizableColGroup columns={TADAROK_COLUMNS} widths={widths} />
          <thead>
            <tr>
              {TADAROK_COLUMNS.map((col) => (
                <ResizableTh
                  key={col.key}
                  columnKey={col.key}
                  resizable={col.resizable !== false}
                  onResizeStart={startResize}
                >
                  {col.key === 'salePrice' ? (
                    <SalePriceColumnHeader
                      saleType={saleType}
                      vatInclusive={vatInclusive}
                      showToggle={isOfficialSale}
                      disabled={!canToggleVat}
                      onChange={handleVatInclusiveChange}
                    />
                  ) : (
                    col.label
                  )}
                </ResizableTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={TADAROK_COLUMNS.length} className="tadarok-stage__empty">
                  قلمی برای تدارک ثبت نشده است.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={row.isSplitChild ? 'tadarok-stage__row--split' : undefined}
                >
                  <td>{row.rowNumber.toLocaleString('fa-IR')}</td>
                  <td>{row.name}</td>
                  <td>{row.description || '—'}</td>
                  <td>{row.qty.toLocaleString('fa-IR')}</td>
                  <td>{row.unit}</td>
                  <td>
                    {row.saleUnitPriceRial
                      ? formatAmountRial(row.saleUnitPriceRial)
                      : '—'}
                  </td>
                  <td>{formatSupplyPrice(row.supplyUnitPriceRial, row.supplySupplierName)}</td>
                  <td>
                    <span
                      className={`tadarok-stage__badge tadarok-stage__badge--${
                        row.status === TADAROK_LINE_STATUS.PO_ISSUED ? 'success' : 'pending'
                      }`}
                    >
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="nabz-table__actions-cell tadarok-stage__cell--center">
                    <div className="nabz-table__actions">
                      {live && row.canSplit && (
                        <button
                          type="button"
                          className="nabz-table__action-btn"
                          onClick={() => setSplitLine(row)}
                          aria-label="تفکیک سطر"
                          title="تفکیک"
                        >
                          <SplitRowIcon />
                        </button>
                      )}
                      {live && row.canIssuePo && (
                        <button
                          type="button"
                          className="nabz-table__action-btn nabz-table__action-btn--po"
                          onClick={() => openCreatePo(row)}
                          aria-label="صدور سفارش خرید"
                          title="صدور سفارش خرید"
                        >
                          <PurchaseOrderIcon />
                        </button>
                      )}
                      {row.status === TADAROK_LINE_STATUS.PO_ISSUED && (
                        <button
                          type="button"
                          className="nabz-table__action-btn nabz-table__action-btn--view-po"
                          onClick={() => openViewPo(row)}
                          title="مشاهده / ویرایش سفارش خرید"
                          aria-label="مشاهده و ویرایش سفارش خرید"
                        >
                          <ViewPurchaseOrderIcon />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {live && progress.allIssued && (
        <footer className="tadarok-stage__footer">
          <button
            type="button"
            className="btn btn--primary tadarok-stage__btn-complete"
            onClick={handleComplete}
          >
            تکمیل تدارک و ارجاع به تجهیز
          </button>
        </footer>
      )}

      {!live && (
        <p className="tadarok-stage__readonly-hint">
          نمایش تاریخچه مرحله تدارک — صدور سفارش خرید جدید فقط در مرحله فعال جاری مجاز است.
        </p>
      )}

      <SplitLineModal
        open={Boolean(splitLine)}
        line={splitLine}
        onClose={() => setSplitLine(null)}
        onSubmit={handleSplitSubmit}
      />

      <PurchaseOrderModal
        open={poModal.open}
        order={order}
        line={poModal.line}
        mode={poModal.mode}
        defaultSupplierId={
          poModal.line && poModal.mode === 'create'
            ? getDefaultSupplierIdForLine(order, poModal.line)
            : ''
        }
        onClose={closePoModal}
        onSubmit={handlePoSubmit}
      />
    </section>
  );
}
