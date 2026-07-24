import { useEffect, useMemo, useState } from 'react';
import { listCarriers } from '../../../carriers';
import GatewaySelect from '../gateway/GatewaySelect';

export default function ShippingModal({
  open,
  order,
  selectedRows = [],
  onClose,
  onGenerate,
}) {
  const [carrierId, setCarrierId] = useState('');
  const carriers = useMemo(() => listCarriers(), []);
  const carrierOptions = useMemo(
    () => carriers.map((carrier) => ({ value: carrier.id, label: carrier.name })),
    [carriers],
  );

  useEffect(() => {
    if (!open) return;
    setCarrierId(order?.tajhizShipping?.carrierId || '');
  }, [open, order?.tajhizShipping?.carrierId]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedRows.length) {
      window.alert('حداقل یک ردیف کالا را برای باربری انتخاب کنید.');
      return;
    }
    if (!carrierId) {
      window.alert('باربری را انتخاب کنید.');
      return;
    }
    onGenerate?.(carrierId);
  };

  return (
    <div className="tadarok-modal" role="presentation">
      <button type="button" className="tadarok-modal__backdrop" aria-label="بستن" onClick={onClose} />
      <div className="tadarok-modal__panel tadarok-modal__panel--narrow" role="dialog" aria-modal="true" aria-labelledby="shipping-modal-title">
        <header className="tadarok-modal__header">
          <div>
            <h2 id="shipping-modal-title" className="tadarok-modal__title">صدور حواله باربری</h2>
            <p className="tadarok-modal__subtitle">
              سفارش
              {' '}
              {order?.code}
              {' · '}
              {selectedRows.length.toLocaleString('fa-IR')}
              {' '}
              قلم انتخاب‌شده
            </p>
          </div>
          <button type="button" className="tadarok-modal__close" onClick={onClose} aria-label="بستن">×</button>
        </header>

        <form className="tadarok-modal__form" onSubmit={handleSubmit}>
          <label className="tadarok-form__field tadarok-form__field--full">
            <span>انتخاب باربری</span>
            <GatewaySelect
              value={carrierId}
              onChange={setCarrierId}
              options={carrierOptions}
              ariaLabel="انتخاب باربری"
              placeholder="انتخاب از کانون..."
            />
          </label>

          <footer className="tadarok-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>انصراف</button>
            <button type="submit" className="btn btn--primary">تولید و چاپ حواله باربری</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
