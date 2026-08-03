/**
 * Kanoon module store facade — contact-person CRUD lives on the shared contacts SSOT.
 * Prefer importing from here inside the Kanoon module.
 */
export { useContactsStore as useKanoonStore } from '../../../stores/useContactsStore';
