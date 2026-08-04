import { describe, expect, it } from 'vitest';
import {
  isValidMobile,
  lookupMobile,
  normalizeMobile,
  toPossibleDuplicateMatches,
} from '../contactPerson';

describe('normalizeMobile', () => {
  it('normalizes 09… local format', () => {
    expect(normalizeMobile('09121234567')).toBe('989121234567');
  });

  it('normalizes 98… and +98… formats', () => {
    expect(normalizeMobile('989121234567')).toBe('989121234567');
    expect(normalizeMobile('+989121234567')).toBe('989121234567');
  });

  it('normalizes 10-digit form without leading zero', () => {
    expect(normalizeMobile('9121234567')).toBe('989121234567');
  });

  it('accepts Persian digits', () => {
    expect(normalizeMobile('۰۹۱۲۱۲۳۴۵۶۷')).toBe('989121234567');
  });

  it('returns empty for invalid values', () => {
    expect(normalizeMobile('')).toBe('');
    expect(normalizeMobile('123')).toBe('');
    expect(normalizeMobile('02188776655')).toBe('');
    expect(isValidMobile('0912')).toBe(false);
  });
});

describe('lookupMobile', () => {
  const companies = [
    {
      id: 1,
      companyName: 'شرکت الف',
      relatedPersons: [
        {
          id: 'p1',
          fullName: 'محمد رضایی',
          mobile: '09121234567',
          jobPosition: 'مدیر خرید',
        },
      ],
    },
    {
      id: 2,
      companyName: 'شرکت ب',
      relatedPersons: [
        {
          id: 'p2',
          fullName: 'محمد رضایی',
          mobile: '+989121234567',
          jobPosition: 'مدیرعامل',
        },
        {
          id: 'p3',
          fullName: 'سارا موسوی',
          mobile: '09354445566',
          jobPosition: 'مدیر مالی',
        },
      ],
    },
    {
      id: 3,
      companyName: 'شرکت ج',
      relatedPersons: [
        {
          id: 'p4',
          fullName: 'رضا نوری',
          mobile: '989121234567',
          jobPosition: 'کارشناس',
        },
      ],
    },
  ];

  it('returns empty array when nothing matches', () => {
    expect(lookupMobile(companies, '09120000000')).toEqual([]);
    expect(lookupMobile(companies, '')).toEqual([]);
  });

  it('finds all matches across companies with format-tolerant compare', () => {
    const matches = lookupMobile(companies, '989121234567');
    expect(matches).toHaveLength(3);
    expect(matches.map((m) => m.personId).sort()).toEqual(['p1', 'p2', 'p4']);
  });

  it('includes same-company matches (no company exclusion)', () => {
    const matches = lookupMobile(companies, '09121234567');
    expect(matches.some((m) => String(m.companyId) === '1' && m.personId === 'p1')).toBe(true);
  });

  it('excludes only the edited contact person (self)', () => {
    const matches = lookupMobile(companies, '09121234567', {
      excludeContactPersonId: 'p1',
    });
    expect(matches.every((m) => m.personId !== 'p1')).toBe(true);
    expect(matches).toHaveLength(2);
  });

  it('maps matches to possibleDuplicateMatches audit shape', () => {
    const matches = lookupMobile(companies, '09121234567');
    expect(toPossibleDuplicateMatches(matches)[0]).toEqual({
      companyId: '1',
      contactPersonId: 'p1',
      matchedMobile: '989121234567',
    });
  });

  it('does not mutate input companies', () => {
    const snapshot = structuredClone(companies);
    lookupMobile(companies, '09121234567');
    expect(companies).toEqual(snapshot);
  });
});
