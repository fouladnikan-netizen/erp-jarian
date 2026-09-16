/**
 * Template Variable Registry — single source for validation + Smart Template Builder UI.
 * No render engine / no channel send.
 */

export const TEMPLATE_VARIABLE_SCOPE = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  ORDER: 'ORDER',
  CAMPAIGN: 'CAMPAIGN',
  TASK: 'TASK',
  FINANCE: 'FINANCE',
});

/** String literals — avoid circular import with template.types.js */
const TT = Object.freeze({
  MESSAGE: 'MESSAGE_TEMPLATE',
  SURVEY: 'SURVEY_TEMPLATE',
  TASK: 'TASK_TEMPLATE',
  PHYSICAL: 'PHYSICAL_TEMPLATE',
});

const ALL_TEMPLATE_TYPES = Object.freeze(Object.values(TT));

const MESSAGE_SURVEY_TASK = Object.freeze([TT.MESSAGE, TT.SURVEY, TT.TASK]);

export const TEMPLATE_VARIABLE_CATEGORY = Object.freeze({
  CONTACT_PERSON: 'contact_person',
  COMPANY: 'company',
  ORDER: 'order',
  PURCHASE: 'purchase',
  FINANCE: 'finance',
  CAMPAIGN: 'campaign',
  TASK: 'task',
});

export const TEMPLATE_VARIABLE_CATEGORY_LABELS = Object.freeze({
  [TEMPLATE_VARIABLE_CATEGORY.CONTACT_PERSON]: 'شخص مرتبط',
  [TEMPLATE_VARIABLE_CATEGORY.COMPANY]: 'شرکت',
  [TEMPLATE_VARIABLE_CATEGORY.ORDER]: 'سفارش',
  [TEMPLATE_VARIABLE_CATEGORY.PURCHASE]: 'خرید',
  [TEMPLATE_VARIABLE_CATEGORY.FINANCE]: 'مالی',
  [TEMPLATE_VARIABLE_CATEGORY.CAMPAIGN]: 'کمپین',
  [TEMPLATE_VARIABLE_CATEGORY.TASK]: 'وظیفه',
});

/**
 * @typedef {object} TemplateVariableDefinition
 * @property {string} id
 * @property {string} key
 * @property {string} token
 * @property {string} label
 * @property {string} placeholder
 * @property {string} category
 * @property {string} [description]
 * @property {string} [sourceModule]
 * @property {string} scope
 * @property {string[]} compatibleTemplateTypes
 */

/** @type {ReadonlyArray<TemplateVariableDefinition>} */
export const TEMPLATE_VARIABLE_REGISTRY = Object.freeze([
  // ——— شخص مرتبط ———
  {
    id: 'personFirstName',
    key: 'personFirstName',
    token: '{{personFirstName}}',
    label: 'نام',
    placeholder: 'نام شخص',
    category: TEMPLATE_VARIABLE_CATEGORY.CONTACT_PERSON,
    description: 'نام شخص مرتبط ثبت‌شده در کانون',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'personLastName',
    key: 'personLastName',
    token: '{{personLastName}}',
    label: 'نام خانوادگی',
    placeholder: 'نام خانوادگی',
    category: TEMPLATE_VARIABLE_CATEGORY.CONTACT_PERSON,
    description: 'نام خانوادگی شخص مرتبط',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'personFullName',
    key: 'personFullName',
    token: '{{personFullName}}',
    label: 'نام کامل',
    placeholder: 'نام کامل',
    category: TEMPLATE_VARIABLE_CATEGORY.CONTACT_PERSON,
    description: 'نام و نام خانوادگی شخص مرتبط',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'customerName',
    key: 'customerName',
    token: '{{customerName}}',
    label: 'نام مخاطب',
    placeholder: 'نام مخاطب',
    category: TEMPLATE_VARIABLE_CATEGORY.CONTACT_PERSON,
    description: 'نام مخاطب (سازگاری با قالب‌های قبلی)',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'personGender',
    key: 'personGender',
    token: '{{personGender}}',
    label: 'جنسیت',
    placeholder: 'جنسیت',
    category: TEMPLATE_VARIABLE_CATEGORY.CONTACT_PERSON,
    description: 'جنسیت شخص مرتبط',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'personRole',
    key: 'personRole',
    token: '{{personRole}}',
    label: 'سمت',
    placeholder: 'سمت سازمانی',
    category: TEMPLATE_VARIABLE_CATEGORY.CONTACT_PERSON,
    description: 'سمت شخص در شرکت',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'personMobile',
    key: 'personMobile',
    token: '{{personMobile}}',
    label: 'موبایل',
    placeholder: 'شماره موبایل',
    category: TEMPLATE_VARIABLE_CATEGORY.CONTACT_PERSON,
    description: 'شماره تماس شخص مرتبط',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: [TT.MESSAGE, TT.TASK],
  },
  {
    id: 'personEmail',
    key: 'personEmail',
    token: '{{personEmail}}',
    label: 'ایمیل',
    placeholder: 'ایمیل',
    category: TEMPLATE_VARIABLE_CATEGORY.CONTACT_PERSON,
    description: 'آدرس ایمیل شخص مرتبط',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: [TT.MESSAGE, TT.TASK],
  },
  // ——— شرکت ———
  {
    id: 'companyName',
    key: 'companyName',
    token: '{{companyName}}',
    label: 'نام شرکت',
    placeholder: 'نام شرکت',
    category: TEMPLATE_VARIABLE_CATEGORY.COMPANY,
    description: 'نام حقوقی / شرکت در کانون',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'companyCity',
    key: 'companyCity',
    token: '{{companyCity}}',
    label: 'شهر',
    placeholder: 'شهر',
    category: TEMPLATE_VARIABLE_CATEGORY.COMPANY,
    description: 'شهر محل شرکت',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'companyProvince',
    key: 'companyProvince',
    token: '{{companyProvince}}',
    label: 'استان',
    placeholder: 'استان',
    category: TEMPLATE_VARIABLE_CATEGORY.COMPANY,
    description: 'استان محل شرکت',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'companyIndustry',
    key: 'companyIndustry',
    token: '{{companyIndustry}}',
    label: 'حوزه صنعت',
    placeholder: 'صنعت',
    category: TEMPLATE_VARIABLE_CATEGORY.COMPANY,
    description: 'حوزه فعالیت صنعتی شرکت',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'companyType',
    key: 'companyType',
    token: '{{companyType}}',
    label: 'نوع شرکت',
    placeholder: 'نوع شرکت',
    category: TEMPLATE_VARIABLE_CATEGORY.COMPANY,
    description: 'نوع / طبقه‌بندی شرکت',
    sourceModule: 'kanoon',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  // ——— سفارش ———
  {
    id: 'orderNumber',
    key: 'orderNumber',
    token: '{{orderNumber}}',
    label: 'شماره سفارش',
    placeholder: 'شماره سفارش',
    category: TEMPLATE_VARIABLE_CATEGORY.ORDER,
    description: 'شماره سفارش ثبت‌شده در نبض',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'orderDate',
    key: 'orderDate',
    token: '{{orderDate}}',
    label: 'تاریخ سفارش',
    placeholder: 'تاریخ سفارش',
    category: TEMPLATE_VARIABLE_CATEGORY.ORDER,
    description: 'تاریخ ثبت سفارش',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'deliveryDate',
    key: 'deliveryDate',
    token: '{{deliveryDate}}',
    label: 'تاریخ تحویل',
    placeholder: 'تاریخ تحویل',
    category: TEMPLATE_VARIABLE_CATEGORY.ORDER,
    description: 'تاریخ تحویل سفارش از نبض',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'orderAmount',
    key: 'orderAmount',
    token: '{{orderAmount}}',
    label: 'مبلغ سفارش',
    placeholder: 'مبلغ',
    category: TEMPLATE_VARIABLE_CATEGORY.ORDER,
    description: 'مبلغ کل سفارش',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: [TT.MESSAGE, TT.SURVEY],
  },
  {
    id: 'orderWeight',
    key: 'orderWeight',
    token: '{{orderWeight}}',
    label: 'وزن سفارش',
    placeholder: 'وزن',
    category: TEMPLATE_VARIABLE_CATEGORY.ORDER,
    description: 'وزن کل سفارش',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: [TT.MESSAGE],
  },
  {
    id: 'productName',
    key: 'productName',
    token: '{{productName}}',
    label: 'محصول',
    placeholder: 'نام محصول',
    category: TEMPLATE_VARIABLE_CATEGORY.ORDER,
    description: 'نام کالای سفارش',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: MESSAGE_SURVEY_TASK,
  },
  {
    id: 'productBrand',
    key: 'productBrand',
    token: '{{productBrand}}',
    label: 'برند',
    placeholder: 'برند',
    category: TEMPLATE_VARIABLE_CATEGORY.ORDER,
    description: 'برند محصول سفارش',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: [TT.MESSAGE],
  },
  {
    id: 'supplierName',
    key: 'supplierName',
    token: '{{supplierName}}',
    label: 'تأمین‌کننده',
    placeholder: 'تأمین‌کننده',
    category: TEMPLATE_VARIABLE_CATEGORY.ORDER,
    description: 'نام تأمین‌کننده سفارش',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: [TT.MESSAGE],
  },
  // ——— خرید ———
  {
    id: 'purchaseTotal',
    key: 'purchaseTotal',
    token: '{{purchaseTotal}}',
    label: 'مجموع خرید',
    placeholder: 'مجموع خرید',
    category: TEMPLATE_VARIABLE_CATEGORY.PURCHASE,
    description: 'مجموع مبلغ خریدهای مشتری',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: [TT.MESSAGE],
  },
  {
    id: 'orderCount',
    key: 'orderCount',
    token: '{{orderCount}}',
    label: 'تعداد سفارش',
    placeholder: 'تعداد',
    category: TEMPLATE_VARIABLE_CATEGORY.PURCHASE,
    description: 'تعداد کل سفارش‌های مشتری',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: [TT.MESSAGE],
  },
  {
    id: 'lastPurchaseDate',
    key: 'lastPurchaseDate',
    token: '{{lastPurchaseDate}}',
    label: 'آخرین خرید',
    placeholder: 'تاریخ آخرین خرید',
    category: TEMPLATE_VARIABLE_CATEGORY.PURCHASE,
    description: 'تاریخ آخرین سفارش مشتری',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: [TT.MESSAGE],
  },
  {
    id: 'firstPurchaseDate',
    key: 'firstPurchaseDate',
    token: '{{firstPurchaseDate}}',
    label: 'اولین خرید',
    placeholder: 'تاریخ اولین خرید',
    category: TEMPLATE_VARIABLE_CATEGORY.PURCHASE,
    description: 'تاریخ اولین سفارش مشتری',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    compatibleTemplateTypes: [TT.MESSAGE],
  },
  // ——— مالی ———
  {
    id: 'accountBalance',
    key: 'accountBalance',
    token: '{{accountBalance}}',
    label: 'مانده حساب',
    placeholder: 'مانده',
    category: TEMPLATE_VARIABLE_CATEGORY.FINANCE,
    description: 'مانده حساب مشتری',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.FINANCE,
    compatibleTemplateTypes: [TT.MESSAGE],
  },
  {
    id: 'debtAmount',
    key: 'debtAmount',
    token: '{{debtAmount}}',
    label: 'مبلغ بدهی',
    placeholder: 'بدهی',
    category: TEMPLATE_VARIABLE_CATEGORY.FINANCE,
    description: 'مبلغ بدهی مشتری',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.FINANCE,
    compatibleTemplateTypes: [TT.MESSAGE],
  },
  {
    id: 'creditAmount',
    key: 'creditAmount',
    token: '{{creditAmount}}',
    label: 'مبلغ بستانکاری',
    placeholder: 'بستانکاری',
    category: TEMPLATE_VARIABLE_CATEGORY.FINANCE,
    description: 'مبلغ بستانکاری مشتری',
    sourceModule: 'nabz',
    scope: TEMPLATE_VARIABLE_SCOPE.FINANCE,
    compatibleTemplateTypes: [TT.MESSAGE],
  },
  // ——— کمپین ———
  {
    id: 'campaignName',
    key: 'campaignName',
    token: '{{campaignName}}',
    label: 'نام کمپین',
    placeholder: 'نام کمپین',
    category: TEMPLATE_VARIABLE_CATEGORY.CAMPAIGN,
    description: 'نام کمپین موج',
    sourceModule: 'mowj',
    scope: TEMPLATE_VARIABLE_SCOPE.CAMPAIGN,
    compatibleTemplateTypes: ALL_TEMPLATE_TYPES,
  },
  {
    id: 'campaignRunDate',
    key: 'campaignRunDate',
    token: '{{campaignRunDate}}',
    label: 'تاریخ اجرای کمپین',
    placeholder: 'تاریخ اجرا',
    category: TEMPLATE_VARIABLE_CATEGORY.CAMPAIGN,
    description: 'تاریخ اجرای کمپین',
    sourceModule: 'mowj',
    scope: TEMPLATE_VARIABLE_SCOPE.CAMPAIGN,
    compatibleTemplateTypes: ALL_TEMPLATE_TYPES,
  },
  // ——— وظیفه ———
  {
    id: 'taskTitle',
    key: 'taskTitle',
    token: '{{taskTitle}}',
    label: 'عنوان وظیفه',
    placeholder: 'عنوان',
    category: TEMPLATE_VARIABLE_CATEGORY.TASK,
    description: 'عنوان وظیفه پویش',
    sourceModule: 'pooyesh',
    scope: TEMPLATE_VARIABLE_SCOPE.TASK,
    compatibleTemplateTypes: [TT.TASK, TT.MESSAGE],
  },
  {
    id: 'taskDescription',
    key: 'taskDescription',
    token: '{{taskDescription}}',
    label: 'شرح وظیفه',
    placeholder: 'شرح',
    category: TEMPLATE_VARIABLE_CATEGORY.TASK,
    description: 'توضیحات وظیفه',
    sourceModule: 'pooyesh',
    scope: TEMPLATE_VARIABLE_SCOPE.TASK,
    compatibleTemplateTypes: [TT.TASK],
  },
  {
    id: 'taskPriority',
    key: 'taskPriority',
    token: '{{taskPriority}}',
    label: 'اولویت وظیفه',
    placeholder: 'اولویت',
    category: TEMPLATE_VARIABLE_CATEGORY.TASK,
    description: 'اولویت وظیفه در پویش',
    sourceModule: 'pooyesh',
    scope: TEMPLATE_VARIABLE_SCOPE.TASK,
    compatibleTemplateTypes: [TT.TASK],
  },
  {
    id: 'taskDueDate',
    key: 'taskDueDate',
    token: '{{taskDueDate}}',
    label: 'موعد وظیفه',
    placeholder: 'موعد',
    category: TEMPLATE_VARIABLE_CATEGORY.TASK,
    description: 'تاریخ سررسید وظیفه',
    sourceModule: 'pooyesh',
    scope: TEMPLATE_VARIABLE_SCOPE.TASK,
    compatibleTemplateTypes: [TT.TASK],
  },
]);

/** @deprecated use TEMPLATE_VARIABLE_REGISTRY — kept for backward compatibility */
export const TEMPLATE_VARIABLE_CATALOG = TEMPLATE_VARIABLE_REGISTRY;

const BY_KEY = Object.freeze(
  Object.fromEntries(TEMPLATE_VARIABLE_REGISTRY.map((item) => [item.key, item])),
);
const BY_TOKEN = Object.freeze(
  Object.fromEntries(TEMPLATE_VARIABLE_REGISTRY.map((item) => [item.token, item])),
);

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

const CATEGORY_ORDER = Object.freeze([
  TEMPLATE_VARIABLE_CATEGORY.CONTACT_PERSON,
  TEMPLATE_VARIABLE_CATEGORY.COMPANY,
  TEMPLATE_VARIABLE_CATEGORY.ORDER,
  TEMPLATE_VARIABLE_CATEGORY.PURCHASE,
  TEMPLATE_VARIABLE_CATEGORY.FINANCE,
  TEMPLATE_VARIABLE_CATEGORY.CAMPAIGN,
  TEMPLATE_VARIABLE_CATEGORY.TASK,
]);

/** @param {string} key */
export function getTemplateVariable(key) {
  return BY_KEY[String(key || '')] || null;
}

/** @param {string} token */
export function getTemplateVariableByToken(token) {
  return BY_TOKEN[String(token || '').trim()] || null;
}

/**
 * @param {string} [templateType]
 * @param {{ query?: string }} [filters]
 */
export function listTemplateVariablesForType(templateType, filters = {}) {
  const type = String(templateType || TT.MESSAGE).toUpperCase();
  const query = String(filters.query || '').trim().toLowerCase();
  return TEMPLATE_VARIABLE_REGISTRY.filter((item) => {
    if (!item.compatibleTemplateTypes.includes(type)) return false;
    if (!query) return true;
    const haystack = [
      item.label,
      item.key,
      item.token,
      item.description,
      TEMPLATE_VARIABLE_CATEGORY_LABELS[item.category],
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(query);
  });
}

/**
 * @param {string} templateType
 * @param {{ query?: string }} [filters]
 * @returns {Array<{ id: string, label: string, variables: TemplateVariableDefinition[] }>}
 */
export function listTemplateVariableCategories(templateType, filters = {}) {
  const variables = listTemplateVariablesForType(templateType, filters);
  return CATEGORY_ORDER
    .map((categoryId) => ({
      id: categoryId,
      label: TEMPLATE_VARIABLE_CATEGORY_LABELS[categoryId] || categoryId,
      variables: variables.filter((v) => v.category === categoryId),
    }))
    .filter((group) => group.variables.length > 0);
}

/**
 * Extract {{var}} tokens from text — validation only.
 * @param {string} content
 * @returns {string[]}
 */
export function extractVariableTokens(content) {
  const text = String(content || '');
  const found = [];
  const re = new RegExp(TOKEN_RE.source, 'g');
  let match = re.exec(text);
  while (match) {
    found.push(`{{${match[1]}}}`);
    match = re.exec(text);
  }
  return [...new Set(found)];
}

/**
 * Find unknown variable keys in content.
 * @param {string} content
 * @returns {string[]}
 */
export function findUnknownVariableTokens(content) {
  const text = String(content || '');
  const unknown = [];
  const re = new RegExp(TOKEN_RE.source, 'g');
  let match = re.exec(text);
  while (match) {
    if (!getTemplateVariable(match[1])) {
      unknown.push(`{{${match[1]}}}`);
    }
    match = re.exec(text);
  }
  return [...new Set(unknown)];
}

/**
 * @param {string[]} variables  keys or tokens
 * @returns {{ ok: boolean, errors: string[], known: TemplateVariableDefinition[] }}
 */
export function validateTemplateVariables(variables = []) {
  const errors = [];
  const known = [];
  const list = Array.isArray(variables) ? variables : [];

  list.forEach((item) => {
    const raw = String(item || '').trim();
    if (!raw) return;
    const key = raw.startsWith('{{')
      ? raw.replace(/^\{\{\s*/, '').replace(/\s*\}\}$/, '')
      : raw;
    const def = getTemplateVariable(key);
    if (!def) {
      errors.push(`متغیر ناشناخته: ${raw}`);
      return;
    }
    known.push(def);
  });

  return { ok: errors.length === 0, errors, known };
}

/**
 * Validate that content only uses registered variables.
 * @param {string} content
 */
export function validateContentVariables(content) {
  const tokens = extractVariableTokens(content);
  return validateTemplateVariables(tokens);
}
