import { useState } from 'react';

const SAMPLE = `groupName,categoryName,typeName,brandName,baseUomCode,attr:thickness,attr:width
آهن‌آلات,ورق گرم,ورق سیاه,فولاد مبارکه,KG,6,1250`;

/**
 * Bulk Import / Mass Update (product contract, mandatory). CSV parsing is
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

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) throw new Error('حداقل یک ردیف هدر و یک ردیف داده لازم است.');
    const headers = lines[0].split(',').map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cells = line.split(',').map((c) => c.trim());
      const row = { attributes: {} };
      headers.forEach((header, idx) => {
        const value = cells[idx] ?? '';
        if (!value) return;
        if (header.startsWith('attr:')) row.attributes[header.slice(5)] = value;
        else row[header] = value;
      });
      return row;
    });
  }

  async function run(mode) {
    setError('');
    setBusy(true);
    try {
      const rows = parseCsv(csvText);
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
          <h2 className="vitrin-modal__title">ورود دسته‌ای کالا (CSV)</h2>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="vitrin-modal__body">
          <p className="vitrin-form__hint">
            ستون‌های لازم: groupName, categoryName, typeName — اختیاری: brandName, baseUomCode, salesUomCode,
            purchaseUomCode, weightProfileType، و ویژگی‌های ساختاری با پیشوند <code dir="ltr">attr:کد_ویژگی</code>.
          </p>
          <label className="vitrin-form__field">
            <span className="vitrin-form__label">داده CSV</span>
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
                حالت: {batch.mode === 'DRY_RUN' ? 'پیش‌نمایش (بدون ثبت)' : 'اجرا شد'}
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
                      <td>{r.sku || r.message || (r.errors || []).map((e) => e.message).join('، ')}</td>
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
