import { Outlet } from 'react-router-dom';

/**
 * Settings main pane.
 * Renders optional header + React Router Outlet for nested section pages.
 * Pass children only for one-off overrides; prefer nested routes.
 */
export default function SettingsContent({ title, description, children }) {
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
        {children ?? <Outlet />}
      </div>
    </section>
  );
}
