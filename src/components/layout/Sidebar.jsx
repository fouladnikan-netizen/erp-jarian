import { NavLink } from 'react-router-dom';
import { mainModules, footerModule } from '../../modules/registry';
import logo from '../../assets/images/nikan4.png';
import { MODULE_ICONS } from './ModuleIcons';

function ChevronIcon({ expanded }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`sidebar__chevron${expanded ? ' sidebar__chevron--expanded' : ''}`}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function NavItem({ module, expanded }) {
  const Icon = MODULE_ICONS[module.id];

  return (
    <li className="sidebar__item">
      <NavLink
        to={module.path}
        className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
        title={!expanded ? module.name : undefined}
      >
        <span className="sidebar__icon">
          <Icon />
        </span>
        <span className="sidebar__label">
          <span className="sidebar__name">{module.name}</span>
          <small className="sidebar__subtitle">{module.subtitle}</small>
        </span>
      </NavLink>
    </li>
  );
}

export default function Sidebar({ expanded, onToggle }) {
  return (
    <aside
      id="main-nav"
      className={`sidebar${expanded ? ' sidebar--expanded' : ' sidebar--collapsed'}`}
      aria-label="منوی اصلی"
    >
      <div className="sidebar__brand">
        <button
          type="button"
          className="sidebar__toggle btn btn--ghost"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls="main-nav"
          aria-label={expanded ? 'جمع کردن منو' : 'باز کردن منو'}
        >
          <ChevronIcon expanded={expanded} />
        </button>

        <div className="sidebar__brand-core">
          <img
            src={logo}
            alt="پترو فولاد نیکان"
            className="sidebar__logo"
          />
          {expanded && (
            <div className="sidebar__brand-text">
              <h1 className="sidebar__brand-title">جریان</h1>
              <p className="sidebar__brand-tagline">سامانه مدیریت یکپارچه‌ی سفارشات</p>
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="ماژول‌ها">
        <ul className="sidebar__list">
          {mainModules.map((module) => (
            <NavItem key={module.id} module={module} expanded={expanded} />
          ))}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <ul className="sidebar__list">
          <NavItem module={footerModule} expanded={expanded} />
        </ul>
      </div>
    </aside>
  );
}
