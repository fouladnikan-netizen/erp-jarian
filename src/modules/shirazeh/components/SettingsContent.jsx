import { Outlet, useLocation } from 'react-router-dom';
import SettingsErrorBoundary from './SettingsErrorBoundary';

/**
 * Settings main pane.
 * Renders optional header + React Router Outlet for nested section pages.
 * Error boundary keeps the Shirazeh shell mounted if a section crashes.
 * Keyed by pathname so a prior section crash does not stick on navigation.
 */
export default function SettingsContent({ title, description, children }) {
  const location = useLocation();

  return (
    <section className="shirazeh-content" aria-label={title || 'محتوای تنظیمات'}>
      {(title || description) ? (
        <header className="shirazeh-content__header">
          {title ? (
            <h2 className="shirazeh-content__title font-meem">{title}</h2>
          ) : null}
          {description ? (
            <p className="shirazeh-content__desc font-meem">{description}</p>
          ) : null}
        </header>
      ) : null}

      <div className="shirazeh-content__body">
        <SettingsErrorBoundary key={location.pathname}>
          {children ?? <Outlet />}
        </SettingsErrorBoundary>
      </div>
    </section>
  );
}
