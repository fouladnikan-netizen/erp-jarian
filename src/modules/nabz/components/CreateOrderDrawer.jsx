import { useMemo, useState } from 'react';
import {
  CURRENT_USER,
  DEFAULT_ORDER_TYPE,
  DEFAULT_SALE_TYPE,
  ORDER_TYPES,
  SALES_TYPES,
} from '../constants';
import {
  buildNewOrder,
  createLineItemsFromSelections,
  validateCreateOrder,
} from '../createOrder';
import CustomerCombobox from './CustomerCombobox';
import ProductPickerModal from './ProductPickerModal';
import OrderLineItemsTable from './OrderLineItemsTable';

function FormField({ label, children }) {
  return (
    <label className="nabz-form__field nabz-form__field--minimal">
      <span className="nabz-form__label">{label}</span>
      {children}
    </label>
  );
}

export default function CreateOrderDrawer({ orders, onClose, onSubmit }) {
  const [customerId, setCustomerId] = useState(null);
  const [orderType, setOrderType] = useState(DEFAULT_ORDER_TYPE);
  const [saleType, setSaleType] = useState(DEFAULT_SALE_TYPE);
  const [lineItems, setLineItems] = useState([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const validation = useMemo(
    () => validateCreateOrder({ customerId, lineItems }),
    [customerId, lineItems],
  );

  const addProductsFromPicker = (selections) => {
    setLineItems((items) => [...items, ...createLineItemsFromSelections(selections)]);
  };

  const removeLine = (lineId) => {
    setLineItems((items) => items.filter((item) => item.lineId !== lineId));
  };

  const handleSubmit = () => {
    if (!validation.valid) {
      setSubmitError(validation.reason);
      return;
    }
    const order = buildNewOrder({
      orders,
      customerId,
      assignee: CURRENT_USER,
      lineItems,
      orderType,
      saleType,
      generalNotes,
    });
    onSubmit(order);
    onClose();
  };

  return (
    <>
      <div className="nabz-drawer-overlay nabz-drawer-overlay--create" onClick={onClose} role="presentation">
        <aside
          className="nabz-drawer nabz-drawer--create nabz-drawer--create-minimal"
          role="dialog"
          aria-modal="true"
          aria-label="ثبت سفارش جدید"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="nabz-drawer__header nabz-drawer__header--create">
            <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <h2 className="nabz-drawer__title nabz-drawer__title--create">ثبت سفارش جدید</h2>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!validation.valid}
              onClick={handleSubmit}
            >
              ثبت نهایی سفارش
            </button>
          </header>

          <div className="nabz-drawer__body nabz-drawer__body--create nabz-drawer__body--create-minimal">
            <section className="nabz-create-minimal">
              <FormField label="مشتری *">
                <CustomerCombobox value={customerId} onChange={setCustomerId} />
              </FormField>

              <FormField label="نوع سفارش">
                <select
                  className="nabz-form__input"
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value)}
                >
                  {ORDER_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="نوع فروش">
                <select
                  className="nabz-form__input"
                  value={saleType}
                  onChange={(e) => setSaleType(e.target.value)}
                >
                  {SALES_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="توضیحات کلی سفارش">
                <textarea
                  className="nabz-form__textarea nabz-form__textarea--minimal"
                  rows={3}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="نکات کلی مربوط به این سفارش..."
                />
              </FormField>

              <div className="nabz-create-minimal__items">
                <div className="nabz-create-minimal__items-head">
                  <span className="nabz-form__label">اقلام سفارش *</span>
                  <button type="button" className="btn btn--outline btn--sm" onClick={() => setPickerOpen(true)}>
                    افزودن کالا
                  </button>
                </div>

                {lineItems.length === 0 ? (
                  <div className="nabz-create-empty nabz-create-empty--minimal">
                    <p>کالایی انتخاب نشده است.</p>
                    <button type="button" className="btn btn--outline btn--sm" onClick={() => setPickerOpen(true)}>
                      انتخاب از ویترین
                    </button>
                  </div>
                ) : (
                  <OrderLineItemsTable
                    items={lineItems}
                    onChange={setLineItems}
                    onRemove={removeLine}
                  />
                )}
              </div>
            </section>

            {submitError && <p className="nabz-create-error" role="alert">{submitError}</p>}
            {!validation.valid && validation.reason && (
              <p className="nabz-create-hint">{validation.reason}</p>
            )}
          </div>
        </aside>
      </div>

      {pickerOpen && (
        <ProductPickerModal
          onClose={() => setPickerOpen(false)}
          onConfirm={addProductsFromPicker}
        />
      )}
    </>
  );
}
