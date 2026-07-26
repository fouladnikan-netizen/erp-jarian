import { useState } from 'react';
import { CURRENT_USER, CURRENT_USER_ROLE } from '../../../constants';
import {
  CRM_ACTIVITY_ORDER,
  CRM_ACTIVITY_META,
  CRM_ACTIVITY_TYPES,
  CRM_FOLLOW_UP_ACTIONS,
} from '../../../orderCrmConfig';
import { getRoleLabel } from '../../../orderCrmService';
import { parseMoneyInput } from '../../../orderCode';
import JalaliDatePicker from '../../JalaliDatePicker';
import MoneyInput from '../../MoneyInput';
import MentionTextarea from './MentionTextarea';

const INITIAL_FOLLOW_UP = {
  date: '',
  time: '',
  actionType: CRM_FOLLOW_UP_ACTIONS[0],
  title: '',
};

const INITIAL_PAYMENT = {
  amountRial: '',
  date: '',
  receiptFileName: '',
  receiptFileDataUrl: '',
  receiptMimeType: '',
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export default function ActivityComposer({ onSubmit }) {
  const [activityType, setActivityType] = useState(CRM_ACTIVITY_TYPES.CALL);
  const [body, setBody] = useState('');
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  const [followUp, setFollowUp] = useState(INITIAL_FOLLOW_UP);
  const [payment, setPayment] = useState(INITIAL_PAYMENT);

  const isPayment = activityType === CRM_ACTIVITY_TYPES.PAYMENT;

  const resetForm = () => {
    setBody('');
    setNeedsFollowUp(false);
    setFollowUp(INITIAL_FOLLOW_UP);
    setPayment(INITIAL_PAYMENT);
  };

  const handleReceiptChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setPayment((prev) => ({
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
    const trimmedBody = body.trim();

    if (isPayment) {
      const amount = parseMoneyInput(payment.amountRial);
      if (!amount || amount <= 0 || !payment.date) {
        window.alert('برای دریافت وجه، مبلغ و تاریخ را تکمیل کنید.');
        return;
      }
      onSubmit({
        type: activityType,
        body: trimmedBody || 'دریافت وجه',
        author: CURRENT_USER,
        roleLabel: getRoleLabel(CURRENT_USER_ROLE),
        followUp: null,
        payment: {
          amountRial: amount,
          date: payment.date,
          receiptFileName: payment.receiptFileName,
          receiptFileDataUrl: payment.receiptFileDataUrl,
          receiptMimeType: payment.receiptMimeType,
        },
      });
      resetForm();
      return;
    }

    if (!trimmedBody) return;

    if (needsFollowUp && (!followUp.date || !followUp.time || !followUp.actionType)) {
      window.alert('لطفاً تاریخ، ساعت و نوع اقدام بعدی را تکمیل کنید.');
      return;
    }

    onSubmit({
      type: activityType,
      body: trimmedBody,
      author: CURRENT_USER,
      roleLabel: getRoleLabel(CURRENT_USER_ROLE),
      followUp: needsFollowUp
        ? {
          date: followUp.date,
          time: followUp.time,
          actionType: followUp.actionType,
          title: followUp.title.trim() || followUp.actionType,
        }
        : null,
      payment: null,
    });

    resetForm();
  };

  return (
    <section className="order-crm-card order-crm-card--composer order-crm-composer">
      <header className="order-crm-card__head">
        <h2 className="order-crm-card__title">ثبت فعالیت و برنامه پیگیری</h2>
      </header>

      <form className="order-crm-composer__form" onSubmit={handleSubmit}>
        <div className="order-crm-composer__section">
          <span className="order-crm-composer__label">نوع تعامل</span>
          <div className="order-crm-type-tabs" role="tablist" aria-label="نوع تعامل">
            {CRM_ACTIVITY_ORDER.map((type) => {
              const meta = CRM_ACTIVITY_META[type];
              return (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={activityType === type}
                  className={`order-crm-type-tabs__btn${activityType === type ? ' is-active' : ''}`}
                  onClick={() => setActivityType(type)}
                >
                  <span aria-hidden="true">{meta.icon}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {isPayment ? (
          <div className="order-crm-composer__payment">
            <div className="order-crm-followup-fields__row">
              <label className="order-crm-field">
                <span>مبلغ دریافتی (ریال)</span>
                <MoneyInput
                  className="order-crm-field__input"
                  value={payment.amountRial}
                  onChange={(amountRial) => setPayment((prev) => ({ ...prev, amountRial }))}
                  placeholder="مبلغ"
                />
              </label>
              <JalaliDatePicker
                label="تاریخ دریافت"
                value={payment.date}
                onChange={(date) => setPayment((prev) => ({ ...prev, date }))}
              />
            </div>
            <label className="order-crm-field">
              <span>فیش واریزی (اختیاری)</span>
              <input
                type="file"
                accept="image/*,.pdf"
                className="order-crm-field__input"
                onChange={handleReceiptChange}
              />
              {payment.receiptFileName ? (
                <span className="order-crm-composer__file-name font-vazir">{payment.receiptFileName}</span>
              ) : null}
            </label>
            <label className="order-crm-composer__label" htmlFor="crm-payment-body">
              توضیحات (اختیاری)
            </label>
            <MentionTextarea
              id="crm-payment-body"
              value={body}
              onChange={setBody}
              placeholder="شرح دریافت وجه یا شماره پیگیری..."
            />
          </div>
        ) : (
          <>
            <div className="order-crm-composer__section">
              <label className="order-crm-composer__label" htmlFor="crm-activity-body">
                شرح تعامل
              </label>
              <MentionTextarea
                id="crm-activity-body"
                value={body}
                onChange={setBody}
                placeholder="شرح مکالمه، یادداشت یا نتیجه تعامل را بنویسید... (برای منشن از @کاشف یا @شوالیه استفاده کنید)"
              />
            </div>

            <hr className="order-crm-composer__divider" />

            <div className="order-crm-composer__section order-crm-composer__section--followup">
              <label className="order-crm-followup-toggle">
                <input
                  type="checkbox"
                  checked={needsFollowUp}
                  onChange={(event) => setNeedsFollowUp(event.target.checked)}
                />
                <span>تنظیم یادآور</span>
              </label>

              {needsFollowUp && (
                <div className="order-crm-followup-fields">
                  <div className="order-crm-followup-fields__row">
                    <label className="order-crm-field">
                      <span>تاریخ پیگیری</span>
                      <input
                        type="date"
                        className="order-crm-field__input"
                        value={followUp.date}
                        onChange={(event) => setFollowUp((prev) => ({ ...prev, date: event.target.value }))}
                      />
                    </label>
                    <label className="order-crm-field">
                      <span>ساعت</span>
                      <input
                        type="time"
                        className="order-crm-field__input"
                        value={followUp.time}
                        onChange={(event) => setFollowUp((prev) => ({ ...prev, time: event.target.value }))}
                      />
                    </label>
                  </div>
                  <label className="order-crm-field">
                    <span>نوع اقدام</span>
                    <select
                      className="order-crm-field__input"
                      value={followUp.actionType}
                      onChange={(event) => setFollowUp((prev) => ({ ...prev, actionType: event.target.value }))}
                    >
                      {CRM_FOLLOW_UP_ACTIONS.map((action) => (
                        <option key={action} value={action}>{action}</option>
                      ))}
                    </select>
                  </label>
                  <label className="order-crm-field">
                    <span>عنوان یادآور (اختیاری)</span>
                    <input
                      type="text"
                      className="order-crm-field__input"
                      value={followUp.title}
                      onChange={(event) => setFollowUp((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="مثلاً پیگیری تایید پیش‌فاکتور"
                    />
                  </label>
                </div>
              )}
            </div>
          </>
        )}

        <div className="order-crm-composer__actions">
          <button type="submit" className="btn btn--primary">
            {isPayment ? 'ثبت دریافت وجه' : 'ثبت فعالیت'}
          </button>
        </div>
      </form>
    </section>
  );
}
