/**
 * Mill-sheet millimetre length (DDL-56 / DDL-61). Display / order-time default
 * only — never Product identity / SKU. PostgreSQL is SoR for the Attribute
 * Definition and Type bindings after seed; this module is the closed rule catalog.
 *
 * Do not write these millimetre values into meter `length`.
 */

import { STEEL_TYPE_OFFER_UNITS, resolveTypeName } from './steelOfferUnits.js';
import { STAINLESS_SHEET_TYPE_NAMES } from './stainlessSheetCatalog.js';

export const SHEET_LENGTH_CODE = 'sheet_length';
export const SHEET_LENGTH_UOM_CODE = 'MM';
export const SHEET_LENGTH_METER_CODE = 'length';
export const SHEET_LENGTH_PHRASE = 'طول';
export const SUPPLY_FORM_CODE = 'supply_form';
export const SUPPLY_FORM_ROLL = 'roll';

export const SHEET_LENGTH_ATTRIBUTE = Object.freeze({
  code: SHEET_LENGTH_CODE,
  skuCode: 'SLEN',
  nameFa: 'طول ورق',
  dataType: 'DECIMAL',
});

export const SHEET_LENGTH_BINDING = Object.freeze({
  isRequired: false,
  valueScope: 'TRANSACTION',
});

export function millSheetTypeNames() {
  const carbon = STEEL_TYPE_OFFER_UNITS
    .filter((row) => row.countUnitFa === 'برگ')
    .map((row) => resolveTypeName(row.typeName));
  return [...carbon, ...STAINLESS_SHEET_TYPE_NAMES];
}

export function isSheetLengthAttribute(definition = {}) {
  return definition.code === SHEET_LENGTH_CODE;
}

export function isRollSupplyForm(value) {
  const v = String(value || '').trim();
  return v === SUPPLY_FORM_ROLL || v === 'رول';
}

/** طول ورق applies to mill / cut sheet, never to رول. */
export function isSheetLengthApplicable(liveByCode = {}) {
  return !isRollSupplyForm(liveByCode.supply_form);
}

export function isSheetLengthPhrase(value) {
  return String(value || '').trim() === SHEET_LENGTH_PHRASE;
}

/**
 * Display overlay: the thickness>40 default is the word «طول», not millimetres.
 */
export function applySheetLengthDisplay({ code, displayValue, unitLabel } = {}) {
  if (code !== SHEET_LENGTH_CODE || !isSheetLengthPhrase(displayValue)) {
    return { displayValue, unitLabel };
  }
  return { displayValue: SHEET_LENGTH_PHRASE, unitLabel: null };
}

/**
 * More-specific mill-sheet rules win. Empty string = no catalog match
 * (caller may fall back to DDL-55 scalar override_default_value).
 */
export function sheetMillLengthDefault({ width, thickness, supplyForm } = {}) {
  if (isRollSupplyForm(supplyForm)) return '';
  const w = Number(width);
  const t = Number(thickness);
  const thick = Number.isFinite(t) ? t : null;

  if (thick !== null && thick > 40) return SHEET_LENGTH_PHRASE;
  if (!Number.isFinite(w)) return '';
  if (w === 1250 && thick !== null && thick > 8) return '6000';
  if (w === 1000) return '2000';
  if (w === 1250) return '2500';
  if (w === 1200 || w === 1500 || w === 2000) return '6000';
  return '';
}

export default {
  SHEET_LENGTH_CODE,
  SHEET_LENGTH_UOM_CODE,
  SHEET_LENGTH_PHRASE,
  SHEET_LENGTH_ATTRIBUTE,
  SHEET_LENGTH_BINDING,
  millSheetTypeNames,
  isSheetLengthAttribute,
  isSheetLengthPhrase,
  isRollSupplyForm,
  isSheetLengthApplicable,
  applySheetLengthDisplay,
  sheetMillLengthDefault,
};
