import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useContactsStore } from '../../stores/useContactsStore';
import ContactPersonCard from './ContactPersonCard';
import ContactPersonModal from './ContactPersonModal';
import './contactPerson.css';

/**
 * Shared ContactPersons section (Company 1:N).
 * Consumes the single contacts SSOT — usable from Kanoon, Nabz, Ofogh, etc.
 *
 * @param {boolean} [showAddButton=true] — set false when the page Action Bar owns create
 */
export default function ContactPersonsSection({ companyId, showAddButton = true }) {
  const relatedPersons = useContactsStore((s) => {
    const company = s.contacts.find((c) => String(c.id) === String(companyId));
    return company?.relatedPersons || [];
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const openAdd = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (personId) => {
    setEditingId(personId);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
  };

  return (
    <section className="contact-person" aria-label="افراد و رابطین مرتبط" dir="rtl">
      <header className="contact-person__header">
        <div className="contact-person__titles">
          <h3 className="contact-person__title font-meem">افراد و رابطین مرتبط</h3>
          <p className="contact-person__subtitle font-meem">
            مدیریت افراد مرتبط با این شرکت برای تماس و پیگیری
          </p>
        </div>
        {showAddButton ? (
          <button
            type="button"
            className="contact-person-btn contact-person-btn--primary font-meem"
            onClick={openAdd}
          >
            <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" />
            افزودن رابط جدید
          </button>
        ) : null}
      </header>

      {relatedPersons.length === 0 ? (
        <p className="contact-person__empty font-meem">هنوز رابطی ثبت نشده است.</p>
      ) : (
        <ul className="contact-person__list">
          {relatedPersons.map((person) => (
            <ContactPersonCard
              key={person.id}
              person={person}
              onEdit={openEdit}
            />
          ))}
        </ul>
      )}

      <ContactPersonModal
        open={modalOpen}
        companyId={companyId}
        personId={editingId}
        onClose={closeModal}
      />
    </section>
  );
}
