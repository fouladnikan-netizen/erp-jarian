import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { initialContacts } from './contactsData';
import { ENTITY_TYPES, PERSON_TYPES } from './config';
import { computeKanoonKpis } from './kpi';
import KanoonKpis from './components/KanoonKpis';
import KanoonToolbar from './components/KanoonToolbar';
import KanoonTable from './components/KanoonTable';
import ContactModal from './components/ContactModal';
import ContactProfileDrawer from './components/ContactProfileDrawer';
import KanoonActionPlaceholder from './components/KanoonActionPlaceholder';
import { KANOON_ACTION } from './kanoonActionTypes';
import './kanoon.css';

export default function KanoonPage() {
  const [contacts, setContacts] = useState(initialContacts);
  const [entityTab, setEntityTab] = useState(ENTITY_TYPES.CUSTOMER);
  const [personType, setPersonType] = useState(PERSON_TYPES.LEGAL);
  const [search, setSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState({});
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [profileContact, setProfileContact] = useState(null);
  const [modalState, setModalState] = useState(null);
  const [actionForm, setActionForm] = useState(null);
  const [searchParams] = useSearchParams();

  const kpis = useMemo(() => computeKanoonKpis(contacts), [contacts]);

  useEffect(() => {
    const contactId = Number(searchParams.get('contact'));
    if (!contactId) return;
    const match = contacts.find((c) => c.id === contactId);
    if (match) setProfileContact(match);
  }, [searchParams, contacts]);

  useEffect(() => {
    setColumnFilters({});
    setSelectedIds(new Set());
  }, [entityTab, personType]);

  const handleAddContact = (contact) => {
    setContacts((prev) => [...prev, { ...contact, id: Date.now() }]);
    setModalState(null);
  };

  const handleUpdateContact = (id, updates) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    setProfileContact((prev) => (prev?.id === id ? { ...prev, ...updates } : prev));
  };

  const handleQuickActivity = (contact) => {
    setActionForm({ type: KANOON_ACTION.NEW_ACTIVITY, contact });
  };

  const handleQuickOrder = (contact) => {
    setActionForm({ type: KANOON_ACTION.NEW_ORDER, contact });
  };

  const handleOrderFallback = (contact) => {
    setProfileContact({ ...contact, _initialTab: 'orders' });
  };

  const handleToggleActive = (contact) => {
    handleUpdateContact(contact.id, { isActive: contact.isActive === false });
  };

  const openCreateModal = (mode = 'minimal') => {
    setModalState({ mode, entityType: entityTab, personType });
  };

  return (
    <div className="module-page kanoon-page" data-module="kanoon">
      <KanoonKpis kpis={kpis} />

      <KanoonToolbar
        entityTab={entityTab}
        personType={personType}
        search={search}
        columnFilters={columnFilters}
        onEntityTabChange={setEntityTab}
        onPersonTypeChange={setPersonType}
        onSearchChange={setSearch}
        onColumnFiltersChange={setColumnFilters}
        onCreateClick={() => openCreateModal('minimal')}
      />

      <KanoonTable
        contacts={contacts}
        entityType={entityTab}
        personType={personType}
        search={search}
        columnFilters={columnFilters}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onNameClick={setProfileContact}
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

      {profileContact && (
        <ContactProfileDrawer
          contact={profileContact}
          onClose={() => setProfileContact(null)}
          onUpdateContact={handleUpdateContact}
        />
      )}
    </div>
  );
}
