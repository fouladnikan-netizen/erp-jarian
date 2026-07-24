import { useEffect, useState } from 'react';
import {
  applyDeliveryInfoToOrder,
  getEmptyDeliveryInfo,
  resolveDeliveryInfoPrefill,
  validateDeliveryInfo,
} from '../deliveryInfoService';
import DeliveryInfoForm from './DeliveryInfoForm';

/**
 * مودال «محل ارسال» در هدر پروفایل سفارش
 */
export default function DeliveryLocationModal({
  open,
  order,
  onClose,
  onSave,
}) {
  const [draft, setDraft] = useState(() => getEmptyDeliveryInfo());

  useEffect(() => {
    if (!open) return;
    setDraft({
      ...resolveDeliveryInfoPrefill(order),
      needsShipping: true,
    });
  }, [open, order]);

  if (!open) return null;

  const handleSave = (event) => {
    event.preventDefault();
    const draftToSave = { ...draft, needsShipping: true };
    const error = validateDeliveryInfo(draftToSave);
    if (error) {
      window.alert(error);
      return;
    }
    const nextOrder = applyDeliveryInfoToOrder(order, draftToSave);
    onSave?.(nextOrder);
    onClose?.();
  };

  return (
    <div className="delivery-location-modal" role="presentation">
      <button
        type="button"
        className="delivery-location-modal__backdrop"
        aria-label="بستن"
        onClick={onClose}
      />
      <div
        className="delivery-location-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delivery-location-modal-title"
      >
        <header className="delivery-location-modal__head">
          <h2 id="delivery-location-modal-title" className="delivery-location-modal__title">
            محل ارسال
          </h2>
          <button
            type="button"
            className="delivery-location-modal__close"
            onClick={onClose}
            aria-label="بستن"
          >
            ×
          </button>
        </header>

        <form className="delivery-location-modal__body" onSubmit={handleSave}>
          <DeliveryInfoForm
            value={draft}
            onChange={setDraft}
            idPrefix={`delivery-modal-${order?.id || 'x'}`}
            showToggle={false}
          />
          <footer className="delivery-location-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>
              انصراف
            </button>
            <button type="submit" className="btn btn--primary">
              ذخیره
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
