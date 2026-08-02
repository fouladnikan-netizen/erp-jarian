import { Routes, Route, Navigate } from 'react-router-dom';
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
import CampaignsDashboard from './modules/kampayn/CampaignsDashboard';
import SurveyBuilder from './modules/kampayn/SurveyBuilder';
import { NabzOrdersProvider } from './modules/nabz/NabzOrdersContext';
import { modules, moduleData } from './modules/registry';

export default function App() {
  return (
    // پل طلایی افق ↔ نبض: پرووایدر سفارشات باید بالای همه مسیرها بماند تا
    // سفارشِ ساخته‌شده از افق هنگام ناوبری به /nabz از بین نرود.
    <NabzOrdersProvider>
      <Routes>
        <Route path="/nabz/proforma/preview" element={<ProformaPreviewPage />} />
        <Route path="/nabz/shipping/preview" element={<ShippingPreviewPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<KanoonPage />} />
          <Route path="/kanoon/contact/:contactId" element={<CustomerProfilePage />} />
          <Route path="/vitrin" element={<VitrinPage />} />
          <Route path="/ofogh" element={<OfoqModule />} />
          <Route path="/gahshomar" element={<CalendarPage />} />
          <Route path="/calendar" element={<Navigate to="/gahshomar" replace />} />
          <Route path="/kampayn" element={<CampaignsDashboard />} />
          <Route path="/kampayn/survey" element={<SurveyBuilder />} />
          <Route path="/nabz" element={<NabzPage />} />
          <Route path="/nabz/new-order" element={<NabzPage />} />
          <Route path="/nabz/order/:orderCode" element={<OrderDetailPage />} />
          {modules
            .filter((module) => (
              module.id !== 'kanoon'
              && module.id !== 'vitrin'
              && module.id !== 'nabz'
              && module.id !== 'ofogh'
              && module.id !== 'gahshomar'
              && module.id !== 'kampayn'
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
      </Routes>
    </NabzOrdersProvider>
  );
}
