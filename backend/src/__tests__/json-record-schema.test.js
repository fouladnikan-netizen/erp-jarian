import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  jsonRecord,
  attributeValueRecord,
  weightCoefficientRecord,
} from '../modules/shared/schemas/jsonRecord.js';

describe('shared jsonRecord schemas', () => {
  it('accepts nested JSON and rejects functions', () => {
    const ok = jsonRecord.safeParse({ items: [{ sku: 'A', qty: 2 }], nested: { a: null } });
    assert.equal(ok.success, true);
    const bad = jsonRecord.safeParse({ fn: () => 1 });
    assert.equal(bad.success, false);
  });

  it('tightens product attribute values to scalars', () => {
    assert.equal(attributeValueRecord.safeParse({ THK: '10', W: 1250, FLAG: true }).success, true);
    assert.equal(attributeValueRecord.safeParse({ BAD: { nested: true } }).success, false);
  });

  it('tightens weight coefficients', () => {
    assert.equal(weightCoefficientRecord.safeParse({ density: 7.85, note: null }).success, true);
    assert.equal(weightCoefficientRecord.safeParse({ density: { x: 1 } }).success, false);
  });
});
