import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Type,
  AlignLeft,
  ListOrdered,
  Star,
  Upload,
  Trash2,
  Plus,
  ChevronRight,
  GripVertical,
  Check,
} from 'lucide-react';
import { SURVEY_FORMS } from './surveyForms';
import { FIELD_TYPES, createBlock, createEmptySurvey } from './surveyBuilderData';
import './mowj.css';
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

function AppleToggle({ on, onChange, label }) {
  return (
    <button
      type="button"
      className={`svb-toggle${on ? ' is-on' : ''}`}
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
    >
      <span className="svb-toggle__track" aria-hidden="true">
        <span className="svb-toggle__knob" />
      </span>
      <span className="svb-toggle__label font-meem">{label}</span>
    </button>
  );
}

function PreviewControl({ block }) {
  if (block.type === 'short_text') {
    return <div className="svb-preview-input font-meem">پاسخ کوتاه…</div>;
  }
  if (block.type === 'paragraph') {
    return <div className="svb-preview-textarea font-meem">پاسخ چندخطی…</div>;
  }
  if (block.type === 'multiple_choice') {
    return (
      <ul className="svb-preview-choices">
        {(block.options || []).map((opt, i) => (
          <li key={`${block.id}-opt-${i}`} className="svb-preview-choice font-meem">
            <span className="svb-preview-choice__dot" aria-hidden="true" />
            {opt}
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === 'rating') {
    return (
      <div className="svb-preview-nps" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i} className="svb-preview-nps__cell font-yekan">
            {i.toLocaleString('fa-IR')}
          </span>
        ))}
      </div>
    );
  }
  return (
    <div className="svb-preview-upload font-meem">
      <Upload size={18} strokeWidth={1.75} aria-hidden="true" />
      <span>برای بارگذاری کلیک کنید</span>
    </div>
  );
}

function QuestionBlock({
  block,
  index,
  active,
  onActivate,
  onChange,
  onDelete,
}) {
  const meta = fieldMeta(block.type);
  const IconComp = TYPE_ICONS[meta.icon] || Type;

  const patchOption = (optIndex, value) => {
    const next = [...(block.options || [])];
    next[optIndex] = value;
    onChange({ options: next });
  };

  const addOption = () => {
    const next = [...(block.options || []), `گزینه ${(block.options?.length || 0) + 1}`];
    onChange({ options: next });
  };

  const removeOption = (optIndex) => {
    const next = (block.options || []).filter((_, i) => i !== optIndex);
    onChange({ options: next.length ? next : ['گزینه ۱'] });
  };

  return (
    <article
      className={`svb-block${active ? ' is-active' : ''}`}
      onClick={() => onActivate(block.id)}
      role="group"
      aria-label={`سؤال ${(index + 1).toLocaleString('fa-IR')}`}
    >
      <div className="svb-block__chrome">
        <span className="svb-block__grip" aria-hidden="true">
          <GripVertical size={14} strokeWidth={1.75} />
        </span>
        <span className="svb-block__type">
          <IconComp size={14} strokeWidth={1.75} aria-hidden="true" />
          <span className="font-meem">{meta.label}</span>
        </span>
        <span className="svb-block__index font-yekan">
          {(index + 1).toLocaleString('fa-IR')}
        </span>
      </div>

      {active ? (
        <input
          type="text"
          className="svb-block__question-input font-meem"
          value={block.question}
          onChange={(e) => onChange({ question: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="متن سؤال را بنویسید…"
          autoFocus
        />
      ) : (
        <p className="svb-block__question font-meem">
          {block.question || 'بدون عنوان'}
          {block.required ? <span className="svb-block__req" aria-hidden="true">*</span> : null}
        </p>
      )}

      <div className="svb-block__preview">
        {block.type === 'multiple_choice' && active ? (
          <div className="svb-options-edit" onClick={(e) => e.stopPropagation()}>
            {(block.options || []).map((opt, i) => (
              <div key={`${block.id}-edit-${i}`} className="svb-options-edit__row">
                <span className="svb-preview-choice__dot" aria-hidden="true" />
                <input
                  type="text"
                  className="svb-options-edit__input font-meem"
                  value={opt}
                  onChange={(e) => patchOption(i, e.target.value)}
                />
                <button
                  type="button"
                  className="svb-icon-btn"
                  aria-label="حذف گزینه"
                  onClick={() => removeOption(i)}
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                </button>
              </div>
            ))}
            <button type="button" className="svb-add-option font-meem" onClick={addOption}>
              <Plus size={14} strokeWidth={1.75} aria-hidden="true" />
              افزودن گزینه
            </button>
          </div>
        ) : (
          <PreviewControl block={block} />
        )}
      </div>

      {active ? (
        <footer className="svb-block__settings" onClick={(e) => e.stopPropagation()}>
          <AppleToggle
            on={block.required}
            onChange={(v) => onChange({ required: v })}
            label="پاسخ اجباری"
          />
          <button
            type="button"
            className="svb-icon-btn svb-icon-btn--danger"
            aria-label="حذف سؤال"
            onClick={() => onDelete(block.id)}
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        </footer>
      ) : null}
    </article>
  );
}

function AddBlockPopover({ open, onClose, onPick, anchorRef }) {
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (
        popRef.current?.contains(e.target)
        || anchorRef.current?.contains(e.target)
      ) return;
      onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div className="svb-popover" ref={popRef} role="menu" aria-label="انتخاب نوع سؤال">
      <p className="svb-popover__hint font-meem">نوع بلوک را انتخاب کنید</p>
      {FIELD_TYPES.map((type) => {
        const IconComp = TYPE_ICONS[type.icon] || Type;
        return (
          <button
            key={type.id}
            type="button"
            className="svb-popover__item"
            role="menuitem"
            onClick={() => {
              onPick(type.id);
              onClose();
            }}
          >
            <span className="svb-popover__icon">
              <IconComp {...ICON} aria-hidden="true" />
            </span>
            <span className="svb-popover__body">
              <span className="svb-popover__title font-meem">{type.label}</span>
              <span className="svb-popover__sub font-meem">{type.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function SurveyBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const seedId = searchParams.get('id');
  const seedForm = SURVEY_FORMS.find((f) => f.id === seedId);

  const [survey, setSurvey] = useState(() => createEmptySurvey({
    id: seedForm?.id,
    title: seedForm?.label || '',
    welcome: seedForm
      ? `از مشارکت شما در «${seedForm.label}» سپاسگزاریم.`
      : 'سلام! چند سؤال کوتاه داریم.',
  }));
  const [activeId, setActiveId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const addBtnRef = useRef(null);

  // Independent create path removed — edit only with ?id=, or create via Campaign Builder drawer.
  if (!seedId) {
    return <Navigate to="/mowj" replace />;
  }

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
  };

  const deleteBlock = (id) => {
    setSurvey((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((b) => b.id !== id),
    }));
    setActiveId((cur) => (cur === id ? null : cur));
  };

  const handleSave = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  return (
    <div
      className="module-page svb-page"
      data-module="mowj-survey"
      dir="rtl"
      onClick={() => {
        setActiveId(null);
        setMenuOpen(false);
      }}
    >
      <div className="svb-topbar" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="mowj-btn mowj-btn--ghost"
          onClick={() => navigate('/mowj')}
        >
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
          بازگشت به موج
        </button>
        <div className="svb-topbar__actions">
          {savedFlash ? (
            <span className="svb-saved font-meem">
              <Check size={14} strokeWidth={2} aria-hidden="true" />
              ذخیره شد
            </span>
          ) : null}
          <button
            type="button"
            className="mowj-btn mowj-btn--primary"
            onClick={handleSave}
          >
            ذخیره فرم
          </button>
        </div>
      </div>

      <div className="svb-canvas" onClick={(e) => e.stopPropagation()}>
        <header className="svb-intro">
          <input
            type="text"
            className="svb-title-input font-meem"
            placeholder="نام نظرسنجی"
            value={survey.title}
            onChange={(e) => patchSurvey({ title: e.target.value })}
            onFocus={() => setActiveId(null)}
          />
          <textarea
            className="svb-welcome-input font-meem"
            placeholder="متن خوش‌آمدگویی…"
            rows={2}
            value={survey.welcome}
            onChange={(e) => patchSurvey({ welcome: e.target.value })}
            onFocus={() => setActiveId(null)}
          />
        </header>

        <section className="svb-blocks" aria-label="سؤالات فرم">
          {survey.blocks.map((block, index) => (
            <QuestionBlock
              key={block.id}
              block={block}
              index={index}
              active={activeId === block.id}
              onActivate={setActiveId}
              onChange={(partial) => patchBlock(block.id, partial)}
              onDelete={deleteBlock}
            />
          ))}

          {!survey.blocks.length ? (
            <p className="svb-empty font-meem">
              هنوز سؤالی اضافه نشده. با دکمه زیر اولین بلوک را بسازید.
            </p>
          ) : null}
        </section>

        <div className="svb-add-wrap" ref={addBtnRef}>
          <button
            type="button"
            className={`svb-add-btn${menuOpen ? ' is-open' : ''}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => {
              setActiveId(null);
              setMenuOpen((v) => !v);
            }}
          >
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
            <span className="font-meem">افزودن سوال جدید</span>
          </button>
          <AddBlockPopover
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onPick={addBlock}
            anchorRef={addBtnRef}
          />
        </div>

        <footer className="svb-outro">
          <label className="svb-outro__label font-meem" htmlFor="svb-thanks">
            متن پایان / تشکر
          </label>
          <textarea
            id="svb-thanks"
            className="svb-thanks-input font-meem"
            rows={2}
            placeholder="پیام پایانی پس از ارسال پاسخ…"
            value={survey.thankYou}
            onChange={(e) => patchSurvey({ thankYou: e.target.value })}
            onFocus={() => setActiveId(null)}
          />
        </footer>
      </div>
    </div>
  );
}
