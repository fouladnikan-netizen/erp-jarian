/**
 * Channel identity matrix (operator catalog, not a second SoR).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHANNEL_KINDS,
  CHANNEL_SIZES,
  channelIdentityRows,
} from '../domain/productMaster/channelCatalog.js';

describe('channelCatalog', () => {
  it('pairs معمولی/سبک/هم وزن اروپا with mill sizes 6–24', () => {
    assert.deepEqual([...CHANNEL_KINDS], ['معمولی', 'سبک', 'هم وزن اروپا']);
    assert.deepEqual([...CHANNEL_SIZES], [6, 8, 10, 12, 14, 16, 18, 20, 22, 24]);
    const rows = channelIdentityRows();
    assert.equal(rows.length, CHANNEL_KINDS.length * CHANNEL_SIZES.length);
    assert.deepEqual(rows[0], { kind: 'معمولی', size: 6 });
    assert.deepEqual(rows[CHANNEL_SIZES.length - 1], { kind: 'معمولی', size: 24 });
    assert.deepEqual(rows[CHANNEL_SIZES.length], { kind: 'سبک', size: 6 });
    assert.deepEqual(rows.at(-1), { kind: 'هم وزن اروپا', size: 24 });
  });
});
