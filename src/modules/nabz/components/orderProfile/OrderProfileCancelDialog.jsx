import { useEffect, useState } from 'react';

export default function OrderProfileCancelDialog({
  open,
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setReason('');
    setError('');
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('علت لغو سفارش الزامی است.');
      return;
    }
    onConfirm?.(trimmed);
  };

  return (
    <div className="order-profile-dialog" role="presentation">
      <button
        type="button"
        className="order-profile-dialog__backdrop"
        aria-label="بستن"
        onClick={onCancel}
      />
      <div
        className="order-profile-dialog__panel order-profile-dialog__panel--cancel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-profile-cancel-title"
      >
        <h2 id="order-profile-cancel-title" className="order-profile-dialog__title">
          لغو سفارش
        </h2>
        <p className="order-profile-dialog__message">
          با لغو، این سفارش به فهرست سفارشات ناموفق منتقل می‌شود. لطفاً علت لغو را وارد کنید.
        </p>
        <label className="order-profile-dialog__field" htmlFor="order-cancel-reason">
          <span className="order-profile-dialog__field-label">
            علت لغو
            <span className="order-profile-dialog__required" aria-hidden="true">*</span>
          </span>
          <textarea
            id="order-cancel-reason"
            className="order-profile-dialog__textarea"
            rows={4}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="مثلاً انصراف مشتری، عدم تأمین، توقف مذاکره…"
            aria-required="true"
            aria-invalid={Boolean(error)}
          />
        </label>
        {error && (
          <p className="order-profile-dialog__error" role="alert">{error}</p>
        )}
        <div className="order-profile-dialog__actions">
          <button type="button" className="btn btn--outline" onClick={onCancel}>
            انصراف
          </button>
          <button type="button" className="btn btn--outline-danger" onClick={handleConfirm}>
            لغو و انتقال به ناموفق
          </button>
        </div>
      </div>
    </div>
  );
}
