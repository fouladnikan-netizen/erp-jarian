/**
 * Fixed official-letter document structure (compose + print SSOT).
 * Subject / attention person come from form fields — not TipTap.
 * TipTap only edits greeting + free body text.
 */

import { CURRENT_USER } from '../../nabz/constants';
import { escapeHtml, ensureLetterHtml, htmlToPlainText, plainTextToHtml } from './letterHtml';

export const LETTER_BISMILLAH = 'به نام یکتا خالق هستی';
export const LETTER_GREETING = 'با سلام و احترام';
/** Closing org line on letters (left-aligned signatory block). */
export const LETTER_ORG_LINE = 'پترو فولاد نیکان';

/** Demo signatory until Auth SSOT — mirrors Nabz CURRENT_USER. */
export function getLetterSignatory() {
  return Object.freeze({
    name: CURRENT_USER,
    title: 'راهبر',
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
