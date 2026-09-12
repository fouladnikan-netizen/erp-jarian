import { useMockApi } from './useMockApi';
import { useContactsStore } from '../stores/useContactsStore';
import { useNabzStore } from '../modules/nabz/store/useNabzStore';
import { useLeadsStore } from '../stores/useLeadsStore';
import { loadOrganizationIdentity } from '../domain/organizationIdentity';

/** Load Company + Order + Lead aggregates from API after login */
export async function hydrateErpData() {
  if (useMockApi()) {
    await useNabzStore.getState().fetchOrders();
    await loadOrganizationIdentity({ force: true });
    return;
  }

  await Promise.all([
    useContactsStore.getState().fetchContacts(),
    useNabzStore.getState().fetchOrders(),
    useLeadsStore.getState().fetchLeads(),
    loadOrganizationIdentity({ force: true }),
  ]);
}

export default hydrateErpData;
