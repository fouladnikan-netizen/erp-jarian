import { useMockApi } from '../useMockApi';
import { useContactsStore } from '../../stores/useContactsStore';
import { useNabzStore } from '../../modules/nabz/store/useNabzStore';

/** Load Company + Order aggregates from API after login */
export async function hydrateErpData() {
  if (useMockApi()) {
    await useNabzStore.getState().fetchOrders();
    return;
  }

  await Promise.all([
    useContactsStore.getState().fetchContacts(),
    useNabzStore.getState().fetchOrders(),
  ]);
}

export default hydrateErpData;
