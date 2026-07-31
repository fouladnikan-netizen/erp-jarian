import { useMemo } from 'react';
import { expertKey, findExpertByKey, listCustomerExperts } from '../customers';
import SearchCombobox from './SearchCombobox';

export default function ExpertCombobox({ customerId, value, onChange }) {
  const experts = useMemo(
    () => (customerId ? listCustomerExperts(customerId) : []),
    [customerId],
  );

  return (
    <SearchCombobox
      value={value}
      onChange={onChange}
      options={experts}
      getOptionKey={expertKey}
      getOptionLabel={(person) => person.name}
      getOptionMeta={(person) => [person.role, person.mobile].filter(Boolean).join(' · ')}
      placeholder={customerId ? 'جستجو در کارشناسان مرتبط...' : 'ابتدا نام شرکت را انتخاب کنید'}
      ariaLabel="کارشناس مرتبط"
      disabled={!customerId}
      emptyMessage="کارشناسی یافت نشد."
    />
  );
}

export function getExpertFromValue(customerId, value) {
  return findExpertByKey(customerId, value);
}
