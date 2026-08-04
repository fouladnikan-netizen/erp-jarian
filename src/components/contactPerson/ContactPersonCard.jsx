import { Edit2, Star } from 'lucide-react';
import { getContactPersonDisplayName } from '../../domain/contactPerson';
import { getContactPersonJobLabel } from './contactPersonRoles';

/**
 * ContactPerson row — info + edit only (delete lives in the modal).
 */
export default function ContactPersonCard({ person, onEdit }) {
  const name = getContactPersonDisplayName(person);
  const jobLabel = getContactPersonJobLabel(person.jobPosition);
  const mobile = person.mobile || '—';
  const hasRole = Boolean(jobLabel && jobLabel !== '—');

  return (
    <li className="contact-person-row">
      <div className="contact-person-row__info">
        <div className="contact-person-row__line contact-person-row__line--primary">
          {person.isPrimary ? (
            <span className="contact-person-row__star" title="رابط اصلی">
              <Star size={14} strokeWidth={1.75} aria-hidden="true" />
            </span>
          ) : null}
          <span className="contact-person-row__name font-meem">{name}</span>
          {hasRole ? (
            <span className="contact-person-row__role font-meem">{jobLabel}</span>
          ) : null}
        </div>

        <div className="contact-person-row__line contact-person-row__line--meta">
          <span className="contact-person-row__phone font-yekan">{mobile}</span>
        </div>
      </div>

      <div className="contact-person-row__actions" role="group" aria-label={`عملیات ${name}`}>
        <button
          type="button"
          className="contact-person-action"
          title="ویرایش رابط"
          aria-label="ویرایش رابط"
          onClick={() => onEdit?.(person.id)}
        >
          <Edit2 size={15} strokeWidth={1.75} />
        </button>
      </div>
    </li>
  );
}
