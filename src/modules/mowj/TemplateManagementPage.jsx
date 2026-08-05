import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, History, ArrowRight, FileText, Filter, Trash2 } from 'lucide-react';
import {
  TEMPLATE_STATUS,
  TEMPLATE_STATUS_LABELS,
  TEMPLATE_TYPE,
  TEMPLATE_TYPE_LABELS,
  TEMPLATE_VARIABLE_CATALOG,
} from './domain';
import {
  createTemplateVersion,
  getTemplate,
  removeTemplateAsset,
  saveTemplate,
  useTemplateList,
} from './services/campaignFacade';
import './mowj.css';

const ICON = { size: 16, strokeWidth: 1.75 };

function StatusBadge({ status }) {
  const label = TEMPLATE_STATUS_LABELS[status] || status;
  return <span className={`mowj-status mowj-status--${String(status || '').toLowerCase()}`}>{label}</span>;
}

export default function TemplateManagementPage() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [flash, setFlash] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const filters = useMemo(
    () => (typeFilter ? { type: typeFilter } : {}),
    [typeFilter],
  );
  const templates = useTemplateList(filters);
  const selected = selectedId ? getTemplate(selectedId) : null;

  const patchForm = (partial) => setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  const patchContent = (partial) => setForm((prev) => (prev ? {
    ...prev,
    content: { ...prev.content, ...partial },
  } : prev));

  const handleSelect = (id) => {
    const tpl = getTemplate(id);
    if (!tpl) return;
    setSelectedId(id);
    setHistoryOpen(false);
    setForm({
      id: tpl.id,
      name: tpl.name,
      type: tpl.type,
      status: tpl.status,
      content: { ...tpl.content },
      variables: [...(tpl.variables || [])],
    });
  };

  const clearSelection = () => {
    setSelectedId(null);
    setHistoryOpen(false);
    setForm(null);
  };

  const handleSave = () => {
    if (!form?.id) return;
    const saved = saveTemplate({
      id: form.id,
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      content: form.content,
      variables: form.variables,
      version: selected?.version,
    });
    if (!saved) {
      setFlash({ tone: 'danger', text: 'اعتبارسنجی قالب ناموفق بود.' });
      return;
    }
    setSelectedId(saved.id);
    setFlash({ tone: 'success', text: `قالب «${saved.name}» ذخیره شد (نسخه ${saved.version}).` });
    handleSelect(saved.id);
  };

  const handleCreateVersion = () => {
    if (!form?.id) {
      setFlash({ tone: 'danger', text: 'ابتدا قالب را ذخیره کنید.' });
      return;
    }
    const result = createTemplateVersion(form.id, {
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      content: form.content,
      variables: form.variables,
    });
    if (!result) {
      setFlash({ tone: 'danger', text: 'ایجاد نسخه ناموفق بود.' });
      return;
    }
    setFlash({
      tone: 'success',
      text: `نسخه v${result.template.version} ایجاد شد. ارجاع‌های قبلی روی نسخه قبل می‌مانند.`,
    });
    handleSelect(result.template.id);
    setHistoryOpen(true);
  };

  const handleRemove = () => {
    if (!form?.id) return;
    const result = removeTemplateAsset(form.id);
    if (!result?.ok) {
      setFlash({ tone: 'danger', text: result?.error || 'حذف ناموفق بود.' });
      return;
    }
    if (result.mode === 'archived') {
      setFlash({
        tone: 'warning',
        text: result.error || 'این مورد در کمپین‌های فعال استفاده شده و قابل حذف نیست.',
      });
      handleSelect(form.id);
      return;
    }
    setFlash({ tone: 'success', text: 'قالب حذف شد.' });
    clearSelection();
  };

  return (
    <div className="module-page mowj-page mowj-detail-page" data-module="mowj" dir="rtl">
      <header className="mowj-detail-hero glass-panel">
        <button
          type="button"
          className="mowj-btn mowj-btn--ghost mowj-detail-back"
          onClick={() => navigate('/mowj')}
        >
          <ArrowRight {...ICON} aria-hidden="true" />
          بازگشت
        </button>
        <div className="mowj-detail-hero__main">
          <div className="mowj-detail-hero__title-row">
            <FileText {...ICON} aria-hidden="true" />
            <h1 className="font-meem">مدیریت قالب‌ها</h1>
          </div>
          <p className="mowj-detail-hero__desc font-meem">
            مدیریت Assetهای قالب — ایجاد قالب فقط از داخل کمپین
          </p>
        </div>
      </header>

      {flash ? (
        <div className={`mowj-detail-flash mowj-detail-flash--${flash.tone} font-meem`} role="status">
          {flash.text}
        </div>
      ) : null}

      <section className="mowj-template-layout">
        <aside className="mowj-detail-card glass-panel">
          <header className="mowj-detail-card__head">
            <h2 className="mowj-detail-card__title font-meem">فهرست قالب‌ها</h2>
            <Filter size={14} strokeWidth={1.75} aria-hidden="true" />
          </header>
          <div className="mowj-field">
            <label className="font-meem" htmlFor="tpl-type-filter">فیلتر نوع</label>
            <select
              id="tpl-type-filter"
              className="mowj-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">همه</option>
              {Object.values(TEMPLATE_TYPE).map((type) => (
                <option key={type} value={type}>{TEMPLATE_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>
          <ul className="mowj-template-list font-meem">
            {templates.map((tpl) => (
              <li key={tpl.id}>
                <button
                  type="button"
                  className={`mowj-template-list__item${selectedId === tpl.id ? ' is-selected' : ''}`}
                  onClick={() => handleSelect(tpl.id)}
                >
                  <span className="mowj-template-list__name">{tpl.name}</span>
                  <span className="mowj-template-list__meta">
                    {tpl.typeLabel}
                    {' · v'}
                    <span className="font-yekan">{Number(tpl.version).toLocaleString('fa-IR')}</span>
                  </span>
                  <StatusBadge status={tpl.status} />
                </button>
              </li>
            ))}
            {!templates.length ? (
              <li className="mowj-results-empty">قالبی یافت نشد.</li>
            ) : null}
          </ul>
        </aside>

        <article className="mowj-detail-card glass-panel">
          {!form ? (
            <p className="mowj-detail-hint font-meem">
              یک قالب را از فهرست انتخاب کنید. ساخت قالب جدید فقط از جریان ایجاد کمپین انجام می‌شود.
            </p>
          ) : (
            <>
          <header className="mowj-detail-card__head">
            <h2 className="mowj-detail-card__title font-meem">ویرایش قالب</h2>
            {selected ? (
              <span className="mowj-table-count font-yekan">
                v{Number(selected.version).toLocaleString('fa-IR')}
              </span>
            ) : null}
          </header>

          <div className="mowj-field">
            <label className="font-meem" htmlFor="tpl-name">نام</label>
            <input
              id="tpl-name"
              className="mowj-input"
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
              placeholder="مثلاً: رضایت مشتری"
            />
          </div>

          <div className="mowj-field">
            <label className="font-meem" htmlFor="tpl-type">نوع</label>
            <select
              id="tpl-type"
              className="mowj-select"
              value={form.type}
              disabled
            >
              {Object.values(TEMPLATE_TYPE).map((type) => (
                <option key={type} value={type}>{TEMPLATE_TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>

          <div className="mowj-field">
            <label className="font-meem" htmlFor="tpl-status">وضعیت</label>
            <select
              id="tpl-status"
              className="mowj-select"
              value={form.status}
              onChange={(e) => patchForm({ status: e.target.value })}
            >
              {Object.values(TEMPLATE_STATUS).map((status) => (
                <option key={status} value={status}>{TEMPLATE_STATUS_LABELS[status]}</option>
              ))}
            </select>
          </div>

          {form.type === TEMPLATE_TYPE.MESSAGE_TEMPLATE ? (
            <>
              <div className="mowj-field">
                <label className="font-meem" htmlFor="tpl-subject">موضوع</label>
                <input
                  id="tpl-subject"
                  className="mowj-input"
                  value={form.content.subject || ''}
                  onChange={(e) => patchContent({ subject: e.target.value })}
                />
              </div>
              <div className="mowj-field">
                <label className="font-meem" htmlFor="tpl-body">متن</label>
                <textarea
                  id="tpl-body"
                  className="mowj-input mowj-textarea"
                  rows={5}
                  value={form.content.body || ''}
                  onChange={(e) => patchContent({ body: e.target.value })}
                />
              </div>
            </>
          ) : null}

          {form.type === TEMPLATE_TYPE.SURVEY_TEMPLATE ? (
            <>
              <div className="mowj-field">
                <label className="font-meem" htmlFor="tpl-survey">شناسه فرم طنین</label>
                <input
                  id="tpl-survey"
                  className="mowj-input"
                  value={form.content.surveyFormId || ''}
                  onChange={(e) => patchContent({ surveyFormId: e.target.value })}
                />
              </div>
              <div className="mowj-field">
                <label className="font-meem" htmlFor="tpl-intro">مقدمه</label>
                <textarea
                  id="tpl-intro"
                  className="mowj-input mowj-textarea"
                  rows={3}
                  value={form.content.intro || ''}
                  onChange={(e) => patchContent({ intro: e.target.value })}
                />
              </div>
            </>
          ) : null}

          {form.type === TEMPLATE_TYPE.TASK_TEMPLATE ? (
            <>
              <div className="mowj-field">
                <label className="font-meem" htmlFor="tpl-title">عنوان وظیفه</label>
                <input
                  id="tpl-title"
                  className="mowj-input"
                  value={form.content.title || ''}
                  onChange={(e) => patchContent({ title: e.target.value })}
                />
              </div>
              <div className="mowj-field">
                <label className="font-meem" htmlFor="tpl-desc">توضیح</label>
                <textarea
                  id="tpl-desc"
                  className="mowj-input mowj-textarea"
                  rows={3}
                  value={form.content.description || ''}
                  onChange={(e) => patchContent({ description: e.target.value })}
                />
              </div>
            </>
          ) : null}

          {form.type === TEMPLATE_TYPE.PHYSICAL_TEMPLATE ? (
            <>
              <div className="mowj-field">
                <label className="font-meem" htmlFor="tpl-item">برچسب اقلام</label>
                <input
                  id="tpl-item"
                  className="mowj-input"
                  value={form.content.itemLabel || ''}
                  onChange={(e) => patchContent({ itemLabel: e.target.value })}
                />
              </div>
              <div className="mowj-field">
                <label className="font-meem" htmlFor="tpl-instr">دستورالعمل</label>
                <textarea
                  id="tpl-instr"
                  className="mowj-input mowj-textarea"
                  rows={4}
                  value={form.content.instructions || ''}
                  onChange={(e) => patchContent({ instructions: e.target.value })}
                />
              </div>
            </>
          ) : null}

          <p className="mowj-detail-hint font-meem">
            متغیرهای مجاز:
            {' '}
            {TEMPLATE_VARIABLE_CATALOG.map((v) => v.token).join(' · ')}
          </p>

          <div className="mowj-detail-actions">
            <button type="button" className="mowj-btn mowj-btn--launch" onClick={handleSave}>
              <Save {...ICON} aria-hidden="true" />
              ذخیره
            </button>
            <button
              type="button"
              className="mowj-btn mowj-btn--ghost"
              onClick={handleCreateVersion}
              disabled={!form.id}
            >
              <History {...ICON} aria-hidden="true" />
              ایجاد نسخه جدید
            </button>
            <button
              type="button"
              className="mowj-btn mowj-btn--ghost"
              onClick={() => setHistoryOpen((v) => !v)}
              disabled={!form.id}
            >
              تاریخچه نسخه
            </button>
            <button
              type="button"
              className="mowj-btn mowj-btn--ghost"
              onClick={handleRemove}
              disabled={!form.id}
            >
              <Trash2 {...ICON} aria-hidden="true" />
              حذف / بایگانی
            </button>
          </div>

          {historyOpen && selected?.versions?.length ? (
            <div className="mowj-table-scroll" style={{ marginTop: '1rem' }}>
              <table className="jarian-table mowj-table">
                <thead>
                  <tr>
                    <th>ردیف</th>
                    <th>نسخه</th>
                    <th>نام</th>
                    <th>تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.versions.map((row, index) => (
                    <tr key={row.id}>
                      <td className="font-yekan">{(index + 1).toLocaleString('fa-IR')}</td>
                      <td className="font-yekan">
                        v{Number(row.version).toLocaleString('fa-IR')}
                      </td>
                      <td className="font-meem">{row.name}</td>
                      <td className="font-yekan">{row.createdAt?.slice(0, 10) || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
            </>
          )}
        </article>
      </section>
    </div>
  );
}
