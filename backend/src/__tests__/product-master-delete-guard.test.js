import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { throwInUse, toPersianCount } from '../domain/productMaster/deleteGuard.js';

describe('product master deleteGuard (DDL-24n)', () => {
  it('formats a Persian 409 with count and sample names', () => {
    try {
      throwInUse({
        code: 'PRODUCT_GROUP_IN_USE',
        entityLabel: 'گروه',
        dependencyLabel: 'دسته',
        items: [
          { id: '1', name: 'ورق گرم', skuCode: 'HR' },
          { id: '2', name: 'پروفیل', skuCode: 'Pr' },
        ],
      });
      assert.fail('expected throw');
    } catch (err) {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'PRODUCT_GROUP_IN_USE');
      assert.match(err.message, /۲ دسته/);
      assert.match(err.message, /ورق گرم \(HR\)/);
      assert.equal(err.details.count, 2);
    }
  });

  it('does not duplicate identical name and code (order codes)', () => {
    try {
      throwInUse({
        code: 'PRODUCT_IN_USE',
        entityLabel: 'کالا',
        dependencyLabel: 'سفارش',
        verb: 'فراخوانده',
        items: [{ id: 'o1', name: 'JR-1405010101', code: 'JR-1405010101' }],
      });
      assert.fail('expected throw');
    } catch (err) {
      assert.match(err.message, /JR-1405010101/);
      assert.doesNotMatch(err.message, /JR-1405010101 \(JR-1405010101\)/);
    }
  });

  it('maps ASCII digits to Persian', () => {
    assert.equal(toPersianCount(12), '۱۲');
  });

  it('formats a brand-in-use 409 with product names', () => {
    try {
      throwInUse({
        code: 'BRAND_IN_USE',
        entityLabel: 'برند',
        dependencyLabel: 'کالا',
        verb: 'استفاده',
        items: [{ id: 'p1', name: 'ورق گرم مبارکه', sku: 'CS-HR-10' }],
      });
      assert.fail('expected throw');
    } catch (err) {
      assert.equal(err.status, 409);
      assert.equal(err.code, 'BRAND_IN_USE');
      assert.match(err.message, /۱ کالا استفاده شده/);
      assert.match(err.message, /ورق گرم مبارکه \(CS-HR-10\)/);
    }
  });
});
