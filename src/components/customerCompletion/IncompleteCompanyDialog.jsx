import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserPlus } from 'lucide-react';
import ContactPersonModal from '../contactPerson/ContactPersonModal';
import { evaluateCompanyCompletion } from '../../domain/customerCompletion';
import { useContactsStore } from '../../stores/useContactsStore';
import './customerCompletion.css';

/**
 * Glass dialog when a non-operational company is selected for a business workflow.
 * Primary action opens the shared ContactPersonModal (no navigation to Kanoon).
 */
export default function IncompleteCompanyDialog({
  open,
  companyId,
  onClose,
  onResolved,
}) {
  const company = useContactsStore((s) => (
    s.contacts.find((c) => String(c.id) === String(companyId)) || null
  ));
  const [personModalOpen, setPersonModalOpen] = useState(false);

  useEffect(() => {
    if (!open) setPersonModalOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !personModalOpen) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, personModalOpen, onClose]);

  if (!open || !companyId) return null;

  const handlePersonSaved = () => {
    setPersonModalOpen(false);
    const live = useContactsStore.getState().contacts.find(
      (c) => String(c.id) === String(companyId),
    );
    const evaluation = evaluateCompanyCompletion(live);
    if (evaluation.isOperational) {
      onResolved?.(live);
      onClose?.();
    }
  };

  return createPortal(
    <>
      <div className="company-completion-dialog" role="presentation">
        <button
          type="button"
          className="company-completion-dialog__backdrop"
          aria-label="بستن"
          onClick={onClose}
        />
        <div
          className="company-completion-dialog__panel"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="incomplete-company-title"
          aria-describedby="incomplete-company-body"
          dir="rtl"
        >
          <h2 id="incomplete-company-title" className="company-completion-dialog__title font-meem">
            اطلاعات شرکت ناقص است
          </h2>
          <p id="incomplete-company-body" className="company-completion-dialog__body font-meem">
            برای استفاده از این شرکت در این بخش،
            ابتدا حداقل یک فرد مرتبط ثبت کنید.
          </p>
          {company ? (
            <p className="company-completion-dialog__hint font-meem">
              {company.companyName || company.personName || 'شرکت انتخاب‌شده'}
            </p>
          ) : null}
          <div className="company-completion-dialog__actions">
            <button
              type="button"
              className="company-completion-dialog__secondary font-meem"
              onClick={onClose}
            >
              انصراف
            </button>
            <button
              type="button"
              className="company-completion-dialog__primary font-meem"
              onClick={() => setPersonModalOpen(true)}
            >
              <UserPlus size={16} strokeWidth={1.75} aria-hidden="true" />
              افزودن فرد مرتبط
            </button>
          </div>
        </div>
      </div>

      <ContactPersonModal
        open={personModalOpen}
        companyId={companyId}
        elevated
        onClose={() => setPersonModalOpen(false)}
        onSaved={handlePersonSaved}
      />
    </>,
    document.body,
  );
}
