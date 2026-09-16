import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearAuthSession, setAuthSession } from '../../modules/auth/authSession.js';
import { canEditWholeOrder, canMutateOrders, canEditProfitMargin } from '../../modules/nabz/orderEditPermissions.js';
import { PERMISSIONS } from '../permissions.catalog.js';
import { evaluateStageTransition } from '../../domain/order/orderLifecycle.js';

describe('Order permission vs business rule', () => {
  beforeEach(() => {
    clearAuthSession();
  });

  afterEach(() => {
    clearAuthSession();
  });

  it('without orders:write — write helpers unavailable', () => {
    setAuthSession({
      token: 't',
      username: 'ro',
      user: {
        id: 'u',
        username: 'ro',
        displayName: 'RO',
        roles: [],
        permissions: [PERMISSIONS.ORDERS_READ],
      },
    });
    expect(canMutateOrders()).toBe(false);
    expect(canEditWholeOrder()).toBe(false);
    expect(canEditProfitMargin()).toBe(false);
  });

  it('with orders:write — write helpers available', () => {
    setAuthSession({
      token: 't',
      username: 'rw',
      user: {
        id: 'u',
        username: 'rw',
        displayName: 'RW',
        roles: [],
        permissions: [PERMISSIONS.ORDERS_WRITE],
      },
    });
    expect(canMutateOrders()).toBe(true);
    expect(canEditWholeOrder()).toBe(true);
  });

  it('business-invalid transition still blocked even with write permission', () => {
    setAuthSession({
      token: 't',
      username: 'rw',
      user: {
        id: 'u',
        permissions: [PERMISSIONS.ORDERS_WRITE],
      },
    });
    expect(canMutateOrders()).toBe(true);
    const r = evaluateStageTransition({
      fromStage: 1,
      toStage: 4,
      status: 'current',
      order: {},
    });
    expect(r.ok).toBe(false);
    expect(r.code).toBe('ORDER_PHASE2_COMMITMENT_REQUIRED');
  });
});
