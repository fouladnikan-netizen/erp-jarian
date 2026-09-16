/**
 * Plain rebar identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAIN_REBAR_GRADE,
  PLAIN_REBAR_SIZES,
  plainRebarIdentityRows,
} from '../domain/productMaster/plainRebarCatalog.js';

describe('plainRebarCatalog', () => {
  it('covers 8–40 mill with the Type grade A1', () => {
    assert.equal(PLAIN_REBAR_SIZES.length, 13);
    assert.equal(PLAIN_REBAR_SIZES[0], 8);
    assert.equal(PLAIN_REBAR_SIZES.at(-1), 40);
    const rows = plainRebarIdentityRows();
    assert.equal(rows.length, 13);
    assert.deepEqual(rows[0], { size: 8, grade: PLAIN_REBAR_GRADE });
    assert.deepEqual(rows.at(-1), { size: 40, grade: 'A1' });
    assert.equal(new Set(rows.map((row) => row.grade)).size, 1);
  });
});
