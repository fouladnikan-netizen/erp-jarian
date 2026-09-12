/**
 * When an ENUM Attribute Definition's allowed values are renamed (same
 * commercial option, new stored `value`), map old stored values onto the new
 * catalog so Product rows and display names stay aligned.
 *
 * Typical operator edit: `چهارچوب رومی=roman` → `چهارچوب رومی` (value becomes
 * the Persian label). Display names look up by stored value; without this map
 * they fall back to the stale latin code.
 */

function optionValue(item) {
  return String(item?.value ?? '').trim();
}

function optionLabel(item) {
  const label = String(item?.labelFa ?? '').trim();
  return label || optionValue(item);
}

/**
 * @param {Array<{ value?: string, labelFa?: string }>} oldOptions
 * @param {Array<{ value?: string, labelFa?: string }>} newOptions
 * @returns {Record<string, string>} old value → new value (identity for unchanged)
 */
export function mapEnumOptionRenames(oldOptions = [], newOptions = []) {
  const next = (Array.isArray(newOptions) ? newOptions : []).filter((item) => optionValue(item));
  const newValues = new Set(next.map(optionValue));
  const newByLabel = new Map();
  for (const item of next) {
    const label = optionLabel(item);
    const list = newByLabel.get(label) || [];
    list.push(item);
    newByLabel.set(label, list);
  }

  const mapping = {};
  for (const item of (Array.isArray(oldOptions) ? oldOptions : [])) {
    const value = optionValue(item);
    if (!value) continue;
    if (newValues.has(value)) {
      mapping[value] = value;
      continue;
    }
    const sameLabel = newByLabel.get(optionLabel(item)) || [];
    if (sameLabel.length === 1) {
      mapping[value] = optionValue(sameLabel[0]);
      continue;
    }
    if (newValues.has(optionLabel(item))) {
      mapping[value] = optionLabel(item);
    }
  }
  return mapping;
}

export function remapEnumStoredValue(stored, mapping, newValues) {
  const raw = String(stored ?? '').trim();
  if (!raw) return raw;
  if (mapping && mapping[raw]) return mapping[raw];
  if (newValues instanceof Set ? newValues.has(raw) : (newValues || []).includes(raw)) return raw;
  return null;
}

export function mappingHasRenames(mapping = {}) {
  return Object.entries(mapping).some(([from, to]) => from !== to);
}

export default {
  mapEnumOptionRenames,
  remapEnumStoredValue,
  mappingHasRenames,
};
