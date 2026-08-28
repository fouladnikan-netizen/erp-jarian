/**
 * Vitrin KPI + filter helpers over the real Product Master (DDL-24).
 * No shadow order/demand projection here — traceability belongs to a future
 * read-only hook (see Docs/architecture/product-master-nabz-future-contract.md),
 * never a copied `relatedOrders` array.
 */
export function computeVitrinKpis(products, taxonomyGroups) {
  const activeProducts = products.filter((p) => p.lifecycleStatus !== 'INACTIVE');
  const groupsInUse = new Set(products.map((p) => p.groupId).filter(Boolean));

  return [
    { label: 'کل کالاهای مرجع', value: products.length.toLocaleString('fa-IR'), variant: 'accent' },
    { label: 'کالاهای فعال', value: activeProducts.length.toLocaleString('fa-IR') },
    { label: 'گروه‌های کالای دارای محصول', value: groupsInUse.size.toLocaleString('fa-IR') },
    { label: 'گروه‌های کالای تعریف‌شده (شیرازه)', value: (taxonomyGroups?.length || 0).toLocaleString('fa-IR') },
  ];
}
