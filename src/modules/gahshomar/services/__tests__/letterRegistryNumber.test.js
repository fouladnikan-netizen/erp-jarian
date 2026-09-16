import { describe, expect, it } from 'vitest';
import {
  buildRegistryNumber,
  formatRegistryNumberFa,
  nextRegistrySequence,
  parseRegistryNumber,
  toRegistryYearShort,
} from '../letterRegistryNumber.js';
import { RECORD_DIRECTION } from '../../models/officialRecord.js';

describe('letterRegistryNumber', () => {
  it('shortens Jalali year to three digits', () => {
    expect(toRegistryYearShort('1405/01/12')).toBe('405');
    expect(toRegistryYearShort('1404')).toBe('404');
  });

  it('builds outgoing format with Persian digits and 3-digit serial', () => {
    const existing = [
      { registryNumber: '۴۰۵/OUT/۱۲۴' },
      { registryNumber: '۴۰۵/IN/۲۰۰' },
    ];
    expect(buildRegistryNumber(RECORD_DIRECTION.OUTGOING, '1405/02/01', existing))
      .toBe('۴۰۵/OUT/۱۲۵');
  });

  it('builds incoming format with Persian digits and 3-digit serial', () => {
    const existing = [{ registryNumber: '۴۰۵/IN/۱۲۴' }];
    expect(buildRegistryNumber(RECORD_DIRECTION.INCOMING, '1405/02/01', existing))
      .toBe('۴۰۵/IN/۱۲۵');
  });

  it('builds internal format INT', () => {
    expect(buildRegistryNumber(RECORD_DIRECTION.INTERNAL, '1405/02/01', []))
      .toBe('۴۰۵/INT/۰۰۱');
  });

  it('sequences OUT and IN independently', () => {
    const existing = [
      { registryNumber: '۴۰۵/OUT/۰۰۳' },
      { registryNumber: '۴۰۵/IN/۰۱۰' },
    ];
    expect(nextRegistrySequence(existing, '405', 'OUT')).toBe(4);
    expect(nextRegistrySequence(existing, '405', 'IN')).toBe(11);
  });

  it('parses Persian or ASCII registry numbers', () => {
    expect(parseRegistryNumber('۴۰۵/IN/۱۲۵')).toEqual({
      yearShort: '405',
      code: 'IN',
      seq: 125,
    });
    expect(formatRegistryNumberFa('405/OUT/12')).toBe('۴۰۵/OUT/۰۱۲');
  });
});
