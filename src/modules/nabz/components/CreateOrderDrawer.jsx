import { useEffect, useMemo, useState } from 'react';
import {
  CREATE_ORDER_TYPES,
  CURRENT_USER,
  DEFAULT_ORDER_TYPE,
  DEFAULT_SALE_TYPE,
  SALES_TYPES,
} from '../constants';
import {
  applyOrderEdit,
  buildNewOrder,
  createLineItemsFromSelections,
  orderToEditDraft,
  validateCreateOrder,
} from '../createOrder';
import { expertKey, listCustomerExperts } from '../customers';
import { SENSITIVE_WIPE_CONFIRM_MESSAGE } from '../orderEditPermissions';
import CustomerCombobox from './CustomerCombobox';
import ExpertCombobox, { getExpertFromValue } from './ExpertCombobox';
import FormSegment from './FormSegment';
import ProductPickerModal from './ProductPickerModal';
import OrderLineItemsTable from './OrderLineItemsTable';
import QuickAddCustomerModal from './QuickAddCustomerModal';
import QuickAddExpertModal from './QuickAddExpertModal';
import OrderProfileConfirmDialog from './orderProfile/OrderProfileConfirmDialog';

function FormField({ label, children, hint, action }) {
  return (
    <div className="nabz-create-field">
      <span className="nabz-form__label font-meem">{label}</span>
      {children}
      {action}
      {hint ? <span className="nabz-form__hint font-meem">{hint}</span> : null}
    </div>
  );
}

function QuickAddLink({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      className="nabz-create-quick-add font-meem"
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function resolveExpertKey(customerId, requesterName, requesterMobile) {
  if (!customerId || !requesterName) return null;
  const match = listCustomerExperts(customerId).find((person) => (
    person.name === requesterName
    && (!requesterMobile || person.mobile === requesterMobile)
  ));
  return match ? expertKey(match) : null;
}

export default function CreateOrderDrawer({
  orders,
  onClose,
  onSubmit,
  mode = 'create',
  order = null,
  onSave,
}) {
  const isEdit = mode === 'edit' && Boolean(order);
  const initialDraft = isEdit ? orderToEditDraft(order) : null;

  const [customerId, setCustomerId] = useState(initialDraft?.customerId ?? null);
  const [expertKeyValue, setExpertKeyValue] = useState(() => (
    initialDraft
      ? resolveExpertKey(
        initialDraft.customerId,
        initialDraft.requesterName,
        initialDraft.requesterMobile,
      )
      : null
  ));
  const [saleType, setSaleType] = useState(initialDraft?.saleType ?? DEFAULT_SALE_TYPE);
  const [orderType, setOrderType] = useState(initialDraft?.orderType ?? DEFAULT_ORDER_TYPE);
  const [lineItems, setLineItems] = useState(initialDraft?.lineItems ?? []);
  const [generalNotes, setGeneralNotes] = useState(initialDraft?.generalNotes ?? '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [expertModalOpen, setExpertModalOpen] = useState(false);
  const [contactsTick, setContactsTick] = useState(0);
  const [submitError, setSubmitError] = useState('');
  const [wipeConfirmOpen, setWipeConfirmOpen] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const handleCustomerChange = (nextId) => {
    setCustomerId(nextId);
    setExpertKeyValue(null);
  };

  const validation = useMemo(
    () => validateCreateOrder({ customerId, lineItems }),
    [customerId, lineItems],
  );

  const selectedExpert = useMemo(
    () => getExpertFromValue(customerId, expertKeyValue),
    [customerId, expertKeyValue, contactsTick],
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

  const buildEditPayload = () => ({
    customerId,
    lineItems,
    orderType,
    saleType,
    generalNotes,
    requesterName: selectedExpert?.name,
    requesterMobile: selectedExpert?.mobile,
  });

  const commitEdit = (wipeConfirmed = false) => {
    const result = applyOrderEdit(order, buildEditPayload(), { wipeConfirmed });
    if (result.needsWipeConfirm) {
      setWipeConfirmOpen(true);
      return;
    }
    if (!result.ok) return;
    onSave?.(result.order);
    handleClose();
  };

  const handleSubmit = () => {
    if (!validation.valid) {
      setSubmitError(validation.reason);
      return;
    }
    setSubmitError('');

    if (isEdit) {
      commitEdit(false);
      return;
    }

    const nextOrder = buildNewOrder({
      orders,
      customerId,
      assignee: CURRENT_USER,
      lineItems,
      orderType,
      saleType,
      generalNotes,
      requesterName: selectedExpert?.name,
      requesterMobile: selectedExpert?.mobile,
    });
    onSubmit(nextOrder);
    handleClose();
  };

  const title = isEdit ? 'ویرایش سفارش' : 'ثبت سفارش جدید';
  const eyebrow = isEdit ? 'نبض · ویرایش سفارش' : 'نبض · سفارش جدید';
  const submitLabel = isEdit ? 'ذخیره تغییرات' : 'ثبت و ایجاد سفارش';

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
              <p className="nabz-create-premium__eyebrow font-meem">{eyebrow}</p>
              <h2 id="nabz-create-order-title" className="nabz-create-premium__title font-meem">
                {title}
              </h2>
              {isEdit && order?.code ? (
                <p className="nabz-create-premium__code font-yekan">{order.code}</p>
              ) : null}
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
            <div className="nabz-create-grid-row">
              <FormField
                label="نام شرکت *"
                action={(
                  <QuickAddLink onClick={() => setCustomerModalOpen(true)}>
                    + افزودن سریع
                  </QuickAddLink>
                )}
              >
                <CustomerCombobox
                  key={`customer-${contactsTick}`}
                  value={customerId}
                  onChange={handleCustomerChange}
                />
              </FormField>

              <FormField
                label="کارشناس مرتبط"
                action={(
                  <QuickAddLink
                    onClick={() => setExpertModalOpen(true)}
                    disabled={!customerId}
                  >
                    + افزودن کارشناس
                  </QuickAddLink>
                )}
              >
                <ExpertCombobox
                  key={`expert-${customerId}-${contactsTick}`}
                  customerId={customerId}
                  value={expertKeyValue}
                  onChange={setExpertKeyValue}
                />
              </FormField>
            </div>

            <div className="nabz-create-grid-row">
              <FormSegment
                label="نوع فروش"
                options={SALES_TYPES}
                value={saleType}
                onChange={setSaleType}
              />
              <FormSegment
                label="نوع سفارش"
                options={CREATE_ORDER_TYPES}
                value={orderType}
                onChange={setOrderType}
              />
            </div>

            <section className="nabz-create-premium__section" aria-labelledby="nabz-create-items">
              <div className="nabz-create-premium__section-head">
                <h3 id="nabz-create-items" className="nabz-create-premium__section-title font-meem">
                  اقلام محصول
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
                توضیحات
              </h3>
              <textarea
                className="nabz-form__textarea nabz-create-premium__notes nabz-create-input font-meem"
                rows={4}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="توضیحات تکمیلی سفارش..."
                aria-label="توضیحات"
              />
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
              {submitLabel}
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

      {customerModalOpen && (
        <QuickAddCustomerModal
          onClose={() => setCustomerModalOpen(false)}
          onAdded={(record) => {
            setContactsTick((tick) => tick + 1);
            handleCustomerChange(record.id);
          }}
        />
      )}

      {expertModalOpen && customerId && (
        <QuickAddExpertModal
          customerId={customerId}
          onClose={() => setExpertModalOpen(false)}
          onAdded={(key) => {
            setContactsTick((tick) => tick + 1);
            setExpertKeyValue(key);
          }}
        />
      )}

      <OrderProfileConfirmDialog
        open={wipeConfirmOpen}
        title="بازنشانی قیمت‌های استعلامی"
        message={SENSITIVE_WIPE_CONFIRM_MESSAGE}
        confirmLabel="تایید و ذخیره"
        onConfirm={() => {
          setWipeConfirmOpen(false);
          commitEdit(true);
        }}
        onCancel={() => setWipeConfirmOpen(false)}
      />
    </>
  );
}
