/**
 * Heavy hollow section (پروفیل صنعتی) identity catalog.
 * Operator schema: width_profile + length_profile + thickness are required
 * PRODUCT identity. Length stays TRANSACTION and is not stored on the Product.
 *
 * Union of the mill-common table and the mill-specific extra list.
 */

export const INDUSTRIAL_PROFILE_TYPE_NAME = 'پروفیل صنعتی';

function row(width, height, thickness) {
  return Object.freeze({ width, height, thickness });
}

function keyOf(item) {
  return `${item.width}x${item.height}@${item.thickness}`;
}

/** Common / mill table (list 1). */
export const INDUSTRIAL_PROFILE_MILL_ROWS = Object.freeze([
  row(40, 80, 5), row(50, 100, 5), row(60, 60, 5), row(60, 80, 5),
  row(70, 70, 5), row(80, 80, 5), row(90, 90, 5),
  row(100, 100, 5), row(100, 150, 5), row(100, 180, 5), row(100, 200, 5),
  row(120, 120, 5), row(140, 140, 5), row(150, 150, 5), row(160, 160, 5),
  row(180, 180, 5),

  row(60, 120, 6), row(80, 80, 6), row(90, 90, 6),
  row(100, 100, 6), row(100, 150, 6), row(100, 200, 6),
  row(110, 110, 6), row(120, 120, 6), row(120, 200, 6),
  row(135, 135, 6), row(140, 140, 6), row(150, 150, 6), row(160, 160, 6),
  row(180, 180, 6), row(200, 200, 6),

  row(100, 100, 8), row(100, 150, 8), row(100, 200, 8),
  row(120, 120, 8), row(120, 200, 8),
  row(140, 140, 8), row(150, 150, 8), row(150, 200, 8),
  row(160, 160, 8), row(180, 180, 8), row(200, 200, 8),
  row(220, 220, 8), row(250, 250, 8),

  row(100, 200, 10), row(120, 120, 10), row(120, 200, 10),
  row(140, 140, 10), row(150, 150, 10), row(150, 200, 10),
  row(160, 160, 10), row(180, 180, 10), row(200, 200, 10), row(200, 300, 10),
  row(220, 220, 10), row(250, 250, 10), row(300, 300, 10),
]);

/** Mill-specific extra list (list 2). Overlaps with list 1 are kept here for diff. */
export const INDUSTRIAL_PROFILE_EXTRA_ROWS = Object.freeze([
  row(140, 140, 8), row(140, 140, 10),
  row(160, 160, 8), row(160, 160, 10),
  row(200, 200, 6), row(200, 200, 8), row(200, 200, 10), row(200, 200, 12),
  row(150, 250, 6), row(150, 250, 8), row(150, 250, 10),
  row(260, 260, 5), row(260, 260, 6),
  row(250, 250, 8), row(250, 250, 10), row(250, 250, 12),
  row(300, 300, 8), row(300, 300, 10), row(300, 300, 12), row(300, 300, 15),
  row(180, 300, 5),
  row(220, 300, 6),
  row(200, 300, 8), row(200, 300, 10),
  row(400, 270, 8), row(400, 270, 10), row(400, 270, 12),
  row(400, 200, 6), row(400, 200, 8), row(400, 200, 10), row(400, 200, 12),
  row(400, 400, 8), row(400, 400, 10), row(400, 400, 12), row(400, 400, 15),
]);

function sortRows(rows) {
  return [...rows].sort((a, b) => (
    a.thickness - b.thickness
    || a.width - b.width
    || a.height - b.height
  ));
}

export function industrialProfileListDiff() {
  const millKeys = new Set(INDUSTRIAL_PROFILE_MILL_ROWS.map(keyOf));
  const extraKeys = new Set(INDUSTRIAL_PROFILE_EXTRA_ROWS.map(keyOf));
  return Object.freeze({
    onlyMill: Object.freeze(sortRows(
      INDUSTRIAL_PROFILE_MILL_ROWS.filter((item) => !extraKeys.has(keyOf(item))),
    )),
    onlyExtra: Object.freeze(sortRows(
      INDUSTRIAL_PROFILE_EXTRA_ROWS.filter((item) => !millKeys.has(keyOf(item))),
    )),
    both: Object.freeze(sortRows(
      INDUSTRIAL_PROFILE_MILL_ROWS.filter((item) => extraKeys.has(keyOf(item))),
    )),
  });
}

export const INDUSTRIAL_PROFILE_ROWS = Object.freeze((() => {
  const map = new Map();
  for (const item of [...INDUSTRIAL_PROFILE_MILL_ROWS, ...INDUSTRIAL_PROFILE_EXTRA_ROWS]) {
    map.set(keyOf(item), item);
  }
  return sortRows([...map.values()]);
})());

export function industrialProfileIdentityRows() {
  return INDUSTRIAL_PROFILE_ROWS.map((item) => Object.freeze({
    width: item.width,
    height: item.height,
    thickness: item.thickness,
  }));
}

export default {
  INDUSTRIAL_PROFILE_TYPE_NAME,
  INDUSTRIAL_PROFILE_MILL_ROWS,
  INDUSTRIAL_PROFILE_EXTRA_ROWS,
  INDUSTRIAL_PROFILE_ROWS,
  industrialProfileIdentityRows,
  industrialProfileListDiff,
};
