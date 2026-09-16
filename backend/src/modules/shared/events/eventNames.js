/**
 * Internal domain/application events (in-process).
 * Names are stable contracts — do not rename without updating ARCHITECTURE.md.
 *
 * Kafka / outbox is out of scope until a second process needs the same stream.
 */
export const EVENT = Object.freeze({
  SALES_ORDER_COMMITTED: 'sales.order.committed',
  SALES_ORDER_ARCHIVED: 'sales.order.archived',
  TASKS_ACTIVITY_RECORDED: 'tasks.activity.recorded',
  TASKS_ACTIVITY_COMPLETED: 'tasks.activity.completed',
});

export const PRODUCER = Object.freeze({
  SALES: 'sales',
  TASKS: 'tasks',
});

/**
 * Machine-readable catalog: event → producer → consumers.
 * Tests assert this list so docs and code cannot silently drift.
 */
export const EVENT_CATALOG = Object.freeze([
  {
    name: EVENT.SALES_ORDER_COMMITTED,
    producer: PRODUCER.SALES,
    consumers: ['crm.lifecycle', 'catalog.productUsage'],
    payload: 'orderId, orderCode, companyId, status, previousStatus, becameSuccess, items[], actorUserId, trigger',
  },
  {
    name: EVENT.SALES_ORDER_ARCHIVED,
    producer: PRODUCER.SALES,
    consumers: ['catalog.productUsage'],
    payload: 'orderId, orderCode, companyId, items[], actorUserId',
    notes: 'Archived orders still block product hard-delete (DDL-24n); usage rows are kept.',
  },
  {
    name: EVENT.TASKS_ACTIVITY_RECORDED,
    producer: PRODUCER.TASKS,
    consumers: [],
    payload: 'activityId, subjectType, subjectId, activityType, status, actorUserId, trigger',
    notes: 'Reserved for future CRM/analytics projections; lifecycle reacts to completed only.',
  },
  {
    name: EVENT.TASKS_ACTIVITY_COMPLETED,
    producer: PRODUCER.TASKS,
    consumers: ['crm.lifecycle'],
    payload: 'activityId, subjectType, subjectId, activityType, status, actorUserId, trigger',
  },
]);
