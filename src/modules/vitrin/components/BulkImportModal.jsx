import { useState } from 'react';
import { parseBulkImportText } from '../bulkImportParse.js';

const TEMPLATE_XLSX = '/templates/jarian-product-import.xlsx';
const TEMPLATE_CSV = '/templates/jarian-product-import.csv';

const SAMPLE = `groupName,categoryName,typeName,baseUomCode,attr:grade,attr:size
مقاطع فولادی,میلگرد,میلگرد آجدار,PIECE,A2,8`;

/**
 * Bulk Import / Mass Update (product contract, mandatory). CSV/TSV parsing is
 * client-side (no new xlsx dependency); the backend is the single
 * authoritative validate/duplicate-check/apply path — this UI never creates
 * Products itself, only previews (DRY_RUN) then applies via the same API
 * (DDL-24g).
 */
export default function BulkImportModal({ onClose, onRun }) {
  const [csvText, setCsvText] = useState('');
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState('');

  async function onPickFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (/\.xlsx$/i.test(file.name)) {
      setError('فایل اکسل را با «Save As → CSV UTF-8» ذخیره کنید، یا همان CSV تمپلیت را پر کنید. ورود مستقیم xlsx در این پنجره پشتیبانی نمی‌شود.');
      return;
    }
    setCsvText(await file.text());
    setBatch(null);
    setError('');
  }

  async function run(mode) {
    setError('');
    setBusy(true);
    try {
      const rows = parseBulkImportText(csvText);
      const result = await onRun({ mode, rows });
      setBatch(result);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'اجرای ورود دسته‌ای ناموفق بود.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vitrin-modal-overlay" onClick={onClose} role="presentation">
      <div className="vitrin-modal vitrin-modal--wide" role="dialog" aria-modal="true" aria-label="ورود دسته‌ای کالا" onClick={(e) => e.stopPropagation()}>
        <header className="vitrin-modal__header">
          <h2 className="vitrin-modal__title">ورود دسته‌ای کالا</h2>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="vitrin-modal__body">
          <p className="vitrin-form__hint">
            تمپلیت اکسل را پر کنید (برگه «محصولات»). نام گروه/دسته/نوع باید عین درخت فعلی باشد.
            ستون‌های لازم: <code dir="ltr">groupName, categoryName, typeName</code>
            — ویژگی‌ها با پیشوند <code dir="ltr">attr:کد</code>.
            سلول خالی یعنی آن ویژگی برای این ردیف استفاده نشود.
          </p>
          <div className="vitrin-form__field" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a className="btn btn--outline" href={TEMPLATE_XLSX} download>دانلود تمپلیت اکسل</a>
            <a className="btn btn--outline" href={TEMPLATE_CSV} download>دانلود CSV</a>
            <label className="btn btn--outline">
              بارگذاری CSV
              <input type="file" accept=".csv,.tsv,.txt" onChange={onPickFile} hidden />
            </label>
          </div>
          <label className="vitrin-form__field">
            <span className="vitrin-form__label">داده CSV / TSV</span>
            <textarea
              rows={8}
              dir="ltr"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={SAMPLE}
              style={{ fontFamily: 'monospace' }}
            />
          </label>
          <button type="button" className="btn btn--outline" onClick={() => setCsvText(SAMPLE)}>
            استفاده از نمونه
          </button>

          {error && <p className="vitrin-form__error">{error}</p>}

          {batch && (
            <div className="vitrin-profile-panel" style={{ marginTop: 12 }}>
              <p>
                حالت: {batch.mode === 'DRY_RUN' ? 'پیش‌نمایش (بدون ثبت کالا)' : 'اجرا شد'}
                {' · '}کل ردیف‌ها: {batch.totalRows?.toLocaleString('fa-IR')}
                {' · '}پذیرفته/قابل‌پذیرش: {batch.acceptedRows?.toLocaleString('fa-IR')}
                {' · '}رد شده: {batch.rejectedRows?.toLocaleString('fa-IR')}
              </p>
              <table className="jarian-table">
                <thead><tr><th>ردیف</th><th>وضعیت</th><th>جزئیات</th></tr></thead>
                <tbody>
                  {(batch.rowResults || []).map((r) => (
                    <tr key={r.rowIndex}>
                      <td>{(r.rowIndex + 1).toLocaleString('fa-IR')}</td>
                      <td>{r.status}</td>
                      <td>{r.message || (r.errors || []).map((e) => e.message).join('، ') || r.generatedName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <footer className="vitrin-modal__footer">
            <button type="button" className="btn btn--outline" onClick={onClose}>بستن</button>
            <button type="button" className="btn btn--outline" disabled={busy || !csvText.trim()} onClick={() => run('DRY_RUN')}>
              پیش‌نمایش (Dry Run)
            </button>
            <button type="button" className="btn btn--primary" disabled={busy || !csvText.trim() || !batch} onClick={() => run('APPLY')}>
              اجرا و ثبت نهایی
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
