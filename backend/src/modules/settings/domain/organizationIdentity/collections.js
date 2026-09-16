/**
 * Organization Identity collections (DDL-32 / DDL-33 / DDL-34).
 * Explicit isPrimary with [0] fallback. Phone type is ignored.
 */

import { bankByCode, inferBankCodeFromName } from './iranBanks.js';
import {
  cityBelongsToProvinceCode,
  cityByCode,
  cityByName,
  resolveProvince,
} from './iranGeo.js';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function toAsciiDigits(value) {
  return String(value ?? '').replace(/[۰-۹٠-٩]/g, (ch) => {
    const fa = FA_DIGITS.indexOf(ch);
    if (fa >= 0) return String(fa);
    const ar = AR_DIGITS.indexOf(ch);
    return ar >= 0 ? String(ar) : ch;
  });
}

function trimText(value) {
  return String(value ?? '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function mintId(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function resolveItemId(existing, prefix, index, { mintIds }) {
  const text = String(existing || '').trim();
  if (text && !text.startsWith('tmp_')) return text;
  if (mintIds) return mintId(prefix);
  return `${prefix}_${index}`;
}

function clipLabel(value) {
  return trimText(value).slice(0, 80);
}

function isFlaggedPrimary(item) {
  return item?.isPrimary === true || item?.isPrimary === 'true';
}

function assignPrimary(items) {
  if (!items.length) return items;
  const flagged = items.findIndex(isFlaggedPrimary);
  const primaryIndex = flagged >= 0 ? flagged : 0;
  return items.map((item, index) => ({ ...item, isPrimary: index === primaryIndex }));
}

function pickPrimaryItem(items) {
  if (!items.length) return null;
  return items.find(isFlaggedPrimary) || items[0];
}

export function normalizeIranIban(value) {
  return toAsciiDigits(value).replace(/[\s\-]/g, '').toUpperCase();
}

function iso7064Mod97(iban) {
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const expanded = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let remainder = 0;
  for (const ch of expanded) {
    remainder = (remainder * 10 + Number(ch)) % 97;
  }
  return remainder;
}

/** Iranian IBAN BBAN bank code: characters 5–7 (after IR + check digits). */
export function iranIbanBankCode(value) {
  const iban = normalizeIranIban(value);
  if (!/^IR\d{24}$/.test(iban)) return '';
  return iban.slice(4, 7);
}

export function validateIranIban(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { ok: true, iban: '' };
  const iban = normalizeIranIban(raw);
  if (!iban.startsWith('IR')) {
    return { ok: false, message: 'شماره شبا باید با IR شروع شود.' };
  }
  if (iban.length !== 26 || !/^IR\d{24}$/.test(iban)) {
    return { ok: false, message: 'ساختار شماره شبا نامعتبر است.' };
  }
  if (iso7064Mod97(iban) !== 1) {
    return { ok: false, message: 'شماره شبا نامعتبر است.' };
  }
  return { ok: true, iban };
}

export function normalizeAccountNumber(value) {
  return toAsciiDigits(value).replace(/\s+/g, ' ').trim();
}

export function validateAccountNumber(value) {
  const accountNumber = normalizeAccountNumber(value);
  if (!accountNumber) {
    return { ok: false, message: 'شماره حساب الزامی است.' };
  }
  if (accountNumber.length > 40) {
    return { ok: false, message: 'شماره حساب بیش از حد طولانی است.' };
  }
  if (!/^[0-9.\-\/]+(?: [0-9.\-\/]+)*$/.test(accountNumber)) {
    return { ok: false, message: 'شماره حساب فقط رقم و جداکننده (. - /) مجاز است.' };
  }
  if (/[.\-\/]{2,}/.test(accountNumber) || /^[.\-\/]/.test(accountNumber) || /[.\-\/]$/.test(accountNumber)) {
    return { ok: false, message: 'جداکننده‌های شماره حساب نامعتبر است.' };
  }
  return { ok: true, accountNumber };
}

export function validateOrganizationPhone(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return { ok: true, number: '' };
  const ascii = toAsciiDigits(raw);
  if (/[A-Za-z\u0600-\u06FF]/.test(ascii)) {
    return { ok: false, message: 'شماره تلفن نباید شامل حرف باشد.' };
  }
  const compact = ascii.replace(/[()\s]/g, '');
  if (!/^[0-9-]+$/.test(compact) || compact.includes('--')) {
    return { ok: false, message: 'شماره تلفن نامعتبر است.' };
  }
  const digits = compact.replace(/-/g, '');
  if (!/^0\d{9,10}$/.test(digits)) {
    return { ok: false, message: 'شماره تلفن باید با صفر شروع شود و ۱۰ یا ۱۱ رقم باشد.' };
  }
  return { ok: true, number: compact };
}

function phoneNumberOf(item) {
  if (item == null) return '';
  if (typeof item === 'string' || typeof item === 'number') return String(item).trim();
  return String(item.number || '').trim();
}

export function primaryPhone(identity) {
  const phones = asArray(identity?.phones);
  if (phones.length) return phoneNumberOf(pickPrimaryItem(phones));
  return String(identity?.phone || '').trim();
}

export function primaryAddress(identity) {
  const addresses = asArray(identity?.addresses);
  if (addresses.length) {
    const first = pickPrimaryItem(addresses);
    const row = first && typeof first === 'object' ? first : {};
    return {
      province: String(row.provinceName || row.province || '').trim(),
      city: String(row.cityName || row.city || '').trim(),
      officialAddress: String(row.address || row.officialAddress || '').trim(),
      postalCode: String(row.postalCode || '').trim(),
    };
  }
  return {
    province: String(identity?.province || '').trim(),
    city: String(identity?.city || '').trim(),
    officialAddress: String(identity?.officialAddress || '').trim(),
    postalCode: String(identity?.postalCode || '').trim(),
  };
}

export function primaryBankAccount(identity) {
  const banks = asArray(identity?.bankAccounts);
  if (banks.length) {
    const first = pickPrimaryItem(banks);
    const row = first && typeof first === 'object' ? first : {};
    return {
      bankCode: String(row.bankCode || '').trim(),
      bankName: String(row.bankName || '').trim(),
      accountHolderName: String(row.accountHolderName || '').trim(),
      accountNumber: String(row.accountNumber || '').trim(),
      iban: String(row.iban || '').trim(),
    };
  }
  return {
    bankCode: String(identity?.bankCode || '').trim(),
    bankName: String(identity?.bankName || '').trim(),
    accountHolderName: String(identity?.accountHolderName || '').trim(),
    accountNumber: String(identity?.bankAccountNumber || '').trim(),
    iban: String(identity?.iban || '').trim(),
  };
}

function parsePhones(src, { mintIds }) {
  const list = Array.isArray(src.phones)
    ? src.phones
    : (trimText(src.phone) ? [src.phone] : []);
  const phones = [];
  list.forEach((item, index) => {
    const raw = item && typeof item === 'object' ? item : {};
    const checked = validateOrganizationPhone(phoneNumberOf(item));
    const number = checked.ok ? checked.number : toAsciiDigits(phoneNumberOf(item)).trim();
    if (!number) return;
    phones.push({
      id: resolveItemId(raw.id, 'orgph', index, { mintIds }),
      sortOrder: index,
      label: clipLabel(raw.label),
      number,
      isPrimary: isFlaggedPrimary(raw),
    });
  });
  return assignPrimary(phones);
}

function hydrateAddressItem(item, index, { mintIds }) {
  const raw = item && typeof item === 'object' ? item : {};
  const provinceHint = trimText(raw.provinceCode || raw.provinceName || raw.province);
  const province = resolveProvince(provinceHint);
  const city = province
    ? (cityByCode(province, raw.cityCode) || cityByName(province, raw.cityName || raw.city))
    : null;
  const address = trimText(raw.address || raw.officialAddress);
  const postalCode = toAsciiDigits(raw.postalCode || '').trim();
  const provinceName = province?.name || trimText(raw.provinceName || raw.province);
  const cityName = city?.name || trimText(raw.cityName || raw.city);
  if (!provinceName && !cityName && !address && !postalCode && !clipLabel(raw.label)) {
    return null;
  }
  return {
    id: resolveItemId(raw.id, 'orgad', index, { mintIds }),
    sortOrder: index,
    label: clipLabel(raw.label),
    provinceCode: province?.code || '',
    provinceName,
    cityCode: city?.code || '',
    cityName,
    address,
    postalCode,
    isPrimary: isFlaggedPrimary(raw),
  };
}

function parseAddresses(src, { mintIds }) {
  if (Array.isArray(src.addresses)) {
    return assignPrimary(src.addresses
      .map((item, index) => hydrateAddressItem(item, index, { mintIds }))
      .filter(Boolean));
  }
  const row = hydrateAddressItem({
    province: src.province,
    city: src.city,
    officialAddress: src.officialAddress,
    postalCode: src.postalCode,
  }, 0, { mintIds });
  return row ? assignPrimary([row]) : [];
}

function parseBankAccounts(src, { mintIds }) {
  const fallbackHolder = trimText(src.legalName || src.accountHolderName);
  const list = Array.isArray(src.bankAccounts)
    ? src.bankAccounts
    : [{
      bankCode: inferBankCodeFromName(src.bankName),
      bankName: src.bankName,
      accountHolderName: fallbackHolder,
      accountNumber: src.bankAccountNumber,
      iban: src.iban,
    }];
  const rows = [];
  list.forEach((item, index) => {
    const raw = item && typeof item === 'object' ? item : {};
    const bankCode = trimText(raw.bankCode);
    const bankName = trimText(raw.bankName);
    const accountHolderName = trimText(raw.accountHolderName) || fallbackHolder;
    const accountNumber = normalizeAccountNumber(raw.accountNumber);
    const iban = raw.iban;
    const hasBankData = Boolean(bankCode || bankName || accountNumber || trimText(iban));
    if (!hasBankData) return;
    rows.push({
      id: resolveItemId(raw.id, 'orgba', index, { mintIds }),
      sortOrder: index,
      bankCode,
      bankName,
      accountHolderName,
      accountNumber,
      iban,
      isPrimary: isFlaggedPrimary(raw),
    });
  });
  return assignPrimary(rows);
}

function validateAddressRow(row, index) {
  if (row.cityName && !row.provinceCode && !row.provinceName) {
    return `برای شهر ردیف ${index + 1} ابتدا استان را انتخاب کنید.`;
  }
  if (row.provinceName && !row.provinceCode) {
    return `استان ردیف ${index + 1} در فهرست استان‌ها نیست.`;
  }
  if (row.cityName && !cityBelongsToProvinceCode(row.provinceCode, row.cityCode, row.cityName)) {
    return `شهر ردیف ${index + 1} متعلق به استان انتخاب‌شده نیست.`;
  }
  if (row.postalCode && !/^[0-9]{1,20}$/.test(row.postalCode)) {
    return `کد پستی ردیف ${index + 1} نامعتبر است.`;
  }
  return '';
}

function normalizeBankRow(row, index) {
  const code = row.bankCode || inferBankCodeFromName(row.bankName);
  const bank = bankByCode(code);
  if (!bank) {
    return { ok: false, message: `بانک ردیف ${index + 1} را از فهرست انتخاب کنید.` };
  }
  const holder = trimText(row.accountHolderName);
  if (!holder) {
    return { ok: false, message: `نام صاحب حساب ردیف ${index + 1} الزامی است.` };
  }
  const account = validateAccountNumber(row.accountNumber);
  if (!account.ok) {
    return { ok: false, message: `${account.message} (ردیف ${index + 1})` };
  }
  const iban = validateIranIban(row.iban);
  if (!iban.ok) {
    return { ok: false, message: `${iban.message} (ردیف ${index + 1})` };
  }
  if (iban.iban) {
    const ibanBank = iranIbanBankCode(iban.iban);
    if (ibanBank && ibanBank !== bank.code) {
      return { ok: false, message: 'شماره شبا متعلق به بانک انتخاب‌شده نیست.' };
    }
  }
  return {
    ok: true,
    row: {
      id: row.id,
      sortOrder: row.sortOrder,
      bankCode: bank.code,
      bankName: bank.name,
      accountHolderName: holder,
      accountNumber: account.accountNumber,
      iban: iban.iban,
      isPrimary: Boolean(row.isPrimary),
    },
  };
}

export function hydrateIdentityCollections(src) {
  const body = src && typeof src === 'object' ? src : {};
  return {
    phones: parsePhones(body, { mintIds: false }),
    addresses: parseAddresses(body, { mintIds: false }),
    bankAccounts: parseBankAccounts(body, { mintIds: false }).map((row) => {
      const bank = bankByCode(row.bankCode) || bankByCode(inferBankCodeFromName(row.bankName));
      return {
        ...row,
        bankCode: bank?.code || row.bankCode,
        bankName: bank?.name || row.bankName,
      };
    }),
  };
}

/**
 * @returns {{ ok: true, collections: object, primary: object } | { ok: false, message: string }}
 */
export function normalizeIdentityCollections(src) {
  const body = src && typeof src === 'object' ? src : {};
  const parsedPhones = parsePhones(body, { mintIds: true });
  for (let i = 0; i < parsedPhones.length; i += 1) {
    const check = validateOrganizationPhone(parsedPhones[i].number);
    if (!check.ok) return { ok: false, message: `${check.message} (تلفن ردیف ${i + 1})` };
    parsedPhones[i].number = check.number;
  }
  const phones = assignPrimary(parsedPhones);

  const addresses = parseAddresses(body, { mintIds: true });
  for (let i = 0; i < addresses.length; i += 1) {
    const err = validateAddressRow(addresses[i], i);
    if (err) return { ok: false, message: err };
  }

  const rawBanks = parseBankAccounts(body, { mintIds: true });
  const bankAccounts = [];
  for (let i = 0; i < rawBanks.length; i += 1) {
    const check = normalizeBankRow(rawBanks[i], i);
    if (!check.ok) return { ok: false, message: check.message };
    bankAccounts.push(check.row);
  }
  const banks = assignPrimary(bankAccounts);

  const primaryPhoneItem = pickPrimaryItem(phones);
  const primaryAddr = pickPrimaryItem(addresses) || {};
  const primaryBank = pickPrimaryItem(banks) || {};
  return {
    ok: true,
    collections: { phones, addresses, bankAccounts: banks },
    primary: {
      phone: primaryPhoneItem?.number || '',
      province: primaryAddr.provinceName || '',
      city: primaryAddr.cityName || '',
      officialAddress: primaryAddr.address || '',
      postalCode: primaryAddr.postalCode || '',
      bankName: primaryBank.bankName || '',
      bankAccountNumber: primaryBank.accountNumber || '',
      iban: primaryBank.iban || '',
    },
  };
}

export function presentIdentityCollections(row) {
  const hydrated = hydrateIdentityCollections(row || {});
  const addr = primaryAddress({ ...row, ...hydrated });
  const bank = primaryBankAccount({ ...row, ...hydrated });
  return {
    phones: hydrated.phones,
    addresses: hydrated.addresses,
    bankAccounts: hydrated.bankAccounts,
    phone: primaryPhone({ ...row, ...hydrated }),
    province: addr.province,
    city: addr.city,
    officialAddress: addr.officialAddress,
    postalCode: addr.postalCode,
    bankName: bank.bankName,
    bankAccountNumber: bank.accountNumber,
    iban: bank.iban,
  };
}

export function emptyToNull(value) {
  const text = String(value ?? '').trim();
  return text === '' ? null : text;
}
