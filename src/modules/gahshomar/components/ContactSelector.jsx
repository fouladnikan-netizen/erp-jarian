import { getDisplayName } from '../../kanoon/columns';
import SearchCombobox from '../../nabz/components/SearchCombobox';
import { buildCompanyParticipant, listLetterCompanies } from '../services/letterContactSearch';
import '../../nabz/nabz.css';
import '../gahshomar-page.css';

/**
 * Recipient/sender picker — same UX as Nabz CustomerCombobox (SearchCombobox).
 * Label only: company / natural-person name (no province / activity meta).
 */
export default function ContactSelector({
  value = null,
  onChange,
  disabled = false,
  readOnly = false,
  label = 'گیرنده',
  role = 'RECEIVER',
  required = false,
}) {
  const companies = listLetterCompanies();
  const rawId = value?.companyId ?? value?.partyId ?? null;
  const selected = rawId == null
    ? null
    : companies.find((contact) => String(contact.id) === String(rawId)) || null;
  const selectedId = selected ? selected.id : null;

  const handleChange = (companyId) => {
    if (companyId == null || companyId === '') {
      onChange?.(null);
      return;
    }
    const company = companies.find((item) => String(item.id) === String(companyId));
    onChange?.(company ? buildCompanyParticipant(company, role) : null);
  };

  return (
    <div className={`gahshomar-modal__field font-meem${readOnly ? ' is-readonly' : ''}`}>
      <span>
        {label}
        {required ? <span className="gahshomar-req" aria-hidden="true">*</span> : null}
      </span>
      <SearchCombobox
        value={selectedId}
        onChange={handleChange}
        options={companies}
        getOptionKey={(contact) => contact.id}
        getOptionLabel={(contact) => getDisplayName(contact)}
        placeholder="جستجو در نام شرکت..."
        ariaLabel={required ? `${label} (الزامی)` : label}
        emptyMessage="شرکتی یافت نشد."
        disabled={disabled || readOnly}
      />
    </div>
  );
}
