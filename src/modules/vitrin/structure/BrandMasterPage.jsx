import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import BrandsTab from '../../shirazeh/productMaster/BrandsTab';

export default function BrandMasterPage() {
  const canManage = useCan(PERMISSIONS.PRODUCTS_MANAGE_BRANDS);
  return (
    <section>
      <header className="vitrin-structure__hub-head">
        <div>
          <h2 className="vitrin-structure__hub-title">برندها</h2>
          <p className="vitrin-structure__hub-sub">مرجع برند مستقل. اتصال برند به نوع کالا اختیاری است؛ همهٔ دسته‌ها برند ندارند.</p>
        </div>
      </header>
      <BrandsTab canManage={canManage} />
    </section>
  );
}
