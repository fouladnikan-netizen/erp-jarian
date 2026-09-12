/**
 * Linka CompanyPerson → Kanoon governance + ContactPerson upsert DTOs.
 * Verified fields only — do not invent schema.
 */

import { toJalaliDateString } from './linkaDisplayFormat.js';

/** @typedef {{
 *   firstName?: string|null,
 *   lastName?: string|null,
 *   fullName?: string|null,
 *   nationalCode?: string|null,
 *   postId?: number|null,
 *   postDescription?: string|null,
 *   postCategoryId?: number|null,
 *   postCategoryTitle?: string|null,
 *   personTypeId?: number|null,
 *   personTypeDescription?: string|null,
 *   startDate?: string|null,
 *   endDate?: string|null,
 *   durationTypeId?: number|null,
 *   durationTypeDescription?: string|null,
 *   stockPercentage?: number|null,
 *   stockCount?: number|null,
 *   stockAmount?: number|null,
 *   personAttendanceStatusId?: number|null,
 *   personAttendanceStatusDescription?: string|null,
 * }} LinkaPersonRow */

const CEO_POST_RE = /مدیر\s*عامل/;
const BOARD_CATEGORY_RE = /هیئت\s*مدیره/;
const INSPECTOR_CATEGORY_RE = /بازرس|حسابرس/;

/**
 * @param {unknown} raw
 * @returns {{ ok: true, totalCount: number, rows: LinkaPersonRow[] } | { ok: false, error: string }}
 */
export function parseCompanyPersonEnvelope(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'invalid_envelope' };
  }
  const body = /** @type {Record<string, unknown>} */ (raw);
  if (body.success !== true) {
    return { ok: false, error: 'provider_rejected' };
  }
  const data = body.data;
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'missing_data' };
  }
  const page = /** @type {Record<string, unknown>} */ (data);
  const rows = Array.isArray(page.rows) ? page.rows : [];
  const totalCount = Number(page.totalCount);
  return {
    ok: true,
    totalCount: Number.isFinite(totalCount) ? totalCount : rows.length,
    rows: rows.filter((r) => r && typeof r === 'object'),
  };
}

/**
 * @param {LinkaPersonRow} row
 */
export function isActiveLinkaPerson(row) {
  const status = String(row.personAttendanceStatusDescription || '').trim();
  if (!status) return true; // unknown → keep; filter later if needed
  if (/غیرفعال|منقضی|خاتمه|پایان|لغو/.test(status)) return false;
  if (/فعال|جاری|فعلی/.test(status)) return true;
  // If endDate present and looks past — still keep; provider status is authority
  return true;
}

/**
 * Deduplicate by nationalCode; collect roles on one person.
 * @param {LinkaPersonRow[]} rows
 */
export function dedupeLinkaPersonsByNationalCode(rows) {
  /** @type {Map<string, { nationalCode: string, fullName: string, roles: Array<object>, rows: LinkaPersonRow[] }>} */
  const map = new Map();
  let anon = 0;

  for (const row of rows) {
    if (!isActiveLinkaPerson(row)) continue;

    const nationalCode = String(row.nationalCode || '').replace(/\D/g, '');
    const fullName = String(row.fullName || `${row.firstName || ''} ${row.lastName || ''}`.trim() || '').trim();
    if (!fullName && !nationalCode) continue;

    const key = nationalCode || `anon:${fullName}:${++anon}`;
    const role = {
      postId: row.postId ?? null,
      postDescription: row.postDescription ? String(row.postDescription) : null,
      postCategoryId: row.postCategoryId ?? null,
      postCategoryTitle: row.postCategoryTitle ? String(row.postCategoryTitle) : null,
      startDate: row.startDate ? toJalaliDateString(row.startDate) : null,
      endDate: row.endDate ? toJalaliDateString(row.endDate) : null,
      durationTypeDescription: row.durationTypeDescription
        ? String(row.durationTypeDescription)
        : null,
      personAttendanceStatusDescription: row.personAttendanceStatusDescription
        ? String(row.personAttendanceStatusDescription)
        : null,
    };

    const existing = map.get(key);
    if (existing) {
      existing.roles.push(role);
      existing.rows.push(row);
      if (!existing.fullName && fullName) existing.fullName = fullName;
    } else {
      map.set(key, {
        nationalCode,
        fullName: fullName || nationalCode || 'بدون نام',
        roles: [role],
        rows: [row],
      });
    }
  }

  return [...map.values()];
}

/**
 * Prefer CEO → board chair → board → inspector → first role for display title.
 * @param {Array<{ postDescription?: string|null, postCategoryTitle?: string|null }>} roles
 */
export function pickPrimaryRoleTitle(roles) {
  if (!Array.isArray(roles) || roles.length === 0) return null;
  const scored = roles.map((role, index) => {
    const post = String(role.postDescription || '');
    const cat = String(role.postCategoryTitle || '');
    let score = 0;
    if (CEO_POST_RE.test(post) || CEO_POST_RE.test(cat)) score = 100;
    else if (/رئیس\s*هیئت/.test(post)) score = 90;
    else if (/نایب\s*رئیس/.test(post)) score = 80;
    else if (BOARD_CATEGORY_RE.test(cat) || /عضو\s*هیئت/.test(post)) score = 70;
    else if (INSPECTOR_CATEGORY_RE.test(cat) || INSPECTOR_CATEGORY_RE.test(post)) score = 50;
    else score = 10;
    return { role, score, index };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored[0].role.postDescription || scored[0].role.postCategoryTitle || null;
}

/**
 * @param {ReturnType<typeof dedupeLinkaPersonsByNationalCode>} persons
 */
export function buildGovernanceFromLinkaPersons(persons) {
  const ceo = { name: '', nationalId: '', validUntil: '' };
  /** @type {Array<{ role: string, name: string, nationalId: string }>} */
  const boardMembers = [];
  /** @type {Array<{ role: string, name: string, nationalId: string }>} */
  const inspectors = [];

  for (const person of persons) {
    const roles = person.roles || [];
    const hasCeo = roles.some((r) => CEO_POST_RE.test(String(r.postDescription || ''))
      || CEO_POST_RE.test(String(r.postCategoryTitle || '')));
    const boardRoles = roles.filter((r) => BOARD_CATEGORY_RE.test(String(r.postCategoryTitle || ''))
      || /هیئت\s*مدیره/.test(String(r.postDescription || '')));
    const inspectorRoles = roles.filter((r) => INSPECTOR_CATEGORY_RE.test(String(r.postCategoryTitle || ''))
      || INSPECTOR_CATEGORY_RE.test(String(r.postDescription || '')));

    if (hasCeo && !ceo.name) {
      ceo.name = person.fullName;
      ceo.nationalId = person.nationalCode || '';
      const ceoRole = roles.find((r) => CEO_POST_RE.test(String(r.postDescription || '')));
      ceo.validUntil = ceoRole?.endDate || '';
    }

    for (const role of boardRoles) {
      const label = String(role.postDescription || role.postCategoryTitle || 'عضو هیئت مدیره');
      // Skip pure CEO-only rows from board list if post is only مدیرعامل without board category
      if (CEO_POST_RE.test(label) && !BOARD_CATEGORY_RE.test(String(role.postCategoryTitle || ''))) {
        continue;
      }
      boardMembers.push({
        role: label,
        name: person.fullName,
        nationalId: person.nationalCode || '',
      });
    }

    for (const role of inspectorRoles) {
      inspectors.push({
        role: String(role.postDescription || role.postCategoryTitle || 'بازرس'),
        name: person.fullName,
        nationalId: person.nationalCode || '',
      });
    }
  }

  return {
    ceo,
    boardMembers,
    boardValidUntil: '',
    inspectors,
  };
}

/**
 * ContactPerson upsert DTOs — one row per physical person; roles in payload.
 * @param {ReturnType<typeof dedupeLinkaPersonsByNationalCode>} persons
 * @param {string} companyId
 */
export function buildContactPersonUpserts(persons, companyId) {
  return persons.map((person) => {
    const primary = pickPrimaryRoleTitle(person.roles);
    const allTitles = [...new Set(
      person.roles
        .map((r) => String(r.postDescription || r.postCategoryTitle || '').trim())
        .filter(Boolean),
    )];
    return {
      companyId,
      fullName: person.fullName,
      mobile: null,
      roleTitle: primary || allTitles[0] || null,
      payload: {
        source: 'LINKA',
        providerNationalCode: person.nationalCode || null,
        linkaRoles: person.roles,
        linkaRoleTitles: allTitles,
        isLinkaOfficial: true,
      },
    };
  });
}

export default {
  parseCompanyPersonEnvelope,
  isActiveLinkaPerson,
  dedupeLinkaPersonsByNationalCode,
  pickPrimaryRoleTitle,
  buildGovernanceFromLinkaPersons,
  buildContactPersonUpserts,
};
