import { ENTITY_TYPES, PERSON_TYPES } from '../config';
import ListFilterBar from '../../../components/module/ListFilterBar';

/** Audience chips — customers / suppliers only (Nabz-style Block 2) */
export const KANOON_AUDIENCE_CHIPS = [
  { id: 'customers', label: 'مشتریان' },
  { id: 'suppliers', label: 'تامین‌کنندگان' },
];

/**
 * Kanoon unified toolbar filters — chip pattern (no legacy popovers / ad-hoc blocks).
 * Customers/suppliers and legal/natural sit on one row.
 */
export default function KanoonToolbar({
  audienceFilter,
  personType,
  onAudienceFilterChange,
  onPersonTypeChange,
}) {
  return (
    <ListFilterBar className="kanoon-toolbar" ariaLabel="فیلتر مخاطبین">
      <div className="nabz-tabs kanoon-audience-chips" role="tablist" aria-label="فهرست مخاطب">
        {KANOON_AUDIENCE_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            role="tab"
            aria-selected={audienceFilter === chip.id}
            className={`nabz-tabs__btn font-meem${audienceFilter === chip.id ? ' is-active' : ''}`}
            onClick={() => onAudienceFilterChange(chip.id)}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div
        className={`nabz-segment${personType === PERSON_TYPES.LEGAL ? ' nabz-segment--list' : ' nabz-segment--kanban'}`}
        role="group"
        aria-label="نوع شخصیت"
      >
        <span className="nabz-segment__pill" aria-hidden="true" />
        <button
          type="button"
          className={`nabz-segment__btn font-meem${personType === PERSON_TYPES.LEGAL ? ' is-active' : ''}`}
          aria-pressed={personType === PERSON_TYPES.LEGAL}
          onClick={() => onPersonTypeChange(PERSON_TYPES.LEGAL)}
        >
          حقوقی
        </button>
        <button
          type="button"
          className={`nabz-segment__btn font-meem${personType === PERSON_TYPES.NATURAL ? ' is-active' : ''}`}
          aria-pressed={personType === PERSON_TYPES.NATURAL}
          onClick={() => onPersonTypeChange(PERSON_TYPES.NATURAL)}
        >
          حقیقی
        </button>
      </div>
    </ListFilterBar>
  );
}

/** Resolve entity lens for table columns from audience chip */
export function entityTypeFromAudience(audienceFilter) {
  if (audienceFilter === 'suppliers') return ENTITY_TYPES.SUPPLIER;
  return ENTITY_TYPES.CUSTOMER;
}
