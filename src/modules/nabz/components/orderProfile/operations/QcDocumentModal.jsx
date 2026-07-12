import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import JalaliDatePicker from '../../JalaliDatePicker';
import { getTodayJalali, getNowTimeFa } from '../../../dateUtils';
import { getFulfilledPurchaseRows } from '../../../tajhizStageService';
import {
  QC_FINAL_STATUS,
  QC_VISUAL_HEALTH,
  buildQcItemFromPurchaseRow,
  getQcVisualLabel,
  saveQcInspection,
} from '../../../qcInspectionConfig';
import './QcDocumentModal.css';

const EMPTY_INSPECTION = {
  thickness: '',
  dimensions: '',
  visualHealth: 'black-healthy',
  manufacturerBrand: '',
  notes: '',
  itemStatus: '',
};

function formatFaNumber(value) {
  return Number(value).toLocaleString('fa-IR');
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export default function QcDocumentModal({
  open,
  order,
  onClose,
  onUpdateOrder,
  mode = 'inspect',
  focusRowKey = null,
  initialRecord = null,
}) {
  const titleId = useId();
  const fileInputRef = useRef(null);
  const toastTimerRef = useRef(null);
  const readOnly = mode === 'readonly';

  const qcItems = useMemo(() => {
    if (!order) return [];
    return getFulfilledPurchaseRows(order).map(buildQcItemFromPurchaseRow);
  }, [order]);

  const [inspectorName, setInspectorName] = useState('');
  const [inspectDate, setInspectDate] = useState('');
  const [inspectTime, setInspectTime] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [inspection, setInspection] = useState(EMPTY_INSPECTION);
  const [attachmentName, setAttachmentName] = useState('');
  const [toast, setToast] = useState('');

  const selectedItem = qcItems.find((item) => item.id === selectedItemId) || null;
  const supplierName = selectedItem?.supplierName
    || qcItems[0]?.supplierName
    || '—';
  const orderCodePath = order?.code?.replace(/-/g, '') || '';

  useEffect(() => {
    if (!open || !order) return undefined;

    if (readOnly && initialRecord) {
      setInspectorName(initialRecord.inspectorName || '—');
      setInspectDate(initialRecord.inspectDate || '—');
      setInspectTime(initialRecord.inspectTime || '—');
      setSelectedItemId(focusRowKey || initialRecord.rowKey || '');
      setInspection({
        thickness: initialRecord.thickness || '—',
        dimensions: initialRecord.dimensions || '—',
        visualHealth: initialRecord.visualHealth || 'black-healthy',
        manufacturerBrand: initialRecord.manufacturerBrand || '—',
        notes: initialRecord.notes || '—',
        itemStatus: initialRecord.itemStatus || '',
      });
      setAttachmentName(initialRecord.attachmentName || '');
      setToast('');
      return undefined;
    }

    setInspectorName('');
    setInspectDate(getTodayJalali());
    setInspectTime(getNowTimeFa());
    setSelectedItemId(focusRowKey || '');
    setInspection(EMPTY_INSPECTION);
    setAttachmentName('');
    setToast('');
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [open, order?.id, readOnly, focusRowKey, initialRecord]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !order) return null;

  const updateInspection = (key, value) => {
    if (readOnly) return;
    setInspection((prev) => ({ ...prev, [key]: value }));
  };

  const resetItemForm = () => {
    setSelectedItemId('');
    setInspection(EMPTY_INSPECTION);
    setAttachmentName('');
  };

  const showToast = (message) => {
    setToast(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 2200);
  };

  const handleCompleteItem = () => {
    if (readOnly || !selectedItem) return;
    if (!inspection.itemStatus) {
      showToast('وضعیت نهایی کالا را انتخاب کنید.');
      return;
    }

    const record = {
      rowKey: selectedItem.id,
      itemLabel: selectedItem.label,
      itemDescription: selectedItem.description,
      qty: selectedItem.qty,
      unit: selectedItem.unit,
      inspectorName: inspectorName.trim() || 'بازرس ثبت‌نشده',
      inspectDate,
      inspectTime,
      thickness: inspection.thickness.trim(),
      dimensions: inspection.dimensions.trim(),
      visualHealth: inspection.visualHealth,
      manufacturerBrand: inspection.manufacturerBrand.trim(),
      notes: inspection.notes.trim(),
      attachmentName,
      itemStatus: inspection.itemStatus,
      savedAt: new Date().toISOString(),
    };

    onUpdateOrder?.((prev) => saveQcInspection(prev, selectedItem.id, record));
    showToast(`بازرسی «${selectedItem.label}» تکمیل شد.`);
    resetItemForm();
  };

  return (
    <div className={`qc-drawer${readOnly ? ' qc-drawer--readonly' : ''}`} role="presentation">
      <button
        type="button"
        className="qc-drawer__backdrop"
        aria-label="بستن فرم کنترل کیفیت"
        onClick={onClose}
      />

      <aside
        className="qc-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="qc-drawer__header">
          <div className="qc-drawer__header-main">
            <h2 id={titleId} className="qc-drawer__title">
              {readOnly ? 'مشاهده نتیجه کنترل کیفیت' : 'فرم کنترل کیفیت'}
            </h2>
            <div className="qc-drawer__meta">
              <span className="qc-drawer__meta-label">شماره سفارش:</span>
              <Link to={`/nabz/order/${orderCodePath}`} className="qc-drawer__order-link">
                {order.code}
              </Link>
              <span className="qc-drawer__meta-sep">·</span>
              <span className="qc-drawer__meta-label">تأمین‌کننده:</span>
              <span className="qc-drawer__meta-value">{supplierName}</span>
            </div>
          </div>
          <button type="button" className="qc-drawer__close" onClick={onClose} aria-label="بستن">×</button>
        </header>

        <div className="qc-drawer__body">
          <section className="qc-drawer__section">
            <label className="qc-drawer__field">
              <span className="qc-drawer__label">نام بازرس</span>
              <input
                type="text"
                className="qc-drawer__input"
                value={inspectorName}
                onChange={(event) => setInspectorName(event.target.value)}
                placeholder="نام و نام خانوادگی بازرس"
                disabled={readOnly}
                readOnly={readOnly}
              />
            </label>

            <div className="qc-drawer__datetime-row">
              {readOnly ? (
                <label className="qc-drawer__field">
                  <span className="qc-drawer__label">تاریخ بازرسی</span>
                  <input type="text" className="qc-drawer__input" value={inspectDate} readOnly />
                </label>
              ) : (
                <JalaliDatePicker
                  label="تاریخ بازرسی"
                  value={inspectDate}
                  onChange={setInspectDate}
                  placeholder="۱۴۰۳/۰۵/۱۶"
                />
              )}
              <label className="qc-drawer__field">
                <span className="qc-drawer__label">ساعت بازرسی</span>
                <input
                  type="text"
                  className="qc-drawer__input"
                  value={inspectTime}
                  onChange={(event) => setInspectTime(event.target.value)}
                  placeholder="۰۹:۳۰"
                  inputMode="numeric"
                  disabled={readOnly}
                  readOnly={readOnly}
                />
              </label>
            </div>
          </section>

          {!readOnly && (
            <section className="qc-drawer__section">
              <label className="qc-drawer__field">
                <span className="qc-drawer__label">کالای در حال بازرسی</span>
                <select
                  className="qc-drawer__input qc-drawer__select"
                  value={selectedItemId}
                  onChange={(event) => {
                    setSelectedItemId(event.target.value);
                    setInspection(EMPTY_INSPECTION);
                    setAttachmentName('');
                  }}
                >
                  <option value="">انتخاب کالای در حال بازرسی...</option>
                  {qcItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </label>
            </section>
          )}

          {(selectedItem || (readOnly && initialRecord)) && (
            <section className="qc-drawer__section qc-drawer__section--stack" aria-live="polite">
              <div className="qc-drawer__item-card">
                <p className="qc-drawer__item-name">
                  {selectedItem?.description || initialRecord?.itemDescription || initialRecord?.itemLabel}
                </p>
                <p className="qc-drawer__item-qty">
                  مقدار درخواستی:
                  {' '}
                  <span>{formatFaNumber(selectedItem?.qty ?? initialRecord?.qty ?? 0)}</span>
                  {' '}
                  {selectedItem?.unit || initialRecord?.unit || ''}
                </p>
              </div>

              <label className="qc-drawer__field">
                <span className="qc-drawer__label">ضخامت</span>
                <input
                  type="text"
                  className="qc-drawer__input"
                  value={inspection.thickness}
                  onChange={(event) => updateInspection('thickness', event.target.value)}
                  placeholder="مثلاً ۲ میلی‌متر"
                  disabled={readOnly}
                  readOnly={readOnly}
                />
              </label>

              <label className="qc-drawer__field">
                <span className="qc-drawer__label">ابعاد</span>
                <input
                  type="text"
                  className="qc-drawer__input"
                  value={inspection.dimensions}
                  onChange={(event) => updateInspection('dimensions', event.target.value)}
                  placeholder="مثلاً ۱۲۵۰×۲۵۰۰ میلی‌متر"
                  disabled={readOnly}
                  readOnly={readOnly}
                />
              </label>

              <div className="qc-drawer__field">
                <span className="qc-drawer__label">وضعیت ظاهری</span>
                {readOnly ? (
                  <div className="qc-drawer__readonly-value">
                    {getQcVisualLabel(inspection.visualHealth)}
                  </div>
                ) : (
                  <div className="qc-drawer__toggle qc-drawer__toggle--visual" role="radiogroup" aria-label="وضعیت ظاهری">
                    {QC_VISUAL_HEALTH.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={inspection.visualHealth === option.id}
                        className={`qc-drawer__toggle-btn${inspection.visualHealth === option.id ? ' is-active' : ''}`}
                        onClick={() => updateInspection('visualHealth', option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="qc-drawer__field">
                <span className="qc-drawer__label">نشان تولیدکننده</span>
                <input
                  type="text"
                  className="qc-drawer__input"
                  value={inspection.manufacturerBrand}
                  onChange={(event) => updateInspection('manufacturerBrand', event.target.value)}
                  placeholder="برند یا نشان حک‌شده روی کالا"
                  disabled={readOnly}
                  readOnly={readOnly}
                />
              </label>

              <label className="qc-drawer__field">
                <span className="qc-drawer__label">توضیحات بازرس</span>
                <textarea
                  className="qc-drawer__input qc-drawer__textarea"
                  rows={3}
                  value={inspection.notes}
                  onChange={(event) => updateInspection('notes', event.target.value)}
                  placeholder="مشاهدات، انحرافات و نکات بازرسی..."
                  disabled={readOnly}
                  readOnly={readOnly}
                />
              </label>

              <div className="qc-drawer__field">
                <span className="qc-drawer__label">پیوست عکس / سند این کالا</span>
                {readOnly ? (
                  <div className="qc-drawer__readonly-value">
                    {attachmentName || 'فایلی پیوست نشده است'}
                  </div>
                ) : (
                  <div className="qc-drawer__attach-row">
                    <button
                      type="button"
                      className="qc-drawer__attach-btn"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="افزودن عکس یا سند"
                    >
                      <CameraIcon />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.pdf"
                      className="qc-drawer__file"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        setAttachmentName(file ? file.name : '');
                      }}
                    />
                    <span className={`qc-drawer__attach-name${attachmentName ? '' : ' is-empty'}`}>
                      {attachmentName || 'فایلی انتخاب نشده است'}
                    </span>
                  </div>
                )}
              </div>

              <div className="qc-drawer__field">
                <span className="qc-drawer__label">وضعیت نهایی این کالا</span>
                {readOnly ? (
                  <div className="qc-drawer__readonly-value">
                    {QC_FINAL_STATUS.find((item) => item.id === inspection.itemStatus)?.label || '—'}
                  </div>
                ) : (
                  <div className="qc-drawer__toggle qc-drawer__toggle--status" role="radiogroup" aria-label="وضعیت نهایی">
                    {QC_FINAL_STATUS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={inspection.itemStatus === option.id}
                        className={`qc-drawer__toggle-btn qc-drawer__toggle-btn--${option.tone}${inspection.itemStatus === option.id ? ' is-active' : ''}`}
                        onClick={() => updateInspection('itemStatus', option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <footer className="qc-drawer__footer">
          {readOnly ? (
            <button type="button" className="btn btn--outline qc-drawer__close-btn" onClick={onClose}>
              بستن
            </button>
          ) : selectedItem ? (
            <button type="button" className="qc-drawer__submit" onClick={handleCompleteItem}>
              تکمیل بازرسی این کالا
            </button>
          ) : (
            <p className="qc-drawer__hint">برای ادامه، یک کالا از فهرست انتخاب کنید.</p>
          )}
        </footer>

        {toast && (
          <div className="qc-drawer__toast" role="status">
            {toast}
          </div>
        )}
      </aside>
    </div>
  );
}
