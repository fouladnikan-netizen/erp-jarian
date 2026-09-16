import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoleLabelFa } from '../domain/rbac/normalizeRoleLabel.js';

describe('normalizeRoleLabelFa', () => {
  it('trims, collapses whitespace, maps Arabic yeh/kaf, and lowercases Latin', () => {
    assert.equal(normalizeRoleLabelFa('مدیر فروش'), 'مدیر فروش');
    assert.equal(normalizeRoleLabelFa(' مدیر فروش '), 'مدیر فروش');
    assert.equal(normalizeRoleLabelFa('مدیر  فروش'), 'مدیر فروش');
    assert.equal(normalizeRoleLabelFa('مدير فروش'), 'مدیر فروش');
    assert.equal(normalizeRoleLabelFa('Warehouse Lead'), 'warehouse lead');
    assert.equal(normalizeRoleLabelFa('ك folad'), 'ک folad');
  });
});
