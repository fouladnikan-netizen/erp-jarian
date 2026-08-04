import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useContactsStore } from '../../stores/useContactsStore';
import { PERSON_TYPES } from './config';
import { computeKanoonKpis } from './kpi';
import KanoonKpis from './components/KanoonKpis';
import KanoonToolbar, { entityTypeFromAudience } from './components/KanoonToolbar';
import KanoonTable from './components/KanoonTable';
import ContactModal from './components/ContactModal';
import KanoonActionPlaceholder from './components/KanoonActionPlaceholder';
import { KANOON_ACTION } from './kanoonActionTypes';
import { useCompanyCompletionGate } from '../../components/customerCompletion';
import ListPageLayout from '../../components/module/ListPageLayout';
import ListToolbar from '../../components/module/ListToolbar';
import './kanoon.css';

export default function KanoonPage() {
  const contacts = useContactsStore((state) => state.contacts);
  const addContact = useContactsStore((state) => state.addContact);
  const updateContact = useContactsStore((state) => state.updateContact);
  const [audienceFilter, setAudienceFilter] = useState('customers');
  const [personType, setPersonType] = useState(PERSON_TYPES.LEGAL);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [modalState, setModalState] = useState(null);
  const [actionForm, setActionForm] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { ensureOperational, gateDialog } = useCompanyCompletionGate();

  const entityTab = entityTypeFromAudience(audienceFilter);
  const kpis = useMemo(() => computeKanoonKpis(contacts), [contacts]);

  const openProfile = (contact, tab) => {
    navigate(`/kanoon/contact/${contact.id}${tab ? `?tab=${tab}` : ''}`);
  };

  useEffect(() => {
    const contactId = Number(searchParams.get('contact'));
    if (!contactId) return;
    const match = contacts.find((c) => c.id === contactId);
    if (match) navigate(`/kanoon/contact/${match.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, contacts]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [audienceFilter, personType]);

  const handleAddContact = (contact) => {
    addContact(contact);
    setModalState(null);
  };

  const handleUpdateContact = (id, updates) => {
    updateContact(id, updates);
  };

  const handleQuickActivity = (contact) => {
    ensureOperational(contact, () => {
      setActionForm({ type: KANOON_ACTION.NEW_ACTIVITY, contact });
    });
  };

  const handleQuickOrder = (contact) => {
    ensureOperational(contact, () => {
      setActionForm({ type: KANOON_ACTION.NEW_ORDER, contact });
    });
  };

  const handleOrderFallback = (contact) => {
    openProfile(contact, 'orders');
  };

  const handleToggleActive = (contact) => {
    handleUpdateContact(contact.id, { isActive: contact.isActive === false });
  };

  const openCreateModal = (mode = 'minimal') => {
    setModalState({ mode, entityType: entityTab, personType });
  };

  return (
    <ListPageLayout
      moduleId="kanoon"
      className="kanoon-page"
      kpis={<KanoonKpis kpis={kpis} />}
      toolbar={(
        <ListToolbar
          searchPlaceholder="جستجو در مخاطبین..."
          searchValue={search}
          onSearchChange={setSearch}
          primaryLabel="ثبت مخاطب جدید"
          onPrimaryClick={() => openCreateModal('minimal')}
          filters={(
            <KanoonToolbar
              audienceFilter={audienceFilter}
              personType={personType}
              onAudienceFilterChange={setAudienceFilter}
              onPersonTypeChange={setPersonType}
            />
          )}
        />
      )}
    >
      <KanoonTable
        contacts={contacts}
        entityType={entityTab}
        personType={personType}
        audienceFilter={audienceFilter}
        search={search}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onNameClick={openProfile}
        onQuickActivity={handleQuickActivity}
        onQuickOrder={handleQuickOrder}
        onToggleActive={handleToggleActive}
        onOrderFallback={handleOrderFallback}
      />

      {modalState && (
        <ContactModal
          mode={modalState.mode}
          entityType={modalState.entityType}
          personType={modalState.personType}
          onClose={() => setModalState(null)}
          onSubmit={handleAddContact}
          onOpenFullForm={() => setModalState((s) => ({ ...s, mode: 'full' }))}
        />
      )}

      {actionForm && (
        <KanoonActionPlaceholder
          action={actionForm}
          contact={actionForm.contact}
          onClose={() => setActionForm(null)}
        />
      )}

      {gateDialog}
    </ListPageLayout>
  );
}
