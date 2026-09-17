/**
 * Z-purlin identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDisplayNameFromRule } from '../domain/productMaster/displayNameRule.js';
import {
  ZED_PROFILE_HEIGHTS,
  ZED_PROFILE_THICKNESSES,
  zedProfileDisplayNameRule,
  zedProfileIdentityRows,
} from '../domain/productMaster/zedProfileCatalog.js';

describe('zedProfileCatalog', () => {
  it('pairs mill heights 160–220 with thickness 2 / 2.5 / 3', () => {
    assert.deepEqual([...ZED_PROFILE_HEIGHTS], [160, 180, 200, 220]);
    assert.deepEqual([...ZED_PROFILE_THICKNESSES], [2, 2.5, 3]);
    const rows = zedProfileIdentityRows();
    assert.equal(rows.length, 12);
    assert.deepEqual(rows[0], { height: 160, thickness: 2 });
    assert.deepEqual(rows.at(-1), { height: 220, thickness: 3 });
    assert.equal(rows.filter((row) => row.thickness === 2.5).length, 4);
    const keys = rows.map((row) => `${row.height}@${row.thickness}`);
    assert.equal(new Set(keys).size, 12);
  });

  it('builds names from type + ارتفاع + ضخامت + شاخه, not stored mill length', () => {
    const rule = zedProfileDisplayNameRule({
      heightId: 'h',
      thicknessId: 't',
      lengthId: 'len',
    });
    const name = buildDisplayNameFromRule(rule, {
      sources: { type: 'پروفیل زد' },
      attributes: {
        h: { nameFa: 'ارتفاع', displayValue: '160' },
        t: { nameFa: 'ضخامت', displayValue: '2', unitLabel: 'میل' },
        len: { nameFa: 'طول', displayValue: '6', unitLabel: 'متری' },
      },
    });
    assert.equal(name, 'پروفیل زد ارتفاع ۱۶۰ ضخامت ۲ میل شاخه ۶ متری');
  });
});
