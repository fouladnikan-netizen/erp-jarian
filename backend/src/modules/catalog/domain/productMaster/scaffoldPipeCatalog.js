/**
 * Scaffold pipe (لوله داربست) identity catalog.
 * Live schema: thickness is the only required PRODUCT identity.
 * Size is not bound (operator catalog is always ۱ ۱/۲ اینچ).
 * Length is optional PRODUCT (Type default ۶ m) — not identity, not stored by seed.
 * unitWeight is kg per ۶ m branch (approximate). nicknameKg is commercial alias only.
 */

export const SCAFFOLD_PIPE_TYPE_NAME = 'لوله داربست';
export const SCAFFOLD_PIPE_SIZE_INCH = 1.5;

export const SCAFFOLD_PIPE_ROWS = Object.freeze([
  Object.freeze({ thickness: 2, unitWeight: 13.8, nicknameKg: 14 }),
  Object.freeze({ thickness: 2.3, unitWeight: 15.8, nicknameKg: 16 }),
  Object.freeze({ thickness: 2.5, unitWeight: 17.2, nicknameKg: 17 }),
  Object.freeze({ thickness: 3, unitWeight: 20.5, nicknameKg: 21 }),
]);

export function scaffoldPipeIdentityRows() {
  return SCAFFOLD_PIPE_ROWS;
}

export default {
  SCAFFOLD_PIPE_TYPE_NAME,
  SCAFFOLD_PIPE_SIZE_INCH,
  SCAFFOLD_PIPE_ROWS,
  scaffoldPipeIdentityRows,
};
