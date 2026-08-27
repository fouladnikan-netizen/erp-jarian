import { describe, it, expect } from 'vitest';
import {
  mapCompanyIdentityErrorMessage,
  COMPANY_IDENTITY_ERROR_MESSAGES,
} from '../companyIdentityErrors.js';

describe('companyIdentityErrors', () => {
  it('maps known backend codes to Persian UX messages', () => {
    expect(mapCompanyIdentityErrorMessage('COMPANY_IDENTITY_NOT_FOUND')).toBe(
      COMPANY_IDENTITY_ERROR_MESSAGES.COMPANY_IDENTITY_NOT_FOUND,
    );
    expect(mapCompanyIdentityErrorMessage('COMPANY_IDENTITY_PROVIDER_TIMEOUT')).toBe(
      COMPANY_IDENTITY_ERROR_MESSAGES.COMPANY_IDENTITY_PROVIDER_TIMEOUT,
    );
  });

  it('does not leak provider technical details', () => {
    expect(mapCompanyIdentityErrorMessage('COMPANY_IDENTITY_PROVIDER_AUTH_FAILED', '401 Unauthorized Linka API key'))
      .toBe(COMPANY_IDENTITY_ERROR_MESSAGES.COMPANY_IDENTITY_PROVIDER_AUTH_FAILED);
  });

  it('falls back to server message when safe', () => {
    expect(mapCompanyIdentityErrorMessage(undefined, 'سرنخ یافت نشد.')).toBe('سرنخ یافت نشد.');
  });
});
