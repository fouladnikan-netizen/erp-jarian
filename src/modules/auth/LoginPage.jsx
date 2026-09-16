import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import LoginForm from './LoginForm';
import AuthShell from './AuthShell';
import { authenticate, isAuthenticated } from './authSession';
import './auth.css';

/**
 * Isolated authentication entry — no ERP shell, sidebar, or header.
 */
export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated()) {
    const redirectTo = location.state?.from?.pathname || '/';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async ({ mobile, password }) => {
    setError('');
    setLoading(true);
    try {
      await authenticate({ mobile, password });
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || 'ورود ناموفق بود. دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="ورود">
      <LoginForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
    </AuthShell>
  );
}
