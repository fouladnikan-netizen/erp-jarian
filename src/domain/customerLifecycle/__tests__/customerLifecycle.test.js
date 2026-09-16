import { describe, expect, it } from 'vitest';
import {
  CUSTOMER_LIFECYCLE,
  ENGAGEMENT,
  normalizeLifecycleKey,
} from '../lifecycleKeys.js';
import { deriveCustomerLifecycle } from '../evaluateCustomerLifecycle.js';
import { deriveEngagement } from '../evaluateEngagement.js';

describe('customerLifecycle domain', () => {
  it('normalizes Persian lifecycle keys', () => {
    expect(normalizeLifecycleKey('نوپدید')).toBe(CUSTOMER_LIFECYCLE.COLD_LEAD);
    expect(normalizeLifecycleKey('آستانه')).toBe(CUSTOMER_LIFECYCLE.SALES_QUALIFIED);
  });

  it('excludes suppliers', () => {
    const result = deriveCustomerLifecycle({
      entityType: 'SUPPLIER',
      currentLifecycle: CUSTOMER_LIFECYCLE.COLD_LEAD,
    });
    expect(result.skippedReason).toBe('SUPPLIER_EXCLUDED');
    expect(result.lifecycle).toBeNull();
  });

  it('advances cold_lead → pitched on completed catalog', () => {
    const result = deriveCustomerLifecycle({
      currentLifecycle: CUSTOMER_LIFECYCLE.COLD_LEAD,
      activities: [
        { activityType: 'catalog', status: 'COMPLETED', completedAt: '2026-01-01T10:00:00Z' },
      ],
      orders: [],
    });
    expect(result.lifecycle).toBe(CUSTOMER_LIFECYCLE.PITCHED);
  });

  it('advances pitched → nurturing on follow-up after catalog without order', () => {
    const result = deriveCustomerLifecycle({
      currentLifecycle: CUSTOMER_LIFECYCLE.PITCHED,
      activities: [
        { activityType: 'catalog', status: 'COMPLETED', completedAt: '2026-01-01T10:00:00Z' },
        { activityType: 'call', status: 'COMPLETED', completedAt: '2026-01-02T10:00:00Z' },
      ],
      orders: [],
    });
    expect(result.lifecycle).toBe(CUSTOMER_LIFECYCLE.NURTURING);
  });

  it('advances to sales_qualified on first order', () => {
    const result = deriveCustomerLifecycle({
      currentLifecycle: CUSTOMER_LIFECYCLE.NURTURING,
      activities: [
        { activityType: 'catalog', status: 'COMPLETED', completedAt: '2026-01-01T10:00:00Z' },
        { activityType: 'call', status: 'COMPLETED', completedAt: '2026-01-02T10:00:00Z' },
      ],
      orders: [{ id: 'ord_1', createdAt: '2026-01-03T10:00:00Z' }],
    });
    expect(result.lifecycle).toBe(CUSTOMER_LIFECYCLE.SALES_QUALIFIED);
  });

  it('1–2 successful purchases → نوپیمان; 3+ → هم‌پیمان (DDL-18B)', () => {
    const one = deriveCustomerLifecycle({
      currentLifecycle: CUSTOMER_LIFECYCLE.SALES_QUALIFIED,
      activities: [],
      orders: [
        { id: 'o1', createdAt: '2026-01-01T00:00:00Z', status: 'success' },
      ],
    });
    expect(one.lifecycle).toBe(CUSTOMER_LIFECYCLE.FIRST_TIME_BUYER);

    const two = deriveCustomerLifecycle({
      currentLifecycle: CUSTOMER_LIFECYCLE.SALES_QUALIFIED,
      activities: [],
      orders: [
        { id: 'o1', createdAt: '2026-01-01T00:00:00Z', status: 'success' },
        { id: 'o2', createdAt: '2026-01-02T00:00:00Z', status: 'success' },
      ],
    });
    expect(two.lifecycle).toBe(CUSTOMER_LIFECYCLE.FIRST_TIME_BUYER);

    const three = deriveCustomerLifecycle({
      currentLifecycle: CUSTOMER_LIFECYCLE.SALES_QUALIFIED,
      activities: [],
      orders: [
        { id: 'o1', createdAt: '2026-01-01T00:00:00Z', status: 'success' },
        { id: 'o2', createdAt: '2026-01-02T00:00:00Z', status: 'success' },
        { id: 'o3', createdAt: '2026-01-03T00:00:00Z', status: 'success' },
      ],
    });
    expect(three.lifecycle).toBe(CUSTOMER_LIFECYCLE.LOYAL);
  });

  it('does not treat CURRENT phase-2 orders as successful purchase', () => {
    const result = deriveCustomerLifecycle({
      currentLifecycle: CUSTOMER_LIFECYCLE.SALES_QUALIFIED,
      activities: [],
      orders: [
        { id: 'o1', createdAt: '2026-01-01T00:00:00Z', status: 'current' },
      ],
    });
    expect(result.lifecycle).toBe(CUSTOMER_LIFECYCLE.SALES_QUALIFIED);
  });

  it('marks forgotten after 30d inactivity in early stages', () => {
    const result = deriveEngagement({
      lifecycle: CUSTOMER_LIFECYCLE.NURTURING,
      lastActivityAt: '2026-01-01T00:00:00Z',
      now: '2026-02-10T00:00:00Z',
    });
    expect(result.engagement).toBe(ENGAGEMENT.FORGOTTEN);
  });

  it('reactivates forgotten to normal when recent activity', () => {
    const result = deriveEngagement({
      lifecycle: CUSTOMER_LIFECYCLE.NURTURING,
      lastActivityAt: '2026-02-09T00:00:00Z',
      now: '2026-02-10T00:00:00Z',
    });
    expect(result.engagement).toBe(ENGAGEMENT.NORMAL);
  });

  it('marks shadow after 90d without order in late stages', () => {
    const result = deriveEngagement({
      lifecycle: CUSTOMER_LIFECYCLE.SALES_QUALIFIED,
      lastOrderAt: '2025-10-01T00:00:00Z',
      now: '2026-02-01T00:00:00Z',
    });
    expect(result.engagement).toBe(ENGAGEMENT.SHADOW);
  });
});
