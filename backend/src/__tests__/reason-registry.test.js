import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GATEWAY_CANCEL_REASONS,
  LEAD_REJECT_REASONS,
  REASON_SCOPES,
  getCancelReasonLabel,
  listReasons,
} from '../modules/settings/domain/reasonRegistry.js';

describe('settings reasonRegistry', () => {
  it('lists gateway cancel codes used by Nabz', () => {
    assert.deepEqual(
      GATEWAY_CANCEL_REASONS.map((r) => r.value),
      ['high_price', 'late_supply', 'customer_withdraw', 'other'],
    );
    assert.equal(getCancelReasonLabel('late_supply'), 'عدم تامین به‌موقع کالا');
    assert.equal(getCancelReasonLabel('unknown-code'), 'unknown-code');
  });

  it('scopes lead reject separately from gateway cancel', () => {
    const lead = listReasons(REASON_SCOPES.LEAD_REJECT);
    assert.equal(lead, LEAD_REJECT_REASONS);
    assert.ok(lead.every((r) => r.scope === REASON_SCOPES.LEAD_REJECT));
  });
});
