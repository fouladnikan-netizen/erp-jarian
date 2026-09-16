import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LEAD_STATUSES as shimLeadStatuses,
} from '../services/leadService.js';
import {
  LEAD_STATUSES as canonicalLeadStatuses,
} from '../modules/crm/application/leadService.js';
import {
  TASK_STATUSES as shimTaskStatuses,
  SUBJECT_TYPES as shimTaskSubjects,
} from '../services/taskService.js';
import {
  TASK_STATUSES as canonicalTaskStatuses,
} from '../modules/tasks/application/taskService.js';
import {
  ACTIVITY_STATUSES as shimActivityStatuses,
} from '../services/activityService.js';
import {
  ACTIVITY_STATUSES as canonicalActivityStatuses,
} from '../modules/tasks/application/activityService.js';
import { findCompanyById, findLeadById } from '../modules/crm/public/subjectReferences.js';
import { recomputeCustomerLifecycle } from '../modules/crm/public/customerLifecycle.js';
import { recomputeCustomerLifecycle as shimLifecycle } from '../services/customerLifecycleService.js';
import { findOrdersForCompany } from '../modules/sales/public/companyOrderReferences.js';
import { listActivitiesForCompanySubject } from '../modules/tasks/public/companyActivityReferences.js';
import { HTTP_BASE, MODULE_ID as tasksId } from '../modules/tasks/index.js';
import { PRODUCT_SKU_FORMULA, PRODUCT_SKU_POLICY } from '../modules/catalog/domain/productMaster/productIdentityPolicy.js';

const here = dirname(fileURLToPath(import.meta.url));
const srcRoot = join(here, '..');

function readSrc(rel) {
  return readFileSync(join(srcRoot, rel), 'utf8');
}

describe('Phase 2.1 CRM + tasks modular move', () => {
  it('keeps product identity SSOT unchanged', () => {
    assert.equal(PRODUCT_SKU_POLICY, 'DDL-24m');
    assert.equal(PRODUCT_SKU_FORMULA, '{groupSku}-{categorySku}-{typeSku}-{identityValue…}');
    assert.doesNotMatch(PRODUCT_SKU_FORMULA, /GG-CC-TT-VV|GGCCTTVV/);
  });

  it('re-exports CRM/tasks application constants through old service shims', () => {
    assert.equal(shimLeadStatuses, canonicalLeadStatuses);
    assert.deepEqual(canonicalLeadStatuses, {
      NEW: 'NEW', QUALIFYING: 'QUALIFYING', CONVERTED: 'CONVERTED', REJECTED: 'REJECTED',
    });
    assert.equal(shimTaskStatuses, canonicalTaskStatuses);
    assert.deepEqual(shimTaskSubjects, { COMPANY: 'COMPANY', RAW_LEAD: 'RAW_LEAD' });
    assert.equal(shimActivityStatuses, canonicalActivityStatuses);
    assert.equal(shimLifecycle, recomputeCustomerLifecycle);
  });

  it('exposes public ports instead of foreign repositories', () => {
    assert.equal(typeof findCompanyById, 'function');
    assert.equal(typeof findLeadById, 'function');
    assert.equal(typeof recomputeCustomerLifecycle, 'function');
    assert.equal(typeof findOrdersForCompany, 'function');
    assert.equal(typeof listActivitiesForCompanySubject, 'function');
  });

  it('keeps public HTTP bases stable', () => {
    assert.equal(tasksId, 'tasks');
    assert.deepEqual(HTTP_BASE, [
      '/api/v1/tasks',
      '/api/v1/activities',
      '/api/v1/activity-types',
    ]);
  });

  it('forbids tasks application from importing CRM tables', () => {
    const taskApp = readSrc('modules/tasks/application/taskService.js');
    const activityApp = readSrc('modules/tasks/application/activityService.js');
    for (const src of [taskApp, activityApp]) {
      assert.match(src, /crm\/public\/subjectReferences\.js/);
      assert.doesNotMatch(src, /companyRepository\.js|leadRepository\.js/);
    }
  });

  it('forbids CRM lifecycle from importing sales/tasks tables', () => {
    const src = readSrc('modules/crm/application/customerLifecycleService.js');
    assert.match(src, /tasks\/public\/companyActivityReferences\.js/);
    assert.match(src, /sales\/public\/companyOrderReferences\.js/);
    assert.doesNotMatch(src, /activityRepository\.js|orderRepository\.js/);
  });

  it('forbids sales order writes from importing CRM repositories or lifecycle application', () => {
    const src = readSrc('modules/sales/application/orderService.js');
    assert.match(src, /crm\/public\/subjectReferences\.js/);
    assert.match(src, /shared\/events\/index\.js/);
    assert.doesNotMatch(src, /companyRepository\.js|customerLifecycleService\.js|customerLifecycle\.js/);
  });

  it('keeps old paths as shim-only re-exports', () => {
    const shims = [
      'services/companyService.js',
      'services/taskService.js',
      'repositories/companyRepository.js',
      'repositories/taskRepository.js',
      'routes/companies.js',
      'routes/tasks.js',
    ];
    for (const rel of shims) {
      const src = readSrc(rel);
      assert.match(src, /Compatibility shim/);
      assert.match(src, /export /);
      assert.doesNotMatch(src, /function |class |const createSchema/);
    }
  });
});
