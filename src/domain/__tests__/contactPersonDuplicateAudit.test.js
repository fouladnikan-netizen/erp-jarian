import { beforeEach, describe, expect, it } from 'vitest';
import { lookupMobile } from '../contactPerson';
import { useContactsStore } from '../../stores/useContactsStore.js';

describe('DDL-08 ContactPerson duplicate policy (store + lookup)', () => {
  beforeEach(() => {
    useContactsStore.setState({
      contactPersonAuditLog: [],
    });
  });

  it('Scenario 1 — unique mobile: no metadata, no audit', () => {
    const before = useContactsStore.getState().contactPersonAuditLog.length;
    const personId = useContactsStore.getState().addContactPerson(6, {
      fullName: 'شخص یکتا',
      mobile: '09129998877',
      jobPosition: 'کارشناس فروش',
    });

    const person = useContactsStore.getState().getContactPerson(6, personId);
    expect(personId).toBeTruthy();
    expect(person?.possibleDuplicateMobile).toBeUndefined();
    expect(person?.possibleDuplicateMatches).toBeUndefined();
    expect(useContactsStore.getState().contactPersonAuditLog.length).toBe(before);
    expect(lookupMobile(useContactsStore.getState().contacts, '09128881111')).toEqual([]);
  });

  it('Scenario 2 — same company duplicate: warn signal + metadata + save', () => {
    const personId = useContactsStore.getState().addContactPerson(1, {
      fullName: 'علی رضایی تکراری',
      mobile: '09121112233', // already on company 1 (علی رضایی)
      jobPosition: 'مدیر خرید',
    });

    const person = useContactsStore.getState().getContactPerson(1, personId);
    expect(person?.possibleDuplicateMobile).toBe(true);
    expect(person?.possibleDuplicateMatches?.length).toBeGreaterThan(0);
    expect(person.possibleDuplicateMatches.some((m) => String(m.companyId) === '1')).toBe(true);

    const log = useContactsStore.getState().contactPersonAuditLog;
    expect(log.at(-1)).toMatchObject({
      action: 'CREATE_CONTACT_PERSON',
      possibleDuplicateMobile: true,
      companyId: 1,
      personId,
    });
    expect(log.at(-1).possibleDuplicateMatches.length).toBeGreaterThan(0);
    expect(log.at(-1).createdAt).toBeTruthy();
  });

  it('Scenario 3 — different company duplicate: metadata + audit', () => {
    const personId = useContactsStore.getState().addContactPerson(6, {
      fullName: 'تست بین شرکتی',
      mobile: '09121112233', // seeded on company 1
      jobPosition: 'مدیر خرید',
    });

    const person = useContactsStore.getState().getContactPerson(6, personId);
    expect(person?.possibleDuplicateMobile).toBe(true);
    expect(
      person?.possibleDuplicateMatches?.some((m) => String(m.companyId) === '1'),
    ).toBe(true);

    const event = useContactsStore.getState().contactPersonAuditLog.at(-1);
    expect(event).toMatchObject({
      action: 'CREATE_CONTACT_PERSON',
      possibleDuplicateMobile: true,
      personId,
      mobile: '989121112233',
    });
    expect(event.possibleDuplicateMatches[0]).toMatchObject({
      companyId: expect.any(String),
      contactPersonId: expect.any(String),
      matchedMobile: '989121112233',
    });
  });

  it('Scenario 4 — edit self: excludeContactPersonId avoids self-match', () => {
    const company = useContactsStore.getState().contacts.find((c) => String(c.id) === '1');
    const self = company.relatedPersons.find((p) => p.mobile === '09121112233');
    expect(self).toBeTruthy();

    const withSelf = lookupMobile(useContactsStore.getState().contacts, self.mobile);
    expect(withSelf.some((m) => m.personId === String(self.id))).toBe(true);

    const withoutSelf = lookupMobile(useContactsStore.getState().contacts, self.mobile, {
      excludeContactPersonId: self.id,
    });
    expect(withoutSelf.every((m) => m.personId !== String(self.id))).toBe(true);
  });

  it('Scenario 5 — multiple companies: all matches returned and stored', () => {
    const companies = [
      {
        id: 'A',
        companyName: 'A',
        relatedPersons: [{ id: 'a1', fullName: 'Ali', mobile: '09121234567', jobPosition: 'خرید' }],
      },
      {
        id: 'B',
        companyName: 'B',
        relatedPersons: [{ id: 'b1', fullName: 'Sara', mobile: '+989121234567', jobPosition: 'فروش' }],
      },
      {
        id: 'C',
        companyName: 'C',
        relatedPersons: [{ id: 'c1', fullName: 'Reza', mobile: '989121234567', jobPosition: 'عملیات' }],
      },
    ];
    const matches = lookupMobile(companies, '09121234567');
    expect(matches).toHaveLength(3);
    expect(matches.map((m) => m.companyId).sort()).toEqual(['A', 'B', 'C']);
  });
});
