import { getDisplayName } from '../../kanoon/columns';
import { listCustomers } from '../customers';
import SearchCombobox from './SearchCombobox';

export default function CustomerCombobox({ value, onChange }) {
  const customers = listCustomers();

  return (
    <SearchCombobox
      value={value}
      onChange={onChange}
      options={customers}
      getOptionKey={(contact) => contact.id}
      getOptionLabel={(contact) => getDisplayName(contact)}
      getOptionMeta={(contact) => [contact.province, contact.activityDomain].filter(Boolean).join(' · ')}
      placeholder="جستجو در نام شرکت..."
      ariaLabel="مشتری"
      emptyMessage="مشتری‌ای یافت نشد."
    />
  );
}
