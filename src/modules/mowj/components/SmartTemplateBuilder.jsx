import { useMemo, useRef, useState } from 'react';
import { Eye, Search, AlertTriangle } from 'lucide-react';
import { TEMPLATE_TYPE } from '../domain';
import {
  findUnknownVariableTokens,
  listTemplateVariableCategories,
} from '../templateVariableRegistry';
import { renderTemplatePreviewMock } from '../templatePreview.mock';

const ICON = { size: 16, strokeWidth: 1.75 };

/**
 * Insert text at textarea cursor.
 * @param {HTMLTextAreaElement|null} el
 * @param {string} text
 * @param {string} current
 */
function insertAtCursor(el, text, current) {
  if (!el) {
    return `${current || ''}${text}`;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? start;
  const next = `${current.slice(0, start)}${text}${current.slice(end)}`;
  const cursor = start + text.length;
  window.requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(cursor, cursor);
  });
  return next;
}

/**
 * Smart Template Builder — registry-driven variable panel + editor.
 * Preview uses mock data only; no send/render engine.
 *
 * @param {{
 *   templateType?: string,
 *   value: string,
 *   onChange: (next: string) => void,
 *   label?: string,
 *   placeholder?: string,
 *   rows?: number,
 *   id?: string,
 * }} props
 */
export default function SmartTemplateBuilder({
  templateType = TEMPLATE_TYPE.MESSAGE_TEMPLATE,
  value,
  onChange,
  label = 'متن پیام',
  placeholder = 'متن پیام را بنویسید…',
  rows = 8,
  id = 'smart-template-body',
}) {
  const textareaRef = useRef(null);
  const [query, setQuery] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  const categories = useMemo(
    () => listTemplateVariableCategories(templateType, { query }),
    [templateType, query],
  );

  const unknownTokens = useMemo(
    () => findUnknownVariableTokens(value),
    [value],
  );

  const previewText = useMemo(
    () => renderTemplatePreviewMock(value),
    [value],
  );

  const handleInsertVariable = (token) => {
    const next = insertAtCursor(textareaRef.current, token, value || '');
    onChange(next);
  };

  return (
    <div className="mowj-smart-template">
      <div className="mowj-smart-template__layout">
        <section className="mowj-smart-template__editor" aria-label={label}>
          <div className="mowj-smart-template__editor-head">
            <label className="font-meem" htmlFor={id}>{label}</label>
            <button
              type="button"
              className="mowj-btn mowj-btn--ghost mowj-smart-template__preview-btn font-meem"
              onClick={() => setPreviewOpen((open) => !open)}
              aria-pressed={previewOpen}
            >
              <Eye {...ICON} aria-hidden="true" />
              پیش‌نمایش
            </button>
          </div>

          <textarea
            ref={textareaRef}
            id={id}
            className="mowj-input mowj-textarea mowj-smart-template__textarea font-meem"
            rows={rows}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            dir="rtl"
          />

          {unknownTokens.length > 0 ? (
            <ul className="mowj-smart-template__warnings" role="alert">
              {unknownTokens.map((token) => (
                <li key={token} className="font-meem">
                  <AlertTriangle size={14} strokeWidth={1.75} aria-hidden="true" />
                  متغیر ناشناخته است:
                  {' '}
                  <code>{token}</code>
                </li>
              ))}
            </ul>
          ) : null}

          {previewOpen ? (
            <div className="mowj-smart-template__preview glass-panel">
              <header className="mowj-smart-template__preview-head font-meem">
                پیش‌نمایش (نمونه)
              </header>
              <pre className="mowj-smart-template__preview-body font-meem">{previewText || '—'}</pre>
              <p className="mowj-smart-template__preview-note font-meem">
                داده‌های نمایشی — ارسال انجام نمی‌شود.
              </p>
            </div>
          ) : null}
        </section>

        <aside className="mowj-smart-template__vars glass-panel" aria-label="پنل متغیرها">
          <header className="mowj-smart-template__vars-head">
            <h4 className="font-meem">متغیرها</h4>
            <p className="font-meem">برای درج، روی متغیر کلیک کنید</p>
          </header>

          <label className="mowj-smart-template__search font-meem">
            <Search size={14} strokeWidth={1.75} aria-hidden="true" />
            <input
              type="search"
              className="mowj-input font-meem"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی متغیر…"
              aria-label="جستجوی متغیر"
            />
          </label>

          <div className="mowj-smart-template__categories">
            {categories.map((category) => (
              <section key={category.id} className="mowj-smart-template__category">
                <h5 className="mowj-smart-template__category-title font-meem">{category.label}</h5>
                <ul className="mowj-smart-template__var-list">
                  {category.variables.map((variable) => (
                    <li key={variable.id}>
                      <button
                        type="button"
                        className="mowj-smart-template__var-btn font-meem"
                        title={variable.description || variable.label}
                        onClick={() => handleInsertVariable(variable.token)}
                      >
                        <span className="mowj-smart-template__var-label">{variable.label}</span>
                        <span className="mowj-smart-template__var-token font-yekan" dir="ltr">
                          {variable.token}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {!categories.length ? (
              <p className="mowj-smart-template__empty font-meem">متغیری یافت نشد.</p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
