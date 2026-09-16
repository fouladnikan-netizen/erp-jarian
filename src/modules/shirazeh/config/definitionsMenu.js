/**
 * Shirazeh Definitions navigation — same shell pattern as SETTINGS_MENU.
 */
import { SHIRAZEH_BASE_PATH } from './settingsMenu';

export const DEFINITIONS_BASE_PATH = `${SHIRAZEH_BASE_PATH}/definitions`;

export const DEFINITIONS_PATHS = Object.freeze({
  identity: DEFINITIONS_BASE_PATH,
  users: `${DEFINITIONS_BASE_PATH}/users`,
  organization: `${DEFINITIONS_BASE_PATH}/organization`,
  rolesPermissions: `${DEFINITIONS_BASE_PATH}/roles-permissions`,
  personas: `${DEFINITIONS_BASE_PATH}/personas`,
  products: `${DEFINITIONS_BASE_PATH}/products`,
  activities: `${DEFINITIONS_BASE_PATH}/activities`,
  legacyUsersAccess: `${DEFINITIONS_BASE_PATH}/users-access`,
});

export const DEFINITIONS_MENU = [
  {
    id: 'identity',
    label: 'هویت سازمان',
    description: 'مشخصات ثبتی و ارتباطی مالک جریان',
    path: DEFINITIONS_PATHS.identity,
    icon: 'Landmark',
    end: true,
  },
  {
    id: 'users',
    label: 'کاربران',
    description: 'حساب‌ها، نقش‌ها و وضعیت دسترسی',
    path: DEFINITIONS_PATHS.users,
    icon: 'Users',
  },
  {
    id: 'organization',
    label: 'ساختار سازمانی',
    description: 'واحدها، سمت‌ها و انتساب کاربران',
    path: DEFINITIONS_PATHS.organization,
    icon: 'Network',
  },
  {
    id: 'roles-permissions',
    label: 'نقش‌ها و دسترسی‌ها',
    description: 'نقش‌های سیستمی و ماتریس مجوزها',
    path: DEFINITIONS_PATHS.rolesPermissions,
    icon: 'Shield',
  },
  {
    id: 'personas',
    label: 'پرسونا',
    description: 'هویت کاری حوزه‌ها — نه نقش و نه سمت',
    path: DEFINITIONS_PATHS.personas,
    icon: 'Drama',
  },
  {
    id: 'activities',
    label: 'فعالیت‌ها',
    description: 'انواع فعالیت پویش در کانون، افق و نبض',
    path: DEFINITIONS_PATHS.activities,
    icon: 'ListChecks',
  },
];

export function resolveLegacyUsersAccessTab(tab) {
  if (tab === 'organization') return DEFINITIONS_PATHS.organization;
  if (tab === 'permissions') return DEFINITIONS_PATHS.rolesPermissions;
  return DEFINITIONS_PATHS.users;
}
