import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Save, X } from 'lucide-react';
import {
  TEMPLATE_STATUS,
  TEMPLATE_TYPE,
  TEMPLATE_TYPE_LABELS,
} from './domain';
import { saveTemplate } from './services/campaignFacade';
import { SURVEY_FORMS } from './surveyForms';

const ICON = { size: 16, strokeWidth: 1.75 };

function emptyContent(type) {
  if (type === TEMPLATE_TYPE.SURVEY_TEMPLATE) {
    return { surveyFormId: SURVEY_FORMS[0]?.id || 'nps_delivery', intro: '' };
  }
  if (type === TEMPLATE_TYPE.TASK_TEMPLATE) {
    return { title: '', description: '', priority: 'normal' };
  }
  if (type === TEMPLATE_TYPE.PHYSICAL_TEMPLATE) {
    return { instructions: '', itemLabel: '' };
  }
  return { body: '', subject: '' };
}

/**
 * Quick template creator opened from Campaign Builder (non-survey types).
 * Template type is locked from campaign action compatibility.
 * Survey forms use SurveyFormCreateDrawer instead.
 */
export default function TemplateQuickCreateDrawer({
  open,
  onClose,
  onSaved,
  lockedType = TEMPLATE_TYPE.MESSAGE_TEMPLATE,
}) {
  const [name, setName] = useState('');
  const [content, setContent] = useState(() => emptyContent(lockedType));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    setName('');
    setContent(emptyContent(lockedType));
    setError(null);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, lockedType, onClose]);

  if (!open) return null;

  const patchContent = (partial) => setContent((prev) => ({ ...prev, ...partial }));

  const handleSave = () => {
    setError(null);
    const trimmed = String(name || '').trim();
    if (!trimmed) {
      setError('نام قالب الزامی است.');
      return;
    }
    const saved = saveTemplate({
      name: trimmed,
      type: lockedType,
      status: TEMPLATE_STATUS.ACTIVE,
      content,
      variables: [],
    });
    if (!saved) {
      setError('ذخیره قالب ناموفق بود. فیلدهای الزامی را کامل کنید.');
      return;
    }
    onSaved?.(saved);
    onClose?.();
  };

  const title = `ساخت ${TEMPLATE_TYPE_LABELS[lockedType] || 'قالب'}`;

  return createPortal(
    <div className="mowj-drawer-root" dir="rtl">
      <button type="button" className="mowj-drawer-backdrop" aria-label="بستن" onClick={onClose} />
      <aside
        className="mowj-drawer mowj-audience-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="mowj-drawer__head">
          <div>
            <h2 className="mowj-drawer__title font-meem">{title}</h2>
            <p className="mowj-drawer__sub font-meem">
              نوع قالب از کمپین تعیین شده:
              {' '}
              {TEMPLATE_TYPE_LABELS[lockedType] || lockedType}
            </p>
          </div>
          <button type="button" className="mowj-drawer__close" aria-label="بستن" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <div className="mowj-drawer__body">
          {error ? <p className="mowj-form-error font-meem" role="alert">{error}</p> : null}

          <label className="mowj-field font-meem">
            نام قالب
            <input
              className="mowj-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً پیام موجودی انبار"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </label>

          {lockedType === TEMPLATE_TYPE.MESSAGE_TEMPLATE ? (
            <>
              <label className="mowj-field font-meem">
                موضوع (اختیاری)
                <input
                  className="mowj-input"
                  value={content.subject || ''}
                  onChange={(e) => patchContent({ subject: e.target.value })}
                />
              </label>
              <label className="mowj-field font-meem">
                متن پیام
                <textarea
                  className="mowj-input mowj-textarea"
                  rows={5}
                  value={content.body || ''}
                  onChange={(e) => patchContent({ body: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {lockedType === TEMPLATE_TYPE.SURVEY_TEMPLATE ? (
            <>
              <label className="mowj-field font-meem">
                فرم نظرسنجی
                <select
                  className="mowj-select"
                  value={content.surveyFormId || ''}
                  onChange={(e) => patchContent({ surveyFormId: e.target.value })}
                >
                  {SURVEY_FORMS.map((form) => (
                    <option key={form.id} value={form.id}>{form.label || form.name || form.id}</option>
                  ))}
                </select>
              </label>
              <label className="mowj-field font-meem">
                مقدمه (اختیاری)
                <textarea
                  className="mowj-input mowj-textarea"
                  rows={3}
                  value={content.intro || ''}
                  onChange={(e) => patchContent({ intro: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {lockedType === TEMPLATE_TYPE.TASK_TEMPLATE ? (
            <>
              <label className="mowj-field font-meem">
                عنوان وظیفه
                <input
                  className="mowj-input"
                  value={content.title || ''}
                  onChange={(e) => patchContent({ title: e.target.value })}
                />
              </label>
              <label className="mowj-field font-meem">
                شرح
                <textarea
                  className="mowj-input mowj-textarea"
                  rows={4}
                  value={content.description || ''}
                  onChange={(e) => patchContent({ description: e.target.value })}
                />
              </label>
            </>
          ) : null}

          {lockedType === TEMPLATE_TYPE.PHYSICAL_TEMPLATE ? (
            <>
              <label className="mowj-field font-meem">
                عنوان اقلام
                <input
                  className="mowj-input"
                  value={content.itemLabel || ''}
                  onChange={(e) => patchContent({ itemLabel: e.target.value })}
                />
              </label>
              <label className="mowj-field font-meem">
                دستورالعمل
                <textarea
                  className="mowj-input mowj-textarea"
                  rows={4}
                  value={content.instructions || ''}
                  onChange={(e) => patchContent({ instructions: e.target.value })}
                />
              </label>
            </>
          ) : null}
        </div>

        <footer className="mowj-drawer__foot">
          <button type="button" className="mowj-btn mowj-btn--ghost" onClick={onClose}>
            انصراف
          </button>
          <button type="button" className="mowj-btn mowj-btn--launch" onClick={handleSave}>
            <Save {...ICON} aria-hidden="true" />
            ذخیره و انتخاب برای کمپین
          </button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
