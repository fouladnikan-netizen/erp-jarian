import { useMemo, useState } from 'react';
import { initialGroups, initialProducts } from './catalogData';
import { computeVitrinKpis, filterProducts } from './kpi';
import VitrinKpis from './components/VitrinKpis';
import VitrinToolbar from './components/VitrinToolbar';
import CategoryChips from './components/CategoryChips';
import VitrinTable from './components/VitrinTable';
import GroupModal from './components/GroupModal';
import SubgroupModal from './components/SubgroupModal';
import ProductModal from './components/ProductModal';
import ProductProfileDrawer from './components/ProductProfileDrawer';
import ListPageLayout from '../../components/module/ListPageLayout';
import ListToolbar from '../../components/module/ListToolbar';
import './vitrin.css';

export default function VitrinPage() {
  const [groups, setGroups] = useState(initialGroups);
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [filterGroupId, setFilterGroupId] = useState(null);
  const [chipGroupId, setChipGroupId] = useState(null);
  const [chipSubgroupId, setChipSubgroupId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [subgroupModal, setSubgroupModal] = useState(null);
  const [productModal, setProductModal] = useState(null);
  const [profileProduct, setProfileProduct] = useState(null);

  const kpis = useMemo(() => computeVitrinKpis(products, groups), [products, groups]);

  const filtered = useMemo(
    () => filterProducts(products, groups, {
      search,
      groupId: chipGroupId,
      subgroupId: chipSubgroupId,
      filterGroupId,
    }),
    [products, groups, search, chipGroupId, chipSubgroupId, filterGroupId],
  );

  const listTitle = useMemo(() => {
    if (chipGroupId && chipSubgroupId) {
      const subgroup = groups
        .find((g) => g.id === chipGroupId)
        ?.subgroups.find((s) => s.id === chipSubgroupId);
      if (subgroup) return `فهرست محصولات ${subgroup.name}`;
    }
    return 'فهرست محصولات';
  }, [groups, chipGroupId, chipSubgroupId]);

  const handleAddGroup = (name) => {
    const nextId = Math.max(0, ...groups.map((g) => g.id)) + 1;
    setGroups((prev) => [...prev, { id: nextId, name, subgroups: [] }]);
    setGroupModalOpen(false);
    setChipGroupId(nextId);
    setChipSubgroupId(null);
  };

  const handleAddSubgroup = (groupId, name) => {
    setGroups((prev) => prev.map((g) => {
      if (g.id !== groupId) return g;
      const nextSubId = Math.max(0, ...g.subgroups.map((s) => s.id)) + 1;
      return { ...g, subgroups: [...g.subgroups, { id: nextSubId, name }] };
    }));
    setSubgroupModal(null);
  };

  const handleSaveProduct = (data) => {
    if (productModal?.product) {
      setProducts((prev) => prev.map((p) => (p.id === productModal.product.id ? { ...p, ...data } : p)));
      setProfileProduct((prev) => (prev?.id === productModal.product.id ? { ...prev, ...data } : prev));
    } else {
      setProducts((prev) => [...prev, { ...data, id: Date.now() }]);
    }
    setProductModal(null);
  };

  const handleUpdateProduct = (id, updates) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    setProfileProduct((prev) => (prev?.id === id ? { ...prev, ...updates } : prev));
  };

  const handleToggleActive = (product) => {
    handleUpdateProduct(product.id, { isActive: product.isActive === false });
  };

  const handleSelectGroup = (groupId) => {
    setChipGroupId(groupId);
    setChipSubgroupId(null);
    if (groupId) setFilterGroupId(null);
  };

  const subgroupTarget = subgroupModal
    ? groups.find((g) => g.id === subgroupModal)
    : null;

  return (
    <ListPageLayout
      moduleId="vitrin"
      className="vitrin-page"
      kpis={<VitrinKpis kpis={kpis} />}
      toolbar={(
        <ListToolbar
          searchPlaceholder="جستجو در نام کالا، کد یا گروه..."
          searchValue={search}
          onSearchChange={setSearch}
          primaryLabel="ثبت محصول جدید"
          onPrimaryClick={() => setProductModal({ product: null })}
          secondary={(
            <button
              type="button"
              className="btn btn--outline-danger font-meem"
              onClick={() => setGroupModalOpen(true)}
            >
              ثبت گروه کالا
            </button>
          )}
          filters={(
            <VitrinToolbar
              groups={groups}
              filterGroupId={filterGroupId}
              onFilterGroupChange={setFilterGroupId}
              activeGroupId={chipGroupId}
              subgroupId={chipSubgroupId}
              onSubgroupChange={setChipSubgroupId}
            />
          )}
          belowSearch={(
            <CategoryChips
              groups={groups}
              selectedGroupId={chipGroupId}
              onSelectGroup={handleSelectGroup}
              onAddSubgroup={(groupId) => setSubgroupModal(groupId)}
            />
          )}
        />
      )}
    >
      <VitrinTable
        products={filtered}
        groups={groups}
        listTitle={listTitle}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onTitleClick={setProfileProduct}
        onEdit={(product) => setProductModal({ product })}
        onToggleActive={handleToggleActive}
      />

      {groupModalOpen && (
        <GroupModal onClose={() => setGroupModalOpen(false)} onSubmit={handleAddGroup} />
      )}

      {subgroupTarget && (
        <SubgroupModal
          groupName={subgroupTarget.name}
          onClose={() => setSubgroupModal(null)}
          onSubmit={(name) => handleAddSubgroup(subgroupTarget.id, name)}
        />
      )}

      {productModal && (
        <ProductModal
          groups={groups}
          products={products}
          product={productModal.product}
          onClose={() => setProductModal(null)}
          onSubmit={handleSaveProduct}
        />
      )}

      {profileProduct && (
        <ProductProfileDrawer
          product={profileProduct}
          groups={groups}
          onClose={() => setProfileProduct(null)}
          onUpdateProduct={handleUpdateProduct}
        />
      )}
    </ListPageLayout>
  );
}
