import { describe, expect, it } from 'vitest';
import {
  LETTER_SUBJECT_TEMPLATES,
  filterLetterSubjectTemplates,
  findLetterSubjectTemplate,
} from '../letterSubjectTemplates.js';
import { ensureLetterHtml, htmlToPlainText } from '../letterHtml.js';

describe('letterSubjectTemplates runtime contract', () => {
  it('exposes the settlement template with professional body', () => {
    const template = findLetterSubjectTemplate('درخواست تسویه حساب');
    expect(template).toBeTruthy();
    expect(template.subject).toBe('درخواست تسویه حساب');
    expect(template.body).toContain('با سلام');
    expect(template.body).toContain('تسویه حساب مانده حساب');
  });

  it('returns full catalog when query is empty (CREATE focus)', () => {
    const all = filterLetterSubjectTemplates('');
    expect(all.length).toBe(LETTER_SUBJECT_TEMPLATES.length);
    expect(all.every((item) => item.bodyHtml && item.bodyHtml.includes('<p>'))).toBe(true);
  });

  it('template bodyHtml is ready for TipTap setContent', () => {
    const template = filterLetterSubjectTemplates('تسویه')[0];
    expect(template).toBeTruthy();
    const html = template.bodyHtml || ensureLetterHtml(template.body);
    expect(htmlToPlainText(html)).toContain('با سلام');
    expect(htmlToPlainText(html)).toContain('تسویه حساب');
  });
});
