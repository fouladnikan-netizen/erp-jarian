import { Navigate, useSearchParams } from 'react-router-dom';
import { resolveLegacyUsersAccessTab } from '../config/definitionsMenu';

/**
 * Legacy hub: /shirazeh/definitions/users-access?tab=users|organization|permissions
 * Redirects to the canonical Definitions section. Pages themselves are unchanged.
 */
export default function UsersAccessPage() {
  const [searchParams] = useSearchParams();
  return <Navigate to={resolveLegacyUsersAccessTab(searchParams.get('tab'))} replace />;
}
