import { useState } from 'react';
import OfoqKpis from './OfoqKpis';
import OfoqToolbar from './OfoqToolbar';
import OfoqPipelineBoard from './OfoqPipelineBoard';
import './ofoq-pipeline.css';

/**
 * افق — پایپ‌لاین کانبان چرخه حیات مخاطبین.
 * دیتابیس جدا ندارد؛ لایه نمایشی روی مخاطبین کانون است (useContactsStore).
 * چیدمان استاندارد جریان (هم‌ریتم با نبض): هدر ماژول ← نوار KPI ← تولبار ← بورد.
 */
export default function OfoqModule() {
  const [globalQuery, setGlobalQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState([]);

  const handleAddLead = () => {
    // TODO: به مودال «ثبت مخاطب جدید» کانون (ContactModal) وصل می‌شود.
  };

  return (
    <div className="module-page ofoq-page ofoq-pipeline" data-module="ofogh" dir="rtl">
      <OfoqKpis />

      <OfoqToolbar
        query={globalQuery}
        onQueryChange={setGlobalQuery}
        selectedStages={selectedStages}
        onStagesChange={setSelectedStages}
        onAddLead={handleAddLead}
      />

      <OfoqPipelineBoard globalQuery={globalQuery} selectedStages={selectedStages} />
    </div>
  );
}
