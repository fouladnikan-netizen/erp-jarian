import { JARIAN_PRODUCT_TAGLINE } from '../../config/brand';

/**
 * Global product footer — bottom center across ERP shell and login.
 */
export default function AppFooter({ className = '' }) {
  return (
    <footer className={`app-footer${className ? ` ${className}` : ''}`} aria-label="اطلاعات محصول">
      <p className="app-footer__tagline">{JARIAN_PRODUCT_TAGLINE}</p>
    </footer>
  );
}
