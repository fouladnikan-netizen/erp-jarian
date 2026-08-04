const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

function toAsciiDigits(value) {
  return String(value || '').replace(/[۰-۹]/g, (ch) => String(FA_DIGITS.indexOf(ch)));
}

/**
 * Order codes used across Nabz / Kanoon seeds and live orders.
 * Accepts JR050111002, JR-050111002, and Persian digits.
 */
export const ORDER_CODE_PATTERN = /JR-?[0-9۰-۹]{6,}/gi;

const CONTACT_PATH_PATTERN = /\/kanoon\/contact\/([0-9A-Za-z۰-۹_-]+)/gi;
const ORDER_PATH_PATTERN = /\/nabz\/order\/([A-Za-z0-9۰-۹_-]+)/gi;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** @param {string} raw */
export function normalizeOrderCode(raw) {
  return toAsciiDigits(raw).trim();
}

/**
 * Build path for an order code (no return query).
 * @param {string} code
 */
export function orderDeepLinkPath(code) {
  const normalized = normalizeOrderCode(code);
  if (!normalized) return null;
  return `/nabz/order/${encodeURIComponent(normalized)}`;
}

/**
 * Build path for a company/contact id (no return query).
 * @param {string|number} companyId
 */
export function companyDeepLinkPath(companyId) {
  if (companyId == null || companyId === '') return null;
  return `/kanoon/contact/${encodeURIComponent(String(companyId))}`;
}

/**
 * Tokenize free text into plain segments and entity link segments.
 *
 * @param {string} text
 * @param {{
 *   companies?: Array<{ id: string|number, name: string }>,
 *   extraLabels?: Array<{ label: string, path: string, kind?: string }>,
 * }} [options]
 * @returns {Array<{ type: 'text' | 'link', value: string, path?: string, kind?: string }>}
 */
export function tokenizeEntityMentions(text, options = {}) {
  const source = String(text ?? '');
  if (!source) return [];

  /** @type {Array<{ start: number, end: number, value: string, path: string, kind: string }>} */
  const hits = [];

  const pushHit = (start, end, value, path, kind) => {
    if (start < 0 || end <= start || !path) return;
    /* skip overlaps — keep earlier / longer */
    if (hits.some((h) => !(end <= h.start || start >= h.end))) return;
    hits.push({ start, end, value, path, kind });
  };

  for (const item of options.extraLabels || []) {
    const label = String(item.label || '').trim();
    if (!label || !item.path) continue;
    let from = 0;
    while (from < source.length) {
      const idx = source.indexOf(label, from);
      if (idx === -1) break;
      pushHit(idx, idx + label.length, label, item.path, item.kind || 'entity');
      from = idx + label.length;
    }
  }

  for (const company of options.companies || []) {
    const name = String(company.name || '').trim();
    const path = companyDeepLinkPath(company.id);
    if (!name || name.length < 2 || !path) continue;
    const re = new RegExp(escapeRegExp(name), 'g');
    let match = re.exec(source);
    while (match) {
      pushHit(match.index, match.index + match[0].length, match[0], path, 'company');
      match = re.exec(source);
    }
  }

  let orderMatch;
  const orderRe = new RegExp(ORDER_CODE_PATTERN.source, 'gi');
  while ((orderMatch = orderRe.exec(source)) !== null) {
    const path = orderDeepLinkPath(orderMatch[0]);
    pushHit(orderMatch.index, orderMatch.index + orderMatch[0].length, orderMatch[0], path, 'order');
  }

  let pathMatch;
  const orderPathRe = new RegExp(ORDER_PATH_PATTERN.source, 'gi');
  while ((pathMatch = orderPathRe.exec(source)) !== null) {
    const code = pathMatch[1];
    const path = orderDeepLinkPath(code);
    pushHit(pathMatch.index, pathMatch.index + pathMatch[0].length, pathMatch[0], path, 'order');
  }

  const contactPathRe = new RegExp(CONTACT_PATH_PATTERN.source, 'gi');
  while ((pathMatch = contactPathRe.exec(source)) !== null) {
    const path = companyDeepLinkPath(pathMatch[1]);
    pushHit(pathMatch.index, pathMatch.index + pathMatch[0].length, pathMatch[0], path, 'company');
  }

  hits.sort((a, b) => a.start - b.start || b.end - a.end);

  const tokens = [];
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue;
    if (hit.start > cursor) {
      tokens.push({ type: 'text', value: source.slice(cursor, hit.start) });
    }
    tokens.push({
      type: 'link',
      value: hit.value,
      path: hit.path,
      kind: hit.kind,
    });
    cursor = hit.end;
  }
  if (cursor < source.length) {
    tokens.push({ type: 'text', value: source.slice(cursor) });
  }
  return tokens.length ? tokens : [{ type: 'text', value: source }];
}
