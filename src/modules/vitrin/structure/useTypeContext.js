import { useEffect } from 'react';
import { useAttributeDefinitionsStore } from '../../../stores/useAttributeDefinitionsStore';
import { useProductTaxonomyStore } from '../../../stores/useProductTaxonomyStore';
import { typeBreadcrumb } from '../../../domain/productMaster/typeCompletion';

const EMPTY_SCHEMA = [];

export default function useTypeContext(typeId) {
  const groups = useProductTaxonomyStore((s) => s.groups);
  const categories = useProductTaxonomyStore((s) => s.categories);
  const types = useProductTaxonomyStore((s) => s.types);
  const fetchAll = useProductTaxonomyStore((s) => s.fetchAll);
  const schemaByType = useAttributeDefinitionsStore((s) => s.schemaByType);
  const fetchSchemaForType = useAttributeDefinitionsStore((s) => s.fetchSchemaForType);

  useEffect(() => { void fetchAll(); }, [fetchAll]);
  useEffect(() => {
    if (typeId) void fetchSchemaForType(typeId);
  }, [typeId, fetchSchemaForType]);

  const type = types.find((item) => item.id === typeId) || null;
  const category = type ? categories.find((item) => item.id === type.categoryId) || null : null;
  const group = category ? groups.find((item) => item.id === category.groupId) || null : null;
  const schema = (typeId && schemaByType[typeId]) || EMPTY_SCHEMA;
  const schemaLoaded = Boolean(typeId) && Object.prototype.hasOwnProperty.call(schemaByType, typeId);

  return {
    groups,
    categories,
    types,
    type,
    category,
    group,
    schema,
    schemaLoaded,
    breadcrumb: typeBreadcrumb({ group, category, type }),
  };
}
