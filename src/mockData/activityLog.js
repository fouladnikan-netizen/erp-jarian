/**
 * Generic entity-agnostic business-event log.
 *
 * No real business-event source is wired into this yet (ORDER_APPROVED,
 * DOCUMENT_OPENED, etc. are owned by their source domains — Nabz/Kanoon —
 * per the Golden Law, and are not projected here). Previously this module
 * shipped hardcoded fake entries; removed per no-fake-data policy.
 * Golden Law: هرگز داده دمو/فیک ساخته نمی‌شود — نبود رکورد یعنی فهرست خالی.
 */
export function getActivitiesForEntity(_entityType, _entityId) {
  return [];
}
