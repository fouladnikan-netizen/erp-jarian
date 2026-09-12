/**
 * Canonical Jarian order code (DDL-27).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatJarianOrderCode,
  jalaliDayKey,
} from '../domain/order/jarianOrderCode.js';

function allocateOnDay(counters, parts) {
  const key = jalaliDayKey(parts);
  const sequence = (counters.get(key) || 0) + 1;
  counters.set(key, sequence);
  return formatJarianOrderCode({ ...parts, sequence });
}

describe('jarian order code (DDL-27)', () => {
  it('formats JR-{Y}{MM}{DD}{NN} for 1405/07/02', () => {
    const day = { year: 1405, month: 7, day: 2 };
    assert.equal(formatJarianOrderCode({ ...day, sequence: 1 }), 'JR-5070201');
    assert.equal(formatJarianOrderCode({ ...day, sequence: 2 }), 'JR-5070202');
    assert.equal(formatJarianOrderCode({ ...day, sequence: 3 }), 'JR-5070203');
  });

  it('resets daily sequence on the next Jalali day', () => {
    const counters = new Map();
    const d1 = { year: 1405, month: 7, day: 2 };
    const d2 = { year: 1405, month: 7, day: 3 };
    assert.equal(allocateOnDay(counters, d1), 'JR-5070201');
    assert.equal(allocateOnDay(counters, d1), 'JR-5070202');
    assert.equal(allocateOnDay(counters, d1), 'JR-5070203');
    assert.equal(allocateOnDay(counters, d2), 'JR-5070301');
    assert.equal(allocateOnDay(counters, d1), 'JR-5070204');
  });

  it('uses last digit of Jalali year', () => {
    assert.equal(
      formatJarianOrderCode({ year: 1406, month: 1, day: 1, sequence: 1 }),
      'JR-6010101',
    );
  });
});
