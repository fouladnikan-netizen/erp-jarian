import { useEffect, useMemo, useState } from 'react';
import { Info, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompanies } from '../kanoon/public/index.js';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { isOpenLeadStatus } from './domain/lead.constants.js';
import { getDisplayName } from '../kanoon/columns';
import { showSystemToast } from '../../utils/systemToast';
import { useMockApi } from '../../api/useMockApi';
import { LeadRepository } from '../../api/repositories/LeadRepository';

const MATCH_DEBOUNCE_MS = 320;

function Field({ label, required, children }) {
  return (
    <label className="kanoon-form__field">
      <span className="kanoon-form__label">
        {label}
        {required ? <span className="kanoon-form__required">*</span> : null}
      </span>
      {children}
    </label>
  );
}

function normalize(s) {
  return String(s ?? '').trim().toLowerCase();
}

/**
 * Ofogh-owned raw lead creation. Does NOT write to Kanoon.
 * Duplicate hint: API company-matches when available; mock uses contacts cache.
 */
export default function OfoqRawLeadModal({ onClose, onSaved }) {
  const navigate = useNavigate();
  const contacts = useCompanies();
  const openLeads = useLeadsStore((s) => s.leads);
  const addLead = useLeadsStore((s) => s.addLead);
  const addLeadAsync = useLeadsStore((s) => s.addLeadAsync);
  const [saving, setSaving] = useState(false);
  const [apiMatches, setApiMatches] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const [form, setForm] = useState({
    companyName: '',
    personName: '',
    mobile: '',
    leadSource: '',
    activityDomain: '',
    notes: '',
  });
  const [validationError, setValidationError] = useState('');

  const query = form.companyName.trim();
  const qNorm = normalize(query);

  const exactCompany = useMemo(() => {
    if (!qNorm) return null;
    return contacts.find(
      (c) => c.recordType !== 'LEAD' && normalize(c.companyName || c.name) === qNorm,
    ) || null;
  }, [contacts, qNorm]);

  const localSimilar = useMemo(() => {
    if (!query || query.length < 2) return [];
    return contacts
      .filter((c) => c.recordType !== 'LEAD' && normalize(c.companyName || c.name).includes(qNorm))
      .slice(0, 5);
  }, [contacts, query, qNorm]);

  useEffect(() => {
    if (useMockApi()) {
      setApiMatches([]);
      return undefined;
    }
    if (query.length < 2) {
      setApiMatches([]);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setMatchesLoading(true);
      try {
        const items = await LeadRepository.findCompanyMatches(query, { limit: 5 });
        if (!cancelled) setApiMatches(Array.isArray(items) ? items : []);
      } catch {
        if (!cancelled) setApiMatches([]);
      } finally {
        if (!cancelled) setMatchesLoading(false);
      }
    }, MATCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const similarCompanies = useMockApi()
    ? localSimilar
    : (apiMatches.length
      ? apiMatches.map((m) => ({
        id: m.id,
        companyName: m.name || m.companyName,
        name: m.name,
        nationalId: m.nationalId,
        activityDomain: m.activityDomain,
        recordType: 'CUSTOMER',
      }))
      : localSimilar);

  const exactOpenLead = useMemo(() => {
    if (!qNorm) return null;
    return openLeads.find(
      (l) => isOpenLeadStatus(l.status) && normalize(l.companyName) === qNorm,
    ) || null;
  }, [openLeads, qNorm]);

  const hasHint = Boolean(exactCompany || exactOpenLead || similarCompanies.length > 0 || matchesLoading);

  const openCompany = (contactId) => {
    navigate(`/kanoon/contact/${contactId}`);
    onClose?.();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const companyName = form.companyName.trim();
    const personName = form.personName.trim();
    const mobile = form.mobile.trim();
    const leadSource = form.leadSource.trim();
    const activityDomain = form.activityDomain.trim();
    const notes = form.notes.trim();

    if (!companyName || !personName || !mobile || !leadSource) {
      setValidationError('لطفاً فیلدهای اجباری را کامل کنید.');
      return;
    }

    if (exactCompany) {
      showSystemToast('این مجموعه قبلاً در کانون ثبت شده است.');
      openCompany(exactCompany.id);
      return;
    }

    if (exactOpenLead) {
      showSystemToast('سرنخ بازی با این نام شرکت از قبل وجود دارد.');
      onSaved?.(exactOpenLead.id);
      onClose?.();
      return;
    }

    const payload = {
      companyName,
      personName,
      mobile,
      leadSource,
      activityDomain,
      notes,
    };

    setSaving(true);
    try {
      const id = useMockApi()
        ? addLead(payload)
        : await addLeadAsync(payload);

      if (!id) {
        setValidationError('ثبت سرنخ ناموفق بود.');
        return;
      }

      showSystemToast('سرنخ خام ثبت شد — هنوز در کانون ساخته نشده است');
      onSaved?.(id);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="kanoon-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="kanoon-modal kanoon-modal--minimal"
        role="dialog"
        aria-modal="true"
        aria-label="ثبت سرنخ خام"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="kanoon-modal__header">
          <h2 className="kanoon-modal__title font-meem">ثبت سرنخ خام</h2>
          <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="بستن">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} dir="rtl">
          <div className="kanoon-modal__body">
            {hasHint && (
              <div className="kanoon-modal__alert" role="status" aria-live="polite">
                <p>
                  <Info size={16} strokeWidth={2} aria-hidden="true" />
                  {' '}
                  {exactCompany
                    ? 'این مجموعه قبلاً در کانون ثبت شده است.'
                    : similarCompanies.length || matchesLoading
                      ? 'شرکت‌های مشابه موجود در کانون'
                      : 'سرنخ بازی با نام مشابه وجود دارد.'}
                </p>
                {exactCompany ? (
                  <button type="button" className="btn btn--outline" onClick={() => openCompany(exactCompany.id)}>
                    <ExternalLink size={14} strokeWidth={2} aria-hidden="true" />
                    مشاهده مخاطب موجود
                  </button>
                ) : (
                  <div className="ofoq-lead-matches" aria-label="شرکت‌های مشابه موجود">
                    {matchesLoading ? (
                      <span className="font-meem ofoq-lead-matches__loading">در حال جستجو…</span>
                    ) : null}
                    {similarCompanies.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className="btn btn--ghost ofoq-lead-matches__item"
                        onClick={() => openCompany(m.id)}
                      >
                        <span className="font-meem">{getDisplayName(m) || m.companyName || m.name}</span>
                        {m.nationalId ? (
                          <span className="font-yekan ofoq-lead-matches__nid" dir="ltr">{m.nationalId}</span>
                        ) : null}
                        <span className="ofoq-lead-matches__action">مشاهده مخاطب موجود</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {validationError ? (
              <p className="kanoon-form__error" role="alert">{validationError}</p>
            ) : null}

            <div>
              <Field label="نام شرکت یا مجموعه" required>
                <input
                  type="text"
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  autoComplete="organization"
                />
              </Field>
              <Field label="نام شخص" required>
                <input
                  type="text"
                  value={form.personName}
                  onChange={(e) => setForm((f) => ({ ...f, personName: e.target.value }))}
                />
              </Field>
              <Field label="موبایل" required>
                <input
                  type="tel"
                  className="font-yekan"
                  value={form.mobile}
                  onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                />
              </Field>
              <Field label="منبع جذب" required>
                <input
                  type="text"
                  value={form.leadSource}
                  onChange={(e) => setForm((f) => ({ ...f, leadSource: e.target.value }))}
                  placeholder="مثلاً: نمایشگاه، تبلیغات، ارجاع..."
                />
              </Field>
              <Field label="حوزه فعالیت">
                <input
                  type="text"
                  value={form.activityDomain}
                  onChange={(e) => setForm((f) => ({ ...f, activityDomain: e.target.value }))}
                  placeholder="اختیاری"
                />
              </Field>
              <Field label="توضیحات">
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  placeholder="اختیاری"
                />
              </Field>
            </div>
          </div>

          <footer className="kanoon-modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>انصراف</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'در حال ذخیره…' : 'ذخیره سرنخ'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
