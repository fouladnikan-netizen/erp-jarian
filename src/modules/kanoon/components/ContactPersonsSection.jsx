import { useState } from 'react';
import { Edit2, Star, Trash2, UserPlus } from 'lucide-react';
import { getContactPersonRoleLabel } from '../config/contactPersonRoles';
import { useKanoonStore } from '../store/kanoonStore';
import ContactPersonModal from './ContactPersonModal';
import './contactPersons.css';

/** Initials for avatar circle — e.g. "علی رضایی" → "ع.ر" */
function getInitials(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}.${parts[parts.length - 1].slice(0, 1)}`;
}

/**
 * Compact horizontal list for associated personnel (افراد و رابطین مرتبط).
 */
export default function ContactPersonsSection({ companyId }) {
  const contacts = useKanoonStore((s) => s.contacts);
  const deleteContactPerson = useKanoonStore((s) => s.deleteContactPerson);

  const company = contacts.find((c) => String(c.id) === String(companyId));
  const persons = company?.relatedPersons || [];

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

  const handleDelete = (personId, personName) => {
    const ok = window.confirm(`حذف «${personName || 'این رابط'}» قطعی است؟`);
    if (!ok) return;
    deleteContactPerson(companyId, personId);
  };

  return (
    <section className="kanoon-cp" aria-label="افراد و رابطین مرتبط" dir="rtl">
      <header className="kanoon-cp__header">
        <div className="kanoon-cp__titles">
          <h3 className="kanoon-cp__title font-meem">افراد و رابطین مرتبط</h3>
          <p className="kanoon-cp__subtitle font-meem">
            مدیریت افراد مرتبط با این شرکت برای تماس و پیگیری
          </p>
        </div>
        <button
          type="button"
          className="kanoon-cp-btn kanoon-cp-btn--primary font-meem"
          onClick={openAdd}
        >
          <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" />
          افزودن رابط جدید
        </button>
      </header>

      {persons.length === 0 ? (
        <p className="kanoon-cp__empty font-meem">هنوز رابطی ثبت نشده است.</p>
      ) : (
        <ul className="kanoon-cp__list">
          {persons.map((person) => {
            const name = person.fullName || person.name || '—';
            const roleLabel = getContactPersonRoleLabel(person.role);
            const phones = [person.mobile, person.directPhone].filter(Boolean).join(' · ');

            return (
              <li key={person.id} className="kanoon-cp-row">
                <div className="kanoon-cp-row__identity">
                  <span className="kanoon-cp-row__avatar font-meem" aria-hidden="true">
                    {getInitials(name)}
                  </span>
                  <div className="kanoon-cp-row__who">
                    <span className="kanoon-cp-row__name font-meem">{name}</span>
                    <span className="kanoon-cp-row__role font-meem">{roleLabel}</span>
                  </div>
                </div>

                <div className="kanoon-cp-row__phones font-yekan">
                  {phones || '—'}
                </div>

                <div className="kanoon-cp-row__end">
                  {person.isPrimary ? (
                    <span className="kanoon-cp-row__primary font-meem">
                      <Star size={12} strokeWidth={1.75} aria-hidden="true" />
                      رابط اصلی
                    </span>
                  ) : (
                    <span className="kanoon-cp-row__primary-spacer" aria-hidden="true" />
                  )}
                  <div className="kanoon-cp-row__actions" role="group" aria-label={`عملیات ${name}`}>
                    <button
                      type="button"
                      className="kanoon-cp-action"
                      title="ویرایش رابط"
                      aria-label="ویرایش رابط"
                      onClick={() => openEdit(person.id)}
                    >
                      <Edit2 size={15} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      className="kanoon-cp-action kanoon-cp-action--danger"
                      title="حذف رابط"
                      aria-label="حذف رابط"
                      onClick={() => handleDelete(person.id, name)}
                    >
                      <Trash2 size={15} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
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
