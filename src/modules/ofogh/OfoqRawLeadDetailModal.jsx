import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Phone, StickyNote, Mail, Users, BookOpen } from 'lucide-react';
import { useLeadsStore } from '../../stores/useLeadsStore';
import { useFetchCompanies } from '../kanoon/public/index.js';
import { useActivitiesVersion } from '../pooyesh/public/index.js';
import { createLeadInteraction, listLeadInteractions, fetchLeadInteractions } from './leadInteractionFacade';
import { convertLeadToCompany } from './leadConversionService';
import {
  LEAD_STATUS,
  getAllowedLeadStatusTransitions,
  getLeadStatusLabel,
  isLeadStatusTerminal,
} from './domain/lead.constants.js';
import { resolveRawLeadVisual } from './lifecycleVisualRegistry.js';
import { useNotificationEngine } from '../../context/NotificationEngineContext';
import LifecycleIndicator from '../../components/common/LifecycleIndicator';
import JalaliDatePicker from '../nabz/components/JalaliDatePicker';
import {
  compareJalaliDates,
  getTodayJalali,
  isValidJalaliDate,
  jalaliToGregorian,
  parseJalaliDate,
} from '../nabz/dateUtils';
import { useCan } from '../../stores/useSessionStore';
import { PERMISSIONS } from '../../auth/permissions.catalog.js';
import { FORBIDDEN_MESSAGE } from '../../api/apiErrors.js';
import {
  fetchActivityTypes,
  listActiveActivityTypes,
  useActivityTypesVersion,
} from '../../domain/activityTypes/activityTypesFacade.js';

/** Icon is a UI-only concern — the type list/labels come from the Shirazeh registry (Gap 1). */
const ACTIVITY_TYPE_ICONS = {
  call: Phone,
  message: Mail,
  meeting: Users,
  catalog: BookOpen,
  note: StickyNote,
  task: StickyNote,
};

const ARCHIVE_CONFIRM =
  'این سرنخ از فهرست فعال خارج می‌شود و سابقه آن حفظ خواهد شد.';

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function EditField({ label, required, children }) {
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

/**
 * Ofogh Lead detail — activities / edit / status / archive / convert.
 * National ID only in convert flow (not edit).
 */
export default function OfoqRawLeadDetailModal({ leadId, onClose }) {
  const navigate = useNavigate();
  const lead = useLeadsStore((s) => s.getLead(leadId));
  useLeadsStore((s) => s.leads);
  const fetchLeads = useLeadsStore((s) => s.fetchLeads);
  const updateLeadAsync = useLeadsStore((s) => s.updateLeadAsync);
  const changeLeadStatusAsync = useLeadsStore((s) => s.changeLeadStatusAsync);
  const archiveLeadAsync = useLeadsStore((s) => s.archiveLeadAsync);
  const fetchContacts = useFetchCompanies();
  const activityTick = useActivitiesVersion();
  const { dispatchNotification } = useNotificationEngine();
  const canWriteLeads = useCan(PERMISSIONS.LEADS_WRITE);
  const canConvertLeads = useCan(PERMISSIONS.LEADS_CONVERT);
  const canWriteActivities = useCan(PERMISSIONS.ACTIVITIES_WRITE);
  const activityTypesVersion = useActivityTypesVersion();
  useEffect(() => { fetchActivityTypes(); }, []);
  const activityTypeOptions = useMemo(() => listActiveActivityTypes().map((t) => ({
    id: t.key,
    label: t.labelFa,
    Icon: ACTIVITY_TYPE_ICONS[t.key] || StickyNote,
  })), [activityTypesVersion]);

  const [activityType, setActivityType] = useState('call');
  const [note, setNote] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [convertOpen, setConvertOpen] = useState(false);
  const [nationalId, setNationalId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    companyName: '',
    personName: '',
    mobile: '',
    leadSource: '',
    activityDomain: '',
    notes: '',
  });
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [archiveBusy, setArchiveBusy] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');
  const [opsError, setOpsError] = useState('');

  const interactions = useMemo(
    () => (leadId != null ? listLeadInteractions(leadId) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-read when activities/leads tick
    [leadId, lead?.interactions?.length, lead?.last_interaction_date, activityTick],
  );

  const visual = resolveRawLeadVisual(lead?.status);
  const allowedStatusTransitions = lead
    ? getAllowedLeadStatusTransitions(lead.status)
    : [];
  const canChangeStatus = canWriteLeads && allowedStatusTransitions.length > 0;
  const canEdit = canWriteLeads && lead && lead.status !== LEAD_STATUS.CONVERTED;
  const canArchiveLead = canWriteLeads && Boolean(lead);

  useEffect(() => {
    if (leadId == null) return undefined;
    void fetchLeadInteractions(leadId);
    return undefined;
  }, [leadId]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (archiveConfirmOpen) {
          setArchiveConfirmOpen(false);
          return;
        }
        if (editing) {
          setEditing(false);
          setEditError('');
          return;
        }
        onClose?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, editing, archiveConfirmOpen]);

  useEffect(() => {
    setEditing(false);
    setEditError('');
    setStatusError('');
    setOpsError('');
    setArchiveConfirmOpen(false);
  }, [leadId]);

  if (!lead) return null;

  const isConverted = lead.status === LEAD_STATUS.CONVERTED;
  const isRejected = lead.status === LEAD_STATUS.REJECTED;
  const canShowConvert = canConvertLeads && !isConverted && !isRejected && !editing;
  const canSubmitActivity = canWriteActivities
    && Boolean(note.trim())
    && !isConverted
    && !isRejected;

  const startEdit = () => {
    setEditForm({
      companyName: lead.companyName || '',
      personName: lead.personName || '',
      mobile: lead.mobile || '',
      leadSource: lead.leadSource || '',
      activityDomain: lead.activityDomain || '',
      notes: lead.notes || lead.description || '',
    });
    setEditError('');
    setOpsError('');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditError('');
  };

  const handleEditSave = async (event) => {
    event.preventDefault();
    if (editSaving || !canEdit) return;

    const companyName = editForm.companyName.trim();
    const personName = editForm.personName.trim();
    const mobile = editForm.mobile.trim();
    const leadSource = editForm.leadSource.trim();
    if (!companyName || !personName || !mobile || !leadSource) {
      setEditError('نام شرکت، شخص، موبایل و منبع جذب الزامی است.');
      return;
    }

    setEditSaving(true);
    setEditError('');
    try {
      await updateLeadAsync(leadId, {
        companyName,
        personName,
        mobile,
        leadSource,
        activityDomain: editForm.activityDomain.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
      });
      setEditing(false);
      dispatchNotification({
        type: 'DEFAULT',
        title: 'ویرایش ذخیره شد',
        message: 'اطلاعات سرنخ به‌روز شد.',
      });
    } catch (err) {
      setEditError(err?.response?.data?.message || err?.message || 'ویرایش ناموفق بود.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (statusBusy || !nextStatus) return;
    if (!allowedStatusTransitions.includes(nextStatus)) return;

    setStatusBusy(true);
    setStatusError('');
    setOpsError('');
    try {
      await changeLeadStatusAsync(leadId, nextStatus);
      dispatchNotification({
        type: 'DEFAULT',
        title: 'وضعیت به‌روز شد',
        message: `وضعیت سرنخ به «${getLeadStatusLabel(nextStatus)}» تغییر کرد.`,
      });
    } catch (err) {
      setStatusError(err?.response?.data?.message || err?.message || 'تغییر وضعیت ناموفق بود.');
    } finally {
      setStatusBusy(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (archiveBusy) return;
    const reason = archiveReason.trim();
    if (!reason) {
      setOpsError('دلیل بایگانی الزامی است.');
      return;
    }
    setArchiveBusy(true);
    setOpsError('');
    try {
      await archiveLeadAsync(leadId, { reason });
      setArchiveConfirmOpen(false);
      setArchiveReason('');
      dispatchNotification({
        type: 'DEFAULT',
        title: 'آرشیو شد',
        message: 'سرنخ از فهرست فعال خارج شد.',
      });
      onClose?.();
    } catch (err) {
      setOpsError(err?.response?.data?.message || err?.message || 'آرشیو ناموفق بود.');
    } finally {
      setArchiveBusy(false);
    }
  };

  const handleActivity = async (event) => {
    event.preventDefault();
    if (!canSubmitActivity) return;
    let iso = null;
    if (followUpDate && isValidJalaliDate(followUpDate)
      && compareJalaliDates(followUpDate, getTodayJalali()) > 0) {
      const { year, month, day } = parseJalaliDate(followUpDate);
      const g = jalaliToGregorian(year, month, day);
      iso = new Date(g.year, g.month - 1, g.day, 9, 0, 0).toISOString();
    }
    try {
      await createLeadInteraction(leadId, {
        note: note.trim(),
        type: activityType,
        nextFollowUpDate: iso,
      });
      setNote('');
      setFollowUpDate('');
    } catch {
      /* error surfaced via store; keep form */
    }
  };

  const handleConvert = async (event) => {
    event.preventDefault();
    if (isSubmitting || isConverted) return;
    setError('');
    const cleaned = String(nationalId ?? '').replace(/\D/g, '');
    if (!cleaned) {
      setError('شناسه ملی را وارد کنید.');
      return;
    }
    if (cleaned.length !== 11) {
      setError('شناسه ملی باید دقیقاً ۱۱ رقم باشد.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await convertLeadToCompany(leadId, { nationalId: cleaned });
      if (!result.ok) {
        setError(result.error || 'تبدیل ناموفق بود.');
        return;
      }
      await Promise.all([
        typeof fetchLeads === 'function' ? fetchLeads() : Promise.resolve(),
        typeof fetchContacts === 'function' ? fetchContacts() : Promise.resolve(),
      ]);
      dispatchNotification({
        type: 'DEFAULT',
        title: 'تبدیل انجام شد',
        message: result.conversionMode === 'link_existing'
          ? 'سرنخ به مخاطب موجود در کانون متصل شد.'
          : 'سرنخ به مخاطب رسمی کانون تبدیل شد و در مرحلهٔ نوپدید قرار گرفت.',
      });
      onClose?.();
      navigate(`/kanoon/contact/${result.companyId}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="ofoq-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="ofoq-modal ofoq-modal--lead"
        role="dialog"
        aria-modal="true"
        aria-label={`سرنخ ${lead.companyName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="ofoq-modal__header">
          <div className="ofoq-modal__title-row">
            <LifecycleIndicator visual={visual.kind} label={visual.label} size={16} />
            <h2 className="ofoq-modal__title font-meem">{lead.companyName}</h2>
            <span className="ofoq-modal__lead-badge font-meem">{visual.label}</span>
          </div>
          <button type="button" className="ofoq-modal__close" onClick={onClose} aria-label="بستن">
            <CloseIcon />
          </button>
        </header>

        <div className="ofoq-modal__ops" role="toolbar" aria-label="عملیات سرنخ">
          {canEdit ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm font-meem"
              onClick={editing ? cancelEdit : startEdit}
              disabled={editSaving || statusBusy || archiveBusy}
            >
              {editing ? 'انصراف ویرایش' : 'ویرایش'}
            </button>
          ) : null}

          {canChangeStatus ? (
            <label className="ofoq-modal__ops-status font-meem">
              <span className="ofoq-modal__ops-status-label">وضعیت</span>
              <select
                className="ofoq-modal__ops-select font-meem"
                value=""
                disabled={statusBusy || editing || archiveBusy}
                aria-label="تغییر وضعیت سرنخ"
                onChange={(e) => {
                  const next = e.target.value;
                  e.target.value = '';
                  if (next) void handleStatusChange(next);
                }}
              >
                <option value="">
                  {getLeadStatusLabel(lead.status)}
                  {' '}
                  — تغییر…
                </option>
                {allowedStatusTransitions.map((status) => (
                  <option key={status} value={status}>
                    {getLeadStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span className="ofoq-modal__ops-terminal font-meem">
              وضعیت:
              {' '}
              {getLeadStatusLabel(lead.status)}
              {isLeadStatusTerminal(lead.status) ? ' (پایانی)' : ''}
            </span>
          )}

          {canArchiveLead ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm font-meem ofoq-modal__ops-archive"
            onClick={() => setArchiveConfirmOpen(true)}
            disabled={archiveBusy || editSaving || statusBusy || editing}
            title={canWriteLeads ? undefined : FORBIDDEN_MESSAGE}
          >
            آرشیو
          </button>
          ) : null}
        </div>

        {(opsError || statusError) ? (
          <p className="kanoon-form__error ofoq-modal__ops-error" role="alert">
            {opsError || statusError}
          </p>
        ) : null}

        <div className="ofoq-modal__body ofoq-modal__body--lead">
          <aside className="ofoq-modal__sidebar">
            <h3 className="ofoq-modal__sidebar-title">اطلاعات سرنخ</h3>

            {editing ? (
              <form className="ofoq-modal__edit-form" onSubmit={handleEditSave}>
                <EditField label="نام شرکت" required>
                  <input
                    type="text"
                    className="font-meem"
                    value={editForm.companyName}
                    onChange={(e) => setEditForm((f) => ({ ...f, companyName: e.target.value }))}
                  />
                </EditField>
                <EditField label="نام شخص" required>
                  <input
                    type="text"
                    className="font-meem"
                    value={editForm.personName}
                    onChange={(e) => setEditForm((f) => ({ ...f, personName: e.target.value }))}
                  />
                </EditField>
                <EditField label="موبایل" required>
                  <input
                    type="text"
                    className="font-yekan"
                    dir="ltr"
                    value={editForm.mobile}
                    onChange={(e) => setEditForm((f) => ({ ...f, mobile: e.target.value }))}
                  />
                </EditField>
                <EditField label="منبع جذب" required>
                  <input
                    type="text"
                    className="font-meem"
                    value={editForm.leadSource}
                    onChange={(e) => setEditForm((f) => ({ ...f, leadSource: e.target.value }))}
                  />
                </EditField>
                <EditField label="حوزه فعالیت">
                  <input
                    type="text"
                    className="font-meem"
                    value={editForm.activityDomain}
                    onChange={(e) => setEditForm((f) => ({ ...f, activityDomain: e.target.value }))}
                  />
                </EditField>
                <EditField label="توضیحات">
                  <textarea
                    className="font-meem"
                    rows={3}
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </EditField>
                {editError ? <p className="kanoon-form__error" role="alert">{editError}</p> : null}
                <div className="ofoq-modal__edit-actions">
                  <button type="button" className="btn btn--ghost" onClick={cancelEdit} disabled={editSaving}>
                    انصراف
                  </button>
                  <button type="submit" className="btn btn--primary" disabled={editSaving}>
                    {editSaving ? 'در حال ذخیره…' : 'ذخیره'}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="ofoq-modal__info-list">
                <div className="ofoq-modal__info-row">
                  <dt>وضعیت</dt>
                  <dd>{getLeadStatusLabel(lead.status)}</dd>
                </div>
                <div className="ofoq-modal__info-row">
                  <dt>شخص</dt>
                  <dd>{lead.personName || '—'}</dd>
                </div>
                <div className="ofoq-modal__info-row">
                  <dt>موبایل</dt>
                  <dd className="font-yekan" dir="ltr">{lead.mobile || '—'}</dd>
                </div>
                <div className="ofoq-modal__info-row">
                  <dt>منبع جذب</dt>
                  <dd>{lead.leadSource || '—'}</dd>
                </div>
                {lead.activityDomain ? (
                  <div className="ofoq-modal__info-row">
                    <dt>حوزه</dt>
                    <dd>{lead.activityDomain}</dd>
                  </div>
                ) : null}
                {(lead.notes || lead.description) ? (
                  <div className="ofoq-modal__info-row">
                    <dt>توضیحات</dt>
                    <dd>{lead.notes || lead.description}</dd>
                  </div>
                ) : null}
              </dl>
            )}

            {canShowConvert ? (
              <button
                type="button"
                className="btn btn--primary font-meem ofoq-modal__convert-btn"
                onClick={() => setConvertOpen(true)}
              >
                <ShieldCheck size={16} strokeWidth={2} aria-hidden="true" />
                تبدیل به مخاطب
              </button>
            ) : (isConverted || isRejected) && !editing ? (
              <div className="ofoq-modal__converted-block">
                <p className="ofoq-modal__converted-hint font-meem">
                  {isConverted
                    ? 'این سرنخ به مخاطب کانون تبدیل شده است.'
                    : 'این سرنخ رد شده و وارد چرخهٔ مخاطب نمی‌شود.'}
                </p>
                {isConverted && lead.convertedCompanyId ? (
                  <button
                    type="button"
                    className="btn btn--outline font-meem"
                    onClick={() => navigate(`/kanoon/contact/${lead.convertedCompanyId}`)}
                  >
                    مشاهده مخاطب
                  </button>
                ) : null}
              </div>
            ) : null}
          </aside>

          <div className="ofoq-modal__main">
            {!isConverted && !isRejected && !editing && (
              <form className="ofoq-modal__action-form" onSubmit={handleActivity}>
                <div className="ofoq-modal__action-tabs" role="tablist" aria-label="نوع فعالیت">
                  {activityTypeOptions.map(({ id, label, Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={activityType === id}
                      className={`ofoq-modal__action-tab${activityType === id ? ' is-active' : ''}`}
                      onClick={() => setActivityType(id)}
                    >
                      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  className="ofoq-modal__note-input font-meem"
                  placeholder="ثبت تماس، یادداشت، فعالیت یا وظیفه…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <div className="ofoq-modal__action-row">
                  <JalaliDatePicker
                    label="پیگیری بعدی (اختیاری)"
                    value={followUpDate}
                    onChange={setFollowUpDate}
                    placeholder="انتخاب تاریخ"
                  />
                  <button type="submit" className="btn btn--primary" disabled={!canSubmitActivity}>
                    ثبت پویش
                  </button>
                </div>
              </form>
            )}

            <section className="ofoq-modal__context" aria-label="فعالیت‌ها">
              <h3 className="ofoq-modal__context-title">فعالیت‌ها</h3>
              {interactions.length === 0 ? (
                <p className="ofoq-modal__timeline-empty">هنوز تعاملی ثبت نشده است.</p>
              ) : (
                <ol className="ofoq-timeline ofoq-timeline--compact">
                  {interactions.map((item) => (
                    <li key={item.id} className="ofoq-timeline__item">
                      <span className="ofoq-timeline__dot" aria-hidden="true" />
                      <div>
                        <span className="ofoq-timeline__date font-yekan">
                          {item.date ? new Date(item.date).toLocaleDateString('fa-IR') : '—'}
                        </span>
                        <p className="font-meem">{item.note || item.summary}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>

        {convertOpen && !isConverted && (
          <div className="kanoon-modal-overlay" role="presentation" onClick={() => setConvertOpen(false)}>
            <div
              className="kanoon-modal kanoon-modal--minimal"
              role="dialog"
              aria-modal="true"
              aria-label="تبدیل به مخاطب"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="kanoon-modal__header">
                <h2 className="kanoon-modal__title font-meem">تبدیل به مخاطب</h2>
                <button type="button" className="btn btn--ghost btn--icon" onClick={() => setConvertOpen(false)} aria-label="بستن">
                  <CloseIcon />
                </button>
              </header>
              <form onSubmit={handleConvert} dir="rtl">
                <div className="kanoon-modal__body">
                  <p className="font-meem ofoq-modal__convert-hint">
                    با وارد کردن شناسه ملی، شرکت موجود لینک می‌شود یا مخاطب جدید در کانون ساخته می‌شود. سرنخ حذف نمی‌شود.
                  </p>
                  <label className="kanoon-form__field">
                    <span className="kanoon-form__label">
                      شناسه ملی
                      <span className="kanoon-form__required">*</span>
                    </span>
                    <input
                      type="text"
                      className="font-yekan"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      placeholder="۱۱ رقم"
                    />
                  </label>
                  {error ? <p className="kanoon-form__error" role="alert">{error}</p> : null}
                </div>
                <footer className="kanoon-modal__footer">
                  <button type="button" className="btn btn--ghost" onClick={() => setConvertOpen(false)}>انصراف</button>
                  <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
                    {isSubmitting ? 'در حال استعلام…' : 'تایید تبدیل'}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {archiveConfirmOpen ? (
          <div className="kanoon-modal-overlay" role="presentation" onClick={() => setArchiveConfirmOpen(false)}>
            <div
              className="kanoon-modal kanoon-modal--minimal"
              role="dialog"
              aria-modal="true"
              aria-label="تایید آرشیو"
              onClick={(e) => e.stopPropagation()}
            >
              <header className="kanoon-modal__header">
                <h2 className="kanoon-modal__title font-meem">آرشیو سرنخ</h2>
                <button
                  type="button"
                  className="btn btn--ghost btn--icon"
                  onClick={() => setArchiveConfirmOpen(false)}
                  aria-label="بستن"
                >
                  <CloseIcon />
                </button>
              </header>
              <div className="kanoon-modal__body">
                <p className="font-meem ofoq-modal__convert-hint">{ARCHIVE_CONFIRM}</p>
                <label className="kanoon-form__field">
                  <span className="kanoon-form__label">
                    دلیل بایگانی
                    <span className="kanoon-form__required">*</span>
                  </span>
                  <textarea
                    className="kanoon-form__input font-meem"
                    rows={3}
                    value={archiveReason}
                    onChange={(e) => setArchiveReason(e.target.value)}
                    placeholder="مثلاً: عدم پاسخگویی / خارج از حوزه فعالیت"
                    data-testid="ofogh-archive-reason"
                  />
                </label>
                {opsError ? <p className="kanoon-form__error" role="alert">{opsError}</p> : null}
              </div>
              <footer className="kanoon-modal__footer">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setArchiveConfirmOpen(false)}
                  disabled={archiveBusy}
                >
                  انصراف
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => void handleArchiveConfirm()}
                  disabled={archiveBusy || !archiveReason.trim()}
                  data-testid="ofogh-archive-confirm"
                >
                  {archiveBusy ? 'در حال آرشیو…' : 'تایید آرشیو'}
                </button>
              </footer>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
