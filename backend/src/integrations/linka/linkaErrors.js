/**
 * Linka / company-identity provider error normalization.
 * Provider internals must not leak to API clients.
 */

export const COMPANY_IDENTITY_ERRORS = Object.freeze({
  INVALID_NATIONAL_ID: 'COMPANY_IDENTITY_INVALID_NATIONAL_ID',
  NOT_FOUND: 'COMPANY_IDENTITY_NOT_FOUND',
  PROVIDER_TIMEOUT: 'COMPANY_IDENTITY_PROVIDER_TIMEOUT',
  PROVIDER_UNAVAILABLE: 'COMPANY_IDENTITY_PROVIDER_UNAVAILABLE',
  PROVIDER_AUTH_FAILED: 'COMPANY_IDENTITY_PROVIDER_AUTH_FAILED',
  INVALID_RESPONSE: 'COMPANY_IDENTITY_INVALID_RESPONSE',
  CONTRACT_REQUIRED: 'COMPANY_IDENTITY_CONTRACT_REQUIRED',
});

/** User-facing Persian messages keyed by internal error code. */
export const COMPANY_IDENTITY_USER_MESSAGES = Object.freeze({
  [COMPANY_IDENTITY_ERRORS.INVALID_NATIONAL_ID]: 'شناسه ملی نامعتبر است.',
  [COMPANY_IDENTITY_ERRORS.NOT_FOUND]:
    'شرکتی با این شناسه ملی در سرویس اطلاعات شرکت‌ها پیدا نشد.',
  [COMPANY_IDENTITY_ERRORS.PROVIDER_TIMEOUT]:
    'پاسخ سرویس استعلام بیش از حد طول کشید. دوباره تلاش کنید.',
  [COMPANY_IDENTITY_ERRORS.PROVIDER_UNAVAILABLE]:
    'سرویس استعلام اطلاعات شرکت در حال حاضر در دسترس نیست.',
  [COMPANY_IDENTITY_ERRORS.PROVIDER_AUTH_FAILED]:
    'پیکربندی سرویس استعلام شرکت نامعتبر است. با پشتیبانی تماس بگیرید.',
  [COMPANY_IDENTITY_ERRORS.INVALID_RESPONSE]:
    'پاسخ سرویس استعلام نامعتبر بود. دوباره تلاش کنید.',
  [COMPANY_IDENTITY_ERRORS.CONTRACT_REQUIRED]:
    'اتصال Production به Linka هنوز پیکربندی نشده است.',
});

/**
 * @param {string} code
 * @param {string} [fallback]
 */
export function userMessageForCode(code, fallback) {
  return COMPANY_IDENTITY_USER_MESSAGES[code] || fallback || COMPANY_IDENTITY_USER_MESSAGES.PROVIDER_UNAVAILABLE;
}

/**
 * Map HTTP status / network condition to internal error code.
 * @param {{ status?: number, code?: string, name?: string }} err
 */
export function classifyProviderError(err) {
  const status = err?.status;
  if (err?.code === 'LINKA_TIMEOUT' || err?.name === 'AbortError') {
    return COMPANY_IDENTITY_ERRORS.PROVIDER_TIMEOUT;
  }
  if (status === 401 || status === 403) {
    return COMPANY_IDENTITY_ERRORS.PROVIDER_AUTH_FAILED;
  }
  if (status === 404) {
    return COMPANY_IDENTITY_ERRORS.NOT_FOUND;
  }
  if (status != null && status >= 400 && status < 500) {
    return COMPANY_IDENTITY_ERRORS.INVALID_RESPONSE;
  }
  if (status != null && status >= 500) {
    return COMPANY_IDENTITY_ERRORS.PROVIDER_UNAVAILABLE;
  }
  return COMPANY_IDENTITY_ERRORS.PROVIDER_UNAVAILABLE;
}

export default {
  COMPANY_IDENTITY_ERRORS,
  COMPANY_IDENTITY_USER_MESSAGES,
  userMessageForCode,
  classifyProviderError,
};
