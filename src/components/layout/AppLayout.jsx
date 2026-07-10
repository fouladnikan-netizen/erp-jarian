import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { modules } from '../../modules/registry';
import Header from './Header';
import Sidebar from './Sidebar';

const SIDEBAR_STORAGE_KEY = 'jaryan-sidebar-expanded';

function getModuleByPath(pathname) {
  const normalized = pathname === '' || pathname === '/' ? '/' : pathname;
  return modules.find((m) => m.path === normalized) || modules[0];
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
    document.title = `${currentModule.name} | جریان`;
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
