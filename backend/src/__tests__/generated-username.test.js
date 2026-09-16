import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GENERATED_USERNAME_RE,
  generatedUsernameNumber,
  nextGeneratedUsername,
} from '../domain/userAccount/generatedUsername.js';
import { resolveCreateStatus, canAuthenticate } from '../domain/userAccount/accountStatus.js';

describe('generatedUsername', () => {
  it('allocates user_1 when none exist and skips login usernames', () => {
    assert.equal(nextGeneratedUsername(['admin', 'sales_b']), 'user_1');
    assert.equal(GENERATED_USERNAME_RE.test('admin'), false);
  });

  it('takes the highest numeric suffix', () => {
    assert.equal(nextGeneratedUsername(['user_1', 'user_2', 'user_5']), 'user_6');
    assert.equal(generatedUsernameNumber('user_12'), 12);
  });
});

describe('accountStatus', () => {
  it('creates INVITED when password is omitted', () => {
    assert.equal(resolveCreateStatus({ hasPassword: false }), 'INVITED');
    assert.equal(resolveCreateStatus({ hasPassword: true }), 'ACTIVE');
  });

  it('blocks authentication for INVITED and missing password', () => {
    assert.equal(canAuthenticate({ isActive: true, accountStatus: 'ACTIVE', hasPassword: true }), true);
    assert.equal(canAuthenticate({ isActive: true, accountStatus: 'INVITED', hasPassword: false }), false);
  });
});
