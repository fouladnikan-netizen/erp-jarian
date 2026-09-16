import { describe, expect, it } from 'vitest';
import {
  evaluateCompanyCompletion,
  isCompanyOperational,
} from '../customerCompletion/evaluateCompanyCompletion.js';

describe('evaluateCompanyCompletion', () => {
  it('marks legal company without contact person as non-operational at 70%', () => {
    const result = evaluateCompanyCompletion({
      id: 1,
      personType: 'legal',
      companyName: 'فولاد نمونه',
      nationalId: '10101234567',
      relatedPersons: [],
    });

    expect(result.isRegistered).toBe(true);
    expect(result.isOperational).toBe(false);
    expect(result.completion).toBe(70);
    expect(result.missing).toEqual(['contactPerson']);
  });

  it('becomes operational once a contact person exists', () => {
    const result = evaluateCompanyCompletion({
      id: 1,
      personType: 'legal',
      companyName: 'فولاد نمونه',
      nationalId: '10101234567',
      relatedPersons: [{ id: 'p1', fullName: 'علی', mobile: '0912' }],
    });

    expect(result.isOperational).toBe(true);
    expect(result.completion).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it('treats natural persons as operational without relatedPersons', () => {
    const result = evaluateCompanyCompletion({
      id: 2,
      personType: 'natural',
      personName: 'رضا محمدی',
      nationalId: '0012345678',
      relatedPersons: [],
    });

    expect(result.isOperational).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('returns zero completion for null company', () => {
    const result = evaluateCompanyCompletion(null);
    expect(result.isOperational).toBe(false);
    expect(result.isRegistered).toBe(false);
    expect(result.completion).toBe(0);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('flags missing registration fields on legal company', () => {
    const result = evaluateCompanyCompletion({
      id: 3,
      personType: 'legal',
      companyName: '',
      nationalId: '',
      relatedPersons: [{ id: 'p1', fullName: 'علی', mobile: '0912' }],
    });

    expect(result.isRegistered).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining(['companyRegistration', 'nationalId']),
    );
  });

  it('isCompanyOperational mirrors evaluateCompanyCompletion', () => {
    const company = {
      id: 1,
      personType: 'legal',
      companyName: 'فولاد نمونه',
      nationalId: '10101234567',
      relatedPersons: [{ id: 'p1', fullName: 'علی', mobile: '0912' }],
    };
    expect(isCompanyOperational(company)).toBe(true);
    expect(isCompanyOperational(null)).toBe(false);
  });
});
