/**
 * Backend tax policy enforcement — re-exports domain SSOT + AppError helpers.
 */
import { appError } from '../../lib/errors.js';
import {
  CANONICAL_VAT_RATE,
  buildQuotationTaxSnapshot,
  validateTaxSnapshotAgainstPolicy,
  isMoghayerSupplyType,
  TAX_RULE_MESSAGES,
} from '../../../../src/domain/order/taxPolicy.js';

export {
  CANONICAL_VAT_RATE,
  buildQuotationTaxSnapshot,
  validateTaxSnapshotAgainstPolicy,
  isMoghayerSupplyType,
  TAX_RULE_MESSAGES,
};

function lineFromPayloadItem(item = {}) {
  const incl = item.sellingPrice
    ?? item.sellingPriceInclVat
    ?? item.quoteFinalUnitPriceRial
    ?? item.quoteSaleUnitPriceRial
    ?? item.unitPrice
    ?? null;
  if (incl == null) return null;
  return {
    sellingPrice: Number(incl),
    sellingPriceInclVat: Number(incl),
    purchasePrice: item.purchasePrice != null
      ? Number(item.purchasePrice)
      : (item.targetUnitPrice != null ? Number(item.targetUnitPrice) : null),
    qty: Number(item.qty ?? 1),
    supplyType: item.supplyType
      || item.inquiries?.find((i) => i.id === item.targetInquiryId)?.supplyType
      || null,
  };
}

/**
 * When payload carries priced lines + quotingSnapshot (or isOfficial/saleType),
 * recompute authoritative snapshot and reject tamper / moghayer-without-rules.
 *
 * @returns {{ snapshot: object|null, payload: object }}
 */
export function assertOrderTaxPolicy(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return { snapshot: null, payload };
  }

  const items = Array.isArray(payload.items) ? payload.items : [];
  const lines = items.map(lineFromPayloadItem).filter(Boolean);
  const hasSnapshot = Boolean(payload.quotingSnapshot || payload.taxSnapshot);
  const hasPricingSignal = lines.length > 0 && (
    hasSnapshot
    || typeof payload.isOfficial === 'boolean'
    || payload.saleType
  );

  if (!hasPricingSignal) {
    return { snapshot: null, payload };
  }

  const supplyTypes = lines.map((l) => l.supplyType).filter(Boolean);
  const built = buildQuotationTaxSnapshot({
    saleType: payload.saleType,
    isOfficial: payload.isOfficial,
    lines,
    vatRate: CANONICAL_VAT_RATE,
    supplyTypes,
  });

  if (!built.ok) {
    const status = built.code === 'TAX_MOGHAYER_UNALLOCATED' ? 422 : 400;
    throw appError(built.code, built.message, status, built.details);
  }

  if (hasSnapshot) {
    const check = validateTaxSnapshotAgainstPolicy(payload, built.snapshot);
    if (!check.ok) {
      throw appError(check.code, check.message, 409, check.details);
    }
  }

  return {
    snapshot: built.snapshot,
    payload: {
      ...payload,
      quotingSnapshot: {
        ...(payload.quotingSnapshot || {}),
        ...built.snapshot,
      },
    },
  };
}

export default { assertOrderTaxPolicy };
