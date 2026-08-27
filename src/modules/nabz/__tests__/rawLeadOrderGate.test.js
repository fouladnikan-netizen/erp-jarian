import { describe, expect, it } from 'vitest';
import { validateCreateOrder } from '../createOrder.js';
import { createErpAudiencePort } from '../../mowj/adapters/erpAudiencePort.js';
import { buildCompanyParticipant } from '../../gahshomar/services/letterContactSearch.js';
import { RAW_LEAD_GATE_ERROR } from '../../../domain/entityReference';

describe('Global Raw Lead gate — Nabz / Mowj / Gahshomar', () => {
  it('create order for Raw Lead → rejected', () => {
    const result = validateCreateOrder({
      customerId: 'lead_xyz',
      lineItems: [{ qty: 1 }],
    });
    expect(result.valid).toBe(false);
    expect(result.code).toBe(RAW_LEAD_GATE_ERROR.ORDER);
  });

  it('create order with entityType RAW_LEAD → rejected', () => {
    const result = validateCreateOrder({
      customerId: 'co_1',
      entityType: 'RAW_LEAD',
      lineItems: [{ qty: 1 }],
    });
    expect(result.valid).toBe(false);
    expect(result.code).toBe(RAW_LEAD_GATE_ERROR.ORDER);
  });

  it('Raw Lead not returned as campaign audience', () => {
    const port = createErpAudiencePort();
    expect(port.listLeads()).toEqual([]);
    const check = port.assertAudienceMemberEligible({
      entityType: 'RAW_LEAD',
      leadId: 'lead_1',
    });
    expect(check.ok).toBe(false);
    expect(check.code).toBe(RAW_LEAD_GATE_ERROR.CAMPAIGN);
  });

  it('Gahshomar rejects Raw Lead participant', () => {
    expect(buildCompanyParticipant({
      id: 'lead_1',
      companyName: 'سرنخ',
      recordType: 'LEAD',
    })).toBeNull();
  });
});
