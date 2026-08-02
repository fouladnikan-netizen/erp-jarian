/**
 * RBAC permission registry — Data / Action / Financial separation.
 * Icons are lucide name keys resolved in the UI.
 */

export const PERMISSION_SCOPES = [
  { id: 'OWN', label: 'فقط خودم' },
  { id: 'TEAM', label: 'تیم من' },
  { id: 'ALL', label: 'همه' },
];

export const SECURITY_ROLES = [
  { id: 'sales_manager', label: 'مدیر فروش' },
  { id: 'procurement_manager', label: 'مدیر تأمین' },
  { id: 'sales_expert', label: 'کارشناس فروش' },
  { id: 'ops_coordinator', label: 'هماهنگ‌کننده عملیات' },
];

export const DEFAULT_SECURITY_ROLE_ID = SECURITY_ROLES[0].id;

export const PERMISSIONS_REGISTRY = [
  {
    moduleId: 'nabz',
    moduleName: 'نبض (فروش و تأمین)',
    icon: 'Activity',
    resources: [
      {
        resourceId: 'orders',
        resourceName: 'سفارشات',
        actions: [
          { id: 'VIEW_ORDER', label: 'مشاهده سفارش', type: 'data', hasScope: true },
          { id: 'CREATE_ORDER', label: 'ایجاد سفارش', type: 'action', hasScope: false },
          { id: 'EDIT_ORDER', label: 'ویرایش سفارش', type: 'action', hasScope: true },
          {
            id: 'VIEW_PURCHASE_PRICE',
            label: 'مشاهده قیمت خرید',
            type: 'financial',
            hasScope: false,
            isCritical: true,
          },
          {
            id: 'VIEW_MARGIN',
            label: 'مشاهده حاشیه سود',
            type: 'financial',
            hasScope: false,
            isCritical: true,
          },
        ],
      },
      {
        resourceId: 'pre_invoice',
        resourceName: 'پیش‌فاکتور',
        actions: [
          { id: 'VIEW_PRE_INVOICE', label: 'مشاهده پیش‌فاکتور', type: 'data', hasScope: true },
          { id: 'ISSUE_PRE_INVOICE', label: 'صدور پیش‌فاکتور', type: 'action', hasScope: false },
          {
            id: 'VIEW_PRE_INVOICE_TOTAL',
            label: 'مشاهده مبلغ کل پیش‌فاکتور',
            type: 'financial',
            hasScope: false,
            isCritical: true,
          },
          {
            id: 'APPROVE_PRE_INVOICE_DISCOUNT',
            label: 'تأیید تخفیف پیش‌فاکتور',
            type: 'financial',
            hasScope: false,
            isCritical: true,
          },
        ],
      },
    ],
  },
  {
    moduleId: 'tanin',
    moduleName: 'طنین (نظرسنجی و بازخورد)',
    icon: 'Radio',
    resources: [
      {
        resourceId: 'surveys',
        resourceName: 'نظرسنجی‌ها',
        actions: [
          { id: 'VIEW_SURVEY', label: 'مشاهده نظرسنجی', type: 'data', hasScope: true },
          { id: 'CREATE_SURVEY', label: 'ایجاد نظرسنجی', type: 'action', hasScope: false },
          { id: 'PUBLISH_SURVEY', label: 'انتشار نظرسنجی', type: 'action', hasScope: false },
          {
            id: 'VIEW_SURVEY_ANALYTICS',
            label: 'مشاهده تحلیل پاسخ‌ها',
            type: 'data',
            hasScope: true,
          },
        ],
      },
      {
        resourceId: 'campaign_feedback',
        resourceName: 'بازخورد کمپین',
        actions: [
          { id: 'VIEW_FEEDBACK', label: 'مشاهده بازخورد', type: 'data', hasScope: true },
          { id: 'EXPORT_FEEDBACK', label: 'خروجی بازخورد', type: 'action', hasScope: false },
        ],
      },
    ],
  },
];

/** Seeded baseline grants per role (mock until backend RBAC API). */
export const ROLE_PERMISSION_DEFAULTS = {
  sales_manager: {
    VIEW_ORDER: { enabled: true, scope: 'TEAM' },
    CREATE_ORDER: { enabled: true, scope: 'OWN' },
    EDIT_ORDER: { enabled: true, scope: 'TEAM' },
    VIEW_PURCHASE_PRICE: { enabled: false, scope: 'OWN' },
    VIEW_MARGIN: { enabled: true, scope: 'OWN' },
    VIEW_PRE_INVOICE: { enabled: true, scope: 'TEAM' },
    ISSUE_PRE_INVOICE: { enabled: true, scope: 'OWN' },
    VIEW_PRE_INVOICE_TOTAL: { enabled: true, scope: 'OWN' },
    APPROVE_PRE_INVOICE_DISCOUNT: { enabled: false, scope: 'OWN' },
    VIEW_SURVEY: { enabled: true, scope: 'ALL' },
    CREATE_SURVEY: { enabled: false, scope: 'OWN' },
    PUBLISH_SURVEY: { enabled: false, scope: 'OWN' },
    VIEW_SURVEY_ANALYTICS: { enabled: true, scope: 'TEAM' },
    VIEW_FEEDBACK: { enabled: true, scope: 'TEAM' },
    EXPORT_FEEDBACK: { enabled: false, scope: 'OWN' },
  },
  procurement_manager: {
    VIEW_ORDER: { enabled: true, scope: 'ALL' },
    CREATE_ORDER: { enabled: false, scope: 'OWN' },
    EDIT_ORDER: { enabled: true, scope: 'TEAM' },
    VIEW_PURCHASE_PRICE: { enabled: true, scope: 'OWN' },
    VIEW_MARGIN: { enabled: false, scope: 'OWN' },
    VIEW_PRE_INVOICE: { enabled: true, scope: 'ALL' },
    ISSUE_PRE_INVOICE: { enabled: false, scope: 'OWN' },
    VIEW_PRE_INVOICE_TOTAL: { enabled: true, scope: 'OWN' },
    APPROVE_PRE_INVOICE_DISCOUNT: { enabled: false, scope: 'OWN' },
    VIEW_SURVEY: { enabled: false, scope: 'OWN' },
    CREATE_SURVEY: { enabled: false, scope: 'OWN' },
    PUBLISH_SURVEY: { enabled: false, scope: 'OWN' },
    VIEW_SURVEY_ANALYTICS: { enabled: false, scope: 'OWN' },
    VIEW_FEEDBACK: { enabled: false, scope: 'OWN' },
    EXPORT_FEEDBACK: { enabled: false, scope: 'OWN' },
  },
  sales_expert: {
    VIEW_ORDER: { enabled: true, scope: 'OWN' },
    CREATE_ORDER: { enabled: true, scope: 'OWN' },
    EDIT_ORDER: { enabled: true, scope: 'OWN' },
    VIEW_PURCHASE_PRICE: { enabled: false, scope: 'OWN' },
    VIEW_MARGIN: { enabled: false, scope: 'OWN' },
    VIEW_PRE_INVOICE: { enabled: true, scope: 'OWN' },
    ISSUE_PRE_INVOICE: { enabled: false, scope: 'OWN' },
    VIEW_PRE_INVOICE_TOTAL: { enabled: true, scope: 'OWN' },
    APPROVE_PRE_INVOICE_DISCOUNT: { enabled: false, scope: 'OWN' },
    VIEW_SURVEY: { enabled: true, scope: 'OWN' },
    CREATE_SURVEY: { enabled: false, scope: 'OWN' },
    PUBLISH_SURVEY: { enabled: false, scope: 'OWN' },
    VIEW_SURVEY_ANALYTICS: { enabled: false, scope: 'OWN' },
    VIEW_FEEDBACK: { enabled: true, scope: 'OWN' },
    EXPORT_FEEDBACK: { enabled: false, scope: 'OWN' },
  },
  ops_coordinator: {
    VIEW_ORDER: { enabled: true, scope: 'ALL' },
    CREATE_ORDER: { enabled: false, scope: 'OWN' },
    EDIT_ORDER: { enabled: false, scope: 'OWN' },
    VIEW_PURCHASE_PRICE: { enabled: false, scope: 'OWN' },
    VIEW_MARGIN: { enabled: false, scope: 'OWN' },
    VIEW_PRE_INVOICE: { enabled: true, scope: 'ALL' },
    ISSUE_PRE_INVOICE: { enabled: false, scope: 'OWN' },
    VIEW_PRE_INVOICE_TOTAL: { enabled: false, scope: 'OWN' },
    APPROVE_PRE_INVOICE_DISCOUNT: { enabled: false, scope: 'OWN' },
    VIEW_SURVEY: { enabled: true, scope: 'TEAM' },
    CREATE_SURVEY: { enabled: false, scope: 'OWN' },
    PUBLISH_SURVEY: { enabled: false, scope: 'OWN' },
    VIEW_SURVEY_ANALYTICS: { enabled: true, scope: 'TEAM' },
    VIEW_FEEDBACK: { enabled: true, scope: 'ALL' },
    EXPORT_FEEDBACK: { enabled: true, scope: 'OWN' },
  },
};

export function getRoleLabel(roleId) {
  return SECURITY_ROLES.find((role) => role.id === roleId)?.label || roleId;
}

export function getScopeLabel(scopeId) {
  return PERMISSION_SCOPES.find((scope) => scope.id === scopeId)?.label || scopeId;
}

export function listAllActionIds() {
  const ids = [];
  PERMISSIONS_REGISTRY.forEach((mod) => {
    mod.resources.forEach((resource) => {
      resource.actions.forEach((action) => ids.push(action.id));
    });
  });
  return ids;
}
