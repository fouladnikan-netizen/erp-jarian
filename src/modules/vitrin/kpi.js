export function computeVitrinKpis(products, groups) {
  const activeGroups = groups.filter((g) => g.subgroups.length > 0);
  const demand = new Map();

  for (const product of products) {
    const orders = product.relatedOrders?.length || 0;
    if (!orders) continue;
    const group = groups.find((g) => g.id === product.groupId);
    if (!group) continue;
    demand.set(group.name, (demand.get(group.name) || 0) + orders);
  }

  let topGroup = '—';
  let topCount = 0;
  for (const [name, count] of demand) {
    if (count > topCount) {
      topGroup = name;
      topCount = count;
    }
  }

  return [
    { label: 'کل محصولات', value: products.length.toLocaleString('fa-IR'), variant: 'accent' },
    { label: 'دسته‌بندی‌های فعال', value: activeGroups.length.toLocaleString('fa-IR') },
    {
      label: 'پرمتقاضی‌ترین گروه کالایی',
      value: topGroup,
      trend: topCount ? `${topCount.toLocaleString('fa-IR')} سفارش` : undefined,
      trendDir: 'up',
    },
  ];
}

export function filterProducts(products, groups, { search, groupId, subgroupId, filterGroupId }) {
  const effectiveGroupId = filterGroupId ?? groupId;

  return products.filter((product) => {
    if (effectiveGroupId && product.groupId !== effectiveGroupId) return false;
    if (subgroupId && product.subgroupId !== subgroupId) return false;

    if (search) {
      const group = groups.find((g) => g.id === product.groupId);
      const subgroup = group?.subgroups.find((s) => s.id === product.subgroupId);
      const haystack = [
        product.code,
        product.title,
        product.description,
        group?.name,
        subgroup?.name,
        product.unit,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search.toLowerCase())) return false;
    }

    return true;
  });
}
