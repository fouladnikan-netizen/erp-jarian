/**
 * Smart subject templates for official letter composition (MVP).
 * Selecting a template fills both subject and professional body draft.
 */

import { plainTextToHtml } from './letterHtml';

export const LETTER_SUBJECT_TEMPLATES = Object.freeze([
  {
    id: 'delivery-request',
    subject: 'درخواست تحویل کالا',
    body: [
      'با سلام،',
      'احتراماً، خواهشمند است دستور فرمایید نسبت به تحویل کالای موضوع درخواست/سفارش ثبت‌شده مطابق هماهنگی‌های انجام‌شده اقدام لازم صورت پذیرد.',
      'پیشاپیش از همکاری شما سپاسگزاریم.',
    ].join('\n'),
  },
  {
    id: 'cutting-service',
    subject: 'درخواست خدمات برشکاری',
    body: [
      'با سلام،',
      'احتراماً، خواهشمند است خدمات برشکاری مورد نیاز مطابق مشخصات اعلامی انجام و نتیجه جهت ادامه فرآیند اعلام گردد.',
      'از همکاری شما سپاسگزاریم.',
    ].join('\n'),
  },
  {
    id: 'drilling-service',
    subject: 'درخواست خدمات سوراخکاری',
    body: [
      'با سلام،',
      'احتراماً، درخواست انجام خدمات سوراخکاری مطابق نقشه‌ها و مشخصات فنی اعلامی تقدیم می‌گردد.',
      'خواهشمند است پس از انجام عملیات، مراتب اعلام شود.',
    ].join('\n'),
  },
  {
    id: 'forming-service',
    subject: 'درخواست خدمات فرمینگ',
    body: [
      'با سلام،',
      'احتراماً، خواهشمند است عملیات فرمینگ مطابق مشخصات فنی و توافقات انجام‌شده انجام پذیرد.',
      'لطفاً پس از تکمیل فرآیند، نتیجه اعلام گردد.',
    ].join('\n'),
  },
  {
    id: 'settlement-request',
    subject: 'درخواست تسویه حساب',
    body: [
      'با سلام،',
      'احتراماً، با توجه به انجام تعهدات مربوطه، خواهشمند است نسبت به بررسی و تسویه حساب مانده حساب اقدام فرمایید.',
      'از همکاری شما سپاسگزاریم.',
    ].join('\n'),
  },
  {
    id: 'cheque-agent',
    subject: 'اعلام نماینده شرکت جهت دریافت چک',
    body: [
      'با سلام،',
      'احتراماً، بدین‌وسیله آقای/خانم .......... به عنوان نماینده این شرکت جهت دریافت چک معرفی می‌گردد.',
      'خواهشمند است همکاری لازم در این خصوص انجام پذیرد.',
    ].join('\n'),
  },
  {
    id: 'cheque-return',
    subject: 'درخواست عودت چک',
    body: [
      'با سلام،',
      'احتراماً، با توجه به انجام تعهدات مربوطه، خواهشمند است دستور فرمایید نسبت به عودت چک‌های مربوطه اقدام لازم صورت پذیرد.',
      'پیشاپیش از همکاری شما سپاسگزاریم.',
    ].join('\n'),
  },
  {
    id: 'bank-account',
    subject: 'اعلام شماره حساب بانکی',
    body: [
      'با سلام،',
      'احتراماً، اطلاعات حساب بانکی این شرکت جهت انجام امور مالی و واریزهای مربوطه به شرح زیر اعلام می‌گردد.',
      'خواهشمند است در سوابق مالی ثبت فرمایید.',
    ].join('\n'),
  },
  {
    id: 'company-agent',
    subject: 'معرفی نماینده شرکت',
    body: [
      'با سلام،',
      'احتراماً، بدین‌وسیله آقای/خانم .......... به عنوان نماینده رسمی این شرکت معرفی می‌گردد.',
      'خواهشمند است همکاری لازم با ایشان انجام پذیرد.',
    ].join('\n'),
  },
]);

/**
 * @param {string} [query]
 * @returns {Array<{ id: string, subject: string, body: string, bodyHtml: string }>}
 */
export function filterLetterSubjectTemplates(query = '') {
  const q = String(query || '').trim().toLowerCase();
  const list = LETTER_SUBJECT_TEMPLATES.map((item) => ({
    ...item,
    bodyHtml: plainTextToHtml(item.body),
  }));
  if (!q) return list;
  return list.filter((item) => item.subject.toLowerCase().includes(q));
}

export function findLetterSubjectTemplate(subject) {
  const needle = String(subject || '').trim();
  if (!needle) return null;
  return LETTER_SUBJECT_TEMPLATES.find((item) => item.subject === needle) || null;
}
