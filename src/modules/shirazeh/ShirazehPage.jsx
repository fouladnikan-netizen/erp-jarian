import { Navigate, useLocation, useParams } from 'react-router-dom';
import {
  DEFAULT_SETTINGS_SECTION,
  getSettingsMenuItem,
  SETTINGS_MENU,
  SHIRAZEH_BASE_PATH,
} from './config/settingsMenu';
import { DEFINITIONS_MENU } from './config/definitionsMenu';
import SystemHealthCards from './components/SystemHealthCards';
import SettingsNavigation from './components/SettingsNavigation';
import SettingsContent from './components/SettingsContent';
import SettingsSectionPlaceholder from './components/SettingsSectionPlaceholder';
import IntegrationsPage from './integrations/IntegrationsPage';
import './shirazeh.css';

/**
 * Shirazeh master-detail shell.
 * Child routes render inside SettingsContent → Outlet (see App.jsx).
 * Settings and Definitions share the same nav + content workspace.
 */
export default function ShirazehPage() {
  const location = useLocation();
  const isDefinitions = location.pathname.startsWith(`${SHIRAZEH_BASE_PATH}/definitions`);

  return (
    <div className="module-page shirazeh-page" data-module="shirazeh" dir="rtl">
      <SystemHealthCards />

      <div className="shirazeh-workspace">
        <SettingsNavigation
          items={isDefinitions ? DEFINITIONS_MENU : SETTINGS_MENU}
          title={isDefinitions ? 'تعاریف' : 'تنظیمات'}
          subtitle={isDefinitions ? 'اطلاعات پایه و ساختارهای مرجع سیستم' : undefined}
          ariaLabel={isDefinitions ? 'بخش‌های تعاریف' : 'بخش‌های تنظیمات'}
        />
        <SettingsContent aria-label={isDefinitions ? 'محتوای تعاریف' : undefined} />
      </div>
    </div>
  );
}

export { IntegrationsPage };

/** Generic placeholder for sections without a dedicated page yet. */
export function ShirazehPlaceholderSection() {
  const { sectionId: paramId } = useParams();
  const location = useLocation();
  const sectionId = paramId || location.pathname.split('/').filter(Boolean).pop();
  const item = getSettingsMenuItem(sectionId);

  return (
    <div className="shirazeh-section">
      <header className="shirazeh-section__header">
        <h2 className="shirazeh-section__title font-meem">{item.label}</h2>
        <p className="shirazeh-section__desc font-meem">{item.description}</p>
      </header>
      <SettingsSectionPlaceholder />
    </div>
  );
}

/**
 * Fallback for unknown /shirazeh/:sectionId values — stay inside Shirazeh.
 */
export function ShirazehSectionRoute() {
  const { sectionId } = useParams();
  const known = SETTINGS_MENU.some((item) => item.id === sectionId);

  if (!known) {
    return <Navigate to={`${SHIRAZEH_BASE_PATH}/${DEFAULT_SETTINGS_SECTION.id}`} replace />;
  }

  if (sectionId === 'integrations') {
    return <IntegrationsPage />;
  }

  return <ShirazehPlaceholderSection />;
}
