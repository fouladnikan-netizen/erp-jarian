import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Save,
  Type,
  AlignLeft,
  ListOrdered,
  Star,
  Upload,
  Trash2,
  X,
} from 'lucide-react';
import { TEMPLATE_STATUS, TEMPLATE_TYPE } from './domain';
import { saveTemplate } from './services/campaignFacade';
import { FIELD_TYPES, createBlock, createEmptySurvey } from './surveyBuilderData';
import './survey-builder.css';

const ICON = { size: 16, strokeWidth: 1.75 };

const TYPE_ICONS = {
  Type,
  AlignLeft,
  ListOrdered,
  Star,
  Upload,
};

function fieldMeta(typeId) {
  return FIELD_TYPES.find((t) => t.id === typeId) || FIELD_TYPES[0];
}

function slugify(title) {
  const base = String(title || 'survey')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w\u0600-\u06FF_-]/g, '')
    .slice(0, 40);
  return `${base || 'survey'}_${Date.now().toString(36)}`;
}

/**
 * Survey form creator — only opened from Campaign Builder (SURVEY campaigns).
 * Saves as SURVEY_TEMPLATE and returns selection to the campaign draft.
 */
export default function SurveyFormCreateDrawer({
  open,
  onClose,
  onSaved,
}) {
  const [survey, setSurvey] = useState(() => createEmptySurvey());
  const [activeId, setActiveId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState(null);
  const addBtnRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setSurvey(createEmptySurvey({
      title: '',
      welcome: 'سلام! چند سؤال کوتاه داریم.',
    }));
    setActiveId(null);
    setMenuOpen(false);
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
  }, [open, onClose]);

  if (!open) return null;

  const patchSurvey = (partial) => setSurvey((prev) => ({ ...prev, ...partial }));

  const patchBlock = (id, partial) => {
    setSurvey((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...partial } : b)),
    }));
  };

  const addBlock = (typeId) => {
    const block = createBlock(typeId);
    setSurvey((prev) => ({ ...prev, blocks: [...prev.blocks, block] }));
    setActiveId(block.id);
    setMenuOpen(false);
  };

  const deleteBlock = (id) => {
    setSurvey((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
    setActiveId((cur) => (cur === id ? null : cur));
  };

  const handleSave = () => {
    setError(null);
    const title = String(survey.title || '').trim();
    if (!title) {
      setError('نام فرم نظرسنجی الزامی است.');
      return;
    }
    const formId = slugify(title);
    const saved = saveTemplate({
      name: title,
      type: TEMPLATE_TYPE.SURVEY_TEMPLATE,
      status: TEMPLATE_STATUS.ACTIVE,
      content: {
        surveyFormId: formId,
        intro: survey.welcome || '',
        thankYou: survey.thankYou || '',
        blocks: survey.blocks || [],
      },
      variables: [],
    });
    if (!saved) {
      setError('ذخیره فرم به‌عنوان قالب ناموفق بود.');
      return;
    }
    onSaved?.(saved);
    onClose?.();
  };

  return createPortal(
    <div className="mowj-drawer-root" dir="rtl">
      <button type="button" className="mowj-drawer-backdrop" aria-label="بستن" onClick={onClose} />
      <aside
        className="mowj-drawer mowj-audience-drawer svb-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="ساخت فرم نظرسنجی"
      >
        <header className="mowj-drawer__head">
          <div>
            <h2 className="mowj-drawer__title font-meem">ساخت فرم نظرسنجی</h2>
            <p className="mowj-drawer__sub font-meem">
              پس از ذخیره به‌عنوان قالب نظرسنجی به کمپین برمی‌گردید
            </p>
          </div>
          <button type="button" className="mowj-drawer__close" aria-label="بستن" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </header>

        <div className="mowj-drawer__body" onClick={() => { setActiveId(null); setMenuOpen(false); }}>
          {error ? <p className="mowj-form-error font-meem" role="alert">{error}</p> : null}

          <div className="svb-canvas svb-canvas--embedded" onClick={(e) => e.stopPropagation()}>
            <header className="svb-intro">
              <input
                type="text"
                className="svb-title-input font-meem"
                placeholder="نام نظرسنجی"
                value={survey.title}
                onChange={(e) => patchSurvey({ title: e.target.value })}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <textarea
                className="svb-welcome-input font-meem"
                placeholder="متن خوش‌آمدگویی…"
                rows={2}
                value={survey.welcome}
                onChange={(e) => patchSurvey({ welcome: e.target.value })}
              />
            </header>

            <section className="svb-blocks" aria-label="سؤالات فرم">
              {survey.blocks.map((block, index) => {
                const meta = fieldMeta(block.type);
                const IconComp = TYPE_ICONS[meta.icon] || Type;
                const active = activeId === block.id;
                return (
                  <article
                    key={block.id}
                    className={`svb-block${active ? ' is-active' : ''}`}
                    onClick={() => setActiveId(block.id)}
                  >
                    <header className="svb-block__head">
                      <span className="svb-block__type font-meem">
                        <IconComp size={14} strokeWidth={1.75} aria-hidden="true" />
                        {meta.label}
                        {' · '}
                        {(index + 1).toLocaleString('fa-IR')}
                      </span>
                      <button
                        type="button"
                        className="mowj-icon-btn"
                        aria-label="حذف سؤال"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBlock(block.id);
                        }}
                      >
                        <Trash2 size={14} strokeWidth={1.75} />
                      </button>
                    </header>
                    <input
                      className="mowj-input"
                      value={block.label || ''}
                      onChange={(e) => patchBlock(block.id, { label: e.target.value })}
                      placeholder="متن سؤال"
                    />
                  </article>
                );
              })}
              {!survey.blocks.length ? (
                <p className="svb-empty font-meem">هنوز سؤالی اضافه نشده.</p>
              ) : null}
            </section>

            <div className="svb-add-wrap" ref={addBtnRef}>
              <button
                type="button"
                className={`svb-add-btn${menuOpen ? ' is-open' : ''}`}
                onClick={() => setMenuOpen((v) => !v)}
              >
                <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
                <span className="font-meem">افزودن سوال</span>
              </button>
              {menuOpen ? (
                <div className="svb-popover" role="menu">
                  {FIELD_TYPES.map((type) => {
                    const IconComp = TYPE_ICONS[type.icon] || Type;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        className="svb-popover__item"
                        onClick={() => addBlock(type.id)}
                      >
                        <span className="svb-popover__icon">
                          <IconComp {...ICON} aria-hidden="true" />
                        </span>
                        <span className="svb-popover__title font-meem">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
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
