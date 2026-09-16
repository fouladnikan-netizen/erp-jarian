import { useEffect, useRef, useState } from 'react';
import { Plus, Save, Trash2, Upload } from 'lucide-react';
import { OrganizationIdentityRepository } from '../../../api/repositories/OrganizationIdentityRepository.js';
import {
  IRAN_BANKS,
  IRAN_GEO,
  LOGO_ACCEPT,
  bankByCode,
  bankLogoUrl,
  citiesForProvinceCode,
  cityBelongsToProvinceCode,
  hydrateIdentityCollections,
  setCachedOrganizationIdentity,
  toAsciiDigits,
  validateLogoFile,
} from '../../../domain/organizationIdentity';
import { showSystemToast } from '../../../utils/systemToast.js';

function tmpId(prefix) {
  return `tmp_${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const EMPTY_PHONE = (isPrimary = true) => ({
  id: tmpId('ph'),
  sortOrder: 0,
  label: '',
  number: '',
  isPrimary,
});

const EMPTY_ADDRESS = (isPrimary = true) => ({
  id: tmpId('ad'),
  sortOrder: 0,
  label: '',
  provinceCode: '',
  provinceName: '',
  cityCode: '',
  cityName: '',
  address: '',
  postalCode: '',
  isPrimary,
});

const EMPTY_BANK = (accountHolderName = '', isPrimary = true) => ({
  id: tmpId('ba'),
  sortOrder: 0,
  bankCode: '',
  accountHolderName,
  accountNumber: '',
  iban: '',
  isPrimary,
});

function withExclusivePrimary(items, primaryIndex) {
  return items.map((item, index) => ({ ...item, isPrimary: index === primaryIndex }));
}

function afterRemove(items, removedIndex) {
  const next = items.filter((_, index) => index !== removedIndex);
  if (!next.length) return next;
  if (next.some((item) => item.isPrimary)) return next;
  return withExclusivePrimary(next, 0);
}

function formFromIdentity(row) {
  const hydrated = hydrateIdentityCollections(row || {});
  return {
    tradeName: row?.tradeName || '',
    legalName: row?.legalName || '',
    nationalId: row?.nationalId || '',
    registrationNumber: row?.registrationNumber || '',
    economicNumber: row?.economicNumber || '',
    email: row?.email || '',
    website: row?.website || '',
    fax: row?.fax || '',
    phones: hydrated.phones.length ? hydrated.phones : [EMPTY_PHONE(true)],
    addresses: hydrated.addresses.length ? hydrated.addresses : [EMPTY_ADDRESS(true)],
    bankAccounts: hydrated.bankAccounts.length
      ? hydrated.bankAccounts
      : [EMPTY_BANK(row?.legalName || '', true)],
  };
}

function Field({ id, label, required, className, children }) {
  return (
    <div className={`shirazeh-defs__field${className ? ` ${className}` : ''}`}>
      <label className="shirazeh-defs__label font-meem" htmlFor={id}>
        {label}
        {required ? <span className="shirazeh-defs__req"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function TextInput({ id, value, onChange, onBlur, required, dir = 'rtl', disabled, placeholder }) {
  return (
    <input
      id={id}
      className="shirazeh-defs__input font-meem"
      type="text"
      dir={dir}
      value={value}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
    />
  );
}

function BankLogo({ code }) {
  const url = bankLogoUrl(code);
  if (!url) {
    return <span className="shirazeh-defs__bank-logo shirazeh-defs__bank-logo--empty" aria-hidden="true" />;
  }
  return (
    <span
      className="shirazeh-defs__bank-logo"
      style={{ maskImage: `url("${url}")`, WebkitMaskImage: `url("${url}")` }}
      aria-hidden="true"
    />
  );
}

function BankSelect({ id, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const bank = bankByCode(value);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="shirazeh-defs__bank-select" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="shirazeh-defs__input shirazeh-defs__bank-trigger font-meem"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <BankLogo code={value} />
        <span className="shirazeh-defs__bank-trigger-name">{bank?.name || 'انتخاب بانک'}</span>
      </button>
      {open ? (
        <ul className="shirazeh-defs__bank-menu" role="listbox">
          <li>
            <button
              type="button"
              className="shirazeh-defs__bank-option font-meem"
              role="option"
              aria-selected={!value}
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
            >
              <span className="shirazeh-defs__bank-logo shirazeh-defs__bank-logo--empty" aria-hidden="true" />
              انتخاب بانک
            </button>
          </li>
          {IRAN_BANKS.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                className="shirazeh-defs__bank-option font-meem"
                role="option"
                aria-selected={item.code === value}
                onClick={() => {
                  onChange(item.code);
                  setOpen(false);
                }}
              >
                <BankLogo code={item.code} />
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function PrimaryControl({ isPrimary, onSelect, disabled }) {
  if (isPrimary) {
    return <span className="shirazeh-defs__badge font-meem">اصلی</span>;
  }
  return (
    <button
      type="button"
      className="shirazeh-defs__link-btn font-meem"
      disabled={disabled}
      onClick={onSelect}
    >
      انتخاب به‌عنوان اصلی
    </button>
  );
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error('خواندن فایل لوگو ناموفق بود.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Organization Identity form — GET populate, PUT save. Logo uploads on Save (DDL-31).
 * Collections: explicit isPrimary with [0] fallback (DDL-34).
 */
export default function OrganizationIdentityForm({ canManage }) {
  const [form, setForm] = useState(() => formFromIdentity(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [savedLogoSrc, setSavedLogoSrc] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  const setField = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormError('');
  };

  const setPhone = (index, key, value) => {
    setForm((prev) => {
      const phones = prev.phones.map((row, i) => (
        i === index ? { ...row, [key]: value } : row
      ));
      return { ...prev, phones };
    });
    setFormError('');
  };

  const setAddress = (index, key, value) => {
    setForm((prev) => {
      const addresses = prev.addresses.map((row, i) => {
        if (i !== index) return row;
        const next = { ...row, [key]: value };
        if (key === 'provinceCode') {
          const province = IRAN_GEO.find((item) => item.code === value);
          next.provinceName = province?.name || '';
          if (!cityBelongsToProvinceCode(value, next.cityCode, next.cityName)) {
            next.cityCode = '';
            next.cityName = '';
          }
        }
        if (key === 'cityCode') {
          const cities = citiesForProvinceCode(row.provinceCode, value, row.cityName);
          const city = cities.find((item) => item.code === value);
          next.cityName = city?.name || '';
        }
        return next;
      });
      return { ...prev, addresses };
    });
    setFormError('');
  };

  const setBank = (index, key, value) => {
    setForm((prev) => {
      const bankAccounts = prev.bankAccounts.map((row, i) => (
        i === index ? { ...row, [key]: value } : row
      ));
      return { ...prev, bankAccounts };
    });
    setFormError('');
  };

  useEffect(() => () => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
  }, [pendingPreviewUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const row = await OrganizationIdentityRepository.get();
        if (!cancelled) {
          setForm(formFromIdentity(row));
          setCachedOrganizationIdentity(row);
          if (row?.logoFileId) {
            const logo = await OrganizationIdentityRepository.getLogo();
            if (!cancelled) setSavedLogoSrc(logo?.dataUrl || '');
          } else if (!cancelled) {
            setSavedLogoSrc('');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setFormError(err?.response?.data?.message || err?.message || 'بارگذاری هویت سازمان ناموفق بود.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!canManage) return;
    const tradeName = form.tradeName.trim();
    const legalName = form.legalName.trim();
    const nationalId = form.nationalId.trim();
    if (!tradeName || !legalName || !nationalId) {
      setFormError('نام تجاری، نام کامل حقوقی و شناسه ملی الزامی هستند.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const saved = await OrganizationIdentityRepository.put({
        tradeName,
        legalName,
        nationalId,
        registrationNumber: form.registrationNumber,
        economicNumber: form.economicNumber,
        email: form.email,
        website: form.website,
        fax: form.fax,
        phones: form.phones,
        addresses: form.addresses,
        bankAccounts: form.bankAccounts,
      });
      let identity = saved;
      if (pendingFile) {
        const dataBase64 = await readFileAsBase64(pendingFile);
        identity = await OrganizationIdentityRepository.putLogo({
          fileName: pendingFile.name,
          mimeType: pendingFile.type || undefined,
          dataBase64,
        });
        const logo = await OrganizationIdentityRepository.getLogo();
        setSavedLogoSrc(logo?.dataUrl || '');
        if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
        setPendingPreviewUrl('');
        setPendingFile(null);
      }
      setCachedOrganizationIdentity(identity);
      setForm(formFromIdentity(identity));
      showSystemToast('هویت سازمان ذخیره شد.');
    } catch (err) {
      setFormError(err?.response?.data?.message || err?.message || 'ذخیره هویت سازمان ناموفق بود.');
    } finally {
      setSaving(false);
    }
  };

  const fieldsLocked = !canManage;
  const saveLocked = !canManage || loading || saving;
  const displayLogoSrc = pendingPreviewUrl || savedLogoSrc;
  const logoActionLabel = displayLogoSrc ? 'تغییر لوگو' : 'بارگذاری لوگو';

  const handleLogoPick = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const check = validateLogoFile(file);
    if (!check.ok) {
      setFormError(check.message);
      return;
    }
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(file);
    setPendingPreviewUrl(URL.createObjectURL(file));
    setFormError('');
  };

  return (
    <form className="shirazeh-defs__form" onSubmit={handleSave} noValidate>
      <div className="shirazeh-defs__logo">
        <div className={`shirazeh-defs__logo-box${displayLogoSrc ? '' : ' shirazeh-defs__logo-box--empty'}`}>
          {displayLogoSrc ? (
            <img src={displayLogoSrc} alt="لوگوی سازمان" className="shirazeh-defs__logo-img" />
          ) : null}
        </div>
        <div className="shirazeh-defs__logo-meta">
          {pendingFile ? (
            <p className="shirazeh-defs__logo-hint font-meem">پیش‌نمایش — با ذخیره ثبت می‌شود</p>
          ) : (
            <p className="shirazeh-defs__logo-hint font-meem">
              {savedLogoSrc ? 'لوگوی ذخیره‌شده سازمان' : 'لوگویی ثبت نشده است'}
            </p>
          )}
          {canManage ? (
            <>
              <input
                ref={fileInputRef}
                className="shirazeh-defs__file-input"
                type="file"
                accept={LOGO_ACCEPT}
                onChange={handleLogoPick}
                disabled={fieldsLocked || saving}
              />
              <button
                type="button"
                className="shirazeh-defs__btn shirazeh-defs__btn--secondary font-meem"
                disabled={fieldsLocked || saving}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} strokeWidth={2} aria-hidden="true" />
                {logoActionLabel}
              </button>
            </>
          ) : null}
          <p className="shirazeh-defs__logo-guide font-meem">
            برای بهترین نمایش، لوگو با نسبت افقی و پس‌زمینه شفاف بارگذاری شود.
            اندازه پیشنهادی: ۶۰۰ × ۲۰۰ پیکسل.
            PNG یا WEBP پیشنهاد می‌شود.
            اندازه فایل بارگذاری‌شده، ابعاد نمایش لوگو در سیستم را تغییر نمی‌دهد.
          </p>
        </div>
      </div>

      {!canManage ? (
        <div className="shirazeh-defs__alert">برای ویرایش هویت سازمان به دسترسی مدیریت سیستم نیاز است.</div>
      ) : null}
      {formError ? <div className="shirazeh-defs__alert">{formError}</div> : null}

      <section className="shirazeh-defs__section">
        <h3 className="shirazeh-defs__section-title font-meem">مشخصات ثبتی</h3>
        <div className="shirazeh-defs__grid">
          <Field id="org-trade-name" label="نام تجاری" required>
            <TextInput id="org-trade-name" value={form.tradeName} onChange={setField('tradeName')} required disabled={fieldsLocked} />
          </Field>
          <Field id="org-legal-name" label="نام کامل حقوقی" required>
            <TextInput id="org-legal-name" value={form.legalName} onChange={setField('legalName')} required disabled={fieldsLocked} />
          </Field>
          <Field id="org-national-id" label="شناسه ملی" required>
            <TextInput id="org-national-id" value={form.nationalId} onChange={setField('nationalId')} required dir="ltr" disabled={fieldsLocked} />
          </Field>
          <Field id="org-reg" label="شماره ثبت">
            <TextInput id="org-reg" value={form.registrationNumber} onChange={setField('registrationNumber')} dir="ltr" disabled={fieldsLocked} />
          </Field>
          <Field id="org-eco" label="شماره اقتصادی">
            <TextInput id="org-eco" value={form.economicNumber} onChange={setField('economicNumber')} dir="ltr" disabled={fieldsLocked} />
          </Field>
        </div>
      </section>

      <section className="shirazeh-defs__section">
        <h3 className="shirazeh-defs__section-title font-meem">اطلاعات ارتباطی</h3>
        <div className="shirazeh-defs__grid">
          <Field id="org-email" label="ایمیل رسمی">
            <TextInput id="org-email" value={form.email} onChange={setField('email')} dir="ltr" disabled={fieldsLocked} />
          </Field>
          <Field id="org-website" label="وب‌سایت">
            <TextInput id="org-website" value={form.website} onChange={setField('website')} dir="ltr" disabled={fieldsLocked} />
          </Field>
          <Field id="org-fax" label="فکس">
            <TextInput id="org-fax" value={form.fax} onChange={setField('fax')} dir="ltr" disabled={fieldsLocked} />
          </Field>
          <Field id="org-phone-0" label="تلفن شرکت">
            <div className="shirazeh-defs__phone-main">
              <TextInput
                id="org-phone-0"
                value={form.phones[0]?.number || ''}
                onChange={(value) => setPhone(0, 'number', value)}
                dir="ltr"
                disabled={fieldsLocked}
              />
              {form.phones.length > 1 ? (
                <PrimaryControl
                  isPrimary={Boolean(form.phones[0]?.isPrimary)}
                  disabled={fieldsLocked || saving}
                  onSelect={() => setForm((prev) => ({ ...prev, phones: withExclusivePrimary(prev.phones, 0) }))}
                />
              ) : (
                <span className="shirazeh-defs__badge font-meem">اصلی</span>
              )}
            </div>
          </Field>
        </div>
        {form.phones.slice(1).map((phone, extraIndex) => {
          const index = extraIndex + 1;
          return (
            <div key={phone.id || `phone-${index}`} className="shirazeh-defs__phone-extra">
              <Field id={`org-phone-label-${index}`} label="برچسب">
                <TextInput
                  id={`org-phone-label-${index}`}
                  value={phone.label}
                  onChange={(value) => setPhone(index, 'label', value)}
                  disabled={fieldsLocked}
                  placeholder="دفتر مرکزی"
                />
              </Field>
              <Field id={`org-phone-${index}`} label="شماره">
                <TextInput
                  id={`org-phone-${index}`}
                  value={phone.number}
                  onChange={(value) => setPhone(index, 'number', value)}
                  dir="ltr"
                  disabled={fieldsLocked}
                />
              </Field>
              <div className="shirazeh-defs__phone-extra-actions">
                <PrimaryControl
                  isPrimary={Boolean(phone.isPrimary)}
                  disabled={fieldsLocked || saving}
                  onSelect={() => setForm((prev) => ({ ...prev, phones: withExclusivePrimary(prev.phones, index) }))}
                />
                {canManage ? (
                  <button
                    type="button"
                    className="shirazeh-defs__icon-btn"
                    aria-label="حذف شماره"
                    disabled={fieldsLocked || saving}
                    onClick={() => setForm((prev) => ({ ...prev, phones: afterRemove(prev.phones, index) }))}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
        {canManage ? (
          <button
            type="button"
            className="shirazeh-defs__add-inline font-meem"
            disabled={fieldsLocked || saving}
            onClick={() => setForm((prev) => ({
              ...prev,
              phones: [...prev.phones, { ...EMPTY_PHONE(false), sortOrder: prev.phones.length }],
            }))}
          >
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            افزودن شماره
          </button>
        ) : null}
      </section>

      <section className="shirazeh-defs__section">
        <div className="shirazeh-defs__section-head">
          <h3 className="shirazeh-defs__section-title font-meem">آدرس‌ها</h3>
          {canManage ? (
            <button
              type="button"
              className="shirazeh-defs__btn shirazeh-defs__btn--secondary font-meem"
              disabled={fieldsLocked || saving}
              onClick={() => setForm((prev) => ({
                ...prev,
                addresses: [...prev.addresses, { ...EMPTY_ADDRESS(false), sortOrder: prev.addresses.length }],
              }))}
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              افزودن
            </button>
          ) : null}
        </div>
        <div className="shirazeh-defs__repeat">
          {form.addresses.map((row, index) => (
            <div key={row.id || `addr-${index}`} className="shirazeh-defs__repeat-row">
              <div className="shirazeh-defs__repeat-head">
                <PrimaryControl
                  isPrimary={Boolean(row.isPrimary)}
                  disabled={fieldsLocked || saving}
                  onSelect={() => setForm((prev) => ({
                    ...prev,
                    addresses: withExclusivePrimary(prev.addresses, index),
                  }))}
                />
                {canManage && form.addresses.length > 1 ? (
                  <button
                    type="button"
                    className="shirazeh-defs__icon-btn"
                    aria-label="حذف آدرس"
                    disabled={fieldsLocked || saving}
                    onClick={() => setForm((prev) => ({
                      ...prev,
                      addresses: afterRemove(prev.addresses, index),
                    }))}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                ) : null}
              </div>
              <div className="shirazeh-defs__grid">
                <Field id={`org-addr-label-${index}`} label="برچسب">
                  <TextInput
                    id={`org-addr-label-${index}`}
                    value={row.label}
                    onChange={(value) => setAddress(index, 'label', value)}
                    disabled={fieldsLocked}
                  />
                </Field>
                <Field id={`org-province-${index}`} label="استان">
                  <select
                    id={`org-province-${index}`}
                    className="shirazeh-defs__input font-meem"
                    value={row.provinceCode}
                    disabled={fieldsLocked}
                    onChange={(event) => setAddress(index, 'provinceCode', event.target.value)}
                  >
                    <option value="">انتخاب استان</option>
                    {IRAN_GEO.map((province) => (
                      <option key={province.code} value={province.code}>{province.name}</option>
                    ))}
                  </select>
                </Field>
                <Field id={`org-city-${index}`} label="شهر">
                  <select
                    id={`org-city-${index}`}
                    className="shirazeh-defs__input font-meem"
                    value={row.cityCode}
                    disabled={fieldsLocked || !row.provinceCode}
                    onChange={(event) => setAddress(index, 'cityCode', event.target.value)}
                  >
                    <option value="">انتخاب شهر</option>
                    {citiesForProvinceCode(row.provinceCode, row.cityCode, row.cityName).map((city) => (
                      <option key={city.code} value={city.code}>{city.name}</option>
                    ))}
                  </select>
                </Field>
                <Field id={`org-postal-${index}`} label="کد پستی">
                  <TextInput
                    id={`org-postal-${index}`}
                    value={row.postalCode}
                    onChange={(value) => setAddress(index, 'postalCode', value)}
                    dir="ltr"
                    disabled={fieldsLocked}
                  />
                </Field>
                <Field id={`org-address-${index}`} label="آدرس" className="shirazeh-defs__field--wide">
                  <textarea
                    id={`org-address-${index}`}
                    className="shirazeh-defs__input shirazeh-defs__textarea font-meem"
                    dir="rtl"
                    rows={3}
                    value={row.address}
                    disabled={fieldsLocked}
                    onChange={(event) => setAddress(index, 'address', event.target.value)}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="shirazeh-defs__section">
        <div className="shirazeh-defs__section-head">
          <h3 className="shirazeh-defs__section-title font-meem">حساب‌های بانکی</h3>
          {canManage ? (
            <button
              type="button"
              className="shirazeh-defs__btn shirazeh-defs__btn--secondary font-meem"
              disabled={fieldsLocked || saving}
              onClick={() => setForm((prev) => ({
                ...prev,
                bankAccounts: [
                  ...prev.bankAccounts,
                  { ...EMPTY_BANK(prev.legalName, false), sortOrder: prev.bankAccounts.length },
                ],
              }))}
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              افزودن
            </button>
          ) : null}
        </div>
        <div className="shirazeh-defs__repeat">
          {form.bankAccounts.map((row, index) => (
            <div key={row.id || `bank-${index}`} className="shirazeh-defs__repeat-row">
              <div className="shirazeh-defs__repeat-head">
                <div className="shirazeh-defs__bank-head">
                  <BankLogo code={row.bankCode} />
                  <PrimaryControl
                    isPrimary={Boolean(row.isPrimary)}
                    disabled={fieldsLocked || saving}
                    onSelect={() => setForm((prev) => ({
                      ...prev,
                      bankAccounts: withExclusivePrimary(prev.bankAccounts, index),
                    }))}
                  />
                </div>
                {canManage && form.bankAccounts.length > 1 ? (
                  <button
                    type="button"
                    className="shirazeh-defs__icon-btn"
                    aria-label="حذف حساب"
                    disabled={fieldsLocked || saving}
                    onClick={() => setForm((prev) => ({
                      ...prev,
                      bankAccounts: afterRemove(prev.bankAccounts, index),
                    }))}
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                ) : null}
              </div>
              <div className="shirazeh-defs__grid">
                <Field id={`org-bank-${index}`} label="بانک">
                  <BankSelect
                    id={`org-bank-${index}`}
                    value={row.bankCode}
                    disabled={fieldsLocked}
                    onChange={(value) => setBank(index, 'bankCode', value)}
                  />
                </Field>
                <Field id={`org-holder-${index}`} label="نام صاحب حساب">
                  <TextInput
                    id={`org-holder-${index}`}
                    value={row.accountHolderName}
                    onChange={(value) => setBank(index, 'accountHolderName', value)}
                    disabled={fieldsLocked}
                  />
                </Field>
                <Field id={`org-account-${index}`} label="شماره حساب">
                  <TextInput
                    id={`org-account-${index}`}
                    value={row.accountNumber}
                    onChange={(value) => setBank(index, 'accountNumber', value)}
                    onBlur={() => setBank(index, 'accountNumber', toAsciiDigits(row.accountNumber).replace(/\s+/g, ' ').trim())}
                    dir="ltr"
                    disabled={fieldsLocked}
                  />
                </Field>
                <Field id={`org-iban-${index}`} label="شماره شبا">
                  <TextInput
                    id={`org-iban-${index}`}
                    value={row.iban}
                    onChange={(value) => setBank(index, 'iban', value)}
                    dir="ltr"
                    disabled={fieldsLocked}
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </section>

      {canManage ? (
        <div className="shirazeh-defs__actions">
          <button
            type="submit"
            className="shirazeh-defs__btn shirazeh-defs__btn--primary font-meem"
            disabled={saveLocked}
          >
            <Save size={16} strokeWidth={2} aria-hidden="true" />
            ذخیره
          </button>
        </div>
      ) : null}
    </form>
  );
}
