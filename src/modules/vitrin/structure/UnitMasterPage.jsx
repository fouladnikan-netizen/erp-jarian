import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import UomTab from '../../shirazeh/productMaster/UomTab';

export default function UnitMasterPage() {
  const canManage = useCan(PERMISSIONS.PRODUCTS_MANAGE_TAXONOMY);
  return (
    <section>
      <header className="vitrin-structure__hub-head">
        <div>
          <h2 className="vitrin-structure__hub-title">واحدها</h2>
          <p className="vitrin-structure__hub-sub">مرجع واحد اندازه‌گیری. تبدیل عمومی در مسیر ساخت نوع کالا نمایش داده نمی‌شود.</p>
        </div>
      </header>
      <UomTab canManage={canManage} showConversions={false} />
    </section>
  );
}
