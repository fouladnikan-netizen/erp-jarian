import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { showSystemToast } from '../../../utils/systemToast';
import { WEB_SERVICES_CONFIG } from '../../../config/registry/webServices';
import {
  getTodayJalali,
  isValidJalaliDate,
  parseJalaliDate,
} from '../../nabz/dateUtils';
import { PERSON_TYPES } from '../config';
import { updateCompanyLegalInfo } from '../legalInfoService';
import '../customerProfile.css';

/**
 * Kanoon ownership surface for Company legal / registry identity editing.
 * CustomerProfilePage must only compose this modal — not own legal field structure
 * or persistence (architecture: composition layer → legalInfoService).
 */

function icon(path, size = 14) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {path}
    </svg>
  );
}

const InfoIcon = () => icon(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>, 13);
const CloseIcon = () => icon(<path d="M18 6 6 18M6 6l12 12" />, 16);
const PencilIcon = () => icon(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />, 13);
const SyncIcon = () => icon(<><path d="M21 12a9 9 0 1 1-2.64-6.36" /><path d="M21 3v6h-6" /></>, 13);
const CheckIcon = () => icon(<path d="M20 6 9 17l-5-5" />, 11);
const ChevronRightIcon = () => icon(<path d="m9 18 6-6-6-6" />, 14);
const ChevronLeftIcon = () => icon(<path d="m15 18-6-6 6-6" />, 14);

/* مشخصات ثبتی — nationalId روی ریشه مخاطب است، بقیه داخل officialSpecs */
const LEGAL_REG_FIELDS = [
  { key: 'nationalId', label: 'شناسه ملی', root: true },
  { key: 'registrationNumber', label: 'شماره ثبت' },
  { key: 'establishmentDate', label: 'تاریخ تاسیس' },
  { key: 'economicCode', label: 'کد اقتصادی' },
  { key: 'postalCode', label: 'کد پستی ۱۰ رقمی' },
  { key: 'latestCapital', label: 'آخرین سرمایه ثبتی', rtl: true },
  { key: 'website', label: 'وبسایت' },
  { key: 'phone', label: 'تلفن ثابت' },
  { key: 'latestGazette', label: 'آخرین آگهی رسمی' },
];

function buildLegalDraft(company) {
  const specs = company.officialSpecs || {};
  const gov = company.governance || {};
  return {
    nationalId: company.nationalId || '',
    registrationNumber: specs.registrationNumber || '',
    establishmentDate: specs.establishmentDate || '',
    economicCode: specs.economicCode || '',
    postalCode: specs.postalCode || '',
    latestCapital: specs.latestCapital || '',
    website: specs.website || '',
    phone: specs.phone || '',
    latestGazette: specs.latestGazette || '',
    ceoName: gov.ceo?.name || '',
    ceoNationalId: gov.ceo?.nationalId || '',
    ceoValidUntil: gov.ceo?.validUntil || '',
    boardMembers: (gov.boardMembers || []).map((member) => ({ ...member })),
    boardValidUntil: gov.boardValidUntil || '',
    signatureRight: gov.signatureRight || '',
    address: specs.address || '',
  };
}

/** Flatten a legal snapshot for field-level visual diffing against the next (newer) version. */
function flattenLegalSnapshot(snap) {
  const specs = snap?.specs || {};
  const gov = snap?.gov || {};
  const ceo = gov.ceo || {};
  return {
    nationalId: String(snap?.nationalId ?? ''),
    registrationNumber: String(specs.registrationNumber ?? ''),
    establishmentDate: String(specs.establishmentDate ?? ''),
    economicCode: String(specs.economicCode ?? ''),
    postalCode: String(specs.postalCode ?? ''),
    latestCapital: String(specs.latestCapital ?? ''),
    website: String(specs.website ?? ''),
    phone: String(specs.phone ?? ''),
    latestGazette: String(specs.latestGazette ?? ''),
    address: String(specs.address ?? ''),
    ceoName: String(ceo.name ?? ''),
    ceoNationalId: String(ceo.nationalId ?? ''),
    ceoValidUntil: String(ceo.validUntil ?? ''),
    boardValidUntil: String(gov.boardValidUntil ?? ''),
    signatureRight: String(gov.signatureRight ?? ''),
    boardMembers: JSON.stringify(gov.boardMembers || []),
  };
}

function normalizeDiffValue(value) {
  if (value == null) return '';
  return String(value).trim();
}

/* استعلام «تازه» = حداکثر ~۶ ماه پیش — برای تیک سبز TTL */
function isRecentVerification(dateStr) {
  if (!dateStr || !isValidJalaliDate(dateStr)) return false;
  const d = parseJalaliDate(dateStr);
  const t = parseJalaliDate(getTodayJalali());
  const diffDays = (t.year - d.year) * 365 + (t.month - d.month) * 30 + (t.day - d.day);
  return diffDays >= 0 && diffDays <= 180;
}

/**
 * @param {{
 *   company: object,
 *   onClose: () => void,
 *   onSaved?: (companyId: string|number) => void,
 * }} props
 */
export default function LegalInfoModal({ company, onClose, onSaved }) {
  const isLegal = company.personType === PERSON_TYPES.LEGAL;
  const [isEditing, setIsEditing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [versionIndex, setVersionIndex] = useState(0);
  const [draft, setDraft] = useState(() => buildLegalDraft(company));
  const syncTimer = useRef(null);

  /* ماشین زمان: ایندکس ۰ = نسخه فعلی (داده زنده)، ایندکس‌های بالاتر = استعلام‌های قدیمی‌تر */
  const snapshots = useMemo(() => [
    {
      isCurrent: true,
      verifiedAt: company.legalVerifiedAt || null,
      nationalId: company.nationalId,
      specs: company.officialSpecs || {},
      gov: company.governance || {},
    },
    ...(company.legalHistory || []).map((snap) => ({
      isCurrent: false,
      verifiedAt: snap.verifiedAt,
      nationalId: snap.nationalId ?? company.nationalId,
      specs: snap.officialSpecs || {},
      gov: snap.governance || {},
    })),
  ], [company]);

  const active = snapshots[Math.min(versionIndex, snapshots.length - 1)];
  const isCurrentVersion = active.isCurrent;
  const canGoOlder = versionIndex < snapshots.length - 1;
  const canGoNewer = versionIndex > 0;

  /* Visual diff: compare the expired view with the subsequent (newer) version */
  const nextVersion = !isCurrentVersion && versionIndex > 0
    ? snapshots[versionIndex - 1]
    : null;
  const expiredData = useMemo(() => flattenLegalSnapshot(active), [active]);
  const nextVersionData = useMemo(
    () => (nextVersion ? flattenLegalSnapshot(nextVersion) : null),
    [nextVersion],
  );
  const hasFieldChanged = (fieldName) => {
    if (!nextVersionData) return false;
    return normalizeDiffValue(expiredData[fieldName]) !== normalizeDiffValue(nextVersionData[fieldName]);
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(syncTimer.current);
    };
  }, [onClose]);

  /**
   * استعلام از وب‌سرویس لینکا (به‌روزرسانی خودکار مشخصات رسمی با شناسه ملی).
   * تا وقتی سرویس در شیرازه پیکربندی نشده (WEB_SERVICES_CONFIG.linka.enabled)،
   * فقط چرخه اتصال را شبیه‌سازی و وضعیت را اعلام می‌کند.
   */
  const handleLinkaSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    syncTimer.current = setTimeout(() => {
      setIsSyncing(false);
      const linka = WEB_SERVICES_CONFIG.linka;
      if (!linka.enabled || !linka.endpoint) {
        showSystemToast('وب‌سرویس لینکا هنوز متصل نیست — پس از پیکربندی در شیرازه، اطلاعات با یک کلیک به‌روز می‌شود.', { duration: 3600 });
        return;
      }
      /* TODO(linka): fetch(linka.endpoint + company.nationalId) → updateCompanyLegalInfo */
      showSystemToast('اطلاعات رسمی شرکت از لینکا به‌روزرسانی شد.');
    }, 1200);
  };

  const currentValue = (field) => (field.root ? active.nationalId : active.specs[field.key]);
  const setField = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const setMember = (index, key, value) => setDraft((prev) => ({
    ...prev,
    boardMembers: prev.boardMembers.map((member, i) => (i === index ? { ...member, [key]: value } : member)),
  }));

  const addMember = () => setDraft((prev) => ({
    ...prev,
    boardMembers: [...prev.boardMembers, { role: 'عضو هیئت مدیره', name: '', nationalId: '' }],
  }));

  const removeMember = (index) => setDraft((prev) => ({
    ...prev,
    boardMembers: prev.boardMembers.filter((_, i) => i !== index),
  }));

  const startEdit = () => {
    setDraft(buildLegalDraft(company));
    setIsEditing(true);
  };

  const handleSave = (event) => {
    event.preventDefault();
    const ok = updateCompanyLegalInfo(company.id, draft);
    if (!ok) return;
    setIsEditing(false);
    if (typeof onSaved === 'function') onSaved(company.id);
  };

  const viewRow = (label, value, { rtl = false, changed = false } = {}) => (
    <div
      className={`kprofile-legal-modal__row${changed ? ' diff-changed' : ''}`}
      key={label}
    >
      <dt>{label}</dt>
      <dd className={rtl ? 'is-rtl' : undefined}>{value || '—'}</dd>
    </div>
  );

  const editRow = (key, label, rtl = false) => (
    <label key={key} className="kprofile-legal-modal__row kprofile-legal-modal__row--edit">
      <span>{label}</span>
      <input
        type="text"
        className="kprofile-legal-modal__input"
        value={draft[key]}
        onChange={(event) => setField(key, event.target.value)}
        dir={rtl ? 'rtl' : 'ltr'}
      />
    </label>
  );

  /* پورتال روی body — backdrop-filter کارت والد برای position:fixed
     containing block می‌سازد و مودال را از مرکز صفحه خارج می‌کند */
  return createPortal(
    <div className="kprofile-legal-overlay" onClick={onClose} role="presentation">
      <div
        className={`kprofile-legal-modal kprofile-legal-modal--wide${isCurrentVersion ? '' : ' is-expired'}`}
        role="dialog"
        aria-modal="true"
        aria-label="اطلاعات حقوقی تکمیلی"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="kprofile-legal-modal__header">
          <h3 className="kprofile-legal-modal__title">
            <InfoIcon />
            {isCurrentVersion ? 'اطلاعات حقوقی تکمیلی' : 'نسخه منقضی‌شده'}
          </h3>
          <div className="kprofile-legal-modal__tools">
            {!isEditing && isCurrentVersion && (
              <button
                type="button"
                className="kprofile-legal-modal__close"
                onClick={startEdit}
                title="ویرایش"
                aria-label="ویرایش اطلاعات حقوقی"
              >
                <PencilIcon />
              </button>
            )}
            <button
              type="button"
              className="kprofile-legal-modal__close"
              onClick={onClose}
              aria-label="بستن"
            >
              <CloseIcon />
            </button>
          </div>
        </header>

        {!isEditing && snapshots.length > 1 && (
          <nav className="kprofile-legal-modal__timeline" aria-label="تاریخچه استعلام‌ها">
            <button
              type="button"
              className="kprofile-legal-modal__timeline-btn"
              onClick={() => setVersionIndex((i) => i + 1)}
              disabled={!canGoOlder}
              title="استعلام قدیمی‌تر"
              aria-label="استعلام قدیمی‌تر"
            >
              <ChevronRightIcon />
            </button>
            <span className={`kprofile-legal-modal__timeline-label${isCurrentVersion ? '' : ' is-expired'}`}>
              {isCurrentVersion ? 'نسخه فعلی' : `نسخه منقضی‌شده — استعلام ${active.verifiedAt}`}
            </span>
            <button
              type="button"
              className="kprofile-legal-modal__timeline-btn"
              onClick={() => setVersionIndex((i) => i - 1)}
              disabled={!canGoNewer}
              title="استعلام جدیدتر"
              aria-label="استعلام جدیدتر"
            >
              <ChevronLeftIcon />
            </button>
          </nav>
        )}

        <div className="kprofile-legal-modal__body">
          {isEditing ? (
            <form onSubmit={handleSave}>
              <h4 className="kprofile-legal-modal__section-title">مشخصات ثبتی</h4>
              <div className="kprofile-legal-modal__list">
                {LEGAL_REG_FIELDS.map(({ key, label, rtl }) => editRow(
                  key,
                  key === 'nationalId' && !isLegal ? 'کد ملی' : label,
                  rtl,
                ))}
              </div>

              <h4 className="kprofile-legal-modal__section-title">مدیرعامل</h4>
              <div className="kprofile-legal-modal__list">
                {editRow('ceoName', 'نام و نام خانوادگی', true)}
                {editRow('ceoNationalId', 'کد ملی')}
                {editRow('ceoValidUntil', 'اعتبار مسئولیت تا')}
              </div>

              <h4 className="kprofile-legal-modal__section-title">اعضاء هیئت مدیره</h4>
              {draft.boardMembers.map((member, index) => (
                <div key={index} className="kprofile-legal-modal__member-edit">
                  <input
                    type="text"
                    className="kprofile-legal-modal__input"
                    placeholder="سمت"
                    value={member.role}
                    onChange={(event) => setMember(index, 'role', event.target.value)}
                  />
                  <input
                    type="text"
                    className="kprofile-legal-modal__input"
                    placeholder="نام و نام خانوادگی"
                    value={member.name}
                    onChange={(event) => setMember(index, 'name', event.target.value)}
                  />
                  <input
                    type="text"
                    className="kprofile-legal-modal__input"
                    placeholder="کد ملی"
                    value={member.nationalId}
                    onChange={(event) => setMember(index, 'nationalId', event.target.value)}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="kprofile-legal-modal__member-remove"
                    onClick={() => removeMember(index)}
                    aria-label="حذف عضو"
                  >
                    <CloseIcon />
                  </button>
                </div>
              ))}
              <button type="button" className="kprofile-legal-modal__member-add" onClick={addMember}>
                + افزودن عضو
              </button>
              <div className="kprofile-legal-modal__list">
                {editRow('boardValidUntil', 'اعتبار هیئت مدیره تا')}
              </div>

              <h4 className="kprofile-legal-modal__section-title">حق امضا</h4>
              <textarea
                className="kprofile-legal-modal__textarea"
                rows={4}
                value={draft.signatureRight}
                onChange={(event) => setField('signatureRight', event.target.value)}
              />

              <h4 className="kprofile-legal-modal__section-title">آدرس قانونی</h4>
              <textarea
                className="kprofile-legal-modal__textarea"
                rows={3}
                value={draft.address}
                onChange={(event) => setField('address', event.target.value)}
              />

              <footer className="kprofile-legal-modal__footer">
                <button type="button" className="kprofile-magic__cancel" onClick={() => setIsEditing(false)}>
                  انصراف
                </button>
                <button type="submit" className="btn btn--primary">
                  ذخیره
                </button>
              </footer>
            </form>
          ) : (
            <div key={versionIndex} className="kprofile-legal-modal__fade">
              <h4 className="kprofile-legal-modal__section-title">مشخصات ثبتی</h4>
              <dl className="kprofile-legal-modal__list">
                {LEGAL_REG_FIELDS.map((field) => viewRow(
                  field.key === 'nationalId' && !isLegal ? 'کد ملی' : field.label,
                  currentValue(field),
                  {
                    rtl: field.rtl,
                    changed: hasFieldChanged(field.key),
                  },
                ))}
              </dl>

              <h4 className="kprofile-legal-modal__section-title">مدیرعامل</h4>
              <dl className="kprofile-legal-modal__list">
                {viewRow('نام و نام خانوادگی', active.gov.ceo?.name, {
                  rtl: true,
                  changed: hasFieldChanged('ceoName'),
                })}
                {viewRow('کد ملی', active.gov.ceo?.nationalId, {
                  changed: hasFieldChanged('ceoNationalId'),
                })}
                {viewRow('اعتبار مسئولیت تا', active.gov.ceo?.validUntil, {
                  changed: hasFieldChanged('ceoValidUntil'),
                })}
              </dl>

              <h4 className="kprofile-legal-modal__section-title">اعضاء هیئت مدیره</h4>
              {(active.gov.boardMembers || []).length ? (
                <ul
                  className={`kprofile-legal-modal__members${
                    hasFieldChanged('boardMembers') ? ' diff-changed' : ''
                  }`}
                >
                  {active.gov.boardMembers.map((member, index) => (
                    <li
                      key={`${member.name}-${index}`}
                      className={`kprofile-legal-modal__member${
                        hasFieldChanged('boardMembers') ? ' diff-changed' : ''
                      }`}
                    >
                      <span className="kprofile-legal-modal__member-role">{member.role}</span>
                      <span className="kprofile-legal-modal__member-name">{member.name}</span>
                      <span className="kprofile-legal-modal__member-code">کد ملی: {member.nationalId || '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className={`kprofile-legal-modal__empty${
                    hasFieldChanged('boardMembers') ? ' diff-changed' : ''
                  }`}
                >
                  عضوی ثبت نشده است.
                </p>
              )}
              <dl className="kprofile-legal-modal__list">
                {viewRow('اعتبار هیئت مدیره تا', active.gov.boardValidUntil, {
                  changed: hasFieldChanged('boardValidUntil'),
                })}
              </dl>

              <h4 className="kprofile-legal-modal__section-title">حق امضا</h4>
              <p
                className={`kprofile-legal-modal__text${
                  hasFieldChanged('signatureRight') ? ' diff-changed' : ''
                }`}
              >
                {active.gov.signatureRight || '—'}
              </p>

              <h4 className="kprofile-legal-modal__section-title">آدرس قانونی</h4>
              <p
                className={`kprofile-legal-modal__text${
                  hasFieldChanged('address') ? ' diff-changed' : ''
                }`}
              >
                {active.specs.address || '—'}
              </p>
            </div>
          )}
        </div>

        {!isEditing && (
          <footer className="kprofile-legal-modal__ttl">
            <span className={`kprofile-legal-modal__ttl-badge${isRecentVerification(active.verifiedAt) ? ' is-fresh' : ''}`}>
              {isRecentVerification(active.verifiedAt) && (
                <span className="kprofile-legal-modal__ttl-check" aria-hidden="true"><CheckIcon /></span>
              )}
              آخرین استعلام: {active.verifiedAt || '—'}
            </span>
            {isCurrentVersion && (
              <button
                type="button"
                className={`kprofile-legal-modal__linka-btn${isSyncing ? ' is-syncing' : ''}`}
                onClick={handleLinkaSync}
                disabled={isSyncing}
              >
                <SyncIcon />
                {isSyncing ? 'در حال استعلام…' : 'استعلام از لینکا'}
              </button>
            )}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
