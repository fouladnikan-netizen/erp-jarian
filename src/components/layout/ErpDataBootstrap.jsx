import { useEffect, useRef } from 'react';
import { isAuthenticated } from '../../modules/auth/authSession';
import hydrateErpData from '../../api/bootstrap';

/**
 * After auth, load Company + Order aggregates from PostgreSQL (or mock seeds).
 */
export default function ErpDataBootstrap({ children }) {
  const ran = useRef(false);

  useEffect(() => {
    if (!isAuthenticated() || ran.current) return;
    ran.current = true;
    void hydrateErpData().catch((error) => {
      console.error('[erp-bootstrap] hydrate failed', error);
      ran.current = false;
    });
  }, []);

  return children;
}
