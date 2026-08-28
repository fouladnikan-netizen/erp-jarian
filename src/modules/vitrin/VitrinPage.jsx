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
import ListPageLayout from '../../components/module/ListPageLayout';
import ListToolbar from '../../components/module/ListToolbar';
import './vitrin.css';

/**
 * Vitrin — actual Product/SKU administration (DDL-24). Taxonomy/Attribute
 * Schema/UOM/Brand registries are Shirazeh-owned and administered there;
 * Vitrin only consumes them via the Product Master backend (PostgreSQL is
 * SSOT — see CLIENT_STATE_SSOT.md). No local mock catalog is used here.
 */
export default function VitrinPage() {
  const canWrite = useCan(PERMISSIONS.PRODUCTS_WRITE);
  const canLifecycle = useCan(PERMISSIONS.PRODUCTS_LIFECYCLE);
  const canBulkImport = useCan(PERMISSIONS.PRODUCTS_BULK_IMPORT);
  const canManageRelationships = useCan(PERMISSIONS.PRODUCTS_MANAGE_RELATIONSHIPS);

  const products = useProductsStore((s) => s.products);
  const search = useProductsStore((s) => s.search);
  const createProduct = useProductsStore((s) => s.createProduct);
  const setActive = useProductsStore((s) => s.setActive);
  const listRelationships = useProductsStore((s) => s.listRelationships);
  const createRelationship = useProductsStore((s) => s.createRelationship);
  const deactivateRelationship = useProductsStore((s) => s.deactivateRelationship);
  const runBulkImport = useProductsStore((s) => s.runBulkImport);

  const groups = useProductTaxonomyStore((s) => s.groups);
  const categories = useProductTaxonomyStore((s) => s.categories);
  const types = useProductTaxonomyStore((s) => s.types);
  const fetchTaxonomy = useProductTaxonomyStore((s) => s.fetchAll);

  const uoms = useUomStore((s) => s.uoms);
  const fetchUoms = useUomStore((s) => s.fetchAll);

  const brands = useBrandsStore((s) => s.brands);
  const fetchBrands = useBrandsStore((s) => s.fetchAll);

  const [searchText, setSearchText] = useState('');
  const [chipGroupId, setChipGroupId] = useState(null);
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

  const effectiveGroupId = filterGroupId || chipGroupId;
  useEffect(() => {
    void search({
      text: searchText || undefined,
      groupId: effectiveGroupId || undefined,
      categoryId: filterCategoryId || undefined,
      productTypeId: filterTypeId || undefined,
      brandId: filterBrandId || undefined,
      includeInactive,
      limit: 500,
    });
  }, [search, searchText, effectiveGroupId, filterCategoryId, filterTypeId, filterBrandId, includeInactive]);

  const kpis = useMemo(() => computeVitrinKpis(products, groups), [products, groups]);

  const listTitle = useMemo(() => {
    if (chipGroupId) {
      const group = groups.find((g) => g.id === chipGroupId);
      if (group) return `فهرست کالاهای ${group.name}`;
    }
    return 'فهرست کالاهای مرجع';
  }, [groups, chipGroupId]);

  const handleCreateProduct = async (payload) => {
    await createProduct(payload);
    setProductModalOpen(false);
  };

  const handleToggleActive = async (product) => {
    const nextActive = product.lifecycleStatus === 'INACTIVE';
    await setActive(product.id, nextActive);
    setProfileProduct((prev) => (prev?.id === product.id ? { ...prev, lifecycleStatus: nextActive ? 'ACTIVE' : 'INACTIVE' } : prev));
  };

  const handleSelectGroup = (groupId) => {
    setChipGroupId(groupId);
    if (groupId) setFilterGroupId(null);
  };

  return (
    <ListPageLayout
      moduleId="vitrin"
      className="vitrin-page"
      kpis={<VitrinKpis kpis={kpis} />}
      toolbar={(
        <ListToolbar
          searchPlaceholder="جستجو در نام کالا یا SKU..."
          searchValue={searchText}
          onSearchChange={setSearchText}
          primaryLabel={canWrite ? 'ثبت کالای جدید' : ''}
          onPrimaryClick={canWrite ? () => setProductModalOpen(true) : undefined}
          secondary={canBulkImport ? (
            <button type="button" className="btn btn--outline-danger font-meem" onClick={() => setBulkImportOpen(true)}>
              ورود دسته‌ای (CSV)
            </button>
          ) : null}
          filters={(
            <VitrinToolbar
              groups={groups}
              categories={categories}
              types={types}
              brands={brands}
              filterGroupId={filterGroupId}
              onFilterGroupChange={setFilterGroupId}
              filterCategoryId={filterCategoryId}
              onFilterCategoryChange={setFilterCategoryId}
              filterTypeId={filterTypeId}
              onFilterTypeChange={setFilterTypeId}
              filterBrandId={filterBrandId}
              onFilterBrandChange={setFilterBrandId}
              includeInactive={includeInactive}
              onIncludeInactiveChange={setIncludeInactive}
            />
          )}
          belowSearch={(
            <CategoryChips groups={groups} selectedGroupId={chipGroupId} onSelectGroup={handleSelectGroup} />
          )}
        />
      )}
    >
      <VitrinTable
        products={products}
        listTitle={listTitle}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onTitleClick={setProfileProduct}
        onToggleActive={canLifecycle ? handleToggleActive : undefined}
      />

      {productModalOpen && (
        <ProductFormModal
          groups={groups}
          categories={categories}
          types={types}
          brands={brands}
          uoms={uoms}
          onClose={() => setProductModalOpen(false)}
          onSubmit={handleCreateProduct}
        />
      )}

      {bulkImportOpen && (
        <BulkImportModal onClose={() => setBulkImportOpen(false)} onRun={runBulkImport} />
      )}

      {profileProduct && (
        <ProductProfileDrawer
          product={products.find((p) => p.id === profileProduct.id) || profileProduct}
          brands={brands}
          uoms={uoms}
          products={products}
          onClose={() => setProfileProduct(null)}
          onToggleActive={canLifecycle ? handleToggleActive : undefined}
          canManageRelationships={canManageRelationships}
          listRelationships={listRelationships}
          createRelationship={createRelationship}
          deactivateRelationship={deactivateRelationship}
        />
      )}
    </ListPageLayout>
  );
}
