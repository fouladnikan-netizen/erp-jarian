import { SUPPLY_CHANNEL_TYPES, isDiscrepancySupplyType } from '../inquiryConfig';
import { listSuppliers } from '../suppliers';
import MoneyInput from './MoneyInput';

export default function InquiryDraftForm({
  draft,
  onChange,
  onSubmit,
  onCancel,
  compact = false,
}) {
  const suppliers = listSuppliers();
  const showDiscrepancy = isDiscrepancySupplyType(draft.supplyType);

  return (
    <div className={`nabz-inquiry-form${compact ? ' nabz-inquiry-form--compact' : ''}`}>
      <label className="nabz-inquiry-form__field">
        <span>نوع تامین</span>
        <select
          className="nabz-inquiry-form__input"
          value={draft.supplyType}
          onChange={(e) => onChange({ ...draft, supplyType: e.target.value })}
        >
          {SUPPLY_CHANNEL_TYPES.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </label>
      <label className="nabz-inquiry-form__field">
        <span>نام تامین‌کننده</span>
        <select
          className="nabz-inquiry-form__input"
          value={draft.supplierId}
          onChange={(e) => onChange({ ...draft, supplierId: Number(e.target.value) || '' })}
        >
          <option value="">انتخاب از کانون...</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.companyName || supplier.personName}
            </option>
          ))}
        </select>
      </label>
      <label className="nabz-inquiry-form__field">
        <span>فی (ریال)</span>
        <MoneyInput
          className="nabz-inquiry-form__input nabz-inquiry-form__input--price"
          value={draft.unitPrice}
          onChange={(unitPrice) => onChange({ ...draft, unitPrice })}
          placeholder="مبلغ واحد"
        />
      </label>
      <label className="nabz-inquiry-form__field nabz-inquiry-form__field--wide">
        <span>توضیحات</span>
        <input
          type="text"
          className="nabz-inquiry-form__input"
          value={draft.notes}
          onChange={(e) => onChange({ ...draft, notes: e.target.value })}
          placeholder="یادداشت استعلام"
        />
      </label>

      {showDiscrepancy && (
        <>
          <label className="nabz-inquiry-form__field nabz-inquiry-form__field--full">
            <span>شرح مغایرت</span>
            <textarea
              className="nabz-inquiry-form__textarea"
              rows={2}
              value={draft.discrepancyDescription}
              onChange={(e) => onChange({ ...draft, discrepancyDescription: e.target.value })}
              placeholder="تفاوت فاکتور تامین‌کننده با سفارش اصلی"
            />
          </label>
          <label className="nabz-inquiry-form__field">
            <span>وزن مغایر</span>
            <input
              type="number"
              min="0"
              step="any"
              className="nabz-inquiry-form__input"
              value={draft.discrepancyWeight}
              onChange={(e) => onChange({ ...draft, discrepancyWeight: e.target.value })}
            />
          </label>
          <label className="nabz-inquiry-form__field">
            <span>فی مغایر (ریال)</span>
            <MoneyInput
              className="nabz-inquiry-form__input nabz-inquiry-form__input--price"
              value={draft.discrepancyUnitPrice}
              onChange={(discrepancyUnitPrice) => onChange({ ...draft, discrepancyUnitPrice })}
            />
          </label>
        </>
      )}

      <div className="nabz-inquiry-form__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={onSubmit}>
          ثبت
        </button>
        {onCancel && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
            انصراف
          </button>
        )}
      </div>
    </div>
  );
}
