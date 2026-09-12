/**
 * Sales-facing port: recompute Company lifecycle after order facts change.
 * Sales must not import CRM application or infrastructure internals.
 */
export { recomputeCustomerLifecycle } from '../application/customerLifecycleService.js';
