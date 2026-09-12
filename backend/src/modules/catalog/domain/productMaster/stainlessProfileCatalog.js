/**
 * Stainless square/rectangular tube (پروفیل استیل) identity catalog.
 * Aligns with carbon-steel پروفیل (قوطی مربع/مستطیل): width_profile +
 * length_profile + thickness are required PRODUCT identity. Grade lives in
 * the Product Type name — never a Product/SKU attribute. Length is
 * TRANSACTION (optional Type default 6 m) and is not stored on Product.
 *
 * Sides are always persisted smaller-first (۲۰×۴۰, never ۴۰×۲۰). Closed mill
 * pairs only — not a free size×thickness cartesian.
 * Square 15 + rectangle 15 = 30 SKUs per Type (operator 2+2+2+2+2+1+1+1+1+1
 * table sums to 15 rectangles, not 16).
 */

export const STAINLESS_PROFILE_GROUP_NAME = 'استنلس استیل';
export const STAINLESS_PROFILE_CATEGORY_NAME = 'پروفیل استیل';
export const STAINLESS_PROFILE_DEFAULT_LENGTH_M = '6';

export const STAINLESS_PROFILE_TYPE_NAMES = Object.freeze([
  'پروفیل استیل ۳۰۴',
  'پروفیل استیل ۳۱۶',
]);

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Fold yeh/kaf, Persian digits, and a trailing L so live 304L matches ۳۰۴. */
export function foldStainlessProfileTypeName(name) {
  const folded = [...String(name || '')]
    .map((ch) => {
      if (ch === 'ي') return 'ی';
      if (ch === 'ك') return 'ک';
      const digit = PERSIAN_DIGITS.indexOf(ch);
      return digit >= 0 ? String(digit) : ch;
    })
    .join('')
    .replace(/[\u200c\u200d]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return folded.replace(/(\d)L$/i, '$1');
}

export function matchStainlessProfileTypeName(liveName, catalogName) {
  return foldStainlessProfileTypeName(liveName) === foldStainlessProfileTypeName(catalogName);
}

/** Smaller side first. 40×20 becomes [20, 40]. */
export function canonicalSides(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error('canonicalSides requires numeric sides');
  }
  return Object.freeze(x <= y ? [x, y] : [y, x]);
}

export function stainlessProfileCatalogKey(width, height, thickness) {
  const [w, h] = canonicalSides(width, height);
  return `${w}x${h}@${Number(thickness)}`;
}

function spec(width, height, thicknesses) {
  const [w, h] = canonicalSides(width, height);
  return Object.freeze({
    width: w,
    height: h,
    thicknesses: Object.freeze([...thicknesses]),
  });
}

function expandSpecs(specs) {
  const rows = [];
  const seen = new Set();
  for (const item of specs) {
    const [width, height] = canonicalSides(item.width, item.height);
    for (const thickness of item.thicknesses) {
      const key = stainlessProfileCatalogKey(width, height, thickness);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(Object.freeze({ width, height, thickness: Number(thickness) }));
    }
  }
  return Object.freeze(rows);
}

/** Square (مربع) closed mill pairs. */
export const STAINLESS_PROFILE_SQUARE_SPECS = Object.freeze([
  spec(20, 20, [1, 1.5, 2]),
  spec(25, 25, [1, 1.5, 2]),
  spec(30, 30, [1.5, 2]),
  spec(40, 40, [1.5, 2]),
  spec(50, 50, [1.5, 2]),
  spec(60, 60, [2]),
  spec(80, 80, [2]),
  spec(100, 100, [2]),
]);

/** Rectangle (مستطیل) closed mill pairs — already smaller-first. */
export const STAINLESS_PROFILE_RECTANGLE_SPECS = Object.freeze([
  spec(10, 20, [1, 1.5]),
  spec(20, 30, [1.5, 2]),
  spec(20, 40, [1.5, 2]),
  spec(30, 40, [1.5, 2]),
  spec(30, 50, [1.5, 2]),
  spec(30, 60, [2]),
  spec(40, 60, [2]),
  spec(40, 80, [2]),
  spec(50, 100, [2]),
  spec(60, 120, [2]),
]);

export const STAINLESS_PROFILE_SQUARE_ROWS = expandSpecs(STAINLESS_PROFILE_SQUARE_SPECS);
export const STAINLESS_PROFILE_RECTANGLE_ROWS = expandSpecs(STAINLESS_PROFILE_RECTANGLE_SPECS);
export const STAINLESS_PROFILE_ROWS = Object.freeze([
  ...STAINLESS_PROFILE_SQUARE_ROWS,
  ...STAINLESS_PROFILE_RECTANGLE_ROWS,
]);

export function stainlessProfileIdentityRows(_typeName) {
  return STAINLESS_PROFILE_ROWS.map((item) => Object.freeze({
    width: item.width,
    height: item.height,
    thickness: item.thickness,
  }));
}

/** Same token shape as live carbon پروفیل: width × height ضخامت t میل شاخه 6 متری. */
export function stainlessProfileDisplayNameRule({
  widthId,
  heightId,
  thicknessId,
  lengthId,
} = {}) {
  return {
    separator: ' ',
    tokens: [
      { sourceType: 'type', includeLabel: false },
      widthId
        ? { sourceType: 'attribute', attributeId: widthId, includeLabel: false, includeUnit: false }
        : null,
      { sourceType: 'literal', literalId: 'times' },
      heightId
        ? { sourceType: 'attribute', attributeId: heightId, includeLabel: false, includeUnit: false }
        : null,
      thicknessId
        ? { sourceType: 'attribute', attributeId: thicknessId, includeLabel: true, includeUnit: true }
        : null,
      { sourceType: 'literal', literalId: 'branch' },
      lengthId
        ? { sourceType: 'attribute', attributeId: lengthId, includeLabel: false, includeUnit: true }
        : null,
    ].filter(Boolean),
  };
}

export default {
  STAINLESS_PROFILE_GROUP_NAME,
  STAINLESS_PROFILE_CATEGORY_NAME,
  STAINLESS_PROFILE_DEFAULT_LENGTH_M,
  STAINLESS_PROFILE_TYPE_NAMES,
  foldStainlessProfileTypeName,
  matchStainlessProfileTypeName,
  canonicalSides,
  stainlessProfileCatalogKey,
  STAINLESS_PROFILE_SQUARE_SPECS,
  STAINLESS_PROFILE_RECTANGLE_SPECS,
  STAINLESS_PROFILE_SQUARE_ROWS,
  STAINLESS_PROFILE_RECTANGLE_ROWS,
  STAINLESS_PROFILE_ROWS,
  stainlessProfileIdentityRows,
  stainlessProfileDisplayNameRule,
};
