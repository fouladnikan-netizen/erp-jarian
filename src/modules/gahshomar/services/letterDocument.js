/**
 * Fixed official-letter document structure (compose + print SSOT).
 * Subject / attention person come from form fields — not TipTap.
 * TipTap only edits greeting + free body text.
 */

import { CURRENT_USER, CURRENT_USER_ROLE, USER_ROLES } from '../../nabz/constants';
import { escapeHtml, ensureLetterHtml, htmlToPlainText, plainTextToHtml } from './letterHtml';

export const LETTER_BISMILLAH = 'به نام یکتا خالق هستی';
export const LETTER_GREETING = 'با سلام و احترام';
/** Closing org line on letters (left-aligned signatory block). */
export const LETTER_ORG_LINE = 'پترو فولاد نیکان';

/**
 * Letter-only display titles for internal roles.
 * Do not use these labels outside official letters.
 */
export const LETTER_ROLE_DISPLAY_TITLES = Object.freeze({
  شوالیه: 'کارشناس فروش',
  کاشف: 'مدیر بازرگانی',
  'دیده‌بان': 'مدیر حسابداری',
  راهبر: 'مدیر فروش',
  بازو: 'مدیر عملیات',
});

const ROLE_KEY_TO_LETTER_LABEL = Object.freeze({
  [USER_ROLES.KNIGHT]: 'شوالیه',
  [USER_ROLES.EXPLORER]: 'کاشف',
  [USER_ROLES.WATCHER]: 'دیده‌بان',
  [USER_ROLES.LEADER]: 'راهبر',
  [USER_ROLES.MANAGER]: 'راهبر',
  [USER_ROLES.BRANCH]: 'بازو',
});

/**
 * Map internal role (Persian label or system key) → letter title.
 * Only the five mapped roles resolve; everything else returns ''.
 * @param {string} [roleOrTitle]
 */
export function resolveLetterRoleTitle(roleOrTitle) {
  const raw = String(roleOrTitle || '').trim();
  if (!raw) return '';

  const displayValues = Object.values(LETTER_ROLE_DISPLAY_TITLES);
  if (displayValues.includes(raw)) return raw;

  if (LETTER_ROLE_DISPLAY_TITLES[raw]) return LETTER_ROLE_DISPLAY_TITLES[raw];

  const persianLabel = ROLE_KEY_TO_LETTER_LABEL[raw];
  if (persianLabel && LETTER_ROLE_DISPLAY_TITLES[persianLabel]) {
    return LETTER_ROLE_DISPLAY_TITLES[persianLabel];
  }

  return '';
}

/**
 * Demo signatory until Auth SSOT — mirrors Nabz CURRENT_USER.
 * `title` is letter-only (e.g. راهبر → مدیر فروش).
 * @param {string} [role]
 */
export function getLetterSignatory(role = CURRENT_USER_ROLE) {
  return Object.freeze({
    name: CURRENT_USER,
    role,
    title: resolveLetterRoleTitle(role),
    company: LETTER_ORG_LINE,
  });
}

/**
 * Honorable addressee company line for letter header.
 * @param {string} [companyName]
 */
export function formatHonorableCompany(companyName) {
  const name = String(companyName || '').trim();
  if (!name) return '';
  return `شرکت معظم ${name}`;
}

/** Strip leading greeting lines so templates don't duplicate the fixed greeting. */
export function stripLeadingGreeting(text) {
  return String(text || '')
    .replace(/^\s*با سلام(?:\s*و\s*احترام)?[؛،:.\s]*/u, '')
    .replace(/^\s*احتراماً[،.\s]*/u, '')
    .trim();
}

/**
 * Default / template-driven editable body (greeting + free text).
 * @param {string} [suggestedPlain]
 */
export function buildDefaultEditableBody(suggestedPlain = '') {
  const text = stripLeadingGreeting(suggestedPlain);
  if (!text) {
    return `<p style="text-align: right">${escapeHtml(LETTER_GREETING)}</p><p style="text-align: right"></p>`;
  }
  return plainTextToHtml(`${LETTER_GREETING}\n${text}`);
}

/**
 * Ensure stored body is the editable segment only (not bismillah / subject / footer).
 * @param {string} value
 */
export function ensureEditableLetterBody(value) {
  const html = ensureLetterHtml(value);
  const plain = htmlToPlainText(html);
  if (!plain.trim()) return buildDefaultEditableBody('');
  if (/به نام یکتا خالق هستی/.test(plain)) {
    // Legacy full-document HTML — keep text after greeting if present.
    const afterGreeting = plain.split(/با سلام(?:\s*و\s*احترام)?/u).slice(1).join('با سلام و احترام').trim();
    if (afterGreeting) return buildDefaultEditableBody(afterGreeting);
    return buildDefaultEditableBody(stripLeadingGreeting(plain.replace(/به نام یکتا خالق هستی/g, '')));
  }
  if (!/^با سلام/.test(plain.trim())) {
    return buildDefaultEditableBody(plain);
  }
  return html;
}
