/**
 * Shirazeh settings navigation — single source of truth for sidebar items.
 * Paths are ready for nested React Router routes under /shirazeh/*.
 */

export const SHIRAZEH_BASE_PATH = '/shirazeh';

export const SETTINGS_MENU = [
  {
    id: 'general',
    label: 'عمومی',
    description: 'هویت سازمانی، منطقه زمانی و تنظیمات پایه سامانه',
    path: `${SHIRAZEH_BASE_PATH}/general`,
    icon: 'Settings',
  },
  {
    id: 'users',
    label: 'کاربران و نقش‌ها',
    description: 'مدیریت دسترسی، نقش‌ها و شوالیه‌های عملیاتی',
    path: `${SHIRAZEH_BASE_PATH}/users`,
    icon: 'Users',
  },
  {
    id: 'integrations',
    label: 'یکپارچه‌سازی‌ها',
    description: 'وب‌سرویس‌ها، لینکا، پیامک و تبادل داده',
    path: `${SHIRAZEH_BASE_PATH}/integrations`,
    icon: 'Plug',
  },
  {
    id: 'warehouses',
    label: 'انبارها',
    description: 'تعریف انبارها و آدرس‌های عملیاتی',
    path: `${SHIRAZEH_BASE_PATH}/warehouses`,
    icon: 'Warehouse',
  },
  {
    id: 'security',
    label: 'امنیت',
    description: 'نشست‌ها، سیاست رمز عبور و لاگ دسترسی',
    path: `${SHIRAZEH_BASE_PATH}/security`,
    icon: 'Shield',
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
