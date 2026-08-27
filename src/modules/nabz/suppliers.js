/**
 * Nabz supplier helpers — via Kanoon public Company facade.
 * Supplier ≡ Company with entityType === supplier.
 */
import { getDisplayName } from '../kanoon/columns';
import { ENTITY_TYPES } from '../kanoon/config';
import { getCompany, listCompanies } from '../kanoon/public/index.js';

export function listSuppliers() {
  return listCompanies().filter(
    (c) => c.entityType === ENTITY_TYPES.SUPPLIER && c.isActive !== false,
  );
}

export function getSupplierById(id) {
  const contact = getCompany(id);
  if (!contact || contact.entityType !== ENTITY_TYPES.SUPPLIER) return null;
  return contact;
}

export function getSupplierName(supplierId) {
  const supplier = getSupplierById(supplierId);
  return supplier ? getDisplayName(supplier) : '—';
}
