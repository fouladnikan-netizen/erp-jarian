/**
 * Map Nabz fat Order ↔ backend Order DTO (payload JSONB).
 */

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

  return {
    companyId: companyId ?? customerId ?? null,
    title: title || rest.customer?.name || code || null,
    stageId: stageId != null ? String(stageId) : 'inquiry',
    status: status || 'open',
    version,
    payload: {
      ...(payload && typeof payload === 'object' ? payload : {}),
      ...rest,
      customerId: customerId ?? companyId ?? null,
    },
  };
}

export function orderFromApi(row) {
  if (!row) return null;
  const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};
  const customerId = row.companyId ?? payload.customerId ?? payload.companyId ?? null;

  return {
    ...payload,
    id: row.id,
    code: row.code,
    customerId,
    companyId: row.companyId,
    title: row.title,
    stageId: row.stageId,
    status: row.status,
    version: row.version,
    createdAt: row.createdAt || payload.createdAt,
    updatedAt: row.updatedAt || payload.updatedAt,
    items: payload.items || row.items || [],
  };
}
