import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { footerModule, mainModules } from '../../modules/registry';
import { BRAND_NAME, SHOW_BRAND_NAME } from '../../config/brand';
import logo from '../../assets/images/nikan4.png';
import {
  ArrowLeftRight,
  Boxes,
  Building2,
  CircleCheck,
  Database,
  FileSpreadsheet,
  FileText,
  HeartPulse,
  IdCard,
  Layers,
  LayoutDashboard,
  ListChecks,
  Mail,
  Megaphone,
  Network,
  Package,
  Scale,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Truck,
  Wallet,
} from 'lucide-react';

/** Lucide glyphs already used across Jarian — one unique icon per sidebar item. */
const SIDEBAR_ICONS = {
  ayeneh: LayoutDashboard,
  contacts: Network,
  kanoon: Building2,
  pooyesh: ListChecks,
  marketing: TrendingUp,
  mowj: Megaphone,
  ofogh: Target,
  nabz: HeartPulse,
  nabzOpps: FileText,
  nabzSupply: Package,
  nabzOps: Truck,
  nabzClose: CircleCheck,
  finance: Scale,
  financeAccounts: Wallet,
  financeSales: FileSpreadsheet,
  financePurchase: ShoppingBag,
  financePayments: ArrowLeftRight,
  gahshomar: Mail,
  hr: IdCard,
  shirazeh: SlidersHorizontal,
  settings: Settings,
  definitions: Database,
  vitrin: Boxes,
  vitrinProducts: Boxes,
  vitrinStructure: Layers,
  kampayn: Megaphone,
};

const SIDEBAR_ICON_PROPS = {
  strokeWidth: 2,
  'aria-hidden': true,
};

const NAV_TREE = [
  {
    id: 'dashboard',
    name: 'آینه',
    subtitle: 'داشبورد مدیریتی',
    icon: 'ayeneh',
    path: '/ayeneh',
  },
  {
    id: 'contacts',
    name: 'پیوند',
    subtitle: 'مخاطبین و ارتباطات',
    icon: 'contacts',
    children: [
      {
        id: 'kanoon',
        name: 'کانون',
        subtitle: 'مشتریان و تأمین‌کنندگان',
        icon: 'kanoon',
        path: '/',
      },
      {
        id: 'pooyesh',
        name: 'پویش',
        subtitle: 'فعالیت‌ها و پیگیری‌ها',
        icon: 'pooyesh',
        path: '/pooyesh',
      },
    ],
  },
  {
    id: 'marketing',
    name: 'رویش',
    subtitle: 'بازاریابی و توسعه بازار',
    icon: 'marketing',
    children: [
      {
        id: 'mowj',
        name: 'موج',
        subtitle: 'کمپین‌های بازاریابی',
        icon: 'mowj',
        path: '/mowj',
      },
      {
        id: 'ofogh',
        name: 'افق',
        subtitle: 'سرنخ‌ها و فرصت‌های بازاریابی',
        icon: 'ofogh',
        path: '/ofogh',
      },
    ],
  },
  {
    id: 'nabz-group',
    name: 'نبض',
    subtitle: 'سفارش‌ها',
    icon: 'nabz',
    path: '/nabz',
    children: [
      {
        id: 'nabz-opps',
        name: 'فرصت',
        subtitle: 'فروش و پیش‌فاکتور',
        icon: 'nabzOpps',
        path: '/nabz?view=opportunities',
      },
      {
        id: 'nabz-supply',
        name: 'توشه',
        subtitle: 'خرید و تأمین کالا',
        icon: 'nabzSupply',
        path: '/nabz?view=supply',
      },
      {
        id: 'nabz-ops',
        name: 'رهسپار',
        subtitle: 'ارسال و تحویل',
        icon: 'nabzOps',
        path: '/nabz?view=operations',
      },
      {
        id: 'nabz-close',
        name: 'سرانجام',
        subtitle: 'نهایی‌سازی سفارش',
        icon: 'nabzClose',
        path: '/nabz?view=outcome',
      },
    ],
  },
  {
    id: 'vitrin',
    name: 'ویترین',
    subtitle: 'محصولات و ساختار کالا',
    icon: 'vitrin',
    path: '/vitrin',
    children: [
      {
        id: 'vitrin-products',
        name: 'محصولات',
        subtitle: 'فهرست و ثبت کالا',
        icon: 'vitrinProducts',
        path: '/vitrin',
      },
      {
        id: 'vitrin-structure',
        name: 'ساختار کالا',
        subtitle: 'انواع کالا و قواعد محصول',
        icon: 'vitrinStructure',
        path: '/vitrin/structure',
      },
    ],
  },
  {
    id: 'finance',
    name: 'تراز',
    subtitle: 'مالی و حسابداری',
    icon: 'finance',
    children: [
      { id: 'finance-accounts', name: 'حساب‌ها', icon: 'financeAccounts' },
      { id: 'finance-sales', name: 'فاکتورهای فروش', icon: 'financeSales' },
      { id: 'finance-purchase', name: 'فاکتورهای خرید', icon: 'financePurchase' },
      { id: 'finance-payments', name: 'دریافت و پرداخت', icon: 'financePayments' },
    ],
  },
  {
    id: 'gahshomar',
    name: 'گاه‌شمار',
    subtitle: 'مکاتبات و دبیرخانه',
    icon: 'gahshomar',
    path: '/gahshomar',
  },
  {
    id: 'hr',
    name: 'همراهان',
    subtitle: 'منابع انسانی',
    icon: 'hr',
  },
];

const SYSTEM_GROUP = {
  id: 'system',
  name: 'شیرازه',
  subtitle: 'مدیریت سیستم',
  icon: 'shirazeh',
  children: [
    {
      id: 'settings',
      name: 'تنظیمات',
      subtitle: 'تنظیمات سیستم',
      icon: 'settings',
      path: '/shirazeh',
    },
    {
      id: 'definitions',
      name: 'تعاریف',
      subtitle: 'اطلاعات پایه',
      icon: 'definitions',
      path: '/shirazeh/definitions',
    },
  ],
};

function ChevronIcon({ open, variant = 'rail' }) {
  const openClass = variant === 'group'
    ? (open ? ' sidebar__chevron--group-open' : '')
    : (open ? ' sidebar__chevron--expanded' : '');

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
      className={`sidebar__chevron${openClass}`}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function isPathActive(path, pathname, search = '') {
  if (!path) return false;
  const [pathOnly, query] = path.split('?');
  if (pathOnly === '/') return pathname === '/' || pathname.startsWith('/kanoon');
  if (pathOnly === '/shirazeh' && pathname.startsWith('/shirazeh/definitions')) return false;
  if (pathOnly === '/vitrin') return pathname === '/vitrin' || pathname === '/vitrin/';
  const pathMatches = pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
  if (!pathMatches) return false;
  const current = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  if (!query) {
    if (pathOnly === '/nabz') return !current.get('view');
    return true;
  }
  const required = new URLSearchParams(query);
  for (const [key, value] of required.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

function itemContainsActive(item, pathname, search = '') {
  if (isPathActive(item.path, pathname, search)) return true;
  return (item.children || []).some((child) => isPathActive(child.path, pathname, search));
}

function NavRow({ item, expanded }) {
  const Icon = SIDEBAR_ICONS[item.icon];
  const { pathname, search } = useLocation();
  const active = isPathActive(item.path, pathname, search);

  const content = (
    <>
      <span className="sidebar__icon">
        {Icon ? <Icon {...SIDEBAR_ICON_PROPS} /> : null}
      </span>
      <span className="sidebar__label">
        <span className="sidebar__name">{item.name}</span>
        {item.subtitle ? <small className="sidebar__subtitle">{item.subtitle}</small> : null}
      </span>
    </>
  );

  return (
    <li className="sidebar__item">
      {item.path ? (
        <NavLink
          to={item.path}
          end={item.path === '/' || item.path === '/vitrin'}
          className={() => `sidebar__link${active ? ' is-active' : ''}`}
          aria-current={active ? 'page' : false}
          title={!expanded ? item.name : undefined}
        >
          {content}
        </NavLink>
      ) : (
        <div className="sidebar__link" title={!expanded ? item.name : undefined}>
          {content}
        </div>
      )}
    </li>
  );
}

function NavGroup({ group, open, containsActive, onToggle, expanded, children }) {
  const Icon = SIDEBAR_ICONS[group.icon];
  const panelId = `sidebar-group-${group.id}`;
  const { pathname, search } = useLocation();
  const pathActive = Boolean(group.path && isPathActive(group.path, pathname, search));
  const showActive = Boolean((containsActive && !open) || (pathActive && !open));
  const rowActive = showActive || pathActive;

  const content = (
    <>
      <span className="sidebar__icon">
        {Icon ? <Icon {...SIDEBAR_ICON_PROPS} /> : null}
      </span>
      <span className="sidebar__label">
        <span className="sidebar__name">{group.name}</span>
        {group.subtitle ? <small className="sidebar__subtitle">{group.subtitle}</small> : null}
      </span>
      {expanded ? <ChevronIcon open={open} variant="group" /> : null}
    </>
  );

  const className = `sidebar__link sidebar__group-toggle${rowActive ? ' is-active' : ''}`;

  const handleParentClick = (event) => {
    if (group.path && pathActive && open) {
      event.preventDefault();
      onToggle(group.id);
      return;
    }
    if (!open) onToggle(group.id);
  };

  return (
    <li className="sidebar__group">
      {group.path ? (
        <NavLink
          to={group.path}
          end={group.path === '/vitrin'}
          className={className}
          aria-current={rowActive ? 'page' : undefined}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={handleParentClick}
        >
          {content}
        </NavLink>
      ) : (
        <button
          type="button"
          className={className}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => onToggle(group.id)}
        >
          {content}
        </button>
      )}
      {open && expanded ? (
        <ul id={panelId} className="sidebar__sublist">
          {children}
        </ul>
      ) : null}
    </li>
  );
}

function NavItem({ module, expanded }) {
  const Icon = SIDEBAR_ICONS[module.id];

  return (
    <li className="sidebar__item">
      <NavLink
        to={module.path}
        className={({ isActive }) => `sidebar__link${isActive ? ' is-active' : ''}`}
        title={!expanded ? module.name : undefined}
      >
        <span className="sidebar__icon">
          {Icon ? <Icon {...SIDEBAR_ICON_PROPS} /> : null}
        </span>
        <span className="sidebar__label">
          <span className="sidebar__name">{module.name}</span>
          <small className="sidebar__subtitle">{module.subtitle}</small>
        </span>
      </NavLink>
    </li>
  );
}

function renderTree(nodes, expanded, openGroupIds, onToggle, pathname, search) {
  return nodes.map((node) => {
    if (node.children?.length) {
      return (
        <NavGroup
          key={node.id}
          group={node}
          open={openGroupIds.includes(node.id)}
          containsActive={itemContainsActive(node, pathname, search)}
          onToggle={onToggle}
          expanded={expanded}
        >
          {node.children.map((child) => (
            <NavRow key={child.id} item={child} expanded={expanded} />
          ))}
        </NavGroup>
      );
    }
    return <NavRow key={node.id} item={node} expanded={expanded} />;
  });
}

export default function Sidebar({ expanded, onToggle }) {
  const { pathname, search } = useLocation();
  const groups = useMemo(
    () => [...NAV_TREE, SYSTEM_GROUP].filter((node) => node.children?.length),
    [],
  );

  const activeGroupId = useMemo(() => {
    const match = groups.find((group) => itemContainsActive(group, pathname, search));
    return match?.id || groups[0]?.id;
  }, [groups, pathname, search]);

  const [openGroupIds, setOpenGroupIds] = useState(() => (
    activeGroupId ? [activeGroupId] : []
  ));

  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroupIds((prev) => (
      prev.includes(activeGroupId) ? prev : [...prev, activeGroupId]
    ));
  }, [activeGroupId]);

  const toggleGroup = (groupId) => {
    setOpenGroupIds((prev) => (
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    ));
  };

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
          <ChevronIcon open={expanded} />
        </button>

        <div className="sidebar__brand-core">
          <img
            src={logo}
            alt="پترو فولاد نیکان"
            className="sidebar__logo"
          />
          {expanded && (
            <div className="sidebar__brand-text">
              {SHOW_BRAND_NAME && <h1 className="sidebar__brand-title">{BRAND_NAME}</h1>}
              <p className="sidebar__brand-tagline">سامانه مدیریت یکپارچه‌ی سفارشات</p>
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar__nav" aria-label="ماژول‌ها">
        <ul className="sidebar__list">
          {expanded
            ? renderTree(NAV_TREE, expanded, openGroupIds, toggleGroup, pathname, search)
            : mainModules.map((module) => (
              <NavItem key={module.id} module={module} expanded={expanded} />
            ))}
        </ul>
      </nav>

      <div className="sidebar__footer">
        <ul className="sidebar__list">
          {expanded
            ? renderTree([SYSTEM_GROUP], expanded, openGroupIds, toggleGroup, pathname, search)
            : <NavItem module={footerModule} expanded={expanded} />}
        </ul>
      </div>
    </aside>
  );
}
