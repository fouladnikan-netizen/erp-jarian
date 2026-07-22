import { CURRENT_USER_ROLE, USER_ROLES } from './constants';

/** کاشف — ویرایش قیمت استعلام */
const INQUIRY_EDITOR_ROLES = new Set([
  USER_ROLES.EXPLORER,
]);

/** شوالیه — ویرایش کلی سفارش (هدر، اقلام، توضیحات) */
const WHOLE_ORDER_EDITOR_ROLES = new Set([
  USER_ROLES.KNIGHT,
]);

/** راهبر — نقش مدیر؛ دسترسی کامل به همه ویرایش‌ها */
const FULL_ACCESS_ROLES = new Set([
  USER_ROLES.LEADER,
  USER_ROLES.MANAGER,
]);

function hasFullAccess(role = CURRENT_USER_ROLE) {
  return FULL_ACCESS_ROLES.has(role);
}

export function canEditInquiryPrices(role = CURRENT_USER_ROLE) {
  return hasFullAccess(role) || INQUIRY_EDITOR_ROLES.has(role);
}

export function canEditProfitMargin(role = CURRENT_USER_ROLE) {
  return hasFullAccess(role);
}

/**
 * ویرایش درون‌جدولی شرح/مقدار/توضیحات اقلام غیرفعال است؛
 * این موارد فقط از «ویرایش سفارش» در هدر پروفایل انجام می‌شود.
 */
export function canEditOrderLineFields() {
  return false;
}

/** منوی «ویرایش کلی سفارش» در پروفایل */
export function canEditWholeOrder(role = CURRENT_USER_ROLE) {
  return hasFullAccess(role) || WHOLE_ORDER_EDITOR_ROLES.has(role);
}

export const SENSITIVE_WIPE_CONFIRM_MESSAGE = 'در صورت ویرایش این موارد، قیمت‌های استعلامی ثبت شده پاک شده و باید مجدداً ثبت شوند. آیا تایید می‌کنید؟';
