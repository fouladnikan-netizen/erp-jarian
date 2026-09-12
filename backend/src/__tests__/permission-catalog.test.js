/**
 * Permission catalog compatibility layer (DDL-36).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PERMISSION_CATALOG,
  resolveCanonicalPermissionCode,
  resolveCanonicalPermissionCodes,
  parsePermissionCode,
} from '../domain/rbac/permissionCatalog.js';

describe('permissionCatalog compatibility', () => {
  it('keeps colon codes as canonical', () => {
    assert.equal(resolveCanonicalPermissionCode('orders:read'), 'orders:read');
    assert.equal(resolveCanonicalPermissionCode('users:admin'), 'users:admin');
    assert.equal(resolveCanonicalPermissionCode('products:manage-taxonomy'), 'products:manage-taxonomy');
  });

  it('maps dotted aliases including orders.view → orders:read', () => {
    assert.equal(resolveCanonicalPermissionCode('orders.read'), 'orders:read');
    assert.equal(resolveCanonicalPermissionCode('orders.view'), 'orders:read');
    assert.equal(resolveCanonicalPermissionCode('orders.write'), 'orders:write');
    assert.equal(resolveCanonicalPermissionCode('orders.view_cost'), 'orders:view_cost');
  });

  it('parses resource/action from old codes', () => {
    assert.deepEqual(parsePermissionCode('orders:read'), { resource: 'orders', action: 'read' });
    assert.deepEqual(parsePermissionCode('orders.view'), { resource: 'orders', action: 'read' });
  });

  it('dedupes mixed old/new input', () => {
    const { resolved, missing } = resolveCanonicalPermissionCodes([
      'orders:read',
      'orders.view',
      'orders.read',
      'not-a-perm',
    ]);
    assert.deepEqual(resolved, ['orders:read']);
    assert.deepEqual(missing, ['not-a-perm']);
  });

  it('catalog includes existing operational codes plus sensitive flags', () => {
    const codes = PERMISSION_CATALOG.map((row) => row.code);
    for (const required of ['orders:read', 'orders:write', 'users:admin', 'products:read']) {
      assert.ok(codes.includes(required), required);
    }
    assert.equal(codes.includes('products:manage-relationships'), false);
    const viewCost = PERMISSION_CATALOG.find((row) => row.code === 'orders:view_cost');
    assert.equal(viewCost.isSensitive, true);
    assert.equal(viewCost.category, 'مالی');
    const ordersRead = PERMISSION_CATALOG.find((row) => row.code === 'orders:read');
    assert.equal(ordersRead.isSensitive, false);
    assert.equal(ordersRead.resource, 'orders');
    assert.equal(ordersRead.action, 'read');
  });
});
