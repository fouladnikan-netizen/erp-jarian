import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertUnused,
  findForbiddenMasterCascades,
  MASTER_NO_CASCADE_PARENTS,
  PRODUCT_OWNED_CHILD_TABLES,
  throwInUse,
  toPersianCount,
} from '../domain/productMaster/deleteGuard.js';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

  it('assertUnused is a no-op when the node has no dependents', () => {
    assert.doesNotThrow(() => assertUnused({
      code: 'PRODUCT_GROUP_IN_USE',
      entityLabel: 'گروه',
      dependencyLabel: 'دسته',
      items: [],
    }));
  });

  it('assertUnused throws the same 409 as throwInUse when dependents exist', () => {
    assert.throws(
      () => assertUnused({
        code: 'PRODUCT_GROUP_IN_USE',
        entityLabel: 'گروه',
        dependencyLabel: 'دسته',
        items: [{ id: '1', name: 'ورق گرم', skuCode: 'HR' }],
      }),
      (err) => err.code === 'PRODUCT_GROUP_IN_USE' && err.status === 409,
    );
  });

  it('applied migrations do not CASCADE-delete master parents', () => {
    const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../db/migrations');
    const files = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql'));
    assert.ok(files.length > 0);
    for (const name of files) {
      const sql = readFileSync(join(migrationsDir, name), 'utf8');
      const forbidden = findForbiddenMasterCascades(sql);
      assert.deepEqual(forbidden, [], `${name} must not ON DELETE CASCADE ${forbidden.join(', ')}`);
    }
    assert.ok(MASTER_NO_CASCADE_PARENTS.includes('product_types'));
    assert.ok(PRODUCT_OWNED_CHILD_TABLES.includes('product_attribute_values'));
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
