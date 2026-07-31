import { useState } from 'react';
import { useContactsStore } from '../../stores/useContactsStore';
import { ENTITY_TYPES, PERSON_TYPES } from '../kanoon/config';
import ContactModal from '../kanoon/components/ContactModal';
import { showSystemToast } from '../../utils/systemToast';
import OfoqKpis from './OfoqKpis';
import OfoqToolbar from './OfoqToolbar';
import OfoqPipelineBoard from './OfoqPipelineBoard';
import '../kanoon/kanoon.css';
import './ofoq-pipeline.css';

/**
 * افق — پایپ‌لاین کانبان چرخه حیات مخاطبین.
 * دیتابیس جدا ندارد؛ لایه نمایشی روی مخاطبین کانون است (useContactsStore).
 * چیدمان استاندارد جریان (هم‌ریتم با نبض): هدر ماژول ← نوار KPI ← تولبار ← بورد.
 */
export default function OfoqModule() {
  const addContact = useContactsStore((state) => state.addContact);
  const [globalQuery, setGlobalQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState([]);
  const [globalDue, setGlobalDue] = useState(null);
  const [leadModal, setLeadModal] = useState(null);

  // «فرصت جدید» = همان فرم «ثبت مخاطب جدید» کانون؛ ذخیره در همان پایگاه داده مشترک
  const handleAddLead = () => {
    setLeadModal({ mode: 'minimal', entityType: ENTITY_TYPES.CUSTOMER, personType: PERSON_TYPES.LEGAL });
  };

  const handleSubmitLead = (contact) => {
    addContact(contact);
    setLeadModal(null);
    showSystemToast('فرصت جدید ثبت شد و کارت آن در ستون «نوپدید» ساخته شد');
  };

  return (
    <div className="module-page ofoq-page ofoq-pipeline" data-module="ofogh" dir="rtl">
      <OfoqKpis />

      <OfoqToolbar
        query={globalQuery}
        onQueryChange={setGlobalQuery}
        selectedStages={selectedStages}
        onStagesChange={setSelectedStages}
        dueFilter={globalDue}
        onDueFilterChange={setGlobalDue}
        onAddLead={handleAddLead}
      />

      <OfoqPipelineBoard globalQuery={globalQuery} selectedStages={selectedStages} globalDue={globalDue} />

      {leadModal && (
        <ContactModal
          mode={leadModal.mode}
          entityType={leadModal.entityType}
          personType={leadModal.personType}
          onClose={() => setLeadModal(null)}
          onSubmit={handleSubmitLead}
          onOpenFullForm={() => setLeadModal((s) => ({ ...s, mode: 'full' }))}
        />
      )}
    </div>
  );
}
