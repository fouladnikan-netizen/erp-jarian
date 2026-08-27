import { describe, it, expect } from 'vitest';
import {
  ENTITY_REF_TYPE,
  companyReference,
  rawLeadReference,
  parseEntityReference,
  assertEntityEligibleFor,
  detectRawLeadOrderAttempt,
  assertEligibleForFinance,
  assertEligibleForQuotation,
  ERP_CAPABILITY,
  RAW_LEAD_GATE_ERROR,
} from '../index.js';

describe('EntityReference contract', () => {
  it('normalizes COMPANY and RAW_LEAD', () => {
    expect(parseEntityReference(companyReference('co_1')).ok).toBe(true);
    expect(parseEntityReference(rawLeadReference('lead_1')).ref.entityType).toBe(
      ENTITY_REF_TYPE.RAW_LEAD,
    );
    expect(parseEntityReference({ entityType: 'UNKNOWN', entityId: 'x' }).ok).toBe(false);
  });
});

describe('Raw Lead capability gate', () => {
  it('allows Activity/Task for Raw Lead', () => {
    expect(assertEntityEligibleFor(rawLeadReference('lead_1'), ERP_CAPABILITY.ACTIVITY).ok).toBe(true);
    expect(assertEntityEligibleFor(rawLeadReference('lead_1'), ERP_CAPABILITY.TASK).ok).toBe(true);
  });

  it('rejects Order/Finance/Campaign/Correspondence for Raw Lead', () => {
    expect(assertEntityEligibleFor(rawLeadReference('lead_1'), ERP_CAPABILITY.ORDER)).toMatchObject({
      ok: false,
      code: RAW_LEAD_GATE_ERROR.ORDER,
    });
    expect(assertEligibleForFinance(rawLeadReference('lead_1')).code).toBe(RAW_LEAD_GATE_ERROR.FINANCE);
    expect(assertEligibleForQuotation(rawLeadReference('lead_1')).code).toBe(
      RAW_LEAD_GATE_ERROR.QUOTATION,
    );
    expect(assertEntityEligibleFor(rawLeadReference('lead_1'), ERP_CAPABILITY.CAMPAIGN).code).toBe(
      RAW_LEAD_GATE_ERROR.CAMPAIGN,
    );
    expect(assertEntityEligibleFor(rawLeadReference('lead_1'), ERP_CAPABILITY.CORRESPONDENCE).code)
      .toBe(RAW_LEAD_GATE_ERROR.CORRESPONDENCE);
  });

  it('allows Order for Company', () => {
    expect(assertEntityEligibleFor(companyReference('co_1'), ERP_CAPABILITY.ORDER).ok).toBe(true);
  });

  it('detects raw lead order attempts', () => {
    expect(detectRawLeadOrderAttempt({ leadId: 'lead_1' }).attempted).toBe(true);
    expect(detectRawLeadOrderAttempt({ entityType: 'RAW_LEAD', companyId: 'x' }).attempted).toBe(true);
    expect(detectRawLeadOrderAttempt({ companyId: 'lead_abc' }).attempted).toBe(true);
    expect(detectRawLeadOrderAttempt({ companyId: 'co_1' }).attempted).toBe(false);
  });
});
