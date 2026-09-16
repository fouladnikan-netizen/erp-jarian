import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLOT_TYPE_ATTRIBUTE,
  SLOT_TYPE_BINDING,
} from '../domain/productMaster/wellCasingSlotType.js';

describe('well casing slot type catalog', () => {
  it('is an optional TRANSACTION ENUM with three slot styles', () => {
    assert.equal(SLOT_TYPE_ATTRIBUTE.dataType, 'ENUM');
    assert.equal(SLOT_TYPE_BINDING.isRequired, false);
    assert.equal(SLOT_TYPE_BINDING.valueScope, 'TRANSACTION');
    assert.deepEqual(
      SLOT_TYPE_ATTRIBUTE.allowedValues.map((row) => row.labelFa),
      [
        'شیار دستگاهی (فرزکاری)',
        'شیار کرکره‌ای (جانزون / ژاپنی)',
        'شیار دستی (هوا برش)',
      ],
    );
    const values = SLOT_TYPE_ATTRIBUTE.allowedValues.map((row) => row.value);
    assert.equal(new Set(values).size, values.length);
  });
});
