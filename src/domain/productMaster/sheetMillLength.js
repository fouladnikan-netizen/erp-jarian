/**
 * Mill-sheet millimetre length (DDL-56 / DDL-61). FE mirror of
 * backend/src/domain/productMaster/sheetMillLength.js — Postgres is SoR.
 * Preview + order-line preselect only; never Product identity / SKU.
 */

export const SHEET_LENGTH_CODE = 'sheet_length';
export const SHEET_LENGTH_PHRASE = 'طول';
export const SUPPLY_FORM_CODE = 'supply_form';
export const SUPPLY_FORM_ROLL = 'roll';

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
