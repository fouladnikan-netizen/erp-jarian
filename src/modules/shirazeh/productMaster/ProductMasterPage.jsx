import { useState } from 'react';
import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import TaxonomyTab from './TaxonomyTab';
import AttributesTab from './AttributesTab';
import UomTab from './UomTab';
import BrandsTab from './BrandsTab';
import './product-master.css';

const TABS = [
  { id: 'taxonomy', label: 'طبقه‌بندی کالا' },
  { id: 'attributes', label: 'ویژگی‌ها و شما' },
  { id: 'uom', label: 'واحدهای اندازه‌گیری' },
  { id: 'brands', label: 'برندها' },
];

/**
 * Shirazeh -> Product Master section (Outlet child for /shirazeh/product-master).
 * Master-detail admin surface for Product Groups/Categories/Types, the
 * Attribute Engine + schema binding, the UOM Engine, and the Brand Registry
 * (DDL-24). Actual Product/SKU administration lives in Vitrin, not here.
 */
export default function ProductMasterPage() {
  const canManageTaxonomy = useCan(PERMISSIONS.PRODUCTS_MANAGE_TAXONOMY);
  const canManageBrands = useCan(PERMISSIONS.PRODUCTS_MANAGE_BRANDS);
  const [activeTab, setActiveTab] = useState('taxonomy');
  const [selectedTypeId, setSelectedTypeId] = useState(null);

  return (
    <div className="shirazeh-pm" dir="rtl">
      <header className="shirazeh-pm__header">
        <h2 className="shirazeh-pm__title font-meem">طبقه‌بندی و مرجع کالا (شیرازه)</h2>
        <p className="shirazeh-pm__subtitle font-meem">
          گروه کالا ← دسته کالا ← نوع کالا ← شمای ویژگی، به‌همراه واحدهای اندازه‌گیری و برندهای مرکزی —
          محصول/کد کالای واقعی در ویترین مدیریت می‌شود.
        </p>
      </header>

      <nav className="shirazeh-pm__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`shirazeh-pm__tab ${activeTab === tab.id ? 'shirazeh-pm__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'taxonomy' && <TaxonomyTab canManage={canManageTaxonomy} onSelectType={setSelectedTypeId} />}
      {activeTab === 'attributes' && <AttributesTab canManage={canManageTaxonomy} selectedTypeId={selectedTypeId} />}
      {activeTab === 'uom' && <UomTab canManage={canManageTaxonomy} />}
      {activeTab === 'brands' && <BrandsTab canManage={canManageBrands} />}
    </div>
  );
}
