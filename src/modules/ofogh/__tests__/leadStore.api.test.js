/**
 * Lead store SERVER_FIRST behaviour with mocked repository (API mode).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../api/useMockApi.js', () => ({
  useMockApi: () => false,
  default: () => false,
}));

vi.mock('../../../api/repositories/LeadRepository.js', () => ({
  LeadRepository: {
    listLeads: vi.fn(),
    createLead: vi.fn(),
    updateLead: vi.fn(),
    changeLeadStatus: vi.fn(),
    archiveLead: vi.fn(),
    convertLead: vi.fn(),
  },
}));

const fetchContacts = vi.fn().mockResolvedValue(undefined);

vi.mock('../../../stores/useContactsStore.js', () => ({
  useContactsStore: Object.assign(
    () => ({}),
    {
      getState: () => ({ fetchContacts }),
    },
  ),
  CONTACT_RECORD_TYPES: { CUSTOMER: 'CUSTOMER', LEAD: 'LEAD' },
  LIFECYCLE_STAGES: { COLD_LEAD: 'cold_lead' },
  RELATIONSHIP_LIFECYCLE_STAGES: { NOPODID: 'نوپدید' },
}));

const { useLeadsStore } = await import('../../../stores/useLeadsStore.js');
const { LeadRepository } = await import('../../../api/repositories/LeadRepository.js');
const { LEAD_STATUS } = await import('../domain/lead.constants.js');
const { convertLeadToCompany } = await import('../leadConversionService.js');

describe('useLeadsStore API mode', () => {
  beforeEach(() => {
    useLeadsStore.setState({ leads: [], hydrated: false, error: null, loading: false });
    vi.clearAllMocks();
    fetchContacts.mockResolvedValue(undefined);
  });

  it('hydrates leads from API into cache', async () => {
    LeadRepository.listLeads.mockResolvedValue([
      {
        id: 'lead_api_1',
        companyName: 'API Co',
        status: LEAD_STATUS.NEW,
        personName: 'A',
        mobile: '0912',
        leadSource: 'web',
      },
    ]);
    await useLeadsStore.getState().fetchLeads();
    expect(useLeadsStore.getState().hydrated).toBe(true);
    expect(useLeadsStore.getState().leads).toHaveLength(1);
    expect(useLeadsStore.getState().leads[0].id).toBe('lead_api_1');
  });

  it('create SERVER_FIRST caches response', async () => {
    LeadRepository.createLead.mockResolvedValue({
      id: 'lead_new',
      companyName: 'N',
      status: LEAD_STATUS.NEW,
    });
    const id = await useLeadsStore.getState().addLeadAsync({ companyName: 'N' });
    expect(id).toBe('lead_new');
    expect(useLeadsStore.getState().leads[0].id).toBe('lead_new');
  });

  it('failed create not cached', async () => {
    LeadRepository.createLead.mockRejectedValue(new Error('server down'));
    const id = await useLeadsStore.getState().addLeadAsync({ companyName: 'X' });
    expect(id).toBeNull();
    expect(useLeadsStore.getState().leads).toHaveLength(0);
  });

  it('convert success updates Lead cache', async () => {
    useLeadsStore.setState({
      leads: [{
        id: 'lead_c1',
        companyName: 'C',
        status: LEAD_STATUS.NEW,
        convertedCompanyId: null,
      }],
    });
    LeadRepository.convertLead.mockResolvedValue({
      lead: {
        id: 'lead_c1',
        companyName: 'C',
        status: LEAD_STATUS.CONVERTED,
        convertedCompanyId: 'co_99',
      },
      companyId: 'co_99',
      conversionMode: 'create_new',
    });

    const result = await convertLeadToCompany('lead_c1', { nationalId: '12345678901' });
    expect(result.ok).toBe(true);
    expect(useLeadsStore.getState().getLead('lead_c1').status).toBe(LEAD_STATUS.CONVERTED);
    expect(useLeadsStore.getState().getLead('lead_c1').convertedCompanyId).toBe('co_99');
    expect(fetchContacts).toHaveBeenCalled();
  });

  it('convert failure leaves Lead unconverted', async () => {
    useLeadsStore.setState({
      leads: [{
        id: 'lead_c2',
        companyName: 'C2',
        status: LEAD_STATUS.NEW,
        convertedCompanyId: null,
      }],
    });
    LeadRepository.convertLead.mockRejectedValue({
      response: { data: { message: 'boom' } },
      message: 'boom',
    });

    const result = await convertLeadToCompany('lead_c2', { nationalId: '12345678901' });
    expect(result.ok).toBe(false);
    expect(useLeadsStore.getState().getLead('lead_c2').status).toBe(LEAD_STATUS.NEW);
    expect(useLeadsStore.getState().getLead('lead_c2').convertedCompanyId).toBeNull();
  });

  it('edit success → server saved → cache updated', async () => {
    useLeadsStore.setState({
      leads: [{
        id: 'lead_e1',
        companyName: 'Old Co',
        personName: 'Ali',
        mobile: '09120000000',
        leadSource: 'web',
        status: LEAD_STATUS.NEW,
      }],
    });
    LeadRepository.updateLead.mockResolvedValue({
      id: 'lead_e1',
      companyName: 'New Co',
      personName: 'Sara',
      mobile: '09121111111',
      leadSource: 'نمایشگاه',
      activityDomain: 'فولاد',
      notes: 'به‌روز',
      status: LEAD_STATUS.NEW,
    });

    const saved = await useLeadsStore.getState().updateLeadAsync('lead_e1', {
      companyName: 'New Co',
      personName: 'Sara',
      mobile: '09121111111',
      leadSource: 'نمایشگاه',
      activityDomain: 'فولاد',
      notes: 'به‌روز',
    });

    expect(LeadRepository.updateLead).toHaveBeenCalled();
    expect(saved.companyName).toBe('New Co');
    expect(useLeadsStore.getState().getLead('lead_e1').companyName).toBe('New Co');
    expect(useLeadsStore.getState().getLead('lead_e1').personName).toBe('Sara');
  });

  it('edit failure → cache unchanged', async () => {
    const original = {
      id: 'lead_e2',
      companyName: 'Keep',
      personName: 'P',
      mobile: '0912',
      leadSource: 'web',
      status: LEAD_STATUS.NEW,
    };
    useLeadsStore.setState({ leads: [original] });
    LeadRepository.updateLead.mockRejectedValue(new Error('save failed'));

    await expect(
      useLeadsStore.getState().updateLeadAsync('lead_e2', { companyName: 'Changed' }),
    ).rejects.toThrow('save failed');

    expect(useLeadsStore.getState().getLead('lead_e2').companyName).toBe('Keep');
  });

  it('NEW → QUALIFYING allowed', async () => {
    useLeadsStore.setState({
      leads: [{ id: 'lead_s1', companyName: 'S', status: LEAD_STATUS.NEW }],
    });
    LeadRepository.changeLeadStatus.mockResolvedValue({
      id: 'lead_s1',
      companyName: 'S',
      status: LEAD_STATUS.QUALIFYING,
    });

    const saved = await useLeadsStore.getState().changeLeadStatusAsync('lead_s1', LEAD_STATUS.QUALIFYING);
    expect(saved.status).toBe(LEAD_STATUS.QUALIFYING);
    expect(useLeadsStore.getState().getLead('lead_s1').status).toBe(LEAD_STATUS.QUALIFYING);
  });

  it('NEW → REJECTED allowed', async () => {
    useLeadsStore.setState({
      leads: [{ id: 'lead_s2', companyName: 'S', status: LEAD_STATUS.NEW }],
    });
    LeadRepository.changeLeadStatus.mockResolvedValue({
      id: 'lead_s2',
      companyName: 'S',
      status: LEAD_STATUS.REJECTED,
    });

    await useLeadsStore.getState().changeLeadStatusAsync('lead_s2', LEAD_STATUS.REJECTED);
    expect(useLeadsStore.getState().getLead('lead_s2').status).toBe(LEAD_STATUS.REJECTED);
  });

  it('QUALIFYING → REJECTED allowed', async () => {
    useLeadsStore.setState({
      leads: [{ id: 'lead_s3', companyName: 'S', status: LEAD_STATUS.QUALIFYING }],
    });
    LeadRepository.changeLeadStatus.mockResolvedValue({
      id: 'lead_s3',
      companyName: 'S',
      status: LEAD_STATUS.REJECTED,
    });

    await useLeadsStore.getState().changeLeadStatusAsync('lead_s3', LEAD_STATUS.REJECTED);
    expect(useLeadsStore.getState().getLead('lead_s3').status).toBe(LEAD_STATUS.REJECTED);
  });

  it('status change failure → cache unchanged', async () => {
    useLeadsStore.setState({
      leads: [{ id: 'lead_s4', companyName: 'S', status: LEAD_STATUS.NEW }],
    });
    LeadRepository.changeLeadStatus.mockRejectedValue(new Error('status failed'));

    await expect(
      useLeadsStore.getState().changeLeadStatusAsync('lead_s4', LEAD_STATUS.QUALIFYING),
    ).rejects.toThrow('status failed');
    expect(useLeadsStore.getState().getLead('lead_s4').status).toBe(LEAD_STATUS.NEW);
  });

  it('archive → soft-delete → removed from active cache', async () => {
    useLeadsStore.setState({
      leads: [
        { id: 'lead_a1', companyName: 'A', status: LEAD_STATUS.NEW },
        { id: 'lead_a2', companyName: 'B', status: LEAD_STATUS.NEW },
      ],
    });
    LeadRepository.archiveLead.mockResolvedValue({ id: 'lead_a1', archived: true });

    const result = await useLeadsStore.getState().archiveLeadAsync('lead_a1', { reason: 'تست آرشیو' });
    expect(result.archived).toBe(true);
    expect(LeadRepository.archiveLead).toHaveBeenCalledWith('lead_a1', { reason: 'تست آرشیو' });
    expect(useLeadsStore.getState().getLead('lead_a1')).toBeNull();
    expect(useLeadsStore.getState().leads).toHaveLength(1);
  });

  it('archive failure → cache unchanged', async () => {
    useLeadsStore.setState({
      leads: [{ id: 'lead_a3', companyName: 'A', status: LEAD_STATUS.NEW }],
    });
    LeadRepository.archiveLead.mockRejectedValue(new Error('archive failed'));

    await expect(
      useLeadsStore.getState().archiveLeadAsync('lead_a3', { reason: 'x' }),
    ).rejects.toThrow('archive failed');
    expect(useLeadsStore.getState().getLead('lead_a3')).not.toBeNull();
  });
});
