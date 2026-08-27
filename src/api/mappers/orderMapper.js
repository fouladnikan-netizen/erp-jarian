/**
 * Map Nabz fat Order ↔ backend Order DTO (payload JSONB).
 */
import {
  normalizeStageId,
  normalizeStatus,
  stageIdToStorage,
  ORDER_STATUS,
  STAGE,
} from '../../domain/order/orderLifecycle.js';

export function orderToApi(order) {
  const {
    id,
    code,
    customerId,
    companyId,
    title,
    stageId,
    status,
    version,
    payload,
    ...rest
  } = order;

  const canonicalStage = stageIdToStorage(stageId) || String(STAGE.KAVOSH);
  const canonicalStatus = normalizeStatus(status) || ORDER_STATUS.CURRENT;
  const closure = rest.closure
    || payload?.closure
    || (rest.saranjam?.archivedAt || rest.saranjam?.locked || rest.archivedAt ? 'closed' : 'open');

  return {
    companyId: companyId ?? customerId ?? null,
    title: title || rest.customer?.name || code || null,
    stageId: canonicalStage,
    status: canonicalStatus,
    version,
    payload: {
      ...(payload && typeof payload === 'object' ? payload : {}),
      ...rest,
      customerId: customerId ?? companyId ?? null,
      closure,
    },
  };
}

export function orderFromApi(row) {
  if (!row) return null;
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const customerId = row.companyId ?? payload.customerId ?? payload.companyId ?? null;
  const stageNum = normalizeStageId(row.stageId) ?? STAGE.KAVOSH;
  const status = normalizeStatus(row.status) || ORDER_STATUS.CURRENT;
  const closure = payload.closure
    || (payload.saranjam?.archivedAt || payload.saranjam?.locked || payload.archivedAt
      ? 'closed'
      : 'open');

  return {
    ...payload,
    id: row.id,
    code: row.code,
    customerId,
    companyId: row.companyId,
    title: row.title,
    stageId: stageNum,
    status,
    closure,
    version: row.version,
    createdAt: row.createdAt || payload.createdAt,
    updatedAt: row.updatedAt || payload.updatedAt,
    items: payload.items || row.items || [],
  };
}
