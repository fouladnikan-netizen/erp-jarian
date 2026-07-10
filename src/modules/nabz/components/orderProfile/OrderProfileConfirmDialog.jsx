export default function OrderProfileConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'تایید',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="order-profile-dialog" role="presentation">
      <button
        type="button"
        className="order-profile-dialog__backdrop"
        aria-label="بستن"
        onClick={onCancel}
      />
      <div
        className="order-profile-dialog__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="order-profile-dialog-title"
        aria-describedby="order-profile-dialog-desc"
      >
        <h2 id="order-profile-dialog-title" className="order-profile-dialog__title">
          {title}
        </h2>
        <p id="order-profile-dialog-desc" className="order-profile-dialog__message">
          {message}
        </p>
        <div className="order-profile-dialog__actions">
          <button type="button" className="btn btn--outline" onClick={onCancel}>
            انصراف
          </button>
          <button type="button" className="btn btn--outline-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
