import { describe, expect, it } from 'vitest';
import { sheetMillLengthDefault, SHEET_LENGTH_PHRASE } from '../sheetMillLength';

describe('sheetMillLengthDefault', () => {
  it('matches the mill-sheet matrix with more-specific rules first', () => {
    expect(sheetMillLengthDefault({ width: 2000, thickness: 50 })).toBe(SHEET_LENGTH_PHRASE);
    expect(sheetMillLengthDefault({ width: 1250, thickness: 12 })).toBe('6000');
    expect(sheetMillLengthDefault({ width: 1250, thickness: 8 })).toBe('2500');
    expect(sheetMillLengthDefault({ width: 1250, thickness: 0.5 })).toBe('2500');
    expect(sheetMillLengthDefault({ width: 1000 })).toBe('2000');
    expect(sheetMillLengthDefault({ width: 1500 })).toBe('6000');
    expect(sheetMillLengthDefault({ width: 900 })).toBe('');
    expect(sheetMillLengthDefault({ width: 1000, thickness: 0.5, supplyForm: 'roll' })).toBe('');
    expect(sheetMillLengthDefault({ width: 1000, thickness: 0.5, supplyForm: 'رول' })).toBe('');
    expect(sheetMillLengthDefault({ width: 1000, thickness: 0.5, supplyForm: 'mill' })).toBe('2000');
  });
});
