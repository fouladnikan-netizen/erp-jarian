import { initialContacts } from '../kanoon/contactsData';
import { getDisplayName } from '../kanoon/columns';
import { ENTITY_TYPES } from '../kanoon/config';

export function listSuppliers() {
  return initialContacts.filter(
    (c) => c.entityType === ENTITY_TYPES.SUPPLIER && c.isActive !== false,
  );
}

export function getSupplierById(id) {
  if (!id) return null;
  const contact = initialContacts.find((c) => c.id === id);
  if (!contact || contact.entityType !== ENTITY_TYPES.SUPPLIER) return null;
  return contact;
}

export function getSupplierName(supplierId) {
  const supplier = getSupplierById(supplierId);
  return supplier ? getDisplayName(supplier) : '—';
}
