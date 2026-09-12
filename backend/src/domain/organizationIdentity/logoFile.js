/**
 * Organization Identity logo file rules (DDL-31).
 * PNG / JPEG / WEBP only. No SVG (no sanitizer in this stack).
 */

export const MAX_LOGO_BYTES = 2 * 1024 * 1024;

export const ALLOWED_LOGO_MIMES = Object.freeze(['image/png', 'image/jpeg', 'image/webp']);

const EXT_TO_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function mimeFromFileName(fileName) {
  const ext = String(fileName || '').split('.').pop()?.toLowerCase() || '';
  return EXT_TO_MIME[ext] || '';
}

/**
 * @param {Uint8Array | Buffer} bytes
 * @returns {string | null}
 */
export function sniffLogoMime(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (buf.length >= 8
    && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  if (buf.length >= 12) {
    const ascii = (start, end) => String.fromCharCode(...buf.slice(start, end));
    if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  }
  return null;
}

/**
 * @param {{ fileName?: string, mimeType?: string, bytes: Uint8Array | Buffer }} input
 * @returns {{ ok: true, mimeType: string, sizeBytes: number } | { ok: false, message: string }}
 */
export function validateLogoBytes({ fileName, mimeType, bytes }) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const sizeBytes = buf.byteLength;
  if (!sizeBytes) {
    return { ok: false, message: 'فایل لوگو خالی است.' };
  }
  if (sizeBytes > MAX_LOGO_BYTES) {
    return { ok: false, message: 'حجم لوگو نباید بیشتر از ۲ مگابایت باشد.' };
  }
  const sniffed = sniffLogoMime(buf);
  if (!sniffed) {
    return { ok: false, message: 'فقط تصویر PNG، JPG یا WEBP مجاز است.' };
  }
  const declared = String(mimeType || '').trim().toLowerCase();
  const fromName = mimeFromFileName(fileName);
  if (declared && declared !== sniffed && !(declared === 'image/jpg' && sniffed === 'image/jpeg')) {
    return { ok: false, message: 'نوع فایل با محتوای تصویر هم‌خوان نیست.' };
  }
  if (fromName && fromName !== sniffed) {
    return { ok: false, message: 'پسوند فایل با نوع تصویر هم‌خوان نیست.' };
  }
  return { ok: true, mimeType: sniffed, sizeBytes };
}
