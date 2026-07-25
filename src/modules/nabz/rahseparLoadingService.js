import { CURRENT_USER } from './constants';
import { getTodayJalali, getNowTimeFa } from './dateUtils';
import { getFulfilledPurchaseRows } from './shippingService';
import { getQcInspectionForRow, getQcRowKey } from './qcInspectionConfig';
import { advanceOperationalPhase } from './phase2Service';
import { OPERATIONAL_PHASES } from './phase2Config';

export const LOAD_ITEM_STATUS = {
  PENDING: 'pending',
  DISPATCHED: 'dispatched',
};

function toKilograms(qty, unit = 'تن') {
  const amount = Number(qty) || 0;
  const normalized = String(unit || '').trim();
  if (normalized === 'کیلوگرم' || normalized === 'kg' || normalized === 'KG') return amount;
  if (normalized === 'تن' || normalized === 'تنه') return amount * 1000;
  return amount;
}

function parsePositiveWeight(value) {
  const raw = String(value ?? '').trim();
  const num = Number(String(raw).replace(/,/g, ''));
  if (!raw || !Number.isFinite(num) || num <= 0) return null;
  return num;
}

/** جلسات بارگیری ثبت‌شده */
export function getLoadingSessions(order) {
  const sessions = order?.rahsepar?.loadingSessions;
  if (Array.isArray(sessions)) return sessions;

  const legacy = order?.rahsepar?.manifests;
  if (!Array.isArray(legacy)) return [];
  return legacy.map((manifest) => ({
    id: manifest.id,
    recordedAt: manifest.issuedAt || '—',
    driverName: manifest.driverName || '—',
    licensePlate: manifest.licensePlate || '',
    vehicle: manifest.licensePlate || '',
    actualWeight: (manifest.lines || []).reduce(
      (sum, line) => sum + (Number(line.scaleWeight) || 0),
      0,
    ),
    description: '',
    items: (manifest.lines || []).map((line) => ({
      id: line.id,
      name: line.name,
      unit: line.unit,
      preInvoiceWeightKg: line.preInvoiceWeightKg,
      scaleWeight: line.scaleWeight,
    })),
  }));
}

export function getDispatchedItemIds(order) {
  const fromSessions = getLoadingSessions(order).flatMap(
    (session) => (session.items || []).map((item) => item.id),
  );
  const explicit = order?.rahsepar?.dispatchedItemIds;
  if (Array.isArray(explicit) && explicit.length) {
    return [...new Set([...explicit, ...fromSessions])];
  }
  return [...new Set(fromSessions)];
}

/** نقشه itemId → جلسه بارگیری */
export function getDispatchSessionByItemId(order) {
  const map = new Map();
  getLoadingSessions(order).forEach((session) => {
    (session.items || []).forEach((item) => {
      if (item?.id && !map.has(item.id)) {
        map.set(item.id, { session, itemSnapshot: item });
      }
    });
  });
  return map;
}

function buildItemFromPurchaseRow(order, row) {
  const qc = getQcInspectionForRow(order, row);
  const thickness = qc?.thickness || '';
  const dimensions = qc?.dimensions || '';
  const thicknessDims = [thickness, dimensions].filter(Boolean).join(' / ') || '';
  return {
    id: getQcRowKey(row),
    name: row.name,
    description: row.description || thicknessDims || '',
    unit: row.unit || 'کیلوگرم',
    qty: row.qty,
    preInvoiceWeightKg: toKilograms(row.qty, row.unit),
  };
}

/** همه اقلام سفارش با وضعیت pending / dispatched + جزئیات بارگیری */
export function getAllLoadItems(order) {
  const dispatchMap = getDispatchSessionByItemId(order);
  return getFulfilledPurchaseRows(order).map((row) => {
    const base = buildItemFromPurchaseRow(order, row);
    const hit = dispatchMap.get(base.id);
    if (!hit) {
      return {
        ...base,
        status: LOAD_ITEM_STATUS.PENDING,
        dispatch: null,
      };
    }
    const { session, itemSnapshot } = hit;
    return {
      ...base,
      status: LOAD_ITEM_STATUS.DISPATCHED,
      scaleWeight: itemSnapshot?.scaleWeight ?? null,
      dispatch: {
        sessionId: session.id,
        recordedAt: session.recordedAt,
        driverName: session.driverName,
        licensePlate: session.licensePlate || session.vehicle || '',
        vehicle: session.vehicle || session.licensePlate || '',
        batchWeight: session.actualWeight,
        itemWeight: itemSnapshot?.scaleWeight ?? session.actualWeight,
        description: session.description || '',
      },
    };
  });
}

export function getRemainingLoadItems(order) {
  return getAllLoadItems(order).filter((item) => item.status === LOAD_ITEM_STATUS.PENDING);
}

export function getPendingCount(order) {
  return getRemainingLoadItems(order).length;
}

/**
 * ثبت نوبت بارگیری برای اقلام انتخاب‌شده (هنوز pending)
 * وزن باسکول هر قلم از جدول؛ راننده / وسیله / وزن نوبت از مودال
 */
export function recordLoadingSession(order, {
  selectedItems = [],
  driverName = '',
  licensePlate = '',
  vehicle = '',
  batchWeight = '',
  description = '',
} = {}) {
  const items = (selectedItems || []).filter(Boolean);
  if (!items.length) {
    return { accepted: false, reason: 'حداقل یک قلم را انتخاب کنید.' };
  }

  const driver = String(driverName || '').trim();
  const plate = String(licensePlate || vehicle || '').trim();
  if (!driver || !plate) {
    return { accepted: false, reason: 'نام راننده و مشخصات وسیله/پلاک الزامی است.' };
  }

  const batchWeightNum = parsePositiveWeight(batchWeight);
  if (batchWeightNum == null) {
    return { accepted: false, reason: 'وزن نوبت بارگیری را به‌درستی وارد کنید.' };
  }

  const normalizedItems = [];
  for (const item of items) {
    const scaleWeight = parsePositiveWeight(item.scaleWeight);
    if (scaleWeight == null) {
      return {
        accepted: false,
        reason: `وزن باسکول «${item.name || 'قلم'}» را در جدول وارد کنید.`,
      };
    }
    normalizedItems.push({ ...item, scaleWeight });
  }

  const pendingIds = new Set(getRemainingLoadItems(order).map((item) => item.id));
  const invalid = normalizedItems.find((item) => !pendingIds.has(item.id));
  if (invalid) {
    return { accepted: false, reason: 'یکی از اقلام انتخاب‌شده قبلاً ارسال شده است.' };
  }

  const existing = getLoadingSessions(order);
  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const session = {
    id: `LS-${Date.now()}`,
    recordedAt: at,
    driverName: driver,
    licensePlate: plate,
    vehicle: plate,
    actualWeight: batchWeightNum,
    description: String(description || '').trim(),
    items: normalizedItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      unit: item.unit,
      qty: item.qty,
      preInvoiceWeightKg: item.preInvoiceWeightKg,
      scaleWeight: item.scaleWeight,
    })),
  };

  const dispatchedItemIds = [
    ...getDispatchedItemIds(order),
    ...normalizedItems.map((item) => item.id),
  ];

  return {
    accepted: true,
    session,
    order: {
      ...order,
      rahsepar: {
        ...(order.rahsepar || {}),
        loadingSessions: [...existing, session],
        dispatchedItemIds: [...new Set(dispatchedItemIds)],
      },
      events: [
        ...(order.events || []),
        {
          id: Date.now(),
          type: 'rahsepar_loading_recorded',
          at,
          by: CURRENT_USER,
          summary: `ارسال انتخاب‌شده — ${normalizedItems.length} قلم — راننده ${driver} — وزن ${batchWeightNum.toLocaleString('fa-IR')}`,
        },
      ],
    },
  };
}

export function finalizeRahseparOrder(order) {
  if (getPendingCount(order) > 0) {
    return { accepted: false, reason: 'هنوز اقلام در انتظار ارسال باقی مانده است.' };
  }
  if (!getLoadingSessions(order).length) {
    return { accepted: false, reason: 'حداقل یک نوبت ارسال باید ثبت شده باشد.' };
  }

  const result = advanceOperationalPhase(order, OPERATIONAL_PHASES.SARANJAM);
  if (!result.accepted) return result;

  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  return {
    accepted: true,
    order: {
      ...result.order,
      rahsepar: {
        ...(result.order.rahsepar || {}),
        finalized: true,
        finalizedAt: at,
        finalizedBy: CURRENT_USER,
      },
      events: [
        ...(result.order.events || []),
        {
          id: Date.now() + 1,
          type: 'rahsepar_finalized',
          at,
          by: CURRENT_USER,
          summary: 'نهایی‌سازی سفارش در رهسپار و انتقال به سرانجام',
        },
      ],
    },
  };
}
