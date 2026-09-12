/**
 * Perforated sheet (ورق پانچ) identity catalog.
 * Operator schema: width + thickness + mesh_size (چشمه) are required PRODUCT identity.
 * Length stays TRANSACTION and is not stored on the Product.
 *
 * Size matrix (operator 2026-09-08): only ۲ میل، چشمه ۶، عرض ۱۰۰۰.
 */

export const PUNCHED_SHEET_TYPE_NAME = 'ورق پانچ';

export const PUNCHED_SHEET_THICKNESS = 2;
export const PUNCHED_SHEET_MESH_SIZE = 6;
export const PUNCHED_SHEET_WIDTH = 1000;

export function punchedSheetIdentityRows() {
  return Object.freeze([
    Object.freeze({
      thickness: PUNCHED_SHEET_THICKNESS,
      meshSize: PUNCHED_SHEET_MESH_SIZE,
      width: PUNCHED_SHEET_WIDTH,
    }),
  ]);
}

export default {
  PUNCHED_SHEET_TYPE_NAME,
  PUNCHED_SHEET_THICKNESS,
  PUNCHED_SHEET_MESH_SIZE,
  PUNCHED_SHEET_WIDTH,
  punchedSheetIdentityRows,
};
