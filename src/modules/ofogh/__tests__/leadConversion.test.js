import { describe, it, expect, beforeEach } from 'vitest';
import { useLeadsStore } from '../../../stores/useLeadsStore.js';
import { useContactsStore, CONTACT_RECORD_TYPES, LIFECYCLE_STAGES } from '../../../stores/useContactsStore.js';
import { convertLeadToCompany } from '../leadConversionService.js';
import { LEAD_STATUS } from '../domain/lead.constants.js';
import { createLeadInteraction } from '../leadInteractionFacade.js';

describe('Ofogh lead conversion (mock)', () => {
  beforeEach(() => {
    useLeadsStore.setState({ leads: [], hydrated: true, error: null });
  });

  it('keeps raw leads out of Kanoon contacts store', () => {
    const before = useContactsStore.getState().contacts.length;
    const id = useLeadsStore.getState().addLead({
      companyName: 'پترو تست',
      personName: 'علی',
      mobile: '09120000000',
      leadSource: 'نمایشگاه',
    });
    expect(id).toBeTruthy();
    expect(useLeadsStore.getState().getLead(id).status).toBe(LEAD_STATUS.NEW);
    expect(useContactsStore.getState().contacts.length).toBe(before);
    expect(useContactsStore.getState().addContact({
      recordType: CONTACT_RECORD_TYPES.LEAD,
      companyName: 'should-fail',
    })).toBeNull();
  });

  it('converts lead to company and migrates interactions', async () => {
    const leadId = useLeadsStore.getState().addLead({
      companyName: 'صنایع آزمون',
      personName: 'سارا',
      mobile: '09121112233',
      leadSource: 'وبسایت',
      notes: 'یادداشت اولیه',
    });
    createLeadInteraction(leadId, { note: 'تماس اول', type: 'call' });

    const result = await convertLeadToCompany(leadId, { nationalId: '12345678901' });
    expect(result.ok).toBe(true);
    expect(result.companyId).toBeTruthy();

    const lead = useLeadsStore.getState().getLead(leadId);
    expect(lead.status).toBe(LEAD_STATUS.CONVERTED);
    expect(lead.convertedCompanyId).toBe(result.companyId);

    const company = useContactsStore.getState().contacts.find(
      (c) => String(c.id) === String(result.companyId),
    );
    expect(company).toBeTruthy();
    expect(company.recordType).toBe(CONTACT_RECORD_TYPES.CUSTOMER);
    expect(company.nationalId).toBe('12345678901');
    expect(company.lifecycle_stage).toBe(LIFECYCLE_STAGES.COLD_LEAD);
    expect(company.relatedPersons?.[0]?.fullName).toBe('سارا');
    expect(company.interactions?.some((i) => i.note === 'تماس اول')).toBe(true);
  });
});
