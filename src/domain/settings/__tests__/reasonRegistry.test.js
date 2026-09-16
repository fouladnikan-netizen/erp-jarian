import { describe, expect, it } from 'vitest';
import { GATEWAY_CANCEL_REASONS, getCancelReasonLabel } from '../reasonRegistry.js';
import { DOCUMENT_CHROME_TAGLINE, LEGACY_DOCUMENT_ORGANIZATION } from '../documentChrome.js';
import { COMPANY_BRAND } from '../../../modules/nabz/proformaConfig.js';
import { GATEWAY_CANCEL_REASONS as NabzView } from '../../../modules/nabz/gatewayDecisionConfig.js';

describe('settings SSOT views', () => {
  it('re-exports the same gateway cancel list Nabz renders', () => {
    expect(NabzView).toBe(GATEWAY_CANCEL_REASONS);
    expect(getCancelReasonLabel('customer_withdraw')).toContain('مشتری');
  });

  it('keeps COMPANY_BRAND as a compatibility view of document chrome', () => {
    expect(COMPANY_BRAND.tagline).toBe(DOCUMENT_CHROME_TAGLINE);
    expect(COMPANY_BRAND.name).toBe(LEGACY_DOCUMENT_ORGANIZATION.tradeName);
  });
});
