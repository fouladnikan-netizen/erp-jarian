import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHALLENGE_PURPOSES,
  OTP_MAX_ATTEMPTS,
  assertPasswordPolicy,
  hourlyOtpLimitReached,
  isChallengeOpen,
  otpAttemptsExceeded,
  shouldThrottleOtp,
} from '../domain/userAccount/authChallenges.js';
import { resolveLoginIdentifier, toFarazRecipient } from '../domain/userAccount/loginIdentifier.js';

describe('auth challenge policy', () => {
  it('rejects short passwords', () => {
    assert.equal(assertPasswordPolicy('short').ok, false);
    assert.equal(assertPasswordPolicy('longenough').ok, true);
  });

  it('opens only unconsumed unexpired rows', () => {
    const now = new Date('2026-09-03T00:00:00.000Z');
    assert.equal(isChallengeOpen({
      consumed_at: null,
      expires_at: '2026-09-04T00:00:00.000Z',
    }, now), true);
    assert.equal(isChallengeOpen({
      consumed_at: '2026-09-03T00:00:00.000Z',
      expires_at: '2026-09-04T00:00:00.000Z',
    }, now), false);
  });

  it('throttles OTP resend and hourly cap', () => {
    const now = new Date('2026-09-03T00:01:00.000Z');
    assert.equal(shouldThrottleOtp('2026-09-03T00:00:30.000Z', now), true);
    assert.equal(shouldThrottleOtp('2026-09-03T00:00:00.000Z', now), false);
    assert.equal(hourlyOtpLimitReached(5), true);
    assert.equal(otpAttemptsExceeded({ attempt_count: OTP_MAX_ATTEMPTS }), true);
    assert.equal(CHALLENGE_PURPOSES.INVITATION, 'INVITATION');
  });
});

describe('login identifier', () => {
  it('prefers normalized mobile', () => {
    const result = resolveLoginIdentifier({ mobile: '۰۹۱۲۳۴۵۶۷۸۹' });
    assert.equal(result.ok, true);
    assert.equal(result.kind, 'mobile');
    assert.equal(result.value, '09123456789');
  });

  it('falls back to username when the identifier is not a mobile', () => {
    const result = resolveLoginIdentifier({ username: 'admin' });
    assert.equal(result.ok, true);
    assert.equal(result.kind, 'username');
    assert.equal(result.value, 'admin');
  });

  it('converts domestic mobile to Faraz recipient', () => {
    assert.equal(toFarazRecipient('09123456789'), '989123456789');
  });
});
