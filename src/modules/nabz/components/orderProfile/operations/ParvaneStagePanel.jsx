import { useMemo, useState } from 'react';
import { formatJarianMoney } from '../../../../../config/JarianUI.config';
import { JarianMoney } from '../../../../../components/jarian/JarianPresentation';
import { calculateQuotingPreview, getOrderQuoting, updateOrderQuoting } from '../../../inquiryService';
import { canViewSupplierIdentity, DEFAULT_SALE_TYPE } from '../../../constants';
import { canEditProfitMargin } from '../../../orderEditPermissions';
import { getGatewayDecision } from '../../../gatewayDecisionService';
import { getOrderOperationalPhase } from '../../../phase2Service';
import {
  getParvaneOrderTotal,
  getParvanePredictedProfit,
  isParvaneStageLive,
  issueParvaneSupplyPermit,
  returnParvaneToPishkesh,
} from '../../../parvaneStageService';
import QuotingOrderTable from '../../QuotingOrderTable';

function formatProfitPercent(profit, total) {
  if (!total || total <= 0) return '۰';
  const pct = (profit / total) * 100;
  return pct.toLocaleString('fa-IR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

function buildPaymentTermsRows(decision) {
  if (!decision?.paymentType) return [];
  const terms = decision.paymentTerms || {};
  const rows = [
    { label: 'نوع پرداخت', value: decision.paymentType },
  ];
  if (terms.dueDate) rows.push({ label: 'تاریخ سررسید', value: terms.dueDate });
  if (terms.lcMonths) rows.push({ label: 'تعداد ماه LC', value: terms.lcMonths });
  if (terms.daysAfterDelivery != null && terms.daysAfterDelivery !== '') {
    rows.push({ label: 'روز پس از تحویل', value: String(terms.daysAfterDelivery) });
  }
  if (terms.partialAmount) {
    rows.push({
      label: 'مبلغ علی‌الحساب',
      value: formatJarianMoney(terms.partialAmount, { withCurrency: true }),
    });
  }
  if (terms.document?.name) {
    rows.push({ label: 'سند پیوست', value: terms.document.name });
  }
  if (decision.financeNotes?.trim()) {
    rows.push({ label: 'توضیحات مالی', value: decision.financeNotes.trim() });
  }
  if (decision.decidedAt) {
    rows.push({ label: 'زمان ثبت', value: decision.decidedAt });
  }
  if (decision.decidedBy) {
    rows.push({ label: 'ثبت‌کننده', value: decision.decidedBy });
  }
  return rows;
}

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
  const orderTotal = getParvaneOrderTotal(order);
  const predictedProfit = getParvanePredictedProfit(order);
  const profitPercentLabel = formatProfitPercent(predictedProfit, orderTotal);
  const preview = useMemo(() => calculateQuotingPreview(order), [order]);
  const quoting = getOrderQuoting(order);
  const saleType = preview.saleType || order.saleType || DEFAULT_SALE_TYPE;
  const showSupplier = canViewSupplierIdentity();
  const isOfficialSale = saleType === 'رسمی';
  const canToggleVat = canEditProfitMargin() && isOfficialSale;
  const statusLabel = live ? 'آماده تأمین' : 'تأمین صادر شده';
  const decision = getGatewayDecision(order);
  const paymentRows = useMemo(() => buildPaymentTermsRows(decision), [decision]);

  const handleVatInclusiveChange = (next) => {
    if (!canToggleVat) return;
    onUpdateOrder?.((current) => updateOrderQuoting(current, { vatInclusive: next }));
  };

  const handleIssuePermit = () => {
    const result = issueParvaneSupplyPermit(order, driverNotes);
    if (!result.accepted) {
      window.alert(result.reason || 'امکان صدور دستور خرید وجود ندارد.');
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
        <h2 className="parvane-stage__title">ماشه تأمین</h2>
      </header>

      <div className="parvane-stage__ribbon" role="region" aria-label="خلاصه مالی ماشه تأمین">
        <div className="parvane-stage__ribbon-start">
          <span className={`parvane-stage__status${live ? ' is-ready' : ' is-done'}`}>
            وضعیت: {statusLabel}
          </span>
          <span className="parvane-stage__ribbon-divider" aria-hidden="true" />
          <div className="parvane-stage__ribbon-total">
            <span className="parvane-stage__summary-label">مبلغ کل سفارش</span>
            <strong className="parvane-stage__summary-amount">
              <JarianMoney amount={orderTotal} emphasis withCurrency />
            </strong>
          </div>
        </div>

        <div className="parvane-stage__profit-chip">
          <span className="parvane-stage__profit-label">سود پیش‌بینی‌شده:</span>
          <strong className="parvane-stage__profit-value">
            <JarianMoney amount={predictedProfit} emphasis withCurrency />
            {' '}
            <span className="parvane-stage__profit-pct">({profitPercentLabel}٪)</span>
          </strong>
        </div>

        {live ? (
          <button
            type="button"
            className="btn btn--primary nabz-cta parvane-stage__ribbon-cta"
            onClick={handleIssuePermit}
          >
            تأیید و صدور دستور خرید
          </button>
        ) : (
          <span className="parvane-stage__ribbon-spacer" aria-hidden="true" />
        )}
      </div>

      <QuotingOrderTable
        order={order}
        preview={preview}
        lineMarginMode={quoting.marginMode}
        showSupplier={showSupplier}
        saleType={saleType}
        storageKey="nabz-parvane-quoting-table"
        showVatToggle={isOfficialSale}
        vatToggleDisabled={!canToggleVat}
        onVatInclusiveChange={handleVatInclusiveChange}
      />

      {paymentRows.length > 0 && (
        <section className="parvane-stage__payment-terms" aria-label="شرایط پرداخت ثبت‌شده">
          <h3 className="parvane-stage__payment-terms-title">شرایط پرداخت (ثبت هنگام تأیید سفارش)</h3>
          <dl className="parvane-stage__payment-terms-list">
            {paymentRows.map((row) => (
              <div key={row.label} className="parvane-stage__payment-terms-row">
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {live ? (
        <footer className="parvane-stage__actions">
          <label className="parvane-stage__notes">
            <span>دستور راهبر / ملاحظات تأمین</span>
            <textarea
              className="parvane-stage__textarea"
              rows={2}
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
              placeholder="توضیح کوتاه برای تدارک (اختیاری)..."
            />
          </label>
          <div className="parvane-stage__buttons">
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
          نمایش تاریخچه ماشه تأمین — اقدام فقط در مرحله فعال جاری مجاز است.
        </p>
      )}
    </section>
  );
}
