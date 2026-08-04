import { useState } from 'react';
import { useContactsStore } from '../../stores/useContactsStore';
import { ENTITY_TYPES, PERSON_TYPES } from '../kanoon/config';
import ContactModal from '../kanoon/components/ContactModal';
import { showSystemToast } from '../../utils/systemToast';
import OfoqKpis from './OfoqKpis';
import OfoqToolbar from './OfoqToolbar';
import OfoqPipelineBoard from './OfoqPipelineBoard';
import ListPageLayout from '../../components/module/ListPageLayout';
import ListToolbar from '../../components/module/ListToolbar';
import '../kanoon/kanoon.css';
import './ofoq-pipeline.css';

/**
 * افق — پایپ‌لاین کانبان.
 * چیدمان استاندارد ۳ بلوکی: KPI ← تولبار یکپارچه ← بورد.
 * پویش از این قرارداد مستثنی است.
 */
export default function OfoqModule() {
  const addContact = useContactsStore((state) => state.addContact);
  const [globalQuery, setGlobalQuery] = useState('');
  const [selectedStages, setSelectedStages] = useState([]);
  const [globalDue, setGlobalDue] = useState(null);
  const [leadModal, setLeadModal] = useState(null);

  const handleAddLead = () => {
    setLeadModal({ mode: 'minimal', entityType: ENTITY_TYPES.CUSTOMER, personType: PERSON_TYPES.LEGAL });
  };

  const handleSubmitLead = (contact) => {
    addContact(contact);
    setLeadModal(null);
    showSystemToast('فرصت جدید ثبت شد و کارت آن در ستون «نوپدید» ساخته شد');
  };

  return (
    <ListPageLayout
      moduleId="ofogh"
      className="ofoq-page ofoq-pipeline"
      kpis={<OfoqKpis />}
      toolbar={(
        <ListToolbar
          className="ofoq-glass"
          searchPlaceholder="جستجو در سرنخ‌ها..."
          searchValue={globalQuery}
          onSearchChange={setGlobalQuery}
          primaryLabel="فرصت جدید"
          onPrimaryClick={handleAddLead}
          filters={(
            <OfoqToolbar
              selectedStages={selectedStages}
              onStagesChange={setSelectedStages}
              dueFilter={globalDue}
              onDueFilterChange={setGlobalDue}
            />
          )}
        />
      )}
    >
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
    </ListPageLayout>
  );
}
