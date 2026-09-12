import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENERATED_ROLE_CODE_RE,
  generatedRoleNumber,
  nextGeneratedRoleCode,
} from '../domain/rbac/generatedRoleCode.js';

describe('generatedRoleCode', () => {
  it('allocates role_1 when none exist and skips built-in codes', () => {
    assert.equal(nextGeneratedRoleCode(['admin', 'sales', 'sales_manager']), 'role_1');
    assert.equal(GENERATED_ROLE_CODE_RE.test('admin'), false);
  });

  it('takes the highest numeric suffix including gaps and inactive-looking codes', () => {
    assert.equal(nextGeneratedRoleCode(['role_1', 'role_2', 'role_5', 'qa_role_9']), 'role_6');
    assert.equal(generatedRoleNumber('role_126'), 126);
    assert.equal(generatedRoleNumber('role_'), null);
  });
});
