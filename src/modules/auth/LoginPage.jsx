import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import logoUrl from '../../assets/logo.png';
import LoginForm from './LoginForm';
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

  useEffect(() => {
    document.title = 'ورود | جریان';
  }, []);

  if (isAuthenticated()) {
    const redirectTo = location.state?.from?.pathname || '/';
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async ({ username, password }) => {
    setError('');
    setLoading(true);
    try {
      await authenticate({ username, password });
      const redirectTo = location.state?.from?.pathname || '/';
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || 'ورود ناموفق بود. دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-page__ambient" aria-hidden="true" />

      <main className="auth-card" role="main">
        <header className="auth-card__brand">
          <img
            src={logoUrl}
            alt="پترو فولاد نیکان"
            className="auth-card__logo"
            width={220}
            height={76}
            decoding="async"
          />
          <p className="auth-card__statement font-meem">
            قدرت ساختن، از تصمیم‌های دقیق آغاز می‌شود.
          </p>
        </header>

        <LoginForm
          onSubmit={handleSubmit}
          loading={loading}
          error={error}
        />

        <footer className="auth-card__footer">
          <p className="auth-card__footer-brand font-meem">Petro Foulad Nikan</p>
          <p className="auth-card__footer-meta font-yekan">Jarian ERP v1.0</p>
        </footer>
      </main>
    </div>
  );
}
