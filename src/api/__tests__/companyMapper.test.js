import { describe, expect, it } from 'vitest';
import { contactFromApi, contactToApi } from '../mappers/companyMapper.js';

describe('companyMapper contactFromApi (DDL-26 canonical contacts)', () => {
  it('prefers canonicalContacts over legacy persons when present', () => {
    const mapped = contactFromApi({
      id: 'co_test',
      name: 'شرکت تست',
      entityType: 'CUSTOMER',
      payload: {},
      persons: [{ id: 'legacy-1', fullName: 'Legacy', mobile: '09120000000' }],
      canonicalContacts: [{
        relationshipId: 'rel_1',
        isPrimary: true,
        roleTitle: 'مدیر',
        contact: { id: 'ct_1', fullName: 'علی', mobile: '09121111111' },
      }],
    });

    expect(mapped.relatedPersons).toHaveLength(1);
    expect(mapped.relatedPersons[0].fullName).toBe('علی');
    expect(mapped.relatedPersons[0].canonicalContactId).toBe('ct_1');
    expect(mapped.relatedPersons[0].isPrimary).toBe(true);
  });

  it('falls back to legacy persons when canonicalContacts is empty', () => {
    const mapped = contactFromApi({
      id: 'co_test',
      name: 'شرکت تست',
      entityType: 'CUSTOMER',
      payload: {},
      persons: [{ id: 'legacy-1', fullName: 'Legacy', mobile: '09120000000' }],
      canonicalContacts: [],
    });

    expect(mapped.relatedPersons[0].fullName).toBe('Legacy');
  });

  it('contactToApi sends relatedPersons top-level and strips from payload', () => {
    const api = contactToApi({
      name: 'Co',
      entityType: 'customer',
      relatedPersons: [{ fullName: 'A', mobile: '09121111111' }],
      payload: { relatedPersons: [{ fullName: 'shadow' }], interactions: [{ id: 1 }] },
    });
    expect(api.relatedPersons).toHaveLength(1);
    expect(api.payload.relatedPersons).toBeUndefined();
    expect(api.payload.interactions).toBeUndefined();
  });
});
