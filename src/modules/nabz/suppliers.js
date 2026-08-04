/**
 * Nabz supplier helpers — facade over the shared Company SSOT (useContactsStore).
 * Do NOT read initialContacts seed directly (bypasses live mutations).
 *
 * Supplier ≡ Company with entityType === supplier.
 */
import { useContactsStore } from '../../stores/useContactsStore';
import { getDisplayName } from '../kanoon/columns';
import { ENTITY_TYPES } from '../kanoon/config';

function getContacts() {
  return useContactsStore.getState().contacts;
}

export function listSuppliers() {
  return getContacts().filter(
    (c) => c.entityType === ENTITY_TYPES.SUPPLIER && c.isActive !== false,
  );
}

export function getSupplierById(id) {
  if (!id) return null;
  const contact = getContacts().find((c) => String(c.id) === String(id));
  if (!contact || contact.entityType !== ENTITY_TYPES.SUPPLIER) return null;
  return contact;
}

export function getSupplierName(supplierId) {
  const supplier = getSupplierById(supplierId);
  return supplier ? getDisplayName(supplier) : '—';
}
