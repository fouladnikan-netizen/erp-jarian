/**
 * Tracks Product Master taxonomy/product rows created over HTTP so
 * integration tests delete their own fixtures instead of leaving them
 * in the operator catalog. Does not wipe the live catalog.
 *
 * Delete order: products → types → categories → groups.
 *
 * Name matching is Persian test prefixes only. Never match operator latin
 * labels such as "Carbon Steel Products" / "Stainless Steel Products".
 */

const TEST_TAXONOMY_NAME_RE = /^(گروه-|حذف-|غیرفعال-|تکراری-|RBAC-|دسته-|نوع-)/;

export function isProductMasterTestFixtureName(name, _nameLatin = '') {
  const fa = String(name || '').trim();
  if (!fa) return false;
  return TEST_TAXONOMY_NAME_RE.test(fa);
}

export function createProductMasterFixtureTracker() {
  const ids = {
    products: new Set(),
    types: new Set(),
    categories: new Set(),
    groups: new Set(),
    brands: new Set(),
  };

  function remember(set, id) {
    if (id) set.add(id);
  }

  function track(method, path, data) {
    if (method !== 'POST' || !data) return;
    if (path === '/api/v1/product-taxonomy/groups') remember(ids.groups, data.group?.id);
    else if (path === '/api/v1/product-taxonomy/categories') remember(ids.categories, data.category?.id);
    else if (path === '/api/v1/product-taxonomy/types') remember(ids.types, data.productType?.id);
    else if (path === '/api/v1/products') remember(ids.products, data.product?.id);
    else if (path === '/api/v1/brands') remember(ids.brands, data.brand?.id);
    else if (path === '/api/v1/products/bulk-import') {
      for (const row of data.batch?.rowResults || []) {
        remember(ids.products, row.productId);
      }
    }
  }

  function wrapJson(requestJson) {
    return async function trackedJson(method, path, body, authToken) {
      const res = await requestJson(method, path, body, authToken);
      if (res.status === 201) track(method, path, res.data);
      return res;
    };
  }

  async function emptyType(json, typeId) {
    const listed = await json(
      'GET',
      `/api/v1/products?productTypeId=${encodeURIComponent(typeId)}&includeInactive=true&limit=500`,
    );
    for (const product of listed.data?.items || []) {
      remember(ids.products, product.id);
      await deleteProduct(json, product.id);
    }
    await json('DELETE', `/api/v1/product-taxonomy/types/${typeId}`);
  }

  async function deleteProduct(json, id) {
    const del = await json('DELETE', `/api/v1/products/${id}`);
    if (del.status === 409) {
      await json('PATCH', `/api/v1/products/${id}/deactivate`);
      await json('DELETE', `/api/v1/products/${id}`);
    }
  }

  async function emptyCategory(json, categoryId) {
    const types = await json(
      'GET',
      `/api/v1/product-taxonomy/types?categoryId=${encodeURIComponent(categoryId)}&includeInactive=true`,
    );
    for (const type of types.data?.items || []) {
      remember(ids.types, type.id);
      await emptyType(json, type.id);
    }
    await json('DELETE', `/api/v1/product-taxonomy/categories/${categoryId}`);
  }

  async function emptyGroup(json, groupId) {
    const cats = await json(
      'GET',
      `/api/v1/product-taxonomy/categories?groupId=${encodeURIComponent(groupId)}&includeInactive=true`,
    );
    for (const category of cats.data?.items || []) {
      remember(ids.categories, category.id);
      await emptyCategory(json, category.id);
    }
    await json('DELETE', `/api/v1/product-taxonomy/groups/${groupId}`);
  }

  async function cleanup(json) {
    for (const typeId of [...ids.types]) {
      const listed = await json(
        'GET',
        `/api/v1/products?productTypeId=${encodeURIComponent(typeId)}&includeInactive=true&limit=500`,
      );
      for (const product of listed.data?.items || []) remember(ids.products, product.id);
    }

    for (const id of [...ids.products]) {
      await deleteProduct(json, id);
    }

    for (const id of [...ids.types]) {
      const del = await json('DELETE', `/api/v1/product-taxonomy/types/${id}`);
      if (del.status === 409) await emptyType(json, id);
    }

    for (const id of [...ids.categories]) {
      const del = await json('DELETE', `/api/v1/product-taxonomy/categories/${id}`);
      if (del.status === 409) await emptyCategory(json, id);
    }

    for (const id of [...ids.groups]) {
      const del = await json('DELETE', `/api/v1/product-taxonomy/groups/${id}`);
      if (del.status === 409) await emptyGroup(json, id);
    }

    for (const id of [...ids.brands]) {
      await json('DELETE', `/api/v1/brands/${id}`);
    }
  }

  return { ids, track, wrapJson, cleanup };
}
