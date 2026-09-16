import { useEffect, useState } from 'react';
import {
  EMPTY_ORGANIZATION_IDENTITY,
  getCachedOrganizationIdentity,
  loadOrganizationIdentity,
  subscribeOrganizationIdentity,
} from './organizationIdentityFacade.js';

/**
 * Live Organization Identity for current views. Empty shape while loading —
 * never throws, never leaves identity undefined.
 */
export function useOrganizationIdentity() {
  const [identity, setIdentity] = useState(
    () => getCachedOrganizationIdentity() || EMPTY_ORGANIZATION_IDENTITY,
  );
  const [loading, setLoading] = useState(() => !getCachedOrganizationIdentity());

  useEffect(() => {
    const unsub = subscribeOrganizationIdentity(() => {
      setIdentity(getCachedOrganizationIdentity() || EMPTY_ORGANIZATION_IDENTITY);
      setLoading(false);
    });
    if (!getCachedOrganizationIdentity()) {
      setLoading(true);
      void loadOrganizationIdentity().then((row) => {
        setIdentity(row || EMPTY_ORGANIZATION_IDENTITY);
        setLoading(false);
      });
    }
    return unsub;
  }, []);

  return { identity, loading };
}
