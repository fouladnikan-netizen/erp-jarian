/**
 * @deprecated Compatibility shim — canonical store is `src/modules/sales/store/useSalesStore`.
 * Same Zustand instance; do not create a second Order cache.
 */
export { useSalesStore as useNabzStore, useSalesStore } from '../../sales/store/useSalesStore';
export type { OrderDraft } from '../../sales/store/useSalesStore';
