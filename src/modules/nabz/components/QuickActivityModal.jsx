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

const EMPTY_FORM = {
  type: CRM_ACTIVITY_TYPES.CALL,
  body: '',
  date: '',
  time: '',
  actionType: CRM_FOLLOW_UP_ACTIONS[0],
  title: '',
  assignee: CRM_ASSIGNEE_OPTIONS[0].label,
};

function toIsoDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return '';
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
      });
      return;
    }
    setForm(EMPTY_FORM);
  }, [open, editActivity]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedBody = form.body.trim();
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

          <div className="quick-activity-modal__actions">
            <button type="button" className="btn btn--outline" onClick={onClose}>
              انصراف
            </button>
            <button type="submit" className="btn btn--primary">
              ثبت فعالیت و تنظیم یادآور
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
