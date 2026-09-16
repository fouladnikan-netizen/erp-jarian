import { Navigate } from 'react-router-dom';

/** Legacy Shirazeh Product Master URL — admin UI now lives under Vitrin. */
export default function ProductMasterPage() {
  return <Navigate to="/vitrin/structure" replace />;
}
