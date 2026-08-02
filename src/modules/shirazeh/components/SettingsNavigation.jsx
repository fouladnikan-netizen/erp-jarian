import { NavLink } from 'react-router-dom';
import {
  Settings,
  Users,
  Plug,
  Warehouse,
  Shield,
  Palette,
  DatabaseBackup,
} from 'lucide-react';
import { SETTINGS_MENU, SHIRAZEH_BASE_PATH } from '../config/settingsMenu';

const ICON_MAP = {
  Settings,
  Users,
  Plug,
  Warehouse,
  Shield,
  Palette,
  DatabaseBackup,
};

/**
 * Configuration-driven settings sidebar.
 * NavLinks always use absolute /shirazeh/:id paths (never relative).
 */
export default function SettingsNavigation({ items = SETTINGS_MENU }) {
  return (
    <nav className="shirazeh-nav" aria-label="بخش‌های تنظیمات">
      <p className="shirazeh-nav__title font-meem">تنظیمات</p>
      <ul className="shirazeh-nav__list">
        {items.map((item) => {
          const Icon = ICON_MAP[item.icon] || Settings;
          const to = `${SHIRAZEH_BASE_PATH}/${item.id}`;
          return (
            <li key={item.id}>
              <NavLink
                to={to}
                end={item.id !== 'security'}
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
