/**
 * Mock sample values for Smart Template Builder preview only.
 * No render engine — not used for real sends.
 */

/** @type {Record<string, string>} */
export const TEMPLATE_PREVIEW_MOCK_VALUES = Object.freeze({
  personFirstName: 'علی',
  personLastName: 'رضایی',
  personFullName: 'علی رضایی',
  customerName: 'علی رضایی',
  personGender: 'مرد',
  personRole: 'مدیر خرید',
  personMobile: '۰۹۱۲۱۲۳۴۵۶۷',
  personEmail: 'ali.rezaei@example.com',
  companyName: 'فولاد نوین پارس',
  companyCity: 'تهران',
  companyProvince: 'تهران',
  companyIndustry: 'فولاد',
  companyType: 'تولیدی',
  orderNumber: '45821',
  orderDate: '1405/08/05',
  deliveryDate: '1405/08/12',
  orderAmount: '۱۲,۵۰۰,۰۰۰',
  orderWeight: '۲۴,۵۰۰',
  productName: 'کلاف فولادی',
  productBrand: 'فولاد مبارکه',
  supplierName: 'تأمین‌کننده رسمی الف',
  purchaseTotal: '۸۵,۰۰۰,۰۰۰',
  orderCount: '۱۲',
  lastPurchaseDate: '1405/07/28',
  firstPurchaseDate: '1403/02/15',
  accountBalance: '۲,۳۰۰,۰۰۰',
  debtAmount: '۰',
  creditAmount: '۵۰۰,۰۰۰',
  campaignName: 'نظرسنجی پس از تحویل',
  campaignRunDate: '1405/08/15',
  taskTitle: 'پیگیری تلفنی',
  taskDescription: 'تماس با مشتری برای پیگیری سفارش',
  taskPriority: 'عادی',
  taskDueDate: '1405/08/20',
});

/**
 * Replace {{tokens}} with mock values — preview only.
 * @param {string} content
 * @returns {string}
 */
export function renderTemplatePreviewMock(content) {
  const text = String(content || '');
  return text.replace(/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g, (match, key) => {
    const sample = TEMPLATE_PREVIEW_MOCK_VALUES[key];
    return sample != null ? sample : match;
  });
}
