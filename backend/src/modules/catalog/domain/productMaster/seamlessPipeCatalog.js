/**
 * Seamless pipe (لوله مانیسمان) identity catalog.
 * Live schema: size_pipe + sch (رده) are required PRODUCT identity.
 * Shared `size` and `thickness` bindings stay inactive — mill wall is catalog
 * metadata only and is not stored on the Product.
 * Length stays TRANSACTION. Steel grade reuses the shared mill ENUM `grade`
 * (do not fork grade_pipe) with a Type subset — TRANSACTION, not identity.
 * unitWeight is kg per ۶ m branch (DDL-47), not identity.
 *
 * Size is the nominal inch (DECIMAL) on size_pipe. Schedule (`sch` / رده)
 * is a required PRODUCT ENUM (10, 20, STD, 40S, …), not a number.
 * Pairs are closed mill combinations (operator 2026-09-08), not a cartesian
 * of every size×schedule.
 */

export const SEAMLESS_PIPE_TYPE_NAME = 'لوله مانیسمان';

function row(size, sch, thickness, unitWeight) {
  return Object.freeze({ size, sch, thickness, unitWeight });
}

export const SEAMLESS_PIPE_ROWS = Object.freeze([
  row(0.5, 20, 2.5, 6.95),
  row(0.75, 20, 2.5, 9.03),
  row(1, 20, 2.77, 11.85),
  row(1.25, 20, 2.77, 15.82),
  row(1.5, 20, 2.77, 18.65),
  row(2, 20, 2.77, 23.71),
  row(2.5, 20, 3.4, 34.9),
  row(3, 20, 3.96, 49.8),
  row(4, 20, 4.78, 76.5),
  row(5, 20, 5.16, 104),
  row(6, 20, 5.16, 125.2),
  row(8, 20, 6.35, 200),
  row(10, 20, 6.35, 253),
  row(12, 20, 6.35, 302),
  row(14, 20, 7.92, 417),
  row(16, 20, 7.92, 478),
  row(18, 20, 7.92, 540),
  row(20, 20, 9.53, 716),
  row(24, 20, 9.53, 862),
  row(0.5, 40, 2.77, 7.62),
  row(0.75, 40, 2.87, 10.14),
  row(1, 40, 3.38, 15),
  row(1.25, 40, 3.56, 20.34),
  row(1.5, 40, 3.68, 24.3),
  row(2, 40, 3.91, 32.58),
  row(2.5, 40, 5.16, 51.84),
  row(3, 40, 5.49, 67.86),
  row(4, 40, 6.02, 96.3),
  row(5, 40, 6.55, 130.5),
  row(6, 40, 7.11, 169.5),
  row(8, 40, 8.18, 255.3),
  row(10, 40, 9.27, 364.2),
  row(12, 40, 10.31, 493.8),
  row(14, 40, 11.13, 579),
  row(16, 40, 12.7, 762),
  row(18, 40, 14.27, 965),
  row(20, 40, 15.09, 1117),
  row(24, 40, 17.48, 1540),
  row(0.5, 80, 3.73, 9.72),
  row(0.75, 80, 3.91, 13.2),
  row(1, 80, 4.55, 19.44),
  row(1.25, 80, 4.85, 26.52),
  row(1.5, 80, 5.08, 32.52),
  row(2, 80, 5.54, 44.04),
  row(2.5, 80, 7.01, 68.22),
  row(3, 80, 7.62, 91.32),
  row(4, 80, 8.56, 132.42),
  row(5, 80, 9.52, 183),
  row(6, 80, 10.97, 251),
  row(8, 80, 12.7, 384),
  row(10, 80, 15.09, 573),
  row(12, 80, 17.48, 800),
  row(14, 80, 19.05, 965),
  row(16, 80, 21.44, 1246),
  row(18, 80, 23.83, 1565),
  row(20, 80, 26.19, 1895),
  row(24, 80, 30.96, 2672),
]);

export function seamlessPipeIdentityRows() {
  return SEAMLESS_PIPE_ROWS;
}

/** Type subset on لوله مانیسمان. Values are appended to the shared `grade` ENUM. */
export const SEAMLESS_PIPE_GRADE_VALUES = Object.freeze([
  'ST37.2',
  'ST52',
  'ASTM A53 GR.B',
  'ASTM A106 GR.B',
  'API 5L GR.X42',
  'API 5L GR.X52',
  'API 5L GR.X60',
  'API 5L GR.X65',
  'API 5L GR.X70',
  'ASTM A312',
  'ASTM A333 GR.6',
  'ASTM A335 P11',
  'ASTM A335 P22',
]);

export const SEAMLESS_PIPE_GRADE_OPTIONS = Object.freeze(
  SEAMLESS_PIPE_GRADE_VALUES.map((value) => Object.freeze({ value, labelFa: value })),
);

export const SEAMLESS_PIPE_GRADE_BINDING = Object.freeze({
  isRequired: false,
  valueScope: 'TRANSACTION',
  sortOrder: 40,
  overrideAllowedValues: SEAMLESS_PIPE_GRADE_VALUES,
});

/** ASME/NPS schedule labels on لوله مانیسمان (shared `sch` ENUM). */
export const SEAMLESS_PIPE_SCH_VALUES = Object.freeze([
  '10',
  '20',
  '30',
  '40',
  '60',
  '80',
  '100',
  '120',
  '140',
  '160',
  'STD',
  'XS',
  'XXS',
  '5S',
  '10S',
  '40S',
  '80S',
]);

export const SEAMLESS_PIPE_SCH_OPTIONS = Object.freeze(
  SEAMLESS_PIPE_SCH_VALUES.map((value) => Object.freeze({ value, labelFa: value })),
);

export default {
  SEAMLESS_PIPE_TYPE_NAME,
  SEAMLESS_PIPE_ROWS,
  seamlessPipeIdentityRows,
  SEAMLESS_PIPE_GRADE_VALUES,
  SEAMLESS_PIPE_GRADE_OPTIONS,
  SEAMLESS_PIPE_GRADE_BINDING,
  SEAMLESS_PIPE_SCH_VALUES,
  SEAMLESS_PIPE_SCH_OPTIONS,
};
