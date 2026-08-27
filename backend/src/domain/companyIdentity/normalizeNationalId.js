/**
 * Iranian legal-entity national ID normalization (11 digits).
 * Used before external provider calls — invalid input must not hit Linka.
 */

const NATIONAL_ID_LENGTH = 11;

/**
 * @param {unknown} value
 * @returns {{ ok: true, nationalId: string } | { ok: false, nationalId: string, error: string }}
 */
export function normalizeNationalId(value) {
  const cleaned = String(value ?? '').replace(/\D/g, '');
  if (!cleaned) {
    return { ok: false, nationalId: cleaned, error: 'شناسه ملی الزامی است.' };
  }
  if (cleaned.length !== NATIONAL_ID_LENGTH) {
    return {
      ok: false,
      nationalId: cleaned,
      error: 'شناسه ملی باید دقیقاً ۱۱ رقم باشد.',
    };
  }
  return { ok: true, nationalId: cleaned };
}

export default { normalizeNationalId };
