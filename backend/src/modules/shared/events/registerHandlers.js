/**
 * In-process composition root for domain event consumers.
 * Shared kernel owns the bus; modules own handlers. This file only wires them.
 */
import { registerCrmLifecycleHandlers } from '../../crm/application/lifecycleEventHandlers.js';
import { registerCatalogProductUsageHandlers } from '../../catalog/application/productUsageEventHandler.js';

export function registerDomainEventHandlers(bus) {
  registerCrmLifecycleHandlers(bus);
  registerCatalogProductUsageHandlers(bus);
  return bus;
}
