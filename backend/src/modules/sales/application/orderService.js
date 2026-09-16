import { withTransaction } from '../../../db/pool.js';
import { fromZodError, notFoundError, conflictError, validationError } from '../../../lib/errors.js';
import { newEntityId, writeAudit } from '../../../lib/ids.js';
import * as orderRepo from '../infrastructure/orderRepository.js';
import { jsonRecord } from '../../shared/schemas/jsonRecord.js';
import { assertOrderPartyIsCompany } from '../../crm/public/orderParty.js';
import {
  assertOrderLifecycleUpdate,
  assertOrderArchiveAllowed,
  normalizeCreateDefaults,
} from '../domain/order/orderRules.js';
import { z } from 'zod';
import { findCompanyById } from '../../crm/public/subjectReferences.js';
import { assertLegalCustomerHasNationalId } from '../domain/order/nationalIdOrderGate.js';
import { assertCompanyAllowedForOrder } from '../domain/order/supplierOrderGate.js';
import { assertOrderTaxPolicy } from '../domain/order/taxPolicy.js';
import { ORDER_STATUS } from '../domain/order/orderRules.js';
import { collectOrderLineProductRefs } from '../domain/order/orderLineProductRefs.js';
import { EVENT, PRODUCER, notifyDomainEvent } from '../../shared/events/index.js';

/**
 * Fat Order document (entity-cards/order.yaml). Known keys are typed;
 * `.passthrough()` is the documented escape hatch for embedded Nabz phases
 * (gateway / tadarok / rahsepar / saranjam / proforma) that are not columns yet.
 */
const orderPayloadSchema = z.object({
  items: z.array(jsonRecord).optional(),
  closure: z.string().trim().optional(),
  archivedAt: z.union([z.string(), z.null()]).optional(),
  saranjam: jsonRecord.optional(),
  organizationSnapshot: jsonRecord.optional(),
  gatewayDecision: jsonRecord.optional(),
  quotingSnapshot: jsonRecord.optional(),
  taxSnapshot: jsonRecord.optional(),
  saleType: z.string().optional(),
  isOfficial: z.boolean().optional(),
}).passthrough();

const createSchema = z.object({
  code: z.string().trim().min(1).optional(),
  companyId: z.string().trim().min(1).optional().nullable(),
  title: z.string().trim().optional().nullable(),
  stageId: z.union([z.string(), z.number()]).optional(),
  status: z.string().trim().optional(),
  payload: orderPayloadSchema.optional(),
});

const updateSchema = z.object({
  companyId: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  stageId: z.union([z.string(), z.number()]).optional(),
  status: z.string().trim().optional(),
  payload: orderPayloadSchema.optional(),
  /** Required for optimistic concurrency — stale client → 409 VERSION_CONFLICT */
  version: z.number().int().positive(),
});

export async function listOrders(filters = {}) {
  return orderRepo.findMany(filters);
}

export async function getOrder(id, options = {}) {
  const order = await orderRepo.findByIdOrCode(id, options);
  if (!order) {
    throw notFoundError('سفارش یافت نشد.');
  }
  return order;
}

export async function createOrder(body, actorUserId) {
  assertOrderPartyIsCompany(body);

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    throw fromZodError(parsed, 'داده‌های سفارش نامعتبر است.');
  }

  const data = normalizeCreateDefaults(parsed.data);
  const id = newEntityId('ord');

  let createPayload = data.payload;
  if (createPayload) {
    createPayload = assertOrderTaxPolicy(createPayload).payload;
  }

  await withTransaction(async (client) => {
    if (data.companyId) {
      const company = await findCompanyById(data.companyId, {}, client);
      if (!company) {
        throw validationError('شرکت سفارش یافت نشد.', { companyId: ['INVALID'] });
      }
      assertCompanyAllowedForOrder(company);
      assertLegalCustomerHasNationalId(company);
    }

    // DDL-27: omit code → server allocates JR-{Y}{MM}{DD}{NN}. Explicit code is fixtures/tests only.
    const code = data.code || (await orderRepo.nextOrderCode(client));

    await orderRepo.insert({
      id,
      code,
      companyId: data.companyId,
      title: data.title,
      stageId: data.stageId,
      status: data.status,
      payload: createPayload,
      actorUserId,
    }, client);

    await writeAudit({
      actorUserId,
      action: 'order.create',
      entityType: 'order',
      entityId: id,
      detail: { code, stageId: data.stageId, status: data.status },
    }, client);
  });

  const created = await getOrder(id);
  await notifyDomainEvent({
    name: EVENT.SALES_ORDER_COMMITTED,
    producer: PRODUCER.SALES,
    payload: {
      orderId: created.id,
      orderCode: created.code,
      companyId: created.companyId || null,
      status: created.status || null,
      previousStatus: null,
      becameSuccess: false,
      items: collectOrderLineProductRefs(created.payload),
      actorUserId,
      trigger: 'order_create',
    },
  });
  return created;
}

export async function updateOrder(id, body, actorUserId) {
  assertOrderPartyIsCompany(body);

  const row = await orderRepo.findRawActive(id);
  if (!row) {
    throw notFoundError('سفارش یافت نشد.');
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    throw fromZodError(parsed, 'داده‌های سفارش نامعتبر است.');
  }

  const data = parsed.data;
  if (data.version !== row.version) {
    throw conflictError('نسخه سفارش تغییر کرده است. دوباره بارگذاری کنید.', {
      expected: row.version,
      received: data.version,
    });
  }

  // Lifecycle rules BEFORE versioned write (no PATCH backdoor)
  const lifecycle = assertOrderLifecycleUpdate(row, {
    stageId: data.stageId,
    status: data.status,
    payload: data.payload,
  });

  // Always apply lifecycle stage/status/closure payload (DDL-18B).
  const writeData = { ...data };
  writeData.stageId = lifecycle.stageId;
  writeData.status = lifecycle.status;
  if (lifecycle.payload) {
    writeData.payload = lifecycle.payload;
  }

  if (writeData.payload) {
    writeData.payload = assertOrderTaxPolicy(writeData.payload).payload;
  }

  const previousStatus = String(row.status || '').toLowerCase();
  const nextStatus = String(lifecycle.status || writeData.status || '').toLowerCase();
  const becameSuccess = previousStatus !== ORDER_STATUS.SUCCESS
    && nextStatus === ORDER_STATUS.SUCCESS;

  await withTransaction(async (client) => {
    if (writeData.companyId) {
      const company = await findCompanyById(writeData.companyId, {}, client);
      if (!company) {
        throw validationError('شرکت سفارش یافت نشد.', { companyId: ['INVALID'] });
      }
      assertCompanyAllowedForOrder(company);
      assertLegalCustomerHasNationalId(company);
    }

    const affected = await orderRepo.update(row.id, writeData, actorUserId, data.version, client);
    if (affected === 0) {
      throw conflictError('نسخه سفارش تغییر کرده است. دوباره بارگذاری کنید.', {
        expected: data.version,
      });
    }

    await writeAudit({
      actorUserId,
      action: 'order.update',
      entityType: 'order',
      entityId: row.id,
      detail: {
        stageId: writeData.stageId,
        status: writeData.status,
        versionFrom: data.version,
        versionTo: data.version + 1,
      },
    }, client);

    for (const audit of lifecycle.audits) {
      await writeAudit({
        actorUserId,
        action: audit.action,
        entityType: 'order',
        entityId: row.id,
        detail: {
          orderId: row.id,
          from: audit.from,
          to: audit.to,
          actorId: actorUserId,
          version: data.version + 1,
        },
      }, client);
    }
  });

  const updated = await getOrder(row.id);
  await notifyDomainEvent({
    name: EVENT.SALES_ORDER_COMMITTED,
    producer: PRODUCER.SALES,
    payload: {
      orderId: updated.id,
      orderCode: updated.code,
      companyId: updated.companyId || row.company_id || null,
      status: updated.status || null,
      previousStatus,
      becameSuccess,
      items: collectOrderLineProductRefs(updated.payload),
      actorUserId,
      trigger: 'order_update',
    },
  });
  return updated;
}

/** Soft-delete (archive) */
export async function archiveOrder(id, actorUserId) {
  const row = await orderRepo.findRawActive(id);
  if (!row) {
    throw notFoundError('سفارش یافت نشد.');
  }

  assertOrderArchiveAllowed(row);

  await withTransaction(async (client) => {
    await orderRepo.softDelete(row.id, actorUserId, client);
    await writeAudit({
      actorUserId,
      action: 'order.archive',
      entityType: 'order',
      entityId: row.id,
      detail: {
        orderId: row.id,
        stageId: row.stage_id,
        status: row.status,
        actorId: actorUserId,
        version: row.version,
      },
    }, client);
  });

  await notifyDomainEvent({
    name: EVENT.SALES_ORDER_ARCHIVED,
    producer: PRODUCER.SALES,
    payload: {
      orderId: row.id,
      orderCode: row.code,
      companyId: row.company_id || null,
      items: collectOrderLineProductRefs(row.payload),
      actorUserId,
    },
  });

  return { id: row.id, archived: true };
}
