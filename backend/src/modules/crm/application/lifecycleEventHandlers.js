/**
 * CRM lifecycle reacts to sales/tasks events instead of being called
 * from those modules after persist.
 */
import { EVENT } from '../../shared/events/eventNames.js';
import { recomputeCustomerLifecycle } from './customerLifecycleService.js';

const COMPANY_SUBJECT = 'COMPANY';

/**
 * @param {{ on: Function }} bus
 * @param {{ recompute?: typeof recomputeCustomerLifecycle }} [deps]
 */
export function registerCrmLifecycleHandlers(bus, deps = {}) {
  const recompute = deps.recompute || recomputeCustomerLifecycle;

  bus.on(EVENT.SALES_ORDER_COMMITTED, async (event) => {
    const p = event.payload || {};
    const companyId = p.companyId;
    if (!companyId) return;
    if (p.trigger === 'order_create' || p.becameSuccess) {
      await recompute(companyId, {
        actorUserId: p.actorUserId,
        trigger: p.becameSuccess ? 'order_successful_purchase' : (p.trigger || 'order_create'),
      });
    }
  });

  bus.on(EVENT.TASKS_ACTIVITY_COMPLETED, async (event) => {
    const p = event.payload || {};
    if (String(p.subjectType || '').toUpperCase() !== COMPANY_SUBJECT) return;
    await recompute(p.subjectId, {
      actorUserId: p.actorUserId,
      trigger: p.trigger || 'activity_complete',
    });
  });
}
