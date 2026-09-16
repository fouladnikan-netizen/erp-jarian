/**
 * Equal-leg angle identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANGLE_ROWS,
  angleIdentityRows,
} from '../domain/productMaster/angleCatalog.js';

describe('angleCatalog', () => {
  it('lists equal-leg mill sizes with thickness', () => {
    assert.equal(ANGLE_ROWS.length, 27);
    assert.deepEqual(ANGLE_ROWS[0], { leg: 20, thickness: 2 });
    assert.deepEqual(ANGLE_ROWS.at(-1), { leg: 120, thickness: 8 });
    assert.equal(ANGLE_ROWS.some((row) => row.leg === 100 && row.thickness === 8), true);
    assert.equal(ANGLE_ROWS.some((row) => row.leg === 25), false);
    const rows = angleIdentityRows();
    assert.equal(rows.length, 27);
    assert.deepEqual(rows[0], { height: '20', height2: '20', thickness: 2 });
    assert.deepEqual(rows.at(-1), { height: '120', height2: '120', thickness: 8 });
    assert.equal(rows.every((row) => row.height === row.height2), true);
  });
});
