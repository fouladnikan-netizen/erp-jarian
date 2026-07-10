import { useState } from 'react';
import { CURRENT_USER, CURRENT_USER_ROLE } from '../../../constants';
import {
  CRM_ACTIVITY_ORDER,
  CRM_ACTIVITY_META,
  CRM_ACTIVITY_TYPES,
  CRM_FOLLOW_UP_ACTIONS,
} from '../../../orderCrmConfig';
import { getRoleLabel } from '../../../orderCrmService';
import MentionTextarea from './MentionTextarea';

const INITIAL_FOLLOW_UP = {
  date: '',
  time: '',
  actionType: CRM_FOLLOW_UP_ACTIONS[0],
  title: '',
};

export default function ActivityComposer({ onSubmit }) {
  const [activityType, setActivityType] = useState(CRM_ACTIVITY_TYPES.CALL);
  const [body, setBody] = useState('');
  const [needsFollowUp, setNeedsFollowUp] = useState(false);
  const [followUp, setFollowUp] = useState(INITIAL_FOLLOW_UP);

  const resetForm = () => {
    setBody('');
    setNeedsFollowUp(false);
    setFollowUp(INITIAL_FOLLOW_UP);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedBody = body.trim();
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
                    onChange={(e) => setFollowUp((prev) => ({ ...prev, date: e.target.value }))}
                    required={needsFollowUp}
                  />
                </label>
                <label className="order-crm-field">
                  <span>ساعت</span>
                  <input
                    type="time"
                    className="order-crm-field__input"
                    value={followUp.time}
                    onChange={(e) => setFollowUp((prev) => ({ ...prev, time: e.target.value }))}
                    required={needsFollowUp}
                  />
                </label>
              </div>
              <label className="order-crm-field">
                <span>نوع اقدام بعدی</span>
                <select
                  className="order-crm-field__input"
                  value={followUp.actionType}
                  onChange={(e) => setFollowUp((prev) => ({ ...prev, actionType: e.target.value }))}
                >
                  {CRM_FOLLOW_UP_ACTIONS.map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </label>
              <label className="order-crm-field">
                <span>عنوان پیگیری (اختیاری)</span>
                <input
                  type="text"
                  className="order-crm-field__input"
                  value={followUp.title}
                  onChange={(e) => setFollowUp((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="مثلاً پیگیری تایید پیش‌فاکتور"
                />
              </label>
            </div>
          )}
        </div>

        <div className="order-crm-composer__actions">
          <button
            type="submit"
            className="btn btn--primary order-crm-composer__submit"
            disabled={!body.trim()}
          >
            ثبت تعامل و تنظیم یادآور
          </button>
        </div>
      </form>
    </section>
  );
}
