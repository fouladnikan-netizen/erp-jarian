import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Filter,
  Zap,
  ClipboardCheck,
  ChevronLeft,
  ChevronRight,
  Check,
  MessageSquare,
  Mail,
  Smartphone,
  ListTodo,
} from 'lucide-react';
import {
  ACTION_OPTIONS,
  CAMPAIGN_TYPES,
  SURVEY_FORMS,
  TRIGGER_OPTIONS,
  createEmptyDraft,
  findLabel,
} from './campaignsData';

const ICON = { size: 16, strokeWidth: 1.75 };

const ACTION_ICONS = {
  sms: Smartphone,
  whatsapp_survey: MessageSquare,
  email: Mail,
  internal_task: ListTodo,
};

const STEPS = [
  { id: 1, title: 'شرایط اجرا', subtitle: 'رویداد آغازگر قانون', Icon: Filter },
  { id: 2, title: 'نوع اقدام', subtitle: 'کانال و محتوای اقدام', Icon: Zap },
  { id: 3, title: 'گزارش و اجرا', subtitle: 'بازبینی و فعال‌سازی', Icon: ClipboardCheck },
];

function OptionCard({ selected, title, hint, onClick, icon: IconComp }) {
  return (
    <button
      type="button"
      className={`kampayn-option${selected ? ' is-selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {IconComp ? (
        <span className="kampayn-option__icon">
          <IconComp {...ICON} aria-hidden="true" />
        </span>
      ) : null}
      <span className="kampayn-option__body">
        <span className="kampayn-option__title font-meem">{title}</span>
        {hint ? <span className="kampayn-option__hint">{hint}</span> : null}
      </span>
      {selected ? (
        <span className="kampayn-option__check" aria-hidden="true">
          <Check size={14} strokeWidth={2} />
        </span>
      ) : null}
    </button>
  );
}

export default function CampaignBuilderDrawer({ open, onClose, onActivate }) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(createEmptyDraft);

  useEffect(() => {
    if (!open) return undefined;
    setStep(1);
    setDraft(createEmptyDraft());
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const needsSurvey = draft.actionId === 'whatsapp_survey' || draft.actionId === 'email';
  const canNext = useMemo(() => {
    if (step === 1) return Boolean(draft.triggerId);
    if (step === 2) {
      if (!draft.actionId) return false;
      if (needsSurvey && !draft.surveyId) return false;
      return true;
    }
    return Boolean(draft.name.trim());
  }, [step, draft, needsSurvey]);

  if (!open) return null;

  const patch = (partial) => setDraft((prev) => ({ ...prev, ...partial }));

  const handleActivate = () => {
    if (!draft.name.trim()) return;
    onActivate({
      ...draft,
      name: draft.name.trim(),
      status: 'active',
      responseRate: 0,
      conversionRate: 0,
    });
  };

  return createPortal(
    <div className="kampayn-drawer-root" dir="rtl">
      <button type="button" className="kampayn-drawer-backdrop" aria-label="بستن" onClick={onClose} />
      <aside className="kampayn-drawer" role="dialog" aria-modal="true" aria-label="ایجاد کمپین جدید">
        <header className="kampayn-drawer__head">
          <div>
            <h2 className="kampayn-drawer__title font-meem">ایجاد کمپین جدید</h2>
            <p className="kampayn-drawer__sub font-meem">موتور قوانین — شرط، اقدام، اجرا</p>
          </div>
          <button type="button" className="kampayn-drawer__close" aria-label="بستن" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <nav className="kampayn-steps" aria-label="مراحل ساخت کمپین">
          {STEPS.map(({ id, title, Icon }) => (
            <button
              key={id}
              type="button"
              className={`kampayn-steps__item${step === id ? ' is-active' : ''}${step > id ? ' is-done' : ''}`}
              onClick={() => setStep(id)}
            >
              <span className="kampayn-steps__num font-yekan">{id.toLocaleString('fa-IR')}</span>
              <Icon {...ICON} aria-hidden="true" />
              <span className="font-meem">{title}</span>
            </button>
          ))}
        </nav>

        <div className="kampayn-drawer__body">
          {step === 1 ? (
            <section className="kampayn-block">
              <header className="kampayn-block__head">
                <Filter {...ICON} aria-hidden="true" />
                <div>
                  <h3 className="font-meem">شرایط اجرا</h3>
                  <p>رویداد آغازگر را انتخاب کنید</p>
                </div>
              </header>
              <div className="kampayn-option-grid">
                {TRIGGER_OPTIONS.map((opt) => (
                  <OptionCard
                    key={opt.id}
                    selected={draft.triggerId === opt.id}
                    title={opt.label}
                    hint={opt.hint}
                    onClick={() => patch({ triggerId: opt.id })}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="kampayn-block">
              <header className="kampayn-block__head">
                <Zap {...ICON} aria-hidden="true" />
                <div>
                  <h3 className="font-meem">نوع اقدام</h3>
                  <p>کانال اجرا و در صورت نیاز فرم پیوست</p>
                </div>
              </header>

              <div className="kampayn-field">
                <label className="font-meem" htmlFor="kampayn-type">نوع کمپین</label>
                <select
                  id="kampayn-type"
                  className="kampayn-select"
                  value={draft.type}
                  onChange={(e) => patch({ type: e.target.value })}
                >
                  {Object.values(CAMPAIGN_TYPES).map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="kampayn-option-grid">
                {ACTION_OPTIONS.map((opt) => {
                  const IconComp = ACTION_ICONS[opt.id] || Zap;
                  return (
                    <OptionCard
                      key={opt.id}
                      selected={draft.actionId === opt.id}
                      title={opt.label}
                      hint={opt.hint}
                      icon={IconComp}
                      onClick={() => patch({
                        actionId: opt.id,
                        surveyId: (opt.id === 'whatsapp_survey' || opt.id === 'email')
                          ? (draft.surveyId || SURVEY_FORMS[0].id)
                          : null,
                      })}
                    />
                  );
                })}
              </div>

              {needsSurvey ? (
                <div className="kampayn-field">
                  <label className="font-meem" htmlFor="kampayn-survey">فرم نظرسنجی پیوست</label>
                  <select
                    id="kampayn-survey"
                    className="kampayn-select"
                    value={draft.surveyId || ''}
                    onChange={(e) => patch({ surveyId: e.target.value })}
                  >
                    {SURVEY_FORMS.map((form) => (
                      <option key={form.id} value={form.id}>{form.label}</option>
                    ))}
                  </select>
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 3 ? (
            <section className="kampayn-block">
              <header className="kampayn-block__head">
                <ClipboardCheck {...ICON} aria-hidden="true" />
                <div>
                  <h3 className="font-meem">گزارش و اجرا</h3>
                  <p>خلاصه قانون را بررسی و فعال کنید</p>
                </div>
              </header>

              <div className="kampayn-field">
                <label className="font-meem" htmlFor="kampayn-name">نام کمپین</label>
                <input
                  id="kampayn-name"
                  className="kampayn-input"
                  value={draft.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  placeholder="مثلاً: نظرسنجی پس از ارسال بار"
                  autoFocus
                />
              </div>

              <dl className="kampayn-summary">
                <div>
                  <dt>نوع</dt>
                  <dd className="font-meem">{CAMPAIGN_TYPES[draft.type]?.label}</dd>
                </div>
                <div>
                  <dt>شرط اجرا</dt>
                  <dd className="font-meem">{findLabel(TRIGGER_OPTIONS, draft.triggerId)}</dd>
                </div>
                <div>
                  <dt>اقدام</dt>
                  <dd className="font-meem">{findLabel(ACTION_OPTIONS, draft.actionId)}</dd>
                </div>
                {needsSurvey ? (
                  <div>
                    <dt>فرم پیوست</dt>
                    <dd className="font-meem">{findLabel(SURVEY_FORMS, draft.surveyId)}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          ) : null}
        </div>

        <footer className="kampayn-drawer__foot">
          <button
            type="button"
            className="kampayn-btn kampayn-btn--ghost"
            onClick={() => (step === 1 ? onClose() : setStep((s) => s - 1))}
          >
            <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            {step === 1 ? 'انصراف' : 'قبلی'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              className="kampayn-btn kampayn-btn--primary"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              بعدی
              <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              className="kampayn-btn kampayn-btn--launch"
              disabled={!canNext}
              onClick={handleActivate}
            >
              فعال‌سازی کمپین
              <Zap size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          )}
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
