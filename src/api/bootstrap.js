import { useMockApi } from './useMockApi';
import { useContactsStore } from '../stores/useContactsStore';
import { useSalesStore } from '../modules/sales/store/useSalesStore';
import { useLeadsStore } from '../stores/useLeadsStore';
import { loadOrganizationIdentity } from '../domain/organizationIdentity';
import { loadDocumentChrome } from '../modules/sales/settings/documentChromeFacade.js';
import { loadGatewayCancelReasons } from '../modules/sales/settings/reasonRegistryFacade.js';

async function hydrateSettingsSsots() {
  await Promise.all([
    loadDocumentChrome({ force: true }),
    loadGatewayCancelReasons({ force: true }),
  ]);
}

/** Load Company + Order + Lead aggregates + settings chrome/reasons from API after login */
export async function hydrateErpData() {
  if (useMockApi()) {
    await Promise.all([
      useSalesStore.getState().fetchOrders(),
      loadOrganizationIdentity({ force: true }),
      hydrateSettingsSsots(),
    ]);
    return;
  }

  await Promise.all([
    useContactsStore.getState().fetchContacts(),
    useSalesStore.getState().fetchOrders(),
    useLeadsStore.getState().fetchLeads(),
    loadOrganizationIdentity({ force: true }),
    hydrateSettingsSsots(),
  ]);
}

export default hydrateErpData;
