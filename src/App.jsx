import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ModulePage from './components/module/ModulePage';
import KanoonPage from './modules/kanoon/KanoonPage';
import VitrinPage from './modules/vitrin/VitrinPage';
import NabzPage from './modules/nabz/NabzPage';
import OrderDetailPage from './modules/nabz/OrderDetailPage';
import ProformaPreviewPage from './modules/nabz/ProformaPreviewPage';
import ShippingPreviewPage from './modules/nabz/ShippingPreviewPage';
import { NabzOrdersProvider } from './modules/nabz/NabzOrdersContext';
import { modules, moduleData } from './modules/registry';

function NabzRoutes() {
  return (
    <NabzOrdersProvider>
      <Outlet />
    </NabzOrdersProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/nabz/proforma/preview" element={<ProformaPreviewPage />} />
      <Route path="/nabz/shipping/preview" element={<ShippingPreviewPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<KanoonPage />} />
        <Route path="/vitrin" element={<VitrinPage />} />
        <Route element={<NabzRoutes />}>
          <Route path="/nabz" element={<NabzPage />} />
          <Route path="/nabz/order/:orderCode" element={<OrderDetailPage />} />
        </Route>
        {modules
          .filter((module) => module.id !== 'kanoon' && module.id !== 'vitrin' && module.id !== 'nabz')
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
  );
}
