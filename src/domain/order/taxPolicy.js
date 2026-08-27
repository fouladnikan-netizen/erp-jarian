/**
 * Commercial price + tax display policy.
 *
 * Canonical money facts (only two real prices):
 *   purchasePrice  — cost / market purchase (VAT-inclusive commercial)
 *   sellingPrice   — sale price (VAT-inclusive commercial)
 *
 * Formal vs Informal does NOT change those facts — only selling display:
 *   Informal: displaySellingUnitPrice = sellingPrice
 *   Formal:   displaySellingUnitPrice = round(sellingPrice / 1.1)
 *             VAT (unit) = sellingPrice - displaySellingUnitPrice
 *
 * invoiceUnitPriceExVat / unitExVat are DERIVED display helpers — never SoR.
 *
 * Grand total always equals economic commercial total (qty × sellingPrice).
 * Never add 10% on top of an inclusive sellingPrice (800k → 880k is WRONG).
 *
 * Moghayer: PRODUCT DECISION REQUIRED — MOGHAYER ALLOCATION RULES.
 *
 * Rounding (canonical integer ریال):
 *   Math.round(x)
 *   displaySellingUnitPrice(formal) = round(sellingPrice / 1.1)
 *   economicLine = round(qty × sellingPrice)
 *   lineDisplayEx = round(qty × displaySellingUnitPrice)
 *   vatAmount = economicLine − lineDisplayEx
 *   grandTotal = economicLine
 */

export const CANONICAL_VAT_RATE = 0.1;
export const VAT_MULTIPLIER = 1 + CANONICAL_VAT_RATE;

export const TAX_TREATMENT = Object.freeze({
  FORMAL_EXCLUSIVE_DISPLAY: 'formal_exclusive_display',
  INFORMAL_INCLUSIVE: 'informal_inclusive',
  MOGHAYER: 'moghayer',
});

export const TAX_RULE_MESSAGES = Object.freeze({
  TAX_TAMPER_REJECTED: 'مبالغ مالیات/جمع با سیاست مالیاتی سامانه هم‌خوانی ندارد.',
  TAX_MOGHAYER_UNALLOCATED:
    'PRODUCT DECISION REQUIRED — MOGHAYER ALLOCATION RULES: نوع تأمین مغایرت بدون قاعده تخصیص مالیات.',
  TAX_RATE_INVALID: 'نرخ مالیات معتبر نیست.',
  TAX_AMOUNT_INVALID: 'مبلغ فروش نامعتبر است.',
});

/**
 * @param {number} value
 * @returns {number} integer rial via Math.round
 */
export function roundRial(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

/**
 * Resolve canonical sellingPrice from a line (aliases kept for legacy payloads).
 */
export function resolveSellingPrice(line = {}) {
  const n = Number(
    line.sellingPrice
    ?? line.sellingPriceInclVat
    ?? line.unitInclVat
    ?? line.quoteFinalUnitPriceRial
    ?? line.quoteSaleUnitPriceRial
    ?? line.unitPrice,
  );
  return Number.isFinite(n) ? n : null;
}

/**
 * Resolve canonical purchasePrice from a line / inquiry.
 */
export function resolvePurchasePrice(line = {}) {
  const n = Number(
    line.purchasePrice
    ?? line.costPrice
    ?? line.costPriceInclVat
    ?? line.targetUnitPrice
    ?? line.quotePrice,
  );
  return Number.isFinite(n) ? n : null;
}

/**
 * Formal display transform only — does not invent a third SoR price.
 *
 * @param {{ sellingPrice: number, qty?: number, vatRate?: number }} input
 * @returns display fields; sellingPrice remains the economic truth
 */
export function deriveFormalSellingDisplay({
  sellingPrice,
  qty = 1,
  vatRate = CANONICAL_VAT_RATE,
} = {}) {
  const rate = Number(vatRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    return {
      ok: false,
      code: 'TAX_RATE_INVALID',
      message: TAX_RULE_MESSAGES.TAX_RATE_INVALID,
    };
  }
  const sell = Number(sellingPrice);
  const q = Number(qty);
  if (!Number.isFinite(sell) || sell < 0 || !Number.isFinite(q) || q < 0) {
    return {
      ok: false,
      code: 'TAX_AMOUNT_INVALID',
      message: TAX_RULE_MESSAGES.TAX_AMOUNT_INVALID,
    };
  }

  const displaySellingUnitPrice = roundRial(sell / (1 + rate));
  const economicLine = roundRial(q * sell);
  const lineDisplayEx = roundRial(q * displaySellingUnitPrice);
  const vatAmount = economicLine - lineDisplayEx;

  return {
    ok: true,
    vatRate: rate,
    /** Canonical commercial fact */
    sellingPrice: sell,
    /** @deprecated alias — same as sellingPrice */
    sellingPriceInclVat: sell,
    /** Derived formal display only (not SoR) */
    displaySellingUnitPrice,
    /** @deprecated alias for displaySellingUnitPrice */
    unitExVat: displaySellingUnitPrice,
    invoiceUnitPriceExVat: displaySellingUnitPrice,
    unitInclVat: sell,
    qty: q,
    lineExVat: lineDisplayEx,
    vatAmount,
    economicLine,
    grandTotal: economicLine,
  };
}

/** @deprecated use deriveFormalSellingDisplay */
export function splitInclusiveUnitPrice({
  sellingPriceInclVat,
  sellingPrice,
  qty = 1,
  vatRate = CANONICAL_VAT_RATE,
} = {}) {
  return deriveFormalSellingDisplay({
    sellingPrice: sellingPrice ?? sellingPriceInclVat,
    qty,
    vatRate,
  });
}

/**
 * Formal quotation breakdown from canonical sellingPrice lines.
 */
export function computeFormalTaxFromInclusive(lines = [], vatRate = CANONICAL_VAT_RATE) {
  const built = [];
  let economicSubtotal = 0;
  let exSubtotal = 0;

  for (const line of lines) {
    const sell = resolveSellingPrice(line);
    if (sell == null) {
      return {
        ok: false,
        code: 'TAX_AMOUNT_INVALID',
        message: TAX_RULE_MESSAGES.TAX_AMOUNT_INVALID,
      };
    }
    const split = deriveFormalSellingDisplay({
      sellingPrice: sell,
      qty: line.qty ?? 1,
      vatRate,
    });
    if (!split.ok) return split;
    const purchasePrice = resolvePurchasePrice(line);
    built.push({
      ...line,
      ...split,
      purchasePrice,
      sellingPrice: sell,
    });
    economicSubtotal += split.economicLine;
    exSubtotal += split.lineExVat;
  }

  const vatAmount = economicSubtotal - exSubtotal;
  return {
    ok: true,
    treatment: TAX_TREATMENT.FORMAL_EXCLUSIVE_DISPLAY,
    vatRate,
    lines: built,
    subtotalExVat: exSubtotal,
    vatAmount,
    grandTotal: economicSubtotal,
    economicTotal: economicSubtotal,
  };
}

/**
 * Informal: display = sellingPrice; no separate VAT line; grand = economic.
 */
export function computeInformalTaxFromInclusive(lines = []) {
  const built = [];
  let economicSubtotal = 0;
  for (const line of lines) {
    const sell = resolveSellingPrice(line);
    const q = Number(line.qty ?? 1);
    if (sell == null || sell < 0 || !Number.isFinite(q) || q < 0) {
      return {
        ok: false,
        code: 'TAX_AMOUNT_INVALID',
        message: TAX_RULE_MESSAGES.TAX_AMOUNT_INVALID,
      };
    }
    const economicLine = roundRial(q * sell);
    const purchasePrice = resolvePurchasePrice(line);
    built.push({
      ...line,
      purchasePrice,
      sellingPrice: sell,
      sellingPriceInclVat: sell,
      displaySellingUnitPrice: sell,
      unitInclVat: sell,
      unitExVat: sell,
      invoiceUnitPriceExVat: sell,
      lineExVat: economicLine,
      vatAmount: 0,
      economicLine,
      grandTotal: economicLine,
    });
    economicSubtotal += economicLine;
  }
  return {
    ok: true,
    treatment: TAX_TREATMENT.INFORMAL_INCLUSIVE,
    vatRate: null,
    lines: built,
    subtotalExVat: economicSubtotal,
    vatAmount: 0,
    grandTotal: economicSubtotal,
    economicTotal: economicSubtotal,
  };
}

export function isMoghayerSupplyType(supplyType) {
  const s = String(supplyType || '').trim();
  return s === 'مغایرت' || s.toLowerCase() === 'moghayer';
}

/**
 * @returns {{ ok: true, snapshot: object } | { ok: false, code, message, details? }}
 */
export function buildQuotationTaxSnapshot({
  saleType,
  isOfficial,
  lines = [],
  vatRate = CANONICAL_VAT_RATE,
  supplyTypes = [],
} = {}) {
  if (supplyTypes.some(isMoghayerSupplyType) || lines.some((l) => isMoghayerSupplyType(l.supplyType))) {
    return {
      ok: false,
      code: 'TAX_MOGHAYER_UNALLOCATED',
      message: TAX_RULE_MESSAGES.TAX_MOGHAYER_UNALLOCATED,
      details: { productDecisionRequired: 'MOGHAYER_ALLOCATION_RULES' },
    };
  }

  const sale = String(saleType || '').trim();
  const official = typeof isOfficial === 'boolean'
    ? isOfficial
    : sale === 'رسمی' || sale.toLowerCase() === 'formal' || sale.toLowerCase() === 'official';

  const result = official
    ? computeFormalTaxFromInclusive(lines, vatRate)
    : computeInformalTaxFromInclusive(lines);

  if (!result.ok) return result;

  const snapshot = {
    vatRate: official ? vatRate : null,
    treatment: result.treatment,
    subtotalExVat: result.subtotalExVat,
    vatAmount: result.vatAmount,
    grandTotal: result.grandTotal,
    economicTotal: result.economicTotal,
    amounts: {
      subtotalExVat: result.subtotalExVat,
      vatAmount: result.vatAmount,
      grandTotal: result.grandTotal,
      economicTotal: result.economicTotal,
    },
    lines: result.lines.map((l) => ({
      purchasePrice: l.purchasePrice ?? null,
      sellingPrice: l.sellingPrice,
      /** @deprecated alias */
      sellingPriceInclVat: l.sellingPrice,
      qty: l.qty,
      /** Derived formal display only */
      displaySellingUnitPrice: l.displaySellingUnitPrice ?? l.unitExVat,
      unitExVat: l.unitExVat,
      vatAmount: l.vatAmount,
      economicLine: l.economicLine,
      supplyType: l.supplyType ?? null,
    })),
    roundingRule:
      'Math.round; formal displaySellingUnitPrice=round(sellingPrice/1.1); '
      + 'lineEx=round(qty*display); vat=economicLine-lineEx; grand=economicLine(=qty*sellingPrice)',
    priceModel: 'purchasePrice+sellingPrice SoR; displaySellingUnitPrice derived for formal only',
  };

  return { ok: true, snapshot, formal: official };
}

/**
 * Validate client-supplied tax snapshot / amounts against authoritative recompute.
 */
export function validateTaxSnapshotAgainstPolicy(input = {}, expectedSnapshot) {
  if (!expectedSnapshot) {
    return {
      ok: false,
      code: 'TAX_TAMPER_REJECTED',
      message: TAX_RULE_MESSAGES.TAX_TAMPER_REJECTED,
      details: { reason: 'missing_expected' },
    };
  }

  const client = input.quotingSnapshot || input.taxSnapshot || input;
  if (!client || typeof client !== 'object') {
    return { ok: true, skipped: true, snapshot: expectedSnapshot };
  }

  const mismatches = [];
  if (client.vatRate != null && expectedSnapshot.vatRate != null) {
    if (Number(client.vatRate) !== Number(expectedSnapshot.vatRate)) {
      mismatches.push('vatRate');
    }
  }
  if (client.grandTotal != null
    && roundRial(client.grandTotal) !== roundRial(expectedSnapshot.grandTotal)) {
    mismatches.push('grandTotal');
  }
  if (client.vatAmount != null
    && roundRial(client.vatAmount) !== roundRial(expectedSnapshot.vatAmount)) {
    mismatches.push('vatAmount');
  }
  if (
    client.economicTotal != null
    && client.grandTotal != null
    && roundRial(client.grandTotal) === roundRial(Number(client.economicTotal) * VAT_MULTIPLIER)
    && roundRial(client.economicTotal) === roundRial(expectedSnapshot.economicTotal)
  ) {
    mismatches.push('added_vat_on_inclusive');
  }

  if (mismatches.length) {
    return {
      ok: false,
      code: 'TAX_TAMPER_REJECTED',
      message: TAX_RULE_MESSAGES.TAX_TAMPER_REJECTED,
      details: { mismatches, expected: expectedSnapshot.amounts },
    };
  }

  return { ok: true, snapshot: expectedSnapshot };
}

export default {
  CANONICAL_VAT_RATE,
  VAT_MULTIPLIER,
  TAX_TREATMENT,
  roundRial,
  resolveSellingPrice,
  resolvePurchasePrice,
  deriveFormalSellingDisplay,
  splitInclusiveUnitPrice,
  computeFormalTaxFromInclusive,
  computeInformalTaxFromInclusive,
  buildQuotationTaxSnapshot,
  validateTaxSnapshotAgainstPolicy,
  isMoghayerSupplyType,
  TAX_RULE_MESSAGES,
};
