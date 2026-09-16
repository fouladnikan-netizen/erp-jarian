/**
 * Locate a Group / Category / Type path from a structure search query.
 * Prefers Type, then Category, then Group; also resolves via brand / unit / attribute names.
 */
function normalize(value) {
  return String(value || '')
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u200c\u200d]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function matches(value, query) {
  const hay = normalize(value);
  return Boolean(hay) && hay.includes(query);
}

function itemMatches(item, query) {
  return matches(item?.name, query)
    || matches(item?.nameFa, query)
    || matches(item?.nameLatin, query)
    || matches(item?.code, query)
    || matches(item?.brandName, query)
    || matches(item?.legalName, query);
}

function pathForType(type, categories) {
  if (!type) return null;
  const category = categories.find((item) => item.id === type.categoryId);
  return {
    groupId: category?.groupId || null,
    categoryId: type.categoryId,
    typeId: type.id,
  };
}

export function findStructureSelection(rawQuery, {
  groups = [],
  categories = [],
  types = [],
  brands = [],
  uoms = [],
  definitions = [],
  schemaByType = {},
} = {}) {
  const query = normalize(rawQuery);
  if (query.length < 2) return null;

  const typeHit = types.find((item) => itemMatches(item, query));
  if (typeHit) return pathForType(typeHit, categories);

  const categoryHit = categories.find((item) => itemMatches(item, query));
  if (categoryHit) {
    return { groupId: categoryHit.groupId, categoryId: categoryHit.id, typeId: null };
  }

  const groupHit = groups.find((item) => itemMatches(item, query));
  if (groupHit) return { groupId: groupHit.id, categoryId: null, typeId: null };

  const brandHit = brands.find((item) => itemMatches(item, query));
  if (brandHit) {
    const type = types.find((item) => (item.allowedBrandIds || []).includes(brandHit.id));
    if (type) return pathForType(type, categories);
  }

  const uomHit = uoms.find((item) => itemMatches(item, query));
  if (uomHit) {
    const type = types.find((item) => item.defaultCountUnitId === uomHit.id || item.defaultSalesUnitId === uomHit.id);
    if (type) return pathForType(type, categories);
  }

  const definitionHit = definitions.find((item) => itemMatches(item, query));
  if (definitionHit) {
    const typeId = Object.keys(schemaByType).find((id) => (
      (schemaByType[id] || []).some((entry) => entry.definition?.id === definitionHit.id)
    ));
    if (typeId) return pathForType(types.find((item) => item.id === typeId), categories);
  }

  return null;
}

export function filterByQuery(items, rawQuery, getText) {
  const query = normalize(rawQuery);
  if (!query) return items;
  return items.filter((item) => {
    const text = typeof getText === 'function' ? getText(item) : item;
    if (Array.isArray(text)) return text.some((value) => matches(value, query));
    return matches(text, query);
  });
}
