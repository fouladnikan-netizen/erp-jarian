/**
 * System health snapshot for Shirazeh dashboard cards.
 * Values are mock until monitoring APIs are wired.
 */

export const SYSTEM_HEALTH_CARDS = [
  {
    id: 'uptime',
    label: 'پایداری سامانه',
    value: '۹۹٫۹٪',
    hint: '۳۰ روز اخیر',
    tone: 'success',
    icon: 'Activity',
  },
  {
    id: 'users',
    label: 'کاربران فعال',
    value: '۲۴',
    hint: 'نشست جاری',
    tone: 'accent',
    icon: 'Users',
  },
  {
    id: 'integrations',
    label: 'یکپارچه‌سازی‌ها',
    value: '۵',
    hint: '۱ در انتظار اتصال',
    tone: 'neutral',
    icon: 'Plug',
  },
  {
    id: 'security',
    label: 'هشدار امنیتی',
    value: '۰',
    hint: 'وضعیت ایمن',
    tone: 'success',
    icon: 'ShieldCheck',
  },
];
