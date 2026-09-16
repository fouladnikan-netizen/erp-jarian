/**
 * Seed defaults for the six canonical Personas (DDL-42).
 * Runtime source of truth is PostgreSQL `personas` — do not import this
 * from services, routes, RBAC, or UI. Seed never overwrites edited rows.
 */
export const INITIAL_PERSONAS = Object.freeze([
  Object.freeze({ id: 'prs_sales', code: 'SALES', name: 'شوالیه', domain: 'فروش' }),
  Object.freeze({ id: 'prs_procurement', code: 'PROCUREMENT', name: 'سامورایی', domain: 'تأمین' }),
  Object.freeze({ id: 'prs_finance', code: 'FINANCE', name: 'مُستوفی', domain: 'مالی و حسابداری' }),
  Object.freeze({ id: 'prs_logistics', code: 'LOGISTICS', name: 'قافله‌سالار', domain: 'لجستیک' }),
  Object.freeze({ id: 'prs_quality', code: 'QUALITY', name: 'عیارگر', domain: 'کنترل کیفیت' }),
  Object.freeze({ id: 'prs_system', code: 'SYSTEM', name: 'سپهسالار', domain: 'مدیریت سیستم' }),
]);
