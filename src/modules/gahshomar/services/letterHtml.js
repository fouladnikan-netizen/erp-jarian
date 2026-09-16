/**
 * Lightweight HTML helpers for official letter body storage.
 * Body is stored as HTML from TipTap; templates start as plain text.
 */

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Convert plain-text paragraphs to simple HTML for the editor. */
export function plainTextToHtml(text) {
  const raw = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!raw) return '<p></p>';
  return raw
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n').map((line) => escapeHtml(line) || '&nbsp;');
      return `<p>${lines.join('<br>')}</p>`;
    })
    .join('');
}

/** Strip tags for search / mock AI when needed. */
export function htmlToPlainText(html) {
  const raw = String(html || '');
  if (!raw.trim()) return '';
  return raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isHtmlContent(value) {
  return /<\/?[a-z][\s\S]*>/i.test(String(value || ''));
}

/** Ensure body is HTML (legacy plain-text records remain readable). */
export function ensureLetterHtml(value) {
  const raw = String(value || '').trim();
  if (!raw) return '<p></p>';
  if (isHtmlContent(raw)) return raw;
  return plainTextToHtml(raw);
}
