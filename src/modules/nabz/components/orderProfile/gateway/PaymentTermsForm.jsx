import { useRef, useState } from 'react';
import {
  GATEWAY_PAYMENT_EXTRA_FIELDS,
  GATEWAY_PAYMENT_TYPES,
  getPaymentTermsExtraFields,
} from '../../../gatewayDecisionConfig';
import JalaliDatePicker from '../../JalaliDatePicker';
import MoneyInput from '../../MoneyInput';
import GatewaySelect from './GatewaySelect';

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
      <path d="M12 16V5" />
      <path d="m8 9 4-4 4 4" />
      <path d="M4 19h16" />
    </svg>
  );
}

/**
 * فرم پویای شرایط پرداخت برای تایید معامله / تعیین تکلیف موفق.
 */
export default function PaymentTermsForm({
  value,
  onChange,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const paymentType = value?.paymentType || GATEWAY_PAYMENT_TYPES[0];
  const extras = getPaymentTermsExtraFields(paymentType);
  const showDueDate = extras.includes(GATEWAY_PAYMENT_EXTRA_FIELDS.DUE_DATE);
  const showLcMonths = extras.includes(GATEWAY_PAYMENT_EXTRA_FIELDS.LC_MONTHS);
  const showDaysAfter = extras.includes(GATEWAY_PAYMENT_EXTRA_FIELDS.DAYS_AFTER_DELIVERY);
  const showPartialAmount = extras.includes(GATEWAY_PAYMENT_EXTRA_FIELDS.PARTIAL_AMOUNT);

  const paymentOptions = GATEWAY_PAYMENT_TYPES.map((type) => ({
    value: type,
    label: type,
  }));

  const patch = (next) => {
    if (disabled) return;
    onChange?.({ ...value, ...next });
  };

  const handlePaymentTypeChange = (nextType) => {
    patch({
      paymentType: nextType,
      dueDate: '',
      lcMonths: '',
      daysAfterDelivery: '',
      partialAmount: '',
    });
  };

  const handleFiles = (fileList) => {
    if (disabled || !fileList?.length) return;
    const file = fileList[0];
    patch({
      document: {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      },
    });
  };

  const clearDocument = (event) => {
    event.preventDefault();
    event.stopPropagation();
    patch({ document: null });
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className={`payment-terms-form${disabled ? ' is-disabled' : ''}`}>
      <label className="gateway-decision__field">
        <span>روش پرداخت</span>
        <GatewaySelect
          value={paymentType}
          onChange={handlePaymentTypeChange}
          options={paymentOptions}
          ariaLabel="روش پرداخت"
          disabled={disabled}
        />
      </label>

      {(showDueDate || showLcMonths || showDaysAfter || showPartialAmount) && (
        <div className="payment-terms-form__extras" key={paymentType}>
          {showDueDate && (
            <div className="payment-terms-form__field payment-terms-form__field--fade">
              <JalaliDatePicker
                label="تاریخ سررسید"
                value={value?.dueDate || ''}
                onChange={(dueDate) => patch({ dueDate })}
                placeholder="انتخاب تاریخ"
                disabled={disabled}
              />
            </div>
          )}

          {showLcMonths && (
            <label className="gateway-decision__field payment-terms-form__field--fade">
              <span>تعداد ماه</span>
              <input
                type="number"
                min="1"
                step="1"
                className="gateway-decision__input"
                value={value?.lcMonths ?? ''}
                onChange={(e) => patch({ lcMonths: e.target.value })}
                placeholder="مثلاً ۳"
                disabled={disabled}
                aria-label="تعداد ماه"
              />
            </label>
          )}

          {showDaysAfter && (
            <label className="gateway-decision__field payment-terms-form__field--fade">
              <span>چند روز پس از تحویل</span>
              <input
                type="number"
                min="0"
                step="1"
                className="gateway-decision__input"
                value={value?.daysAfterDelivery ?? ''}
                onChange={(e) => patch({ daysAfterDelivery: e.target.value })}
                placeholder="مثلاً ۷"
                disabled={disabled}
                aria-label="چند روز پس از تحویل"
              />
            </label>
          )}

          {showPartialAmount && (
            <label className="gateway-decision__field payment-terms-form__field--fade">
              <span>مبلغ علی‌الحساب</span>
              <MoneyInput
                className="gateway-decision__input"
                value={value?.partialAmount ?? ''}
                onChange={(partialAmount) => patch({ partialAmount })}
                placeholder="ریال"
                disabled={disabled}
                aria-label="مبلغ علی‌الحساب"
              />
            </label>
          )}
        </div>
      )}

      <div className="payment-terms-form__upload">
        <span className="payment-terms-form__upload-label">آپلود فیش واریزی / تصویر چک / سند LC</span>
        <div
          className={`payment-terms-form__dropzone${dragOver ? ' is-active' : ''}${value?.document ? ' has-file' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            handleFiles(event.dataTransfer.files);
          }}
          onClick={() => {
            if (!disabled) inputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (disabled) return;
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label="آپلود فیش واریزی / تصویر چک / سند LC"
        >
          <input
            ref={inputRef}
            type="file"
            className="payment-terms-form__file-input"
            accept="image/*,.pdf,.doc,.docx"
            disabled={disabled}
            onChange={(e) => handleFiles(e.target.files)}
          />
          {value?.document ? (
            <div className="payment-terms-form__file">
              <strong className="payment-terms-form__file-name">{value.document.name}</strong>
              {!disabled && (
                <button
                  type="button"
                  className="payment-terms-form__file-clear"
                  onClick={clearDocument}
                >
                  حذف
                </button>
              )}
            </div>
          ) : (
            <>
              <span className="payment-terms-form__drop-icon"><UploadIcon /></span>
              <p className="payment-terms-form__drop-title">فایل را بکشید یا کلیک کنید</p>
              <p className="payment-terms-form__drop-hint">تصویر، PDF یا سند LC</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
