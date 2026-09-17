import { useEffect, useMemo, useState } from 'react';
import { useProductsStore } from '../../stores/useProductsStore';
import { useProductTaxonomyStore } from '../../stores/useProductTaxonomyStore';
import { useUomStore } from '../../stores/useUomStore';
import { useBrandsStore } from '../../stores/useBrandsStore';
import { useCan } from '../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../auth/permissions.catalog.js';
import { computeVitrinKpis } from './kpi';
import VitrinKpis from './components/VitrinKpis';
import VitrinToolbar from './components/VitrinToolbar';
import CategoryChips from './components/CategoryChips';
import VitrinTable from './components/VitrinTable';
import ProductFormModal from './components/ProductFormModal';
import ProductProfileDrawer from './components/ProductProfileDrawer';
import BulkImportModal from './components/BulkImportModal';
import { formatProductCatalogName } from '../../domain/productMaster/productDisplayText';
import ListPageLayout from '../../components/module/ListPageLayout';
import ListToolbar from '../../components/module/ListToolbar';
import { useJarianNotice } from '../../context/JarianNoticeContext';
import './vitrin.css';

/**
 * Vitrin — Product catalog administration (DDL-24 / DDL-49). Taxonomy/Attribute
 * Schema/UOM/Brand registries remain Shirazeh-owned on the API; their admin UI
 * lives under Vitrin → ساختار کالا (`/vitrin/structure`).
 */
export default function VitrinPage() {
  const canWrite = useCan(PERMISSIONS.PRODUCTS_WRITE);
  const canLifecycle = useCan(PERMISSIONS.PRODUCTS_LIFECYCLE);
  const canBulkImport = useCan(PERMISSIONS.PRODUCTS_BULK_IMPORT);

  const products = useProductsStore((s) => s.products);
  const search = useProductsStore((s) => s.search);
  const createProduct = useProductsStore((s) => s.createProduct);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const setActive = useProductsStore((s) => s.setActive);
  const deleteProduct = useProductsStore((s) => s.deleteProduct);
  const runBulkImport = useProductsStore((s) => s.runBulkImport);

  const groups = useProductTaxonomyStore((s) => s.groups);
  const categories = useProductTaxonomyStore((s) => s.categories);
  const types = useProductTaxonomyStore((s) => s.types);
  const fetchTaxonomy = useProductTaxonomyStore((s) => s.fetchAll);

  const uoms = useUomStore((s) => s.uoms);
  const fetchUoms = useUomStore((s) => s.fetchAll);

  const brands = useBrandsStore((s) => s.brands);
  const fetchBrands = useBrandsStore((s) => s.fetchAll);
  const { confirm, alert } = useJarianNotice();

  const [searchText, setSearchText] = useState('');
  const [filterGroupId, setFilterGroupId] = useState(null);
  const [filterCategoryId, setFilterCategoryId] = useState(null);
  const [filterTypeId, setFilterTypeId] = useState(null);
  const [filterBrandId, setFilterBrandId] = useState(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [profileProduct, setProfileProduct] = useState(null);

  useEffect(() => {
    void fetchTaxonomy();
    void fetchUoms();
    void fetchBrands();
  }, [fetchTaxonomy, fetchUoms, fetchBrands]);

  useEffect(() => {
    void search({
      text: searchText || undefined,
      groupId: filterGroupId || undefined,
      categoryId: filterCategoryId || undefined,
      productTypeId: filterTypeId || undefined,
      brandId: filterBrandId || undefined,
      includeInactive,
      limit: 500,
    });
  }, [search, searchText, filterGroupId, filterCategoryId, filterTypeId, filterBrandId, includeInactive]);

  const kpis = useMemo(() => computeVitrinKpis(products, groups), [products, groups]);

  const listTitle = useMemo(() => {
    const type = types.find((t) => t.id === filterTypeId);
    if (type) return `فهرست کالاهای ${type.name}`;
    const category = categories.find((c) => c.id === filterCategoryId);
    if (category) return `فهرست کالاهای ${category.name}`;
    const group = groups.find((g) => g.id === filterGroupId);
    if (group) return `فهرست کالاهای ${group.name}`;
    return 'فهرست کالاهای مرجع';
  }, [groups, categories, types, filterGroupId, filterCategoryId, filterTypeId]);

  const handleCreateProduct = async (payload) => {
    await createProduct(payload);
    setProductModalOpen(false);
  };

  const handleToggleActive = async (product) => {
    const nextActive = product.lifecycleStatus === 'INACTIVE';
    await setActive(product.id, nextActive);
    setProfileProduct((prev) => (prev?.id === product.id ? { ...prev, lifecycleStatus: nextActive ? 'ACTIVE' : 'INACTIVE' } : prev));
  };

  const handleDeleteProduct = async (product) => {
    const label = formatProductCatalogName(product) || 'کالا';
    const ok = await confirm({
      title: 'حذف',
      entity: label,
      message: 'این کالا حذف شود؟',
      hint: 'اگر در سفارشی استفاده شده باشد، حذف انجام نمی‌شود.',
      confirmLabel: 'حذف',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(product.id);
      setProfileProduct((prev) => (prev?.id === product.id ? null : prev));
    } catch (err) {
      await alert({
        title: 'خطا',
        message: err?.response?.data?.message || err?.message || 'حذف کالا ناموفق بود.',
        danger: true,
      });
    }
  };

  const handleSelectGroup = (groupId) => {
    setFilterGroupId(groupId);
    setFilterCategoryId(null);
    setFilterTypeId(null);
    setSelectedIds(new Set());
  };

  const handleSelectCategory = (categoryId) => {
    setFilterCategoryId(categoryId);
    setFilterTypeId(null);
    setSelectedIds(new Set());
  };

  const handleSelectType = (typeId) => {
    setFilterTypeId(typeId);
    setSelectedIds(new Set());
  };

  const emptyHint = filterTypeId
    ? 'کالایی در این نوع نیست'
    : filterCategoryId
      ? 'کالایی در این دسته نیست'
      : filterGroupId
        ? 'کالایی در این گروه نیست'
        : null;

  return (
    <ListPageLayout
      moduleId="vitrin"
      className="vitrin-page"
      kpis={<VitrinKpis kpis={kpis} />}
      toolbar={(
        <ListToolbar
          searchPlaceholder="جستجو در نام کالا..."
          searchValue={searchText}
          onSearchChange={setSearchText}
          primaryLabel={canWrite ? 'ثبت کالای جدید' : ''}
          onPrimaryClick={canWrite ? () => setProductModalOpen(true) : undefined}
          secondary={canBulkImport ? (
            <button type="button" className="btn btn--outline-danger font-meem" onClick={() => setBulkImportOpen(true)}>
              ورود دسته‌ای
            </button>
          ) : null}
          filters={(
            <VitrinToolbar
              groups={groups}
              categories={categories}
              types={types}
              brands={brands}
              filterGroupId={filterGroupId}
              onFilterGroupChange={handleSelectGroup}
              filterCategoryId={filterCategoryId}
              onFilterCategoryChange={handleSelectCategory}
              filterTypeId={filterTypeId}
              onFilterTypeChange={handleSelectType}
              filterBrandId={filterBrandId}
              onFilterBrandChange={setFilterBrandId}
              includeInactive={includeInactive}
              onIncludeInactiveChange={setIncludeInactive}
            />
          )}
          belowSearch={(
            <CategoryChips
              groups={groups}
              categories={categories}
              types={types}
              selectedGroupId={filterGroupId}
              selectedCategoryId={filterCategoryId}
              selectedTypeId={filterTypeId}
              onSelectGroup={handleSelectGroup}
              onSelectCategory={handleSelectCategory}
              onSelectType={handleSelectType}
            />
          )}
        />
      )}
    >
      <VitrinTable
        products={products}
        listTitle={listTitle}
        emptyHint={emptyHint}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onTitleClick={setProfileProduct}
        onToggleActive={canLifecycle ? handleToggleActive : undefined}
        onDelete={canWrite ? handleDeleteProduct : undefined}
      />

      <ProductFormModal
        open={productModalOpen}
        groups={groups}
        categories={categories}
        types={types}
        brands={brands}
        uoms={uoms}
        onClose={() => setProductModalOpen(false)}
        onSubmit={handleCreateProduct}
      />

      {bulkImportOpen && (
        <BulkImportModal onClose={() => setBulkImportOpen(false)} onRun={runBulkImport} />
      )}

      {profileProduct && (
        <ProductProfileDrawer
          product={products.find((p) => p.id === profileProduct.id) || profileProduct}
          brands={brands}
          uoms={uoms}
          onClose={() => setProfileProduct(null)}
          onToggleActive={canLifecycle ? handleToggleActive : undefined}
          onDelete={canWrite ? handleDeleteProduct : undefined}
          onUpdate={canWrite ? updateProduct : undefined}
        />
      )}
    </ListPageLayout>
  );
}
