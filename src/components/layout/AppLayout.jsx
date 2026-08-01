import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { modules } from '../../modules/registry';
import { buildDocumentTitle } from '../../config/brand';
import Header from './Header';
import Sidebar from './Sidebar';

const SIDEBAR_STORAGE_KEY = 'jaryan-sidebar-expanded';

function getModuleByPath(pathname) {
  const normalized = pathname === '' || pathname === '/' ? '/' : pathname;
  const exact = modules.find((m) => m.path === normalized);
  if (exact) return exact;
  /* زیرمسیرها: /kanoon/contact/۳ ← کانون (مسیر کانون خودِ / است)، /nabz/order/… ← نبض */
  if (normalized.startsWith('/kanoon')) {
    return modules.find((m) => m.id === 'kanoon') || modules[0];
  }
  return modules.find((m) => m.path !== '/' && normalized.startsWith(m.path)) || modules[0];
}

function readSidebarPreference() {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function AppLayout() {
  const location = useLocation();
  const currentModule = getModuleByPath(location.pathname);
  const [sidebarExpanded, setSidebarExpanded] = useState(readSidebarPreference);

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.title = buildDocumentTitle(currentModule.name);
  }, [currentModule]);

  return (
    <div
      className={`app-shell${sidebarExpanded ? ' app-shell--sidebar-expanded' : ' app-shell--sidebar-collapsed'}`}
    >
      <Sidebar expanded={sidebarExpanded} onToggle={toggleSidebar} />
      <div className="app-content">
        <Header module={currentModule} />
        <main className="main" role="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
