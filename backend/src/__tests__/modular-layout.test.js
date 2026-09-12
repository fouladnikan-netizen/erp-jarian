import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCT_SKU_POLICY,
  PRODUCT_SKU_FORMULA,
  allocateProductSku,
} from '../domain/productMaster/productIdentityPolicy.js';
import {
  PRODUCT_SKU_POLICY as CanonicalPolicy,
  PRODUCT_SKU_FORMULA as CanonicalFormula,
  allocateProductSku as canonicalAllocate,
} from '../modules/catalog/domain/productMaster/productIdentityPolicy.js';
import { findForbiddenMasterCascades } from '../domain/productMaster/deleteGuard.js';
import { MODULE_ID as correspondenceId } from '../modules/correspondence/index.js';
import { MODULE_ID as tasksId, HTTP_BASE as tasksHttp } from '../modules/tasks/index.js';
import { GATEWAY_CANCEL_REASONS } from '../modules/settings/index.js';
import { findCompanyById } from '../modules/crm/public/subjectReferences.js';
import { listCompanies } from '../modules/crm/application/companyService.js';
import { listTasks } from '../modules/tasks/application/taskService.js';

describe('Phase 2 modular layout', () => {
  it('keeps product identity SSOT on the catalog module and identical via shim', () => {
    assert.equal(PRODUCT_SKU_POLICY, 'DDL-24m');
    assert.equal(CanonicalPolicy, PRODUCT_SKU_POLICY);
    assert.equal(CanonicalFormula, PRODUCT_SKU_FORMULA);
    assert.equal(canonicalAllocate, allocateProductSku);
    assert.doesNotMatch(PRODUCT_SKU_FORMULA, /GG-CC-TT-VV|GGCCTTVV/);
  });

  it('exposes deleteGuard through the catalog shim', () => {
    assert.equal(typeof findForbiddenMasterCascades, 'function');
  });

  it('declares correspondence shell and fleshed-out tasks module', () => {
    assert.equal(correspondenceId, 'correspondence');
    assert.equal(tasksId, 'tasks');
    assert.ok(tasksHttp.includes('/api/v1/tasks'));
    assert.equal(typeof listTasks, 'function');
  });

  it('exposes CRM application and public subject port', () => {
    assert.equal(typeof listCompanies, 'function');
    assert.equal(typeof findCompanyById, 'function');
  });

  it('owns cancel reasons in settings', () => {
    assert.ok(GATEWAY_CANCEL_REASONS.some((r) => r.value === 'high_price'));
  });
});
