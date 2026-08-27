/**
 * Company identity provider error codes → user-friendly Persian messages.
 * Maps backend `error` codes from lead conversion / identity resolution.
 */
export const COMPANY_IDENTITY_ERROR_MESSAGES = Object.freeze({
  COMPANY_IDENTITY_INVALID_NATIONAL_ID: 'شناسه ملی نامعتبر است.',
  COMPANY_IDENTITY_NOT_FOUND:
    'شرکتی با این شناسه ملی در سرویس اطلاعات شرکت‌ها پیدا نشد.',
  COMPANY_IDENTITY_PROVIDER_TIMEOUT:
    'پاسخ سرویس استعلام بیش از حد طول کشید. دوباره تلاش کنید.',
  COMPANY_IDENTITY_PROVIDER_UNAVAILABLE:
    'سرویس استعلام اطلاعات شرکت در حال حاضر در دسترس نیست.',
  COMPANY_IDENTITY_PROVIDER_AUTH_FAILED:
    'پیکربندی سرویس استعلام شرکت نامعتبر است. با پشتیبانی تماس بگیرید.',
  COMPANY_IDENTITY_INVALID_RESPONSE:
    'پاسخ سرویس استعلام نامعتبر بود. دوباره تلاش کنید.',
  COMPANY_IDENTITY_CONTRACT_REQUIRED:
    'اتصال Production به Linka هنوز پیکربندی نشده است.',
  COMPANY_RESOLUTION_FAILED: 'استعلام هویت شرکت ناموفق بود.',
  COMPANY_ALREADY_EXISTS: 'شرکت با این شناسه ملی از قبل در کانون ثبت شده است.',
});

/**
 * @param {string} [code]
 * @param {string} [serverMessage]
 */
export function mapCompanyIdentityErrorMessage(code, serverMessage) {
  if (code && COMPANY_IDENTITY_ERROR_MESSAGES[code]) {
    return COMPANY_IDENTITY_ERROR_MESSAGES[code];
  }
  if (serverMessage && !/linka|api key|token|401|403|timeout/i.test(serverMessage)) {
    return serverMessage;
  }
  return COMPANY_IDENTITY_ERROR_MESSAGES.COMPANY_RESOLUTION_FAILED;
}

/**
 * @param {unknown} error axios-like API error
 */
export function getCompanyIdentityErrorFromApi(error) {
  const code = error?.response?.data?.error;
  const message = error?.response?.data?.message;
  return mapCompanyIdentityErrorMessage(code, message);
}

export default {
  COMPANY_IDENTITY_ERROR_MESSAGES,
  mapCompanyIdentityErrorMessage,
  getCompanyIdentityErrorFromApi,
};
