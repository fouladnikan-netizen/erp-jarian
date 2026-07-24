import { useState } from 'react';
import {
  GATEWAY_CANCEL_REASONS,
  GATEWAY_DECISION_OUTCOMES,
  getCancelReasonLabel,
  getEmptyPaymentTerms,
  validatePaymentTerms,
} from '../../../gatewayDecisionConfig';
import {
  getGatewayDecision,
  hasGatewayDecision,
  isGatewayDecisionEditable,
} from '../../../gatewayDecisionService';
import { formatJarianMoney } from '../../../../../config/JarianUI.config';
import { pickRandomSalesQuote } from '../../../salesMotivationalQuotes';
import OrderProfileConfirmDialog from '../OrderProfileConfirmDialog';
import DealCelebrationModal from './DealCelebrationModal';
import GatewaySelect from './GatewaySelect';
import PaymentTermsForm from './PaymentTermsForm';

function formatPaymentTermsSummary(decision) {
  const terms = decision.paymentTerms || {};
  const lines = [`نوع پرداخت: ${decision.paymentType}`];
  if (terms.dueDate) lines.push(`تاریخ سررسید: ${terms.dueDate}`);
  if (terms.lcMonths) lines.push(`تعداد ماه LC: ${terms.lcMonths}`);
  if (terms.daysAfterDelivery != null && terms.daysAfterDelivery !== '') {
    lines.push(`روز پس از تحویل: ${terms.daysAfterDelivery}`);
  }
  if (terms.partialAmount) {
    lines.push(`مبلغ علی‌الحساب: ${formatJarianMoney(terms.partialAmount, { withCurrency: true })}`);
  }
  if (terms.document?.name) lines.push(`سند پیوست: ${terms.document.name}`);
  return lines;
}

export default function GatewayDecisionPanel({
  order,
  viewPhase,
  orderPhase,
  onSubmitSuccess,
  onSubmitFailed,
}) {
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [paymentTerms, setPaymentTerms] = useState(() => getEmptyPaymentTerms());
  const [financeNotes, setFinanceNotes] = useState('');
  const [cancelReason, setCancelReason] = useState(GATEWAY_CANCEL_REASONS[0].value);
  const [cancelNotes, setCancelNotes] = useState('');
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationQuote, setCelebrationQuote] = useState('');
  const [pendingSuccessPayload, setPendingSuccessPayload] = useState(null);

  const decision = getGatewayDecision(order);
  const editable = isGatewayDecisionEditable(order, orderPhase, viewPhase);
  const decided = hasGatewayDecision(order);

  const handleSuccessSubmit = () => {
    const error = validatePaymentTerms(paymentTerms);
    if (error) {
      window.alert(error);
      return;
    }
    setPendingSuccessPayload({
      paymentType: paymentTerms.paymentType,
      financeNotes,
      paymentTerms,
    });
    setCelebrationQuote(pickRandomSalesQuote());
    setCelebrationOpen(true);
  };

  const handleCelebrationThanks = () => {
    const payload = pendingSuccessPayload;
    setCelebrationOpen(false);
    setCelebrationQuote('');
    setPendingSuccessPayload(null);
    if (payload) {
      onSubmitSuccess?.(payload);
    }
    resetForm();
  };

  const handleFailedSubmit = () => {
    if (cancelReason === 'other' && !cancelNotes.trim()) {
      window.alert('لطفاً توضیحات علت لغو را وارد کنید.');
      return;
    }
    onSubmitFailed?.({ cancelReason, cancelNotes });
    resetForm();
    setConfirmCancelOpen(false);
  };

  const resetForm = () => {
    setSelectedOutcome(null);
    setFinanceNotes('');
    setCancelNotes('');
    setPaymentTerms(getEmptyPaymentTerms());
    setCancelReason(GATEWAY_CANCEL_REASONS[0].value);
  };

  const cancelReasonOptions = GATEWAY_CANCEL_REASONS.map((reason) => ({
    value: reason.value,
    label: reason.label,
  }));

  if (decided && decision) {
    const isSuccess = decision.outcome === GATEWAY_DECISION_OUTCOMES.SUCCESS;
    const summaryLines = isSuccess ? formatPaymentTermsSummary(decision) : [];
    return (
      <section className={`gateway-decision gateway-decision--resolved${isSuccess ? ' is-success' : ' is-failed'}`}>
        <header className="gateway-decision__head">
          <h2 className="gateway-decision__title">تعیین تکلیف معامله</h2>
          <span className={`gateway-decision__badge${isSuccess ? ' is-success' : ' is-failed'}`}>
            {isSuccess ? 'موفق' : 'ناموفق'}
          </span>
        </header>
        <div className="gateway-decision__summary">
          {isSuccess ? (
            <>
              {summaryLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {decision.financeNotes && (
                <p>
                  <strong>توضیحات مالی:</strong>
                  {' '}
                  {decision.financeNotes}
                </p>
              )}
            </>
          ) : (
            <>
              <p>
                <strong>علت لغو:</strong>
                {' '}
                {getCancelReasonLabel(decision.cancelReason)}
              </p>
              {decision.cancelNotes && (
                <p>
                  <strong>توضیحات:</strong>
                  {' '}
                  {decision.cancelNotes}
                </p>
              )}
            </>
          )}
          <p className="gateway-decision__meta">
            ثبت‌شده توسط
            {' '}
            {decision.decidedBy || '—'}
            {' · '}
            {decision.decidedAt}
          </p>
        </div>
      </section>
    );
  }

  if (!editable) {
    return (
      <section className="gateway-decision gateway-decision--readonly">
        <h2 className="gateway-decision__title">تعیین تکلیف نهایی سفارش</h2>
        <p className="gateway-decision__hint">
          تعیین تکلیف پس از صدور، مهر و امضای پیش‌فاکتور در مرحله «پیش‌کش» فعال می‌شود.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="gateway-decision">
        <header className="gateway-decision__head">
          <h2 className="gateway-decision__title">تعیین تکلیف معامله</h2>
        </header>

        <div className="gateway-decision__options">
          <button
            type="button"
            className={`gateway-decision__option gateway-decision__option--success${selectedOutcome === GATEWAY_DECISION_OUTCOMES.SUCCESS ? ' is-active' : ''}`}
            onClick={() => setSelectedOutcome(GATEWAY_DECISION_OUTCOMES.SUCCESS)}
          >
            موفق
          </button>
          <button
            type="button"
            className={`gateway-decision__option gateway-decision__option--failed${selectedOutcome === GATEWAY_DECISION_OUTCOMES.FAILED ? ' is-active' : ''}`}
            onClick={() => setSelectedOutcome(GATEWAY_DECISION_OUTCOMES.FAILED)}
          >
            ناموفق
          </button>
        </div>

        {selectedOutcome === GATEWAY_DECISION_OUTCOMES.SUCCESS && (
          <div className="gateway-decision__form gateway-decision__form--success">
            <PaymentTermsForm
              value={paymentTerms}
              onChange={setPaymentTerms}
            />
            <label className="gateway-decision__field">
              <span>توضیحات مالی (اختیاری)</span>
              <textarea
                className="gateway-decision__textarea"
                rows={2}
                value={financeNotes}
                onChange={(e) => setFinanceNotes(e.target.value)}
                placeholder="یادداشت تکمیلی مالی..."
              />
            </label>
            <button
              type="button"
              className="btn gateway-decision__submit gateway-decision__submit--success"
              onClick={handleSuccessSubmit}
            >
              ثبت موفقیت
            </button>
          </div>
        )}

        {selectedOutcome === GATEWAY_DECISION_OUTCOMES.FAILED && (
          <div className="gateway-decision__form gateway-decision__form--failed">
            <label className="gateway-decision__field">
              <span>علت لغو</span>
              <GatewaySelect
                value={cancelReason}
                onChange={setCancelReason}
                options={cancelReasonOptions}
                ariaLabel="علت لغو"
              />
            </label>
            {cancelReason === 'other' && (
              <label className="gateway-decision__field">
                <span>توضیحات</span>
                <textarea
                  className="gateway-decision__textarea"
                  rows={3}
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="علت لغو را توضیح دهید..."
                />
              </label>
            )}
            <button
              type="button"
              className="btn gateway-decision__submit gateway-decision__submit--failed"
              onClick={() => setConfirmCancelOpen(true)}
            >
              ثبت لغو سفارش
            </button>
          </div>
        )}
      </section>

      <OrderProfileConfirmDialog
        open={confirmCancelOpen}
        title="تایید لغو سفارش"
        message="آیا از ثبت تصمیم «ناموفق» و لغو این سفارش اطمینان دارید؟ این عمل قابل بازگشت نیست."
        confirmLabel="بله، لغو شود"
        onConfirm={handleFailedSubmit}
        onCancel={() => setConfirmCancelOpen(false)}
      />

      <DealCelebrationModal
        open={celebrationOpen}
        quote={celebrationQuote}
        onThanks={handleCelebrationThanks}
      />
    </>
  );
}
