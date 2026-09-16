/**
 * Client-side Organization Identity logo checks (DDL-31).
 * Server re-validates magic bytes; this is UX-only reject-before-upload.
 */

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp';

const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/jpg']);
const ALLOWED_EXT = new Set(['png', 'jpg', 'jpeg', 'webp']);

export function validateLogoFile(file) {
  if (!file) {
    return { ok: false, message: 'فایلی انتخاب نشده است.' };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { ok: false, message: 'حجم لوگو نباید بیشتر از ۲ مگابایت باشد.' };
  }
  const mime = String(file.type || '').toLowerCase();
  const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  const mimeOk = !mime || ALLOWED_MIMES.has(mime);
  const extOk = ALLOWED_EXT.has(ext);
  if (!mimeOk || !extOk) {
    return { ok: false, message: 'فقط تصویر PNG، JPG یا WEBP مجاز است.' };
  }
  return { ok: true };
}
