/**
 * Value providers for audience condition selectors — ERP catalogs only.
 */

import { IRAN_PROVINCES, BEHAVIORAL_STATUS, CUSTOMER_ACTIVITY_DOMAINS } from '../../kanoon/config';
import { PERSON_TYPES } from '../../../domain/party/party.constants';
import {
  CONTACT_PERSON_GENDERS,
  CONTACT_PERSON_JOB_POSITIONS,
  CONTACT_PERSON_RELATION_TYPES,
  CONTACT_PERSON_STATUSES,
} from '../../../components/contactPerson/contactPersonRoles';

export const VALUE_PROVIDER_ALL = Object.freeze({
  value: '__ALL__',
  label: 'همه',
});

/**
 * @typedef {{ value: string|boolean|number, label: string }} ValueOption
 */

/** @type {Record<string, () => ValueOption[]>} */
const PROVIDERS = {
  provinces: () => [
    VALUE_PROVIDER_ALL,
    ...IRAN_PROVINCES.map((p) => ({ value: p, label: p })),
  ],
  cities: () => [
    // City catalog is province-backed until a dedicated city registry exists.
    VALUE_PROVIDER_ALL,
    ...IRAN_PROVINCES.map((p) => ({ value: p, label: p })),
  ],
  industries: () => [
    VALUE_PROVIDER_ALL,
    ...(CUSTOMER_ACTIVITY_DOMAINS || []).map((item) => (
      typeof item === 'string'
        ? { value: item, label: item }
        : { value: item.id || item.value || item.label, label: item.label || item.name || item.id }
    )),
  ],
  companyTypes: () => [
    { value: PERSON_TYPES.LEGAL, label: 'حقوقی' },
    { value: PERSON_TYPES.NATURAL, label: 'حقیقی' },
  ],
  companyStatuses: () => Object.entries(BEHAVIORAL_STATUS || {}).map(([key, meta]) => ({
    value: key,
    label: meta?.label || key,
  })),
  acquisitionSources: () => [
    VALUE_PROVIDER_ALL,
    { value: 'نمایشگاه', label: 'نمایشگاه' },
    { value: 'معرفی', label: 'معرفی' },
    { value: 'وبسایت', label: 'وبسایت' },
    { value: 'تماس ورودی', label: 'تماس ورودی' },
    { value: 'کمپین', label: 'کمپین' },
    { value: 'exhibition', label: 'نمایشگاه (کد)' },
  ],
  personGenders: () => CONTACT_PERSON_GENDERS
    .filter((g) => g.id === 'male' || g.id === 'female')
    .map((g) => ({ value: g.id, label: g.label })),
  personPositions: () => CONTACT_PERSON_JOB_POSITIONS.map((item) => ({
    value: item.label,
    label: item.label,
  })),
  personRelationTypes: () => CONTACT_PERSON_RELATION_TYPES.map((item) => ({
    value: item.label,
    label: item.label,
  })),
  personStatuses: () => CONTACT_PERSON_STATUSES.map((item) => ({
    value: item.id,
    label: item.label,
  })),
  relationshipStatuses: () => [
    { value: 'active', label: 'فعال' },
    { value: 'cold', label: 'سرد' },
    { value: 'warm', label: 'گرم' },
    { value: 'dormant', label: 'راکد' },
  ],
  products: () => [
    VALUE_PROVIDER_ALL,
    { value: 'ورق', label: 'ورق' },
    { value: 'میلگرد', label: 'میلگرد' },
    { value: 'تیرآهن', label: 'تیرآهن' },
    { value: 'نبشی', label: 'نبشی' },
  ],
  brands: () => [
    VALUE_PROVIDER_ALL,
    { value: 'فولاد مبارکه', label: 'فولاد مبارکه' },
    { value: 'ذوب‌آهن', label: 'ذوب‌آهن' },
    { value: 'کسری', label: 'کسری' },
  ],
  suppliers: () => [
    { value: 'تامین‌کننده الف', label: 'تامین‌کننده الف' },
    { value: 'تامین‌کننده ب', label: 'تامین‌کننده ب' },
  ],
  orderStatuses: () => [
    { value: 'current', label: 'جاری' },
    { value: 'success', label: 'موفق' },
    { value: 'failed', label: 'ناموفق' },
  ],
  booleans: () => [
    { value: true, label: 'بله' },
    { value: false, label: 'خیر' },
  ],
  relatedKnights: () => {
    // Static catalog fallback; ERP port filters by projection.relatedKnight text.
    return [
      VALUE_PROVIDER_ALL,
      { value: 'علی رضایی', label: 'علی رضایی' },
      { value: 'حسین کریمی', label: 'حسین کریمی' },
      { value: 'مریم احمدی', label: 'مریم احمدی' },
      { value: 'رضا نوری', label: 'رضا نوری' },
      { value: 'سارا موسوی', label: 'سارا موسوی' },
    ];
  },
  /**
   * Relative date presets — UI maps these to BEFORE/AFTER/BETWEEN + absolute dates.
   * Sentinel values are consumed by ConditionValueInput, not stored as field values.
   */
  relativeDatePresets: () => [
    { value: 'older_than_6m', label: 'بیش از ۶ ماه قبل' },
    { value: 'in_last_30d', label: 'در ۳۰ روز گذشته' },
    { value: 'between_dates', label: 'بین دو تاریخ' },
    { value: 'custom_date', label: 'تاریخ مشخص' },
  ],
};

/**
 * @param {string|null|undefined} providerId
 * @returns {ValueOption[]}
 */
export function resolveValueProvider(providerId) {
  if (!providerId) return [];
  const fn = PROVIDERS[String(providerId)];
  return typeof fn === 'function' ? fn() : [];
}

export function listValueProviderIds() {
  return Object.keys(PROVIDERS);
}

/**
 * Register / override a provider (tests / Aineh adapters).
 * @param {string} id
 * @param {() => ValueOption[]} factory
 */
export function registerValueProvider(id, factory) {
  if (!id || typeof factory !== 'function') return;
  PROVIDERS[String(id)] = factory;
}
