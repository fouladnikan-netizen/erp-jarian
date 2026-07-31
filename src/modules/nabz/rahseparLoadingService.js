import { CURRENT_USER } from './constants';
import { getTodayJalali, getNowTimeFa, isJalaliDateReached, isValidJalaliDate } from './dateUtils';
import { getFulfilledPurchaseRows } from './shippingService';
import { getQcInspectionForRow } from './qcInspectionConfig';
import { advanceOperationalPhase } from './phase2Service';
import { OPERATIONAL_PHASES } from './phase2Config';

/** Two-phase dispatch states inside one table */
export const LOAD_ITEM_STATUS = {
  PREPARING: 'preparing',
  READY: 'ready',
  LOADING: 'loading',
  DISPATCHED: 'dispatched',
  /** @deprecated alias for READY — kept for older UI imports */
  PENDING: 'ready',
};

export const LOAD_ITEM_STATUS_LABEL = {
  [LOAD_ITEM_STATUS.PREPARING]: 'در حال آماده‌سازی',
  [LOAD_ITEM_STATUS.READY]: 'آماده',
  [LOAD_ITEM_STATUS.LOADING]: 'در حال بارگیری',
  [LOAD_ITEM_STATUS.DISPATCHED]: 'ارسال‌شده',
};

function toKilograms(qty, unit = 'تن') {
  const amount = Number(qty) || 0;
  const normalized = String(unit || '').trim();
  if (normalized === 'کیلوگرم' || normalized === 'kg' || normalized === 'KG') return amount;
  if (normalized === 'تن' || normalized === 'تنه') return amount * 1000;
  return amount;
}

function parsePositiveNumber(value) {
  const raw = String(value ?? '').trim().replace(/,/g, '');
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return num;
}

function resolveLoadItemId(row, index) {
  if (row?.shippingRowKey) return String(row.shippingRowKey);
  if (row?.id) return String(row.id);
  if (row?.qcKey) return String(row.qcKey);
  const voucher = String(row?.warehouseVoucherCode || '').trim();
  if (voucher && voucher !== '—') {
    return `voucher-${voucher}-${row.rowNumber ?? index + 1}`;
  }
  return `load-${row?.rowNumber ?? index + 1}`;
}

function buildItemFromPurchaseRow(order, row, index) {
  const qc = getQcInspectionForRow(order, row);
  const thickness = qc?.thickness || '';
  const dimensions = qc?.dimensions || '';
  const thicknessDims = [thickness, dimensions].filter(Boolean).join(' / ') || '';
  return {
    id: resolveLoadItemId(row, index),
    name: row.name,
    description: row.description || thicknessDims || '',
    unit: row.unit || 'کیلوگرم',
    qty: row.qty ?? null,
    preInvoiceWeightKg: toKilograms(row.qty, row.unit),
    warehouseName: row.warehouseName || '—',
    warehouseVoucherCode: row.warehouseVoucherCode || '—',
    cargoDeliveryTime: row.cargoDeliveryTime || '',
  };
}

/**
 * وضعیت اولیه قبل از تخصیص راننده:
 * — اگر زمان تحویل ثبت شده و هنوز تأیید کاشف نشده → در حال آماده‌سازی
 * — در غیر این صورت (بدون تاریخ / سازگاری دادهٔ قدیمی) → آماده
 */
export function resolveInitialLoadStatus(cargoDeliveryTime, lineState) {
  const explicit = lineState?.status;
  if (
    explicit === LOAD_ITEM_STATUS.READY
    || explicit === LOAD_ITEM_STATUS.LOADING
    || explicit === LOAD_ITEM_STATUS.DISPATCHED
    || explicit === LOAD_ITEM_STATUS.PREPARING
  ) {
    return explicit;
  }
  if (isValidJalaliDate(cargoDeliveryTime)) {
    return LOAD_ITEM_STATUS.PREPARING;
  }
  return LOAD_ITEM_STATUS.READY;
}

export function isAwaitingReadyConfirm(item) {
  if (!item || item.status !== LOAD_ITEM_STATUS.PREPARING) return false;
  return isJalaliDateReached(item.cargoDeliveryTime);
}

export function getLineStates(order) {
  const states = order?.rahsepar?.lineStates;
  return states && typeof states === 'object' ? { ...states } : {};
}

/** Migrate legacy loadingSessions into lineStates when needed */
function buildLegacyLineStates(order) {
  const sessions = order?.rahsepar?.loadingSessions;
  if (!Array.isArray(sessions) || !sessions.length) {
    const manifests = order?.rahsepar?.manifests;
    if (!Array.isArray(manifests) || !manifests.length) return {};
    const map = {};
    manifests.forEach((manifest) => {
      (manifest.lines || []).forEach((line) => {
        if (!line?.id || map[line.id]) return;
        const weight = parsePositiveNumber(line.scaleWeight);
        map[line.id] = {
          status: weight != null ? LOAD_ITEM_STATUS.DISPATCHED : LOAD_ITEM_STATUS.LOADING,
          assignmentId: manifest.id,
          driverName: manifest.driverName || '',
          licensePlate: manifest.licensePlate || '',
          phone: manifest.phone || '',
          scaleWeight: weight,
          loadingFee: parsePositiveNumber(line.loadingFee) ?? null,
          assignedAt: manifest.issuedAt || null,
          dispatchedAt: weight != null ? (manifest.issuedAt || null) : null,
        };
      });
    });
    return map;
  }

  const map = {};
  sessions.forEach((session) => {
    (session.items || []).forEach((item) => {
      if (!item?.id || map[item.id]) return;
      const weight = parsePositiveNumber(item.scaleWeight);
      const hasBatch = parsePositiveNumber(session.actualWeight) != null;
      const isDispatched = weight != null || (hasBatch && session.phase !== 'assigned');
      map[item.id] = {
        status: isDispatched ? LOAD_ITEM_STATUS.DISPATCHED : LOAD_ITEM_STATUS.LOADING,
        assignmentId: session.id,
        driverName: session.driverName || '',
        licensePlate: session.licensePlate || session.vehicle || '',
        phone: session.phone || '',
        scaleWeight: weight ?? (isDispatched ? parsePositiveNumber(session.actualWeight) : null),
        loadingFee: parsePositiveNumber(item.loadingFee) ?? null,
        assignedAt: session.recordedAt || session.assignedAt || null,
        dispatchedAt: isDispatched ? (session.recordedAt || null) : null,
      };
    });
  });
  return map;
}

export function getResolvedLineStates(order) {
  const current = getLineStates(order);
  if (Object.keys(current).length) return current;
  return buildLegacyLineStates(order);
}

/**
 * Unified table rows — Ready / Loading / Preparing / Dispatched.
 * Null weight/fee are safe for Ready & Loading (no crashes).
 */
export function getAllLoadItems(order) {
  const lineStates = getResolvedLineStates(order);
  const rows = getFulfilledPurchaseRows(order).map((row, index) => {
    const base = buildItemFromPurchaseRow(order, row, index);
    const state = lineStates[base.id] || null;
    const status = resolveInitialLoadStatus(base.cargoDeliveryTime, state);
    const deliveryReached = isJalaliDateReached(base.cargoDeliveryTime);
    const awaitingReadyConfirm = status === LOAD_ITEM_STATUS.PREPARING && deliveryReached;

    const scaleWeight = status === LOAD_ITEM_STATUS.DISPATCHED
      ? (parsePositiveNumber(state?.scaleWeight) ?? null)
      : null;
    const loadingFee = status === LOAD_ITEM_STATUS.DISPATCHED
      ? (parsePositiveNumber(state?.loadingFee) ?? null)
      : null;

    return {
      ...base,
      sortIndex: index,
      status,
      deliveryReached,
      awaitingReadyConfirm,
      scaleWeight,
      loadingFee,
      assignment: state ? {
        assignmentId: state.assignmentId || null,
        driverName: state.driverName || '',
        licensePlate: state.licensePlate || '',
        phone: state.phone || '',
        nationalId: state.nationalId || '',
        freightFare: parsePositiveNumber(state.freightFare) ?? null,
        assignedAt: state.assignedAt || null,
        dispatchedAt: state.dispatchedAt || null,
        readyConfirmedAt: state.readyConfirmedAt || null,
        readyConfirmedBy: state.readyConfirmedBy || null,
      } : null,
      // legacy alias used by older expand UI
      dispatch: status === LOAD_ITEM_STATUS.DISPATCHED ? {
        sessionId: state?.assignmentId || null,
        recordedAt: state?.dispatchedAt || state?.assignedAt || '—',
        driverName: state?.driverName || '—',
        licensePlate: state?.licensePlate || '',
        vehicle: state?.licensePlate || '',
        phone: state?.phone || '',
        itemWeight: scaleWeight,
        loadingFee,
        batchWeight: scaleWeight,
        description: '',
      } : null,
    };
  });

  // Keep original catalog order for every state — never rearrange after assign/dispatch.
  return rows.sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0));
}

export function getReadyLoadItems(order) {
  return getAllLoadItems(order).filter((item) => item.status === LOAD_ITEM_STATUS.READY);
}

export function getPreparingLoadItems(order) {
  return getAllLoadItems(order).filter((item) => item.status === LOAD_ITEM_STATUS.PREPARING);
}

export function getAwaitingReadyConfirmItems(order) {
  return getAllLoadItems(order).filter((item) => item.awaitingReadyConfirm);
}

export function getRemainingLoadItems(order) {
  return getAllLoadItems(order).filter(
    (item) => (
      item.status === LOAD_ITEM_STATUS.PREPARING
      || item.status === LOAD_ITEM_STATUS.READY
      || item.status === LOAD_ITEM_STATUS.LOADING
    ),
  );
}

export function getPendingCount(order) {
  return getRemainingLoadItems(order).length;
}

export function getLoadingSessions(order) {
  const list = order?.rahsepar?.loadingSessions;
  return Array.isArray(list) ? list : [];
}

/**
 * کاشف — تأیید آمادگی پس از رسیدن زمان تحویل بار (preparing → ready)
 */
export function confirmItemsReady(order, selectedItemIds = []) {
  const ids = [...new Set((selectedItemIds || []).filter(Boolean).map(String))];
  if (!ids.length) {
    return { accepted: false, reason: 'حداقل یک قلم برای تأیید آمادگی انتخاب کنید.' };
  }

  const awaiting = new Set(getAwaitingReadyConfirmItems(order).map((item) => item.id));
  const invalid = ids.find((id) => !awaiting.has(id));
  if (invalid) {
    return {
      accepted: false,
      reason: 'فقط اقلامی که زمان تحویل آن‌ها فرا رسیده قابل تأیید آمادگی هستند.',
    };
  }

  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const lineStates = getResolvedLineStates(order);
  ids.forEach((id) => {
    lineStates[id] = {
      ...(lineStates[id] || {}),
      status: LOAD_ITEM_STATUS.READY,
      readyConfirmedAt: at,
      readyConfirmedBy: CURRENT_USER,
    };
  });

  const labels = getAllLoadItems(order)
    .filter((item) => ids.includes(item.id))
    .map((item) => item.name)
    .filter(Boolean);

  return {
    accepted: true,
    order: {
      ...order,
      rahsepar: {
        ...(order.rahsepar || {}),
        lineStates,
      },
      events: [
        ...(order.events || []),
        {
          id: Date.now(),
          type: 'rahsepar_ready_confirmed',
          at,
          by: CURRENT_USER,
          summary: `تأیید آمادگی کاشف — ${labels.length ? labels.join('، ') : `${ids.length} قلم`}`,
        },
      ],
    },
  };
}

/**
 * Phase 1 — Assign Driver (Ready → Loading)
 * Weight fields stay null until Phase 2.
 */
export function assignDriverToItems(order, {
  selectedItemIds = [],
  driverName = '',
  licensePlate = '',
  phone = '',
  nationalId = '',
  freightFare = '',
} = {}) {
  const ids = [...new Set((selectedItemIds || []).filter(Boolean).map(String))];
  if (!ids.length) {
    return { accepted: false, reason: 'حداقل یک قلم آماده را انتخاب کنید.' };
  }

  const driver = String(driverName || '').trim();
  const plate = String(licensePlate || '').trim();
  const mobile = String(phone || '').trim();
  const national = String(nationalId || '').trim();
  const fareNum = parsePositiveNumber(freightFare);
  if (!driver || !plate || !mobile || !national) {
    return { accepted: false, reason: 'نام راننده، پلاک، تماس و شماره ملی الزامی است.' };
  }
  if (fareNum == null) {
    return { accepted: false, reason: 'مبلغ کرایه را به‌درستی وارد کنید.' };
  }

  const readyIds = new Set(getReadyLoadItems(order).map((item) => item.id));
  const invalid = ids.find((id) => !readyIds.has(id));
  if (invalid) {
    return { accepted: false, reason: 'فقط اقلام «آماده» قابل تخصیص راننده هستند.' };
  }

  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const assignmentId = `LA-${Date.now()}`;
  const lineStates = getResolvedLineStates(order);
  const itemSnapshots = getAllLoadItems(order)
    .filter((item) => ids.includes(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description || '',
      unit: item.unit,
      qty: item.qty,
      scaleWeight: null,
      loadingFee: null,
    }));

  ids.forEach((id) => {
    lineStates[id] = {
      ...lineStates[id],
      status: LOAD_ITEM_STATUS.LOADING,
      assignmentId,
      driverName: driver,
      licensePlate: plate,
      phone: mobile,
      nationalId: national,
      freightFare: fareNum,
      scaleWeight: null,
      loadingFee: null,
      assignedAt: at,
      dispatchedAt: null,
    };
  });

  const assignment = {
    id: assignmentId,
    phase: 'assigned',
    assignedAt: at,
    recordedAt: at,
    driverName: driver,
    licensePlate: plate,
    vehicle: plate,
    phone: mobile,
    nationalId: national,
    freightFare: fareNum,
    actualWeight: null,
    items: itemSnapshots,
  };

  return {
    accepted: true,
    assignment,
    order: {
      ...order,
      rahsepar: {
        ...(order.rahsepar || {}),
        lineStates,
        loadingSessions: [...getLoadingSessions(order), assignment],
      },
      events: [
        ...(order.events || []),
        {
          id: Date.now(),
          type: 'rahsepar_driver_assigned',
          at,
          by: CURRENT_USER,
          summary: `تخصیص راننده ${driver} — ${ids.length} قلم`,
        },
      ],
    },
  };
}

/**
 * Phase 2 — Register Weight (Loading → Dispatched)
 */
export function registerItemScaleWeight(order, {
  itemId,
  scaleWeight = '',
  loadingFee = '',
} = {}) {
  const id = String(itemId || '');
  if (!id) {
    return { accepted: false, reason: 'قلم نامعتبر است.' };
  }

  const lineStates = getResolvedLineStates(order);
  const current = lineStates[id];
  if (!current || current.status !== LOAD_ITEM_STATUS.LOADING) {
    return { accepted: false, reason: 'فقط اقلام «در حال بارگیری» قابل ثبت باسکول هستند.' };
  }

  return applyScaleWeightUpdate(order, {
    id,
    current,
    scaleWeight,
    loadingFee,
    eventType: 'rahsepar_weight_registered',
    summaryPrefix: 'ثبت باسکول',
    markDispatched: true,
  });
}

/**
 * ویرایش وزن / هزینه بارگیری برای اقلام ارسال‌شده
 */
export function updateItemScaleWeight(order, {
  itemId,
  scaleWeight = '',
  loadingFee = '',
} = {}) {
  const id = String(itemId || '');
  if (!id) {
    return { accepted: false, reason: 'قلم نامعتبر است.' };
  }

  const lineStates = getResolvedLineStates(order);
  const current = lineStates[id];
  if (!current || current.status !== LOAD_ITEM_STATUS.DISPATCHED) {
    return { accepted: false, reason: 'فقط اقلام «ارسال‌شده» قابل ویرایش باسکول هستند.' };
  }

  return applyScaleWeightUpdate(order, {
    id,
    current,
    scaleWeight,
    loadingFee,
    eventType: 'rahsepar_weight_updated',
    summaryPrefix: 'ویرایش باسکول',
    markDispatched: false,
  });
}

function applyScaleWeightUpdate(order, {
  id,
  current,
  scaleWeight,
  loadingFee,
  eventType,
  summaryPrefix,
  markDispatched,
}) {
  const weightNum = parsePositiveNumber(scaleWeight);
  if (weightNum == null) {
    return { accepted: false, reason: 'وزن دقیق باسکول را به‌درستی وارد کنید.' };
  }

  const feeRaw = String(loadingFee ?? '').trim();
  const feeNum = parsePositiveNumber(feeRaw);
  if (feeNum == null) {
    return { accepted: false, reason: 'هزینه بارگیری را به‌درستی وارد کنید.' };
  }

  const sameWeight = parsePositiveNumber(current.scaleWeight) === weightNum;
  const sameFee = parsePositiveNumber(current.loadingFee) === feeNum;
  if (!markDispatched && sameWeight && sameFee) {
    return { accepted: true, order, unchanged: true };
  }

  const at = `${getTodayJalali()} · ${getNowTimeFa()}`;
  const lineStates = getResolvedLineStates(order);
  lineStates[id] = {
    ...current,
    status: LOAD_ITEM_STATUS.DISPATCHED,
    scaleWeight: weightNum,
    loadingFee: feeNum,
    dispatchedAt: current.dispatchedAt || at,
    updatedAt: at,
  };

  const sessions = getLoadingSessions(order).map((session) => {
    if (session.id !== current.assignmentId) return session;
    const items = (session.items || []).map((item) => (
      item.id === id
        ? { ...item, scaleWeight: weightNum, loadingFee: feeNum }
        : item
    ));
    const allDone = items.every((item) => parsePositiveNumber(item.scaleWeight) != null);
    return {
      ...session,
      items,
      actualWeight: allDone
        ? items.reduce((sum, item) => sum + (parsePositiveNumber(item.scaleWeight) || 0), 0)
        : session.actualWeight ?? null,
      phase: allDone ? 'completed' : 'assigned',
    };
  });

  const itemLabel = getAllLoadItems(order).find((item) => item.id === id)?.name || id;

  return {
    accepted: true,
    order: {
      ...order,
      rahsepar: {
        ...(order.rahsepar || {}),
        lineStates,
        loadingSessions: sessions,
        dispatchedItemIds: markDispatched
          ? [
            ...new Set([
              ...(order?.rahsepar?.dispatchedItemIds || []),
              id,
            ]),
          ]
          : (order?.rahsepar?.dispatchedItemIds || []),
      },
      events: [
        ...(order.events || []),
        {
          id: Date.now(),
          type: eventType,
          at,
          by: CURRENT_USER,
          summary: `${summaryPrefix} «${itemLabel}» — ${weightNum.toLocaleString('fa-IR')} کیلوگرم`,
        },
      ],
    },
  };
}

/** @deprecated — use assignDriverToItems + registerItemScaleWeight */
export function recordLoadingSession(order, payload = {}) {
  const assign = assignDriverToItems(order, {
    selectedItemIds: (payload.selectedItems || []).map((item) => item.id),
    driverName: payload.driverName,
    licensePlate: payload.licensePlate || payload.vehicle,
    phone: payload.phone || '—',
  });
  if (!assign.accepted) return assign;
  return assign;
}

export function finalizeRahseparOrder(order) {
  if (getPendingCount(order) > 0) {
    return { accepted: false, reason: 'هنوز اقلام آماده‌سازی / آماده / بارگیری باقی مانده است.' };
  }
  const dispatched = getAllLoadItems(order).filter(
    (item) => item.status === LOAD_ITEM_STATUS.DISPATCHED,
  );
  if (!dispatched.length) {
    return { accepted: false, reason: 'حداقل یک قلم باید ارسال شده باشد.' };
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
