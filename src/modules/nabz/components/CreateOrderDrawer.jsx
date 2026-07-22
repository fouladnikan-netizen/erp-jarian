import { useEffect, useMemo, useState } from 'react';
import { CURRENT_USER, DEFAULT_ORDER_TYPE, DEFAULT_SALE_TYPE } from '../constants';
import {
  buildNewOrder,
  createLineItemsFromSelections,
  validateCreateOrder,
} from '../createOrder';
import CustomerCombobox from './CustomerCombobox';
import ProductPickerModal from './ProductPickerModal';
import OrderLineItemsTable from './OrderLineItemsTable';

function FormField({ label, children, hint }) {
  return (
    <label className="nabz-form__field nabz-create-premium__field">
      <span className="nabz-form__label font-meem">{label}</span>
      {children}
      {hint ? <span className="nabz-form__hint font-meem">{hint}</span> : null}
    </label>
  );
}

export default function CreateOrderDrawer({ orders, onClose, onSubmit }) {
  const [customerId, setCustomerId] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

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

  const handleClose = () => {
    setEntered(false);
    window.setTimeout(onClose, 220);
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
      orderType: DEFAULT_ORDER_TYPE,
      saleType: DEFAULT_SALE_TYPE,
      generalNotes,
    });
    onSubmit(order);
    handleClose();
  };

  return (
    <>
      <div
        className={`nabz-drawer-overlay nabz-drawer-overlay--create${entered ? ' is-open' : ''}`}
        onClick={handleClose}
        role="presentation"
      >
        <aside
          className={`nabz-drawer nabz-drawer--create nabz-drawer--create-premium${entered ? ' is-open' : ''}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="nabz-create-order-title"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="nabz-create-premium__header">
            <div className="nabz-create-premium__header-copy">
              <p className="nabz-create-premium__eyebrow font-meem">نبض · سفارش جدید</p>
              <h2 id="nabz-create-order-title" className="nabz-create-premium__title font-meem">
                ثبت سفارش جدید
              </h2>
              <p className="nabz-create-premium__subtitle font-meem">
                فقط مشتری، اقلام و یادداشت اولیه — جزئیات مالی و لجستیک بعداً تکمیل می‌شود.
              </p>
            </div>
            <button
              type="button"
              className="nabz-create-premium__close"
              onClick={handleClose}
              aria-label="بستن"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>

          <div className="nabz-create-premium__body">
            <section className="nabz-create-premium__section" aria-labelledby="nabz-create-customer">
              <h3 id="nabz-create-customer" className="nabz-create-premium__section-title font-meem">
                ۱. مشتری
              </h3>
              <FormField label="جستجو و انتخاب مشتری *">
                <CustomerCombobox value={customerId} onChange={setCustomerId} />
              </FormField>
            </section>

            <section className="nabz-create-premium__section" aria-labelledby="nabz-create-items">
              <div className="nabz-create-premium__section-head">
                <h3 id="nabz-create-items" className="nabz-create-premium__section-title font-meem">
                  ۲. اقلام محصول
                </h3>
                <button
                  type="button"
                  className="nabz-create-premium__add-row font-meem"
                  onClick={() => setPickerOpen(true)}
                >
                  + افزودن سطر
                </button>
              </div>

              {lineItems.length === 0 ? (
                <div className="nabz-create-premium__empty">
                  <p className="font-meem">هنوز کالایی اضافه نشده است.</p>
                  <button
                    type="button"
                    className="nabz-create-premium__add-row nabz-create-premium__add-row--solid font-meem"
                    onClick={() => setPickerOpen(true)}
                  >
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
            </section>

            <section className="nabz-create-premium__section" aria-labelledby="nabz-create-notes">
              <h3 id="nabz-create-notes" className="nabz-create-premium__section-title font-meem">
                ۳. یادداشت اولیه
              </h3>
              <FormField label="توضیحات کارشناس فروش">
                <textarea
                  className="nabz-form__textarea nabz-create-premium__notes font-meem"
                  rows={4}
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="نکات اولیه مربوط به این سفارش..."
                />
              </FormField>
            </section>

            {submitError && (
              <p className="nabz-create-error font-meem" role="alert">{submitError}</p>
            )}
            {!validation.valid && validation.reason && (
              <p className="nabz-create-hint font-meem">{validation.reason}</p>
            )}
          </div>

          <footer className="nabz-create-premium__footer">
            <button
              type="button"
              className="nabz-create-premium__cancel font-meem"
              onClick={handleClose}
            >
              انصراف
            </button>
            <button
              type="button"
              className="nabz-create-premium__submit font-meem"
              disabled={!validation.valid}
              onClick={handleSubmit}
            >
              ثبت و ایجاد سفارش
            </button>
          </footer>
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
