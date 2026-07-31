import { useEffect, useState } from 'react';
import { CURRENT_USER, CURRENT_USER_ROLE } from '../constants';
import {
  CRM_ACTIVITY_ORDER,
  CRM_ACTIVITY_META,
  CRM_ACTIVITY_TYPES,
  CRM_ASSIGNEE_OPTIONS,
  CRM_FOLLOW_UP_ACTIONS,
} from '../orderCrmConfig';
import { getRoleLabel } from '../orderCrmService';
import { parseMoneyInput } from '../orderCode';
import JalaliDatePicker from './JalaliDatePicker';
import MoneyInput from './MoneyInput';

const EMPTY_FORM = {
  type: CRM_ACTIVITY_TYPES.CALL,
  body: '',
  date: '',
  time: '',
  actionType: CRM_FOLLOW_UP_ACTIONS[0],
  title: '',
  assignee: CRM_ASSIGNEE_OPTIONS[0].label,
  paymentAmountRial: '',
  paymentDate: '',
  receiptFileName: '',
  receiptFileDataUrl: '',
  receiptMimeType: '',
};

function toIsoDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return '';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export default function QuickActivityModal({
  open,
  order,
  editActivity = null,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (!open) return;
    if (editActivity) {
      setForm({
        type: editActivity.type || CRM_ACTIVITY_TYPES.CALL,
        body: editActivity.body || '',
        date: toIsoDate(editActivity.followUp?.date) || '',
        time: editActivity.followUp?.time || '',
        actionType: editActivity.followUp?.actionType || CRM_FOLLOW_UP_ACTIONS[0],
        title: editActivity.followUp?.title || '',
        assignee: editActivity.followUp?.assignee || CRM_ASSIGNEE_OPTIONS[0].label,
        paymentAmountRial: editActivity.payment?.amountRial != null
          ? String(editActivity.payment.amountRial)
          : '',
        paymentDate: editActivity.payment?.date || '',
        receiptFileName: editActivity.payment?.receiptFileName || '',
        receiptFileDataUrl: editActivity.payment?.receiptFileDataUrl || '',
        receiptMimeType: editActivity.payment?.receiptMimeType || '',
      });
      return;
    }
    setForm(EMPTY_FORM);
  }, [open, editActivity]);

  if (!open) return null;

  const isPayment = form.type === CRM_ACTIVITY_TYPES.PAYMENT;

  const handleReceiptChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setForm((prev) => ({
        ...prev,
        receiptFileName: file.name,
        receiptFileDataUrl: dataUrl,
        receiptMimeType: file.type || '',
      }));
    } catch {
      window.alert('خواندن فایل فیش واریزی ناموفق بود.');
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedBody = form.body.trim();

    if (isPayment) {
      const amount = parseMoneyInput(form.paymentAmountRial);
      if (!amount || amount <= 0 || !form.paymentDate) {
        window.alert('برای دریافت وجه، مبلغ و تاریخ را تکمیل کنید.');
        return;
      }
      onSubmit?.({
        id: editActivity?.id,
        type: form.type,
        body: trimmedBody || 'دریافت وجه',
        author: editActivity?.author || CURRENT_USER,
        roleLabel: editActivity?.roleLabel || getRoleLabel(CURRENT_USER_ROLE),
        followUp: form.date && form.time
          ? {
            date: form.date,
            time: form.time,
            actionType: form.actionType,
            title: form.title.trim() || form.actionType,
            assignee: form.assignee,
            completed: false,
          }
          : null,
        payment: {
          amountRial: amount,
          date: form.paymentDate,
          receiptFileName: form.receiptFileName,
          receiptFileDataUrl: form.receiptFileDataUrl,
          receiptMimeType: form.receiptMimeType,
        },
      });
      return;
    }

    if (!trimmedBody || !form.date || !form.time) {
      window.alert('لطفاً شرح فعالیت، تاریخ و ساعت را تکمیل کنید.');
      return;
    }

    onSubmit?.({
      id: editActivity?.id,
      type: form.type,
      body: trimmedBody,
      author: editActivity?.author || CURRENT_USER,
      roleLabel: editActivity?.roleLabel || getRoleLabel(CURRENT_USER_ROLE),
      followUp: {
        date: form.date,
        time: form.time,
        actionType: form.actionType,
        title: form.title.trim() || form.actionType,
        assignee: form.assignee,
        completed: false,
      },
      payment: null,
    });
  };

  return (
    <div className="quick-activity-modal" role="presentation">
      <button
        type="button"
        className="quick-activity-modal__backdrop"
        aria-label="بستن"
        onClick={onClose}
      />
      <div
        className="quick-activity-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-activity-modal-title"
      >
        <header className="quick-activity-modal__header">
          <div>
            <h2 id="quick-activity-modal-title" className="quick-activity-modal__title">
              {editActivity ? 'ویرایش فعالیت و زمان پیگیری' : 'ثبت فعالیت و برنامه پیگیری جدید'}
            </h2>
            {order && (
              <p className="quick-activity-modal__subtitle">
                سفارش
                {' '}
                {order.customer}
              </p>
            )}
          </div>
          <button type="button" className="quick-activity-modal__close" onClick={onClose} aria-label="بستن">
            ×
          </button>
        </header>

        <form className="quick-activity-modal__form" onSubmit={handleSubmit}>
          <div className="quick-activity-modal__section">
            <span className="quick-activity-modal__label">نوع فعالیت</span>
            <div className="order-crm-type-tabs" role="tablist" aria-label="نوع فعالیت">
              {CRM_ACTIVITY_ORDER.map((type) => {
                const meta = CRM_ACTIVITY_META[type];
                return (
                  <button
                    key={type}
                    type="button"
                    role="tab"
                    aria-selected={form.type === type}
                    className={`order-crm-type-tabs__btn${form.type === type ? ' is-active' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, type }))}
                  >
                    <span aria-hidden="true">{meta.icon}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          {isPayment ? (
            <div className="quick-activity-modal__payment">
              <p className="quick-activity-modal__payment-title font-meem">اطلاعات دریافت وجه</p>
              <div className="quick-activity-modal__row">
                <label className="quick-activity-modal__field">
                  <span>مبلغ دریافتی (ریال)</span>
                  <MoneyInput
                    className="quick-activity-modal__input"
                    value={form.paymentAmountRial}
                    onChange={(paymentAmountRial) => setForm((prev) => ({ ...prev, paymentAmountRial }))}
                    placeholder="مبلغ"
                  />
                </label>
                <JalaliDatePicker
                  label="تاریخ دریافت"
                  value={form.paymentDate}
                  onChange={(paymentDate) => setForm((prev) => ({ ...prev, paymentDate }))}
                />
              </div>
              <label className="quick-activity-modal__field">
                <span>فیش واریزی (اختیاری)</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="quick-activity-modal__file"
                  onChange={handleReceiptChange}
                />
                {form.receiptFileName ? (
                  <span className="quick-activity-modal__file-name font-vazir">
                    {form.receiptFileName}
                    <button
                      type="button"
                      className="quick-activity-modal__file-clear"
                      onClick={() => setForm((prev) => ({
                        ...prev,
                        receiptFileName: '',
                        receiptFileDataUrl: '',
                        receiptMimeType: '',
                      }))}
                    >
                      حذف
                    </button>
                  </span>
                ) : null}
              </label>
              <label className="quick-activity-modal__field">
                <span>توضیحات (اختیاری)</span>
                <textarea
                  className="quick-activity-modal__textarea"
                  rows={3}
                  value={form.body}
                  onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="شرح دریافت وجه، شماره پیگیری، یا توضیحات تکمیلی..."
                />
              </label>
            </div>
          ) : (
            <>
              <label className="quick-activity-modal__field">
                <span>شرح فعالیت</span>
                <textarea
                  className="quick-activity-modal__textarea"
                  rows={4}
                  value={form.body}
                  onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                  placeholder="توضیحات تماس، یادداشت یا نتیجه تعامل..."
                  required
                />
              </label>

              <div className="quick-activity-modal__row">
                <label className="quick-activity-modal__field">
                  <span>تاریخ پیگیری</span>
                  <input
                    type="date"
                    className="quick-activity-modal__input"
                    value={form.date}
                    onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </label>
                <label className="quick-activity-modal__field">
                  <span>ساعت</span>
                  <input
                    type="time"
                    className="quick-activity-modal__input"
                    value={form.time}
                    onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
                    required
                  />
                </label>
              </div>

              <label className="quick-activity-modal__field">
                <span>نوع اقدام</span>
                <select
                  className="quick-activity-modal__input"
                  value={form.actionType}
                  onChange={(e) => setForm((prev) => ({ ...prev, actionType: e.target.value }))}
                >
                  {CRM_FOLLOW_UP_ACTIONS.map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </label>

              <label className="quick-activity-modal__field">
                <span>مسئول پیگیری</span>
                <select
                  className="quick-activity-modal__input"
                  value={form.assignee}
                  onChange={(e) => setForm((prev) => ({ ...prev, assignee: e.target.value }))}
                >
                  {CRM_ASSIGNEE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.label}>{option.label}</option>
                  ))}
                </select>
              </label>
            </>
          )}

          <div className="quick-activity-modal__actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>
              انصراف
            </button>
            <button type="submit" className="btn btn--primary">
              {editActivity ? 'ذخیره تغییرات' : (isPayment ? 'ثبت دریافت وجه' : 'ثبت فعالیت')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
