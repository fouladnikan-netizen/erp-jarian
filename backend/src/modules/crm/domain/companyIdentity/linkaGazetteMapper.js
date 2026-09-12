/**
 * Linka Gazette → latest + history snapshot for Company payload.
 * Verified fields only. Resolve latest by parsed date (Jalali after conversion), not rows[0].
 */

import { toJalaliDateString, toJalaliSortKey } from './linkaDisplayFormat.js';

/** @typedef {{
 *   newsPaperDate?: string|null,
 *   newsPaperNumber?: string|number|null,
 *   newsPaperPageNumber?: string|number|null,
 *   gazetteNumber?: string|number|null,
 *   gazetteDate?: string|null,
 *   gazetteTitle?: string|null,
 *   gazetteBody?: string|null,
 * }} LinkaGazetteRow */

/**
 * @param {unknown} raw
 * @returns {{ ok: true, totalCount: number, rows: LinkaGazetteRow[] } | { ok: false, error: string }}
 */
export function parseGazetteEnvelope(raw) {
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
 * @deprecated use toJalaliSortKey — kept for tests that import the old name
 * @param {string|null|undefined} value
 * @returns {number|null}
 */
export function parseJalaliSortKey(value) {
  const key = toJalaliSortKey(value);
  return key || null;
}

/**
 * @param {LinkaGazetteRow} row
 */
export function normalizeGazetteRow(row) {
  const gazetteDateRaw = row.gazetteDate != null ? String(row.gazetteDate) : null;
  const newsPaperDateRaw = row.newsPaperDate != null ? String(row.newsPaperDate) : null;
  const gazetteDate = gazetteDateRaw ? toJalaliDateString(gazetteDateRaw) : null;
  const newsPaperDate = newsPaperDateRaw ? toJalaliDateString(newsPaperDateRaw) : null;
  return {
    gazetteNumber: row.gazetteNumber != null ? String(row.gazetteNumber) : null,
    gazetteDate,
    gazetteTitle: row.gazetteTitle != null ? String(row.gazetteTitle) : null,
    gazetteBody: row.gazetteBody != null ? String(row.gazetteBody) : null,
    newsPaperDate,
    newsPaperNumber: row.newsPaperNumber != null ? String(row.newsPaperNumber) : null,
    newsPaperPageNumber: row.newsPaperPageNumber != null ? String(row.newsPaperPageNumber) : null,
    sortKey: toJalaliSortKey(gazetteDateRaw || gazetteDate)
      || toJalaliSortKey(newsPaperDateRaw || newsPaperDate)
      || 0,
  };
}

/**
 * Resolve latest gazette by max sortKey (date), not rows[0].
 * @param {LinkaGazetteRow[]} rows
 * @param {{ totalCount?: number, fetchedAt?: string }} [meta]
 */
export function buildGazetteSnapshot(rows, meta = {}) {
  const normalized = (rows || []).map(normalizeGazetteRow);
  const sorted = [...normalized].sort((a, b) => b.sortKey - a.sortKey);
  const latest = sorted[0] || null;
  const history = sorted.map(({ sortKey, ...rest }) => rest);

  let latestSummary = '';
  if (latest) {
    const parts = [
      latest.gazetteDate,
      latest.gazetteNumber ? `شماره ${latest.gazetteNumber}` : null,
      latest.gazetteTitle,
    ].filter(Boolean);
    latestSummary = parts.join(' — ');
  }

  return {
    provider: 'LINKA',
    fetchedAt: meta.fetchedAt || new Date().toISOString(),
    totalCount: meta.totalCount ?? history.length,
    latest: latest
      ? {
        gazetteDate: latest.gazetteDate,
        gazetteNumber: latest.gazetteNumber,
        gazetteTitle: latest.gazetteTitle,
        gazetteBody: latest.gazetteBody,
        newsPaperDate: latest.newsPaperDate,
        newsPaperNumber: latest.newsPaperNumber,
        newsPaperPageNumber: latest.newsPaperPageNumber,
      }
      : null,
    latestSummary,
    history,
  };
}

export default {
  parseGazetteEnvelope,
  parseJalaliSortKey,
  normalizeGazetteRow,
  buildGazetteSnapshot,
};
