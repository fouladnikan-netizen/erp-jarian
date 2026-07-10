import { useState } from 'react';
import ResizableColGroup from '../../../../../components/table/ResizableColGroup';
import ResizableTh from '../../../../../components/table/ResizableTh';
import { useResizableColumns } from '../../../../../hooks/useResizableColumns';
import { formatAmountRial } from '../../../orderCode';
import { getOrderOperationalPhase } from '../../../phase2Service';
import {
  getParvaneCreditStatus,
  getParvaneItemsRows,
  getParvaneOrderTotal,
  getParvanePaymentBadge,
  isParvaneStageLive,
  issueParvaneSupplyPermit,
  returnParvaneToPishkesh,
} from '../../../parvaneStageService';

const PARVANE_COLUMNS = [
  { key: 'name', label: 'نام مقطع فولادی', defaultWidth: 180 },
  { key: 'specs', label: 'مشخصات فنی', defaultWidth: 200 },
  { key: 'qty', label: 'مقدار', defaultWidth: 100 },
  { key: 'supplier', label: 'تامین‌کننده پیشنهادی', defaultWidth: 160 },
];

export default function ParvaneStagePanel({
  order,
  operationalViewPhase,
  onUpdateOrder,
  onOperationalPhaseChange,
  onReturnToGateway,
  compact = false,
}) {
  const [driverNotes, setDriverNotes] = useState(order.parvaneDriverNotes || '');
  const live = isParvaneStageLive(order, operationalViewPhase);
  const paymentBadge = getParvanePaymentBadge(order);
  const creditStatus = getParvaneCreditStatus(order);
  const orderTotal = getParvaneOrderTotal(order);
  const items = getParvaneItemsRows(order);
  const { widths, startResize } = useResizableColumns('nabz-parvane-items', PARVANE_COLUMNS);

  const handleIssuePermit = () => {
    const result = issueParvaneSupplyPermit(order, driverNotes);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان صدور پروانه وجود ندارد.');
      return;
    }
    onUpdateOrder?.(() => result.order);
    onOperationalPhaseChange?.(getOrderOperationalPhase(result.order));
  };

  const handleReturn = () => {
    if (!window.confirm('سفارش به مرحله پیش‌کش بازگردانده شود؟')) return;
    const result = returnParvaneToPishkesh(order, driverNotes);
    if (!result.accepted) return;
    onUpdateOrder?.(() => result.order);
    onReturnToGateway?.();
  };

  return (
    <section className={`parvane-stage${compact ? ' parvane-stage--compact' : ''}`}>
      <header className="parvane-stage__head">
        <h2 className="parvane-stage__title">پروانه — بررسی و صدور مجوز تأمین</h2>
        <p className="parvane-stage__subtitle">خلاصه وضعیت برای تصمیم راهبر</p>
      </header>

      <div className="parvane-stage__summary">
        <div className="parvane-stage__summary-main">
          <span className="parvane-stage__summary-label">مبلغ کل سفارش</span>
          <strong className="parvane-stage__summary-amount">
            {formatAmountRial(orderTotal)}
            {' '}
            <span>ریال</span>
          </strong>
        </div>
        <div className="parvane-stage__summary-badges">
          <span className={`parvane-stage__badge parvane-stage__badge--${paymentBadge.kind}`}>
            {paymentBadge.label}
          </span>
          <span className={`parvane-stage__badge parvane-stage__badge--${creditStatus.kind}`}>
            {creditStatus.label}
          </span>
        </div>
      </div>

      <div className="parvane-stage__table-wrap">
        <table className="parvane-stage__table data-table--resizable">
          <ResizableColGroup columns={PARVANE_COLUMNS} widths={widths} />
          <thead>
            <tr>
              {PARVANE_COLUMNS.map((col) => (
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
            {items.length === 0 ? (
              <tr>
                <td colSpan={PARVANE_COLUMNS.length} className="parvane-stage__empty">
                  قلمی ثبت نشده است.
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.specs}</td>
                  <td>{row.qty}</td>
                  <td>{row.supplier}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {live ? (
        <footer className="parvane-stage__actions">
          <label className="parvane-stage__notes">
            <span>دستور راهبر / ملاحظات تأمین</span>
            <textarea
              className="parvane-stage__textarea"
              rows={2}
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
              placeholder="توضیح کوتاه برای کاشف (اختیاری)..."
            />
          </label>
          <div className="parvane-stage__buttons">
            <button
              type="button"
              className="btn btn--primary parvane-stage__btn-primary"
              onClick={handleIssuePermit}
            >
              صدور پروانه تأمین و ارجاع به کاشف
            </button>
            <button
              type="button"
              className="btn btn--outline parvane-stage__btn-secondary"
              onClick={handleReturn}
            >
              عدم تایید / عودت به پیش‌کش
            </button>
          </div>
        </footer>
      ) : (
        <p className="parvane-stage__readonly-hint">
          نمایش تاریخچه مرحله پروانه — اقدام فقط در مرحله فعال جاری مجاز است.
        </p>
      )}
    </section>
  );
}
