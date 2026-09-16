/**
 * Shirazeh settings navigation — single source of truth for sidebar items.
 * Paths are ready for nested React Router routes under /shirazeh/*.
 */

export const SHIRAZEH_BASE_PATH = '/shirazeh';

export const SETTINGS_MENU = [
  {
    id: 'general',
    label: 'عمومی',
    description: 'منطقه زمانی و تنظیمات پایه سامانه',
    path: `${SHIRAZEH_BASE_PATH}/general`,
    icon: 'Settings',
  },
  {
    id: 'integrations',
    label: 'یکپارچه‌سازی‌ها',
    description: 'وب‌سرویس‌ها، لینکا، پیامک و تبادل داده',
    path: `${SHIRAZEH_BASE_PATH}/integrations`,
    icon: 'Plug',
  },
  {
    id: 'activity-types',
    label: 'انواع فعالیت پویش',
    description: 'فهرست یکپارچه نوع فعالیت برای مشتری، سرنخ و سفارش',
    path: `${SHIRAZEH_BASE_PATH}/activity-types`,
    icon: 'ListChecks',
  },
  {
    id: 'correspondence-types',
    label: 'انواع مکاتبات دبیرخانه',
    description: 'فهرست یکپارچه نوع مکاتبه برای ثبت نامه در گاه‌شمار',
    path: `${SHIRAZEH_BASE_PATH}/correspondence-types`,
    icon: 'Mail',
  },
  {
    id: 'warehouses',
    label: 'انبارها',
    description: 'تعریف انبارها و آدرس‌های عملیاتی',
    path: `${SHIRAZEH_BASE_PATH}/warehouses`,
    icon: 'Warehouse',
  },
  {
    id: 'appearance',
    label: 'ظاهر',
    description: 'برندینگ، تم و ترجیحات نمایش',
    path: `${SHIRAZEH_BASE_PATH}/appearance`,
    icon: 'Palette',
  },
  {
    id: 'backup',
    label: 'پشتیبان و بازیابی',
    description: 'نسخه‌های پشتیبان و بازیابی کنترل‌شده',
    path: `${SHIRAZEH_BASE_PATH}/backup`,
    icon: 'DatabaseBackup',
  },
];

export const DEFAULT_SETTINGS_SECTION = SETTINGS_MENU[0];

export function getSettingsMenuItem(sectionId) {
  return SETTINGS_MENU.find((item) => item.id === sectionId) || DEFAULT_SETTINGS_SECTION;
}
