/**
 * Bed rebar identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  BED_REBAR_KINDS,
  BED_REBAR_SIZES_MM,
  BED_REBAR_WIDTH_OPTIONS,
  BED_REBAR_WIDTH_VALUES,
  bedRebarIdentityRows,
} from '../domain/productMaster/bedRebarCatalog.js';

describe('bedRebarCatalog', () => {
  it('pairs خرپایی/نردبانی with three selectable bed widths and wire sizes 4/4.5', () => {
    assert.deepEqual([...BED_REBAR_KINDS], ['خرپایی', 'نردبانی']);
    assert.deepEqual([...BED_REBAR_WIDTH_VALUES], ['5.5', '11', '15']);
    assert.deepEqual(BED_REBAR_WIDTH_OPTIONS.map((option) => option.labelFa), [
      '۵٫۵ سانتی‌متر', '۱۱ سانتی‌متر', '۱۵ سانتی‌متر',
    ]);
    assert.deepEqual([...BED_REBAR_SIZES_MM], [4, 4.5]);
    const rows = bedRebarIdentityRows();
    assert.equal(rows.length, 12);
    assert.deepEqual(rows[0], { kind: 'خرپایی', bedWidth: '5.5', size: 4 });
    assert.deepEqual(rows[5], { kind: 'خرپایی', bedWidth: '15', size: 4.5 });
    assert.deepEqual(rows[6], { kind: 'نردبانی', bedWidth: '5.5', size: 4 });
    assert.deepEqual(rows.at(-1), { kind: 'نردبانی', bedWidth: '15', size: 4.5 });
  });
});
