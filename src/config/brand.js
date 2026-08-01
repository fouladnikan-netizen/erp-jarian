/**
 * پیکربندی برند سیستم.
 *
 * در دوره تست، نام سیستم از رابط کاربری مخفی است تا پیش از انتشار کسی
 * از آن باخبر نشود. موقع انتشار فقط SHOW_BRAND_NAME را true کنید؛
 * نام در سایدبار، عنوان تب مرورگر و متن‌های وابسته برمی‌گردد.
 * (عنوان استاتیک index.html را هم موقع انتشار برگردانید.)
 */
export const BRAND_NAME = 'جریان';
export const SHOW_BRAND_NAME = false;

/** پسوند عنوان تب مرورگر — در حالت مخفی فقط نام ماژول نمایش داده می‌شود */
export function buildDocumentTitle(moduleName) {
  return SHOW_BRAND_NAME ? `${moduleName} | ${BRAND_NAME}` : moduleName;
}
