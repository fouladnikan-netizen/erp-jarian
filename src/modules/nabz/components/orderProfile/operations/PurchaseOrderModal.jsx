import { useEffect, useMemo, useState } from 'react';
import JalaliDatePicker from '../../JalaliDatePicker';
import MoneyInput from '../../MoneyInput';
import { SUPPLY_CHANNEL_TYPES, isDiscrepancySupplyType } from '../../../inquiryConfig';
import { listSuppliers } from '../../../suppliers';
import { getWarehouseAddress, listWarehouses } from '../../../warehouses';
import {
  getEmptyPaymentTerms,
  getEmptyPurchaseOrderDraft,
  getPurchaseOrderDraftFromLine,
  PAYMENT_TERM_OPTIONS,
  PAYMENT_TERM_TYPES,
} from '../../../tadarokStageConfig';
import GatewaySelect from '../gateway/GatewaySelect';

function PaymentTermsFields({ paymentTerms, onChange, readOnly = false }) {
  const update = (patch) => {
    if (readOnly) return;
    onChange({ ...paymentTerms, ...patch });
  };

  if (paymentTerms.type === PAYMENT_TERM_TYPES.PREPAYMENT) {
    return (
      <div className="tadarok-form__grid">
        <JalaliDatePicker
          label="تاریخ پیش‌پرداخت"
          value={paymentTerms.prepaymentDate}
          onChange={(prepaymentDate) => update({ prepaymentDate })}
          disabled={readOnly}
        />
        <label className="tadarok-form__field">
          <span>مبلغ پیش‌پرداخت (ریال)</span>
          <MoneyInput
            className="tadarok-form__input"
            value={paymentTerms.prepaymentAmountRial}
            onChange={(prepaymentAmountRial) => update({ prepaymentAmountRial })}
            placeholder="مبلغ"
            readOnly={readOnly}
            disabled={readOnly}
          />
        </label>
      </div>
    );
  }

  if (paymentTerms.type === PAYMENT_TERM_TYPES.ON_DELIVERY) {
    return (
      <JalaliDatePicker
        label="تاریخ تحویل"
        value={paymentTerms.deliveryTime}
        onChange={(deliveryTime) => update({ deliveryTime })}
        disabled={readOnly}
      />
    );
  }

  if (paymentTerms.type === PAYMENT_TERM_TYPES.DEFERRED) {
    return (
      <JalaliDatePicker
        label="تاریخ سررسید تسویه"
        value={paymentTerms.dueDate}
        onChange={(dueDate) => update({ dueDate })}
        disabled={readOnly}
      />
    );
  }

  if (paymentTerms.type === PAYMENT_TERM_TYPES.COMBINED) {
    const stages = paymentTerms.combinedStages || [];
    return (
      <div className="tadarok-combined-stages">
        {stages.map((stage, index) => (
          <div key={index} className="tadarok-combined-stages__row">
            <JalaliDatePicker
              label={`مرحله ${(index + 1).toLocaleString('fa-IR')} — تاریخ`}
              value={stage.date}
              onChange={(date) => {
                const next = stages.map((entry, i) => (i === index ? { ...entry, date } : entry));
                update({ combinedStages: next });
              }}
              disabled={readOnly}
            />
            <label className="tadarok-form__field">
              <span>مبلغ (ریال)</span>
              <MoneyInput
                className="tadarok-form__input"
                value={stage.amountRial}
                onChange={(amountRial) => {
                  const next = stages.map((entry, i) => (
                    i === index ? { ...entry, amountRial } : entry
                  ));
                  update({ combinedStages: next });
                }}
                placeholder="مبلغ"
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>
            {!readOnly && stages.length > 1 && (
              <button
                type="button"
                className="btn btn--ghost tadarok-combined-stages__remove"
                onClick={() => update({ combinedStages: stages.filter((_, i) => i !== index) })}
              >
                حذف
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            className="btn btn--outline tadarok-combined-stages__add"
            onClick={() => update({ combinedStages: [...stages, { date: '', amountRial: '' }] })}
          >
            + افزودن مرحله تسویه
          </button>
        )}
      </div>
    );
  }

  return null;
}

export default function PurchaseOrderModal({
  open,
  order,
  line,
  defaultSupplierId,
  mode = 'create',
  onClose,
  onSubmit,
}) {
  const isEdit = mode === 'edit';
  const [draft, setDraft] = useState(() => getEmptyPurchaseOrderDraft(line));
  const [editing, setEditing] = useState(!isEdit);
  const suppliers = useMemo(() => listSuppliers(), []);
  const warehouses = useMemo(() => listWarehouses(), []);

  const supplierOptions = useMemo(
    () => suppliers.map((supplier) => ({
      value: String(supplier.id),
      label: supplier.companyName || supplier.personName,
    })),
    [suppliers],
  );

  const warehouseOptions = useMemo(
    () => warehouses.map((wh) => ({ value: wh.id, label: wh.name })),
    [warehouses],
  );

  const supplyTypeOptions = useMemo(
    () => SUPPLY_CHANNEL_TYPES.map((type) => ({
      value: type,
      label: type,
    })),
    [],
  );

  useEffect(() => {
    if (!open || !line) return;
    if (isEdit) {
      setDraft(getPurchaseOrderDraftFromLine(line));
      setEditing(false);
      return;
    }
    const base = getEmptyPurchaseOrderDraft(line);
    setDraft({
      ...base,
      supplierId: defaultSupplierId
        ? String(defaultSupplierId)
        : (base.supplierId || ''),
      supplyType: line.kavoshSupplyType || base.supplyType,
      agreedUnitPriceRial: line.inquiryUnitPriceRial != null && line.inquiryUnitPriceRial !== ''
        ? String(line.inquiryUnitPriceRial)
        : base.agreedUnitPriceRial,
      purchaseQty: line.qty != null ? String(line.qty) : base.purchaseQty,
    });
    setEditing(true);
  }, [open, line, defaultSupplierId, isEdit]);

  if (!open || !line) return null;

  const readOnly = isEdit && !editing;
  const updateDraft = (patch) => {
    if (readOnly) return;
    setDraft((prev) => ({ ...prev, ...patch }));
  };
  const showDiscrepancy = isDiscrepancySupplyType(draft.supplyType);

  const handleWarehouseChange = (warehouseId) => {
    updateDraft({
      warehouseId,
      warehouseAddress: getWarehouseAddress(warehouseId),
    });
  };

  const handleSupplyTypeChange = (supplyType) => {
    updateDraft({
      supplyType,
      discrepancyNotes: isDiscrepancySupplyType(supplyType) ? draft.discrepancyNotes : '',
    });
  };

  const handlePaymentTypeChange = (type) => {
    updateDraft({
      paymentTerms: { ...getEmptyPaymentTerms(), type },
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (readOnly) return;
    onSubmit?.(draft);
  };

  const title = isEdit
    ? (editing ? 'ویرایش سفارش خرید' : 'جزئیات سفارش خرید')
    : 'صدور سفارش خرید';
  const submitLabel = isEdit ? 'ذخیره تغییرات' : 'صدور سفارش خرید';

  return (
    <div className="tadarok-modal" role="presentation">
      <button type="button" className="tadarok-modal__backdrop" aria-label="بستن" onClick={onClose} />
      <div className="tadarok-modal__panel" role="dialog" aria-modal="true" aria-labelledby="po-modal-title">
        <header className="tadarok-modal__header">
          <div>
            <h2 id="po-modal-title" className="tadarok-modal__title">{title}</h2>
            <p className="tadarok-modal__subtitle">
              {line.name}
              {' '}
              —
              سفارش
              {' '}
              {order?.code}
              {line.purchaseOrder?.poNumber ? ` — ${line.purchaseOrder.poNumber}` : ''}
            </p>
          </div>
          <button type="button" className="tadarok-modal__close" onClick={onClose} aria-label="بستن">×</button>
        </header>

        <form className={`tadarok-modal__form${readOnly ? ' is-readonly' : ''}`} onSubmit={handleSubmit}>
          <div className="tadarok-form__grid">
            <label className="tadarok-form__field">
              <span>نام تامین‌کننده</span>
              <GatewaySelect
                value={draft.supplierId}
                onChange={(value) => updateDraft({ supplierId: value })}
                options={supplierOptions}
                ariaLabel="انتخاب تامین‌کننده"
                placeholder="انتخاب از کانون..."
                disabled={readOnly}
              />
            </label>

            <label className="tadarok-form__field">
              <span>نوع تامین</span>
              <GatewaySelect
                value={draft.supplyType}
                onChange={handleSupplyTypeChange}
                options={supplyTypeOptions}
                ariaLabel="نوع تامین"
                disabled={readOnly}
              />
            </label>

            <label className="tadarok-form__field">
              <span>مقدار خرید</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="tadarok-form__input"
                value={draft.purchaseQty}
                onChange={(e) => updateDraft({ purchaseQty: e.target.value })}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>

            <label className="tadarok-form__field">
              <span>قیمت توافقی (ریال)</span>
              <MoneyInput
                className="tadarok-form__input"
                value={draft.agreedUnitPriceRial}
                onChange={(agreedUnitPriceRial) => updateDraft({ agreedUnitPriceRial })}
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>

            <label className="tadarok-form__field">
              <span>حواله انبار (شماره/کد) — اختیاری</span>
              <input
                type="text"
                className="tadarok-form__input"
                value={draft.warehouseVoucherCode}
                onChange={(e) => updateDraft({ warehouseVoucherCode: e.target.value })}
                placeholder="کد حواله (اختیاری)"
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>

            <label className="tadarok-form__field">
              <span>انتخاب انبار</span>
              <GatewaySelect
                value={draft.warehouseId}
                onChange={handleWarehouseChange}
                options={warehouseOptions}
                ariaLabel="انتخاب انبار"
                placeholder="انتخاب انبار..."
                disabled={readOnly}
              />
            </label>
          </div>

          {showDiscrepancy && (
            <label className="tadarok-form__field tadarok-form__field--full">
              <span>توضیحات مغایرت (اختیاری)</span>
              <textarea
                className="tadarok-form__textarea"
                rows={2}
                value={draft.discrepancyNotes}
                onChange={(e) => updateDraft({ discrepancyNotes: e.target.value })}
                placeholder="شرح تفاوت فاکتور تامین‌کننده با سفارش اصلی..."
                readOnly={readOnly}
                disabled={readOnly}
              />
            </label>
          )}

          <label className="tadarok-form__field tadarok-form__field--full">
            <span>آدرس انبار</span>
            <input
              type="text"
              className="tadarok-form__input"
              value={draft.warehouseAddress}
              readOnly
              placeholder="پس از انتخاب انبار تکمیل می‌شود"
            />
          </label>

          <label className="tadarok-form__field tadarok-form__field--full">
            <span>توضیحات مهم</span>
            <textarea
              className="tadarok-form__textarea"
              rows={2}
              value={draft.importantNotes}
              onChange={(e) => updateDraft({ importantNotes: e.target.value })}
              placeholder="ملاحظات خرید، بارگیری، یا تحویل..."
              readOnly={readOnly}
              disabled={readOnly}
            />
          </label>

          <section className="tadarok-form__section">
            <h3 className="tadarok-form__section-title">شرایط تسویه</h3>
            <label className="tadarok-form__field tadarok-form__field--full">
              <span>نوع تسویه</span>
              <GatewaySelect
                value={draft.paymentTerms.type}
                onChange={handlePaymentTypeChange}
                options={PAYMENT_TERM_OPTIONS}
                ariaLabel="شرایط تسویه"
                disabled={readOnly}
              />
            </label>
            <PaymentTermsFields
              paymentTerms={draft.paymentTerms}
              onChange={(paymentTerms) => updateDraft({ paymentTerms })}
              readOnly={readOnly}
            />
          </section>

          <footer className="tadarok-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>
              {readOnly ? 'بستن' : 'انصراف'}
            </button>
            {isEdit && readOnly && (
              <button type="button" className="btn btn--primary" onClick={() => setEditing(true)}>
                ویرایش سفارش خرید
              </button>
            )}
            {!readOnly && (
              <button type="submit" className="btn btn--primary tadarok-modal__submit">
                {submitLabel}
              </button>
            )}
          </footer>
        </form>
      </div>
    </div>
  );
}
