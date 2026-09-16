import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../modules/shared/events/createEventBus.js';
import { createEnvelope } from '../modules/shared/events/envelope.js';
import { EVENT, EVENT_CATALOG, PRODUCER } from '../modules/shared/events/eventNames.js';
import { registerCrmLifecycleHandlers } from '../modules/crm/application/lifecycleEventHandlers.js';
import { registerCatalogProductUsageHandlers } from '../modules/catalog/application/productUsageEventHandler.js';
import { collectOrderLineProductRefs } from '../modules/sales/domain/order/orderLineProductRefs.js';
import { gregorianToJalali } from '../modules/crm/public/calendar.js';
import { assertOrderPartyIsCompany } from '../modules/crm/public/orderParty.js';
import { PRODUCT_SKU_FORMULA, PRODUCT_SKU_POLICY } from '../modules/catalog/domain/productMaster/productIdentityPolicy.js';

describe('Phase 4 internal domain events', () => {
  it('keeps product identity SSOT unchanged', () => {
    assert.equal(PRODUCT_SKU_POLICY, 'DDL-24m');
    assert.equal(PRODUCT_SKU_FORMULA, '{groupSku}-{categorySku}-{typeSku}-{identityValue…}');
    assert.doesNotMatch(PRODUCT_SKU_FORMULA, /GG-CC-TT-VV|GGCCTTVV/);
  });

  it('catalogs typed event names with producer and consumers', () => {
    const names = EVENT_CATALOG.map((row) => row.name);
    assert.deepEqual(names, [
      EVENT.SALES_ORDER_COMMITTED,
      EVENT.SALES_ORDER_ARCHIVED,
      EVENT.TASKS_ACTIVITY_RECORDED,
      EVENT.TASKS_ACTIVITY_COMPLETED,
    ]);
    const committed = EVENT_CATALOG.find((row) => row.name === EVENT.SALES_ORDER_COMMITTED);
    assert.equal(committed.producer, PRODUCER.SALES);
    assert.ok(committed.consumers.includes('crm.lifecycle'));
    assert.ok(committed.consumers.includes('catalog.productUsage'));
    const completed = EVENT_CATALOG.find((row) => row.name === EVENT.TASKS_ACTIVITY_COMPLETED);
    assert.equal(completed.producer, PRODUCER.TASKS);
    assert.ok(completed.consumers.includes('crm.lifecycle'));
  });

  it('rejects unknown event names', () => {
    assert.throws(
      () => createEnvelope({ name: 'kafka.please', producer: 'sales', payload: {} }),
      /DOMAIN_EVENT_UNKNOWN/,
    );
  });

  it('publishes to subscribers and isolates handler failures', async () => {
    const seen = [];
    const errors = [];
    const bus = createEventBus({
      onError(err) { errors.push(err.message); },
    });
    bus.on(EVENT.SALES_ORDER_COMMITTED, async (event) => {
      seen.push(`ok:${event.payload.orderId}`);
    });
    bus.on(EVENT.SALES_ORDER_COMMITTED, async () => {
      throw new Error('boom');
    });
    bus.on(EVENT.SALES_ORDER_COMMITTED, async (event) => {
      seen.push(`late:${event.payload.orderId}`);
    });

    await bus.publish(createEnvelope({
      name: EVENT.SALES_ORDER_COMMITTED,
      producer: PRODUCER.SALES,
      payload: { orderId: 'ord_1' },
    }));

    assert.deepEqual(seen, ['ok:ord_1', 'late:ord_1']);
    assert.deepEqual(errors, ['boom']);
  });

  it('notifies CRM lifecycle on order create / successful purchase / company activity complete', async () => {
    const calls = [];
    const bus = createEventBus();
    registerCrmLifecycleHandlers(bus, {
      recompute: async (companyId, opts) => { calls.push({ companyId, ...opts }); },
    });

    await bus.publish(createEnvelope({
      name: EVENT.SALES_ORDER_COMMITTED,
      producer: PRODUCER.SALES,
      payload: {
        companyId: 'co_1',
        trigger: 'order_create',
        becameSuccess: false,
        actorUserId: 'u1',
      },
    }));
    await bus.publish(createEnvelope({
      name: EVENT.SALES_ORDER_COMMITTED,
      producer: PRODUCER.SALES,
      payload: {
        companyId: 'co_1',
        trigger: 'order_update',
        becameSuccess: false,
        actorUserId: 'u1',
      },
    }));
    await bus.publish(createEnvelope({
      name: EVENT.SALES_ORDER_COMMITTED,
      producer: PRODUCER.SALES,
      payload: {
        companyId: 'co_1',
        trigger: 'order_update',
        becameSuccess: true,
        actorUserId: 'u1',
      },
    }));
    await bus.publish(createEnvelope({
      name: EVENT.TASKS_ACTIVITY_COMPLETED,
      producer: PRODUCER.TASKS,
      payload: {
        subjectType: 'RAW_LEAD',
        subjectId: 'lead_1',
        actorUserId: 'u1',
      },
    }));
    await bus.publish(createEnvelope({
      name: EVENT.TASKS_ACTIVITY_COMPLETED,
      producer: PRODUCER.TASKS,
      payload: {
        subjectType: 'COMPANY',
        subjectId: 'co_1',
        actorUserId: 'u1',
        trigger: 'activity_complete',
      },
    }));

    assert.deepEqual(calls, [
      { companyId: 'co_1', actorUserId: 'u1', trigger: 'order_create' },
      { companyId: 'co_1', actorUserId: 'u1', trigger: 'order_successful_purchase' },
      { companyId: 'co_1', actorUserId: 'u1', trigger: 'activity_complete' },
    ]);
  });

  it('projects order line product refs into the catalog read model', async () => {
    const writes = [];
    const bus = createEventBus();
    registerCatalogProductUsageHandlers(bus, {
      replaceForOrder: async (row) => { writes.push(row); },
    });

    await bus.publish(createEnvelope({
      name: EVENT.SALES_ORDER_COMMITTED,
      producer: PRODUCER.SALES,
      payload: {
        orderId: 'ord_9',
        orderCode: 'JR-5070201',
        items: [{ productId: 'prd_1', sku: 'AA-BB-CC-1' }],
      },
    }));

    assert.equal(writes.length, 1);
    assert.equal(writes[0].orderId, 'ord_9');
    assert.deepEqual(writes[0].items, [{ productId: 'prd_1', sku: 'AA-BB-CC-1' }]);
  });

  it('collects unique product refs from fat order payload items', () => {
    assert.deepEqual(
      collectOrderLineProductRefs({
        items: [
          { productId: 'prd_1', sku: 'S1' },
          { productId: 'prd_1', sku: 'S1' },
          { sku: 'S2' },
          { name: 'no-id' },
        ],
      }),
      [
        { productId: 'prd_1', sku: 'S1' },
        { productId: '', sku: 'S2' },
      ],
    );
  });

  it('exposes Jalali conversion and order-party gate via CRM public ports', () => {
    const j = gregorianToJalali(2026, 9, 16);
    assert.equal(typeof j.year, 'number');
    assert.equal(typeof j.month, 'number');
    assert.equal(typeof j.day, 'number');
    assert.doesNotThrow(() => assertOrderPartyIsCompany({ companyId: 'co_1' }));
    assert.throws(
      () => assertOrderPartyIsCompany({ leadId: 'lead_1' }),
      (err) => err?.code === 'RAW_LEAD_NOT_ELIGIBLE_FOR_ORDER',
    );
  });
});
