/**
 * Steel-mesh identity catalog (operator mill list, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEEL_MESH_TYPES,
  steelMeshIdentityRows,
} from '../domain/productMaster/steelMeshCatalog.js';

describe('steelMeshCatalog', () => {
  it('covers جوشی، حصاری، مرغی and مش ساختمانی with چشمه×قطر identity', () => {
    assert.deepEqual(STEEL_MESH_TYPES.map((row) => row.name), [
      'توری جوشی',
      'توری حصاری',
      'توری مرغی',
      'مش جوشی ساختمانی',
    ]);
    assert.deepEqual([...STEEL_MESH_TYPES[0].legacyNames], ['توری فولادی']);
    const counts = STEEL_MESH_TYPES.map((row) => steelMeshIdentityRows(row).length);
    assert.deepEqual(counts, [12, 9, 6, 9]);
    assert.deepEqual(steelMeshIdentityRows(STEEL_MESH_TYPES[0])[0], { meshSize: 5, size: 2 });
    assert.deepEqual(steelMeshIdentityRows(STEEL_MESH_TYPES[3]).at(-1), { meshSize: 20, size: 10 });
  });
});
