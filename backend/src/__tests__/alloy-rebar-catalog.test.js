/**
 * Alloy rebar identity catalog (operator: grade only).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALLOY_REBAR_GRADES,
  alloyRebarIdentityRows,
} from '../domain/productMaster/alloyRebarCatalog.js';

describe('alloyRebarCatalog', () => {
  it('lists the 13 operator grades and no size identity', () => {
    assert.deepEqual([...ALLOY_REBAR_GRADES], [
      '1.5714', '1.7131', 'Ck15', 'Ck45', 'Ck60', 'Ck75', 'Mo40',
      'ST52-3', 'VCN150', 'VCN200', '1.251', 'ST37-2', '1.2344',
    ]);
    const rows = alloyRebarIdentityRows();
    assert.equal(rows.length, 13);
    assert.deepEqual(rows[0], { grade: '1.5714' });
    assert.deepEqual(rows.at(-1), { grade: '1.2344' });
    assert.ok(rows.every((row) => row.size === undefined));
  });
});
