/**
 * ENUM option rename mapping (catalog edit must not leave stale Product values).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapEnumOptionRenames,
  mappingHasRenames,
  remapEnumStoredValue,
} from '../domain/productMaster/enumOptionRename.js';

describe('mapEnumOptionRenames', () => {
  it('keeps unchanged values', () => {
    const mapping = mapEnumOptionRenames(
      [{ value: 'سبک', labelFa: 'سبک' }],
      [{ value: 'سبک', labelFa: 'سبک' }, { value: 'سنگین', labelFa: 'سنگین' }],
    );
    assert.deepEqual(mapping, { سبک: 'سبک' });
    assert.equal(mappingHasRenames(mapping), false);
  });

  it('maps latin value to Persian when the label stays the same', () => {
    const mapping = mapEnumOptionRenames(
      [
        { value: 'roman', labelFa: 'چهارچوب رومی' },
        { value: 'french', labelFa: 'چهارچوب فرانسوی' },
      ],
      [
        { value: 'چهارچوب رومی', labelFa: 'چهارچوب رومی' },
        { value: 'چهارچوب فرانسوی', labelFa: 'چهارچوب فرانسوی' },
      ],
    );
    assert.equal(mapping.roman, 'چهارچوب رومی');
    assert.equal(mapping.french, 'چهارچوب فرانسوی');
    assert.equal(mappingHasRenames(mapping), true);
    assert.equal(remapEnumStoredValue('roman', mapping, new Set(['چهارچوب رومی'])), 'چهارچوب رومی');
    assert.equal(remapEnumStoredValue('orphan', mapping, new Set(['چهارچوب رومی'])), null);
  });

  it('does not guess when two new options share a label', () => {
    const mapping = mapEnumOptionRenames(
      [{ value: 'roman', labelFa: 'رومی' }],
      [
        { value: 'a', labelFa: 'رومی' },
        { value: 'b', labelFa: 'رومی' },
      ],
    );
    assert.equal(Object.prototype.hasOwnProperty.call(mapping, 'roman'), false);
  });
});
