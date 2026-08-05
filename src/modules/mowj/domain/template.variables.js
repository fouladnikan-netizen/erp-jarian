/**
 * Template variable contracts — placeholders only (no render engine).
 */

export const TEMPLATE_VARIABLE_SCOPE = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  ORDER: 'ORDER',
  CAMPAIGN: 'CAMPAIGN',
});

/**
 * @typedef {object} TemplateVariableDefinition
 * @property {string} key  e.g. customerName (without braces)
 * @property {string} token  e.g. {{customerName}}
 * @property {string} label
 * @property {string} scope
 * @property {string} [description]
 */

/** @type {ReadonlyArray<TemplateVariableDefinition>} */
export const TEMPLATE_VARIABLE_CATALOG = Object.freeze([
  Object.freeze({
    key: 'customerName',
    token: '{{customerName}}',
    label: 'نام مخاطب',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    description: 'نام شخص تماس',
  }),
  Object.freeze({
    key: 'companyName',
    token: '{{companyName}}',
    label: 'نام شرکت',
    scope: TEMPLATE_VARIABLE_SCOPE.CUSTOMER,
    description: 'نام حقوقی / شرکت',
  }),
  Object.freeze({
    key: 'orderNumber',
    token: '{{orderNumber}}',
    label: 'شماره سفارش',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
  }),
  Object.freeze({
    key: 'productName',
    token: '{{productName}}',
    label: 'نام کالا',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
  }),
  Object.freeze({
    key: 'deliveryDate',
    token: '{{deliveryDate}}',
    label: 'تاریخ تحویل',
    scope: TEMPLATE_VARIABLE_SCOPE.ORDER,
    description: 'تاریخ تحویل سفارش',
  }),
  Object.freeze({
    key: 'campaignName',
    token: '{{campaignName}}',
    label: 'نام کمپین',
    scope: TEMPLATE_VARIABLE_SCOPE.CAMPAIGN,
  }),
]);

const BY_KEY = Object.freeze(
  Object.fromEntries(TEMPLATE_VARIABLE_CATALOG.map((item) => [item.key, item])),
);
const BY_TOKEN = Object.freeze(
  Object.fromEntries(TEMPLATE_VARIABLE_CATALOG.map((item) => [item.token, item])),
);

const TOKEN_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/g;

/** @param {string} key */
export function getTemplateVariable(key) {
  return BY_KEY[String(key || '')] || null;
}

/** @param {string} token */
export function getTemplateVariableByToken(token) {
  return BY_TOKEN[String(token || '').trim()] || null;
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
