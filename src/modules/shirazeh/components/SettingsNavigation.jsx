import { NavLink } from 'react-router-dom';
import {
  Settings,
  Plug,
  Warehouse,
  Palette,
  DatabaseBackup,
  ListChecks,
  Mail,
  Boxes,
  Landmark,
  Users,
  Network,
  Shield,
  Drama,
} from 'lucide-react';
import { SETTINGS_MENU, SHIRAZEH_BASE_PATH } from '../config/settingsMenu';

const ICON_MAP = {
  Settings,
  Plug,
  Warehouse,
  Palette,
  DatabaseBackup,
  ListChecks,
  Mail,
  Boxes,
  Landmark,
  Users,
  Network,
  Shield,
  Drama,
};

/**
 * Configuration-driven settings/definitions sidebar.
 * NavLinks use each item's absolute path.
 */
export default function SettingsNavigation({
  items = SETTINGS_MENU,
  title = 'تنظیمات',
  subtitle,
  ariaLabel = 'بخش‌های تنظیمات',
}) {
  return (
    <nav className={`shirazeh-nav${subtitle ? ' shirazeh-nav--with-subtitle' : ''}`} aria-label={ariaLabel}>
      <p className="shirazeh-nav__title font-meem">{title}</p>
      {subtitle ? (
        <p className="shirazeh-nav__subtitle font-meem">{subtitle}</p>
      ) : null}
      <ul className="shirazeh-nav__list">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon] || Settings;
          const to = item.path || `${SHIRAZEH_BASE_PATH}/${item.id}`;
          return (
            <li key={item.id}>
              <NavLink
                to={to}
                end={Boolean(item.end)}
                className={({ isActive }) =>
                  `shirazeh-nav__item${isActive ? ' shirazeh-nav__item--active' : ''}`
                }
              >
                <span className="shirazeh-nav__icon" aria-hidden="true">
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <span className="shirazeh-nav__text">
                  <span className="shirazeh-nav__label font-meem">{item.label}</span>
                  {item.description ? (
                    <span className="shirazeh-nav__desc font-meem">{item.description}</span>
                  ) : null}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
