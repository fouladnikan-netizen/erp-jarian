import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ModulePage from './components/module/ModulePage';
import KanoonPage from './modules/kanoon/KanoonPage';
import CustomerProfilePage from './modules/kanoon/CustomerProfilePage';
import VitrinPage from './modules/vitrin/VitrinPage';
import NabzPage from './modules/nabz/NabzPage';
import OrderDetailPage from './modules/nabz/OrderDetailPage';
import ProformaPreviewPage from './modules/nabz/ProformaPreviewPage';
import ShippingPreviewPage from './modules/nabz/ShippingPreviewPage';
import OfoqModule from './modules/ofogh/OfoqModule';
import CalendarPage from './components/calendar/CalendarPage';
import MowjPage from './modules/mowj/MowjPage';
import CampaignDetailPage from './modules/mowj/CampaignDetailPage';
import SurveyBuilder from './modules/mowj/SurveyBuilder';
import TemplateManagementPage from './modules/mowj/TemplateManagementPage';
import CustomerSurveyApp from './modules/tanin/survey-client/CustomerSurveyApp';
import TaninAnalyticsDashboard from './modules/tanin/analytics/TaninAnalyticsDashboard';
import LoginPage from './modules/auth/LoginPage';
import RequireAuth from './modules/auth/RequireAuth';
import ShirazehPage, {
  ShirazehSectionRoute,
  ShirazehPlaceholderSection,
  IntegrationsPage,
  SecuritySettingsPage,
} from './modules/shirazeh/ShirazehPage';
import OrganizationStructurePage from './modules/shirazeh/security/organization/OrganizationStructurePage';
import PermissionsPage from './modules/shirazeh/security/permissions/PermissionsPage';
import UsersPage from './modules/shirazeh/users/UsersPage';
import { DEFAULT_SETTINGS_SECTION, SHIRAZEH_BASE_PATH } from './modules/shirazeh/config/settingsMenu';
import { NabzOrdersProvider } from './modules/nabz/NabzOrdersContext';
import { NotificationEngineProvider } from './context/NotificationEngineContext';
import { modules, moduleData } from './modules/registry';
import GahshomarPage from './modules/gahshomar/GahshomarPage';

function ProtectedErpShell() {
  return (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  );
}

export default function App() {
  return (
    // پل طلایی افق ↔ نبض: پرووایدر سفارشات باید بالای همه مسیرها بماند تا
    // سفارشِ ساخته‌شده از افق هنگام ناوبری به /nabz از بین نرود.
    <NabzOrdersProvider>
      <NotificationEngineProvider>
        <Routes>
          {/* ورود — بدون AppLayout / سایدبار ERP */}
          <Route path="/login" element={<LoginPage />} />

          {/* تجربه ایزوله مشتری — بدون AppLayout / سایدبار ERP */}
          <Route path="/survey/:surveyId" element={<CustomerSurveyApp />} />
          <Route path="/survey" element={<Navigate to="/survey/mock-id" replace />} />

          <Route path="/nabz/proforma/preview" element={<ProformaPreviewPage />} />
          <Route path="/nabz/shipping/preview" element={<ShippingPreviewPage />} />

          <Route element={<ProtectedErpShell />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<KanoonPage />} />
              <Route path="/kanoon/contact/:contactId" element={<CustomerProfilePage />} />
              <Route path="/vitrin" element={<VitrinPage />} />
              <Route path="/ofogh" element={<OfoqModule />} />
              {/* Product surface: CommitmentEngine under پویش */}
              <Route path="/pooyesh" element={<CalendarPage />} />
              <Route path="/gahshomar" element={<GahshomarPage />} />
              {/* Legacy bookmarks that opened CommitmentEngine under گاه‌شمار / calendar */}
              <Route path="/calendar" element={<Navigate to="/pooyesh" replace />} />
              <Route path="/commitments" element={<Navigate to="/pooyesh" replace />} />
              <Route path="/gahshomar/commitments" element={<Navigate to="/pooyesh" replace />} />
              <Route path="/mowj" element={<MowjPage />} />
              {/* Executive dashboards belong to آینه — Mowj exposes analytics contracts only */}
              <Route path="/mowj/dashboard" element={<Navigate to="/ayeneh" replace />} />
              <Route path="/mowj/campaign/:campaignId" element={<CampaignDetailPage />} />
              <Route path="/mowj/templates" element={<TemplateManagementPage />} />
              <Route path="/mowj/survey" element={<SurveyBuilder />} />
              {/* Legacy survey analytics path — not a Mowj dashboard surface */}
              <Route path="/mowj/analytics" element={<Navigate to="/tanin/analytics" replace />} />
              <Route path="/tanin/analytics" element={<TaninAnalyticsDashboard />} />
              {/* Legacy Kampayn bookmarks → Mowj */}
              <Route path="/kampayn" element={<Navigate to="/mowj" replace />} />
              <Route path="/kampayn/survey" element={<Navigate to="/mowj/survey" replace />} />
              <Route path="/kampayn/analytics" element={<Navigate to="/tanin/analytics" replace />} />
              <Route
                path="/kampayn/campaign/:campaignId"
                element={<Navigate to="/mowj" replace />}
              />
              <Route path="/nabz" element={<NabzPage />} />
              <Route path="/nabz/new-order" element={<NabzPage />} />
              <Route path="/nabz/order/:orderCode" element={<OrderDetailPage />} />

              <Route path="/shirazeh" element={<ShirazehPage />}>
                <Route
                  index
                  element={<Navigate to={`${SHIRAZEH_BASE_PATH}/${DEFAULT_SETTINGS_SECTION.id}`} replace />}
                />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="security" element={<SecuritySettingsPage />} />
                <Route path="security/organization" element={<OrganizationStructurePage />} />
                <Route path="security/permissions" element={<PermissionsPage />} />
                <Route path="general" element={<ShirazehPlaceholderSection />} />
                <Route path="warehouses" element={<ShirazehPlaceholderSection />} />
                <Route path="appearance" element={<ShirazehPlaceholderSection />} />
                <Route path="backup" element={<ShirazehPlaceholderSection />} />
                <Route path=":sectionId" element={<ShirazehSectionRoute />} />
              </Route>

              {modules
                .filter((module) => (
                  module.id !== 'kanoon'
                  && module.id !== 'vitrin'
                  && module.id !== 'nabz'
                  && module.id !== 'ofogh'
                  && module.id !== 'pooyesh'
                  && module.id !== 'gahshomar'
                  && module.id !== 'mowj'
                  && module.id !== 'kampayn'
                  && module.id !== 'shirazeh'
                ))
                .map((module) => (
                  <Route
                    key={module.id}
                    path={module.path}
                    element={<ModulePage module={module} data={moduleData[module.id]} />}
                  />
                ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </NotificationEngineProvider>
    </NabzOrdersProvider>
  );
}
