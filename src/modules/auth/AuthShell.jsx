import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoUrl from '../../assets/logo.png';
import { JARIAN_PRODUCT_TAGLINE } from '../../config/brand';

export default function AuthShell({ title, children }) {
  useEffect(() => {
    document.title = `${title} | جریان`;
  }, [title]);

  return (
    <div className="auth-page" dir="rtl">
      <div className="auth-page__ambient" aria-hidden="true" />
      <div className="auth-page__body">
        <main className="auth-card" role="main">
          <header className="auth-card__brand">
            <Link to="/login" className="auth-card__logo-link">
              <img
                src={logoUrl}
                alt="پترو فولاد نیکان"
                className="auth-card__logo"
                width={220}
                height={76}
                decoding="async"
              />
            </Link>
            <p className="auth-card__statement font-meem">
              قدرت ساختن، از تصمیم‌های دقیق آغاز می‌شود.
            </p>
          </header>
          {children}
          <footer className="auth-card__footer">
            <p className="auth-card__footer-brand font-meem">Petro Foulad Nikan</p>
            <p className="auth-card__footer-meta font-yekan">{JARIAN_PRODUCT_TAGLINE}</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
