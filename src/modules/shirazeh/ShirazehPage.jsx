import { Navigate, useParams } from 'react-router-dom';
import {
  DEFAULT_SETTINGS_SECTION,
  getSettingsMenuItem,
  SETTINGS_MENU,
} from './config/settingsMenu';
import SystemHealthCards from './components/SystemHealthCards';
import SettingsNavigation from './components/SettingsNavigation';
import SettingsContent from './components/SettingsContent';
import SettingsSectionPlaceholder from './components/SettingsSectionPlaceholder';
import IntegrationsPage from './integrations/IntegrationsPage';
import SecuritySettingsPage from './security/SecuritySettingsPage';
import OrganizationStructurePage from './security/organization/OrganizationStructurePage';
import './shirazeh.css';

/**
 * Shirazeh layout shell — health strip + nav + content Outlet.
 * Nested routes under /shirazeh/* render inside SettingsContent.
 */
export default function ShirazehPage() {
  return (
    <div className="module-page shirazeh-page" data-module="shirazeh" dir="rtl">
      <SystemHealthCards />

      <div className="shirazeh-workspace">
        <SettingsNavigation items={SETTINGS_MENU} />
        <SettingsContent />
      </div>
    </div>
  );
}

export { SecuritySettingsPage, OrganizationStructurePage };

/**
 * Nested section route element — syncs header metadata with active menu item.
 * Dedicated section pages (e.g. Integrations) own their own header.
 */
export function ShirazehSectionRoute() {
  const { sectionId } = useParams();
  const known = SETTINGS_MENU.some((item) => item.id === sectionId);

  if (!known) {
    return <Navigate to={DEFAULT_SETTINGS_SECTION.path} replace />;
  }

  if (sectionId === 'integrations') {
    return <IntegrationsPage />;
  }

  if (sectionId === 'security') {
    return <SecuritySettingsPage />;
  }

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
