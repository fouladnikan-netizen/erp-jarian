import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useSearchParams, useParams } from 'react-router-dom';
import ListPageLayout from '../../../components/module/ListPageLayout';
import ListToolbar from '../../../components/module/ListToolbar';
import VitrinKpis from '../components/VitrinKpis';
import { computeStructureKpis } from '../kpi';
import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import { useAttributeDefinitionsStore } from '../../../stores/useAttributeDefinitionsStore';
import { useBrandsStore } from '../../../stores/useBrandsStore';
import { useProductTaxonomyStore } from '../../../stores/useProductTaxonomyStore';
import { useProductsStore } from '../../../stores/useProductsStore';
import { useUomStore } from '../../../stores/useUomStore';
import { findStructureSelection } from '../../../domain/productMaster/structureSearch';
import TaxonomyTab from '../../shirazeh/productMaster/TaxonomyTab';
import AttributesTab from '../../shirazeh/productMaster/AttributesTab';
import BrandsTab from '../../shirazeh/productMaster/BrandsTab';
import UomTab from '../../shirazeh/productMaster/UomTab';
import TypeDetailPanel from './TypeDetailPanel';
import useTypeContext from './useTypeContext';

const TABS = [
  { id: 'structure', label: 'ساختار' },
  { id: 'attributes', label: 'بانک ویژگی‌ها' },
  { id: 'units', label: 'واحدها' },
  { id: 'brands', label: 'برندها' },
];

const SEARCH_PLACEHOLDERS = {
  structure: 'جستجو در ساختار کالا...',
  attributes: 'جستجو در بانک ویژگی‌ها...',
  units: 'جستجو در واحدها...',
  brands: 'جستجو در برندها...',
};

export default function ProductStructureHub() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get('tab');
  const tab = TABS.some((item) => item.id === tabParam) ? tabParam : 'structure';
  const typeParam = params.get('type');

  const canManageTaxonomy = useCan(PERMISSIONS.PRODUCTS_MANAGE_TAXONOMY);
  const canManageBrands = useCan(PERMISSIONS.PRODUCTS_MANAGE_BRANDS);

  const groups = useProductTaxonomyStore((s) => s.groups);
  const categories = useProductTaxonomyStore((s) => s.categories);
  const types = useProductTaxonomyStore((s) => s.types);
  const fetchTaxonomy = useProductTaxonomyStore((s) => s.fetchAll);
  const definitions = useAttributeDefinitionsStore((s) => s.definitions);
  const schemaByType = useAttributeDefinitionsStore((s) => s.schemaByType);
  const fetchDefinitions = useAttributeDefinitionsStore((s) => s.fetchAll);
  const brands = useBrandsStore((s) => s.brands);
  const fetchBrands = useBrandsStore((s) => s.fetchAll);
  const uoms = useUomStore((s) => s.uoms);
  const fetchUoms = useUomStore((s) => s.fetchAll);
  const products = useProductsStore((s) => s.products);
  const searchProducts = useProductsStore((s) => s.search);

  const [searchText, setSearchText] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState(typeParam || null);
  const [focusPath, setFocusPath] = useState(null);
  const [pathNonce, setPathNonce] = useState(0);

  const appliedTypeParam = useRef(null);
  const appliedSearch = useRef('');
  const searchTimer = useRef(null);

  useEffect(() => {
    void fetchTaxonomy();
    void fetchDefinitions();
    void fetchBrands();
    void fetchUoms();
    void searchProducts({ includeInactive: true, limit: 2000 });
  }, [fetchTaxonomy, fetchDefinitions, fetchBrands, fetchUoms, searchProducts]);

  useEffect(() => {
    if (!typeParam || !types.length) return;
    if (appliedTypeParam.current === typeParam) return;
    const type = types.find((item) => item.id === typeParam);
    if (!type) return;
    const category = categories.find((item) => item.id === type.categoryId);
    appliedTypeParam.current = typeParam;
    setSelectedTypeId(type.id);
    setFocusPath({
      groupId: category?.groupId || null,
      categoryId: type.categoryId,
      typeId: type.id,
    });
    setPathNonce((value) => value + 1);
  }, [typeParam, types, categories]);

  useEffect(() => {
    if (tab !== 'structure') {
      appliedSearch.current = '';
      return undefined;
    }
    const query = searchText.trim();
    if (query.length < 2) {
      appliedSearch.current = '';
      return undefined;
    }
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      const found = findStructureSelection(query, {
        groups,
        categories,
        types,
        brands,
        uoms,
        definitions,
        schemaByType,
      });
      if (!found) return;
      const key = `${query}|${found.groupId || ''}|${found.categoryId || ''}|${found.typeId || ''}`;
      if (appliedSearch.current === key) return;
      appliedSearch.current = key;
      setFocusPath(found);
      setSelectedTypeId(found.typeId);
      setPathNonce((value) => value + 1);
    }, 250);
    return () => window.clearTimeout(searchTimer.current);
  }, [searchText, tab, groups, categories, types, brands, uoms, definitions, schemaByType]);

  const kpis = useMemo(
    () => computeStructureKpis(groups, categories, types, products),
    [groups, categories, types, products],
  );
  const { type, group, category, schema } = useTypeContext(selectedTypeId);

  const setTab = (nextTab) => {
    const next = new URLSearchParams(params);
    if (nextTab === 'structure') next.delete('tab');
    else next.set('tab', nextTab);
    setParams(next, { replace: true });
    setSearchText('');
  };

  const handleSelectType = useCallback((id) => {
    setSelectedTypeId(id);
  }, []);

  return (
    <ListPageLayout
      moduleId="vitrin"
      className="vitrin-page vitrin-structure shirazeh-pm"
      kpis={<VitrinKpis kpis={kpis} />}
      toolbar={(
        <ListToolbar
          searchPlaceholder={SEARCH_PLACEHOLDERS[tab]}
          searchValue={searchText}
          onSearchChange={setSearchText}
          primaryLabel=""
          belowSearch={(
            <div className="vitrin-structure__tabs" role="tablist" aria-label="بخش‌های ساختار کالا">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.id}
                  className={`vitrin-structure__tab${tab === item.id ? ' is-active' : ''}`}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        />
      )}
    >
      {tab === 'structure' && (
        <>
          <div className="vitrin-structure__taxonomy">
            <TaxonomyTab
              canManage={canManageTaxonomy}
              onSelectType={handleSelectType}
              focusPath={focusPath}
              pathNonce={pathNonce}
              initialTypeId={typeParam}
            />
          </div>
          {type ? (
            <TypeDetailPanel type={type} group={group} category={category} schema={schema} />
          ) : (
            <p className="vitrin-structure__hub-hint">نوع کالا را انتخاب کنید تا ویژگی‌ها، واحد، مقادیر مجاز، برندها و نحوه نمایش نام آن را همین‌جا مدیریت کنید.</p>
          )}
        </>
      )}
      {tab === 'attributes' && (
        <AttributesTab
          canManage={canManageTaxonomy}
          mode="definitions"
          filterQuery={searchText}
        />
      )}
      {tab === 'units' && (
        <UomTab canManage={canManageTaxonomy} showConversions={false} filterQuery={searchText} />
      )}
      {tab === 'brands' && (
        <BrandsTab canManage={canManageBrands} filterQuery={searchText} />
      )}
    </ListPageLayout>
  );
}

export function StructureTypeRedirect() {
  const { typeId } = useParams();
  const suffix = typeId ? `?type=${encodeURIComponent(typeId)}` : '';
  return <Navigate to={`/vitrin/structure${suffix}`} replace />;
}
