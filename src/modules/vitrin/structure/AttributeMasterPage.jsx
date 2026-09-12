import { useCan } from '../../../stores/useSessionStore.js';
import { PERMISSIONS } from '../../../auth/permissions.catalog.js';
import AttributesTab from '../../shirazeh/productMaster/AttributesTab';

export default function AttributeMasterPage() {
  const canManage = useCan(PERMISSIONS.PRODUCTS_MANAGE_TAXONOMY);
  return (
    <section>
      <header className="vitrin-structure__hub-head">
        <div>
          <h2 className="vitrin-structure__hub-title">ویژگی‌ها</h2>
          <p className="vitrin-structure__hub-sub">تعریف موجودیت پایه. اتصال به نوع کالا در ویزارد مرحله ویژگی‌ها انجام می‌شود.</p>
        </div>
      </header>
      <AttributesTab canManage={canManage} mode="definitions" />
    </section>
  );
}
