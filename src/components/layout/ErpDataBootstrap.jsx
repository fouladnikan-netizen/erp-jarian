import { useEffect, useRef } from 'react';
import { isAuthenticated } from '../../modules/auth/authSession';
import { useSessionStore } from '../../stores/useSessionStore';
import hydrateErpData from '../../api/bootstrap';

/**
 * After auth: hydrate session permissions from Backend, then ERP aggregates.
 */
export default function ErpDataBootstrap({ children }) {
  const ran = useRef(false);
  const hydrateSession = useSessionStore((s) => s.hydrate);

  useEffect(() => {
    if (!isAuthenticated() || ran.current) return;
    ran.current = true;
    void (async () => {
      try {
        await hydrateSession();
        await hydrateErpData();
      } catch (error) {
        console.error('[erp-bootstrap] hydrate failed', error);
        ran.current = false;
      }
    })();
  }, [hydrateSession]);

  return children;
}
