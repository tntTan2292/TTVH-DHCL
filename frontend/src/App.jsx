import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardHome from './pages/DashboardHome';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import SharedComponentsDemo from './pages/SharedComponentsDemo';
import SharedLayoutDemo from './pages/SharedLayoutDemo';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ROLE_ADMIN, ROLE_VIEWER, getDefaultRouteForRole } from './auth/roles';

import F11Quality from './pages/F11Quality';
import F12Quality from './pages/F12Quality';
import F41Quality from './pages/F41Quality';
import DataImportCenter from './pages/DataImportCenter';
import KpiConfiguration from './pages/KpiConfiguration';
import SystemInformation from './pages/SystemInformation';

import DashboardPage from './features/dashboard/DashboardPage';
import BcvhRankingPage from './features/ranking/BcvhRankingPage';
import RoutePerformancePage from './features/route/RoutePerformancePage';
import RouteViolationEvidencePage from './features/route/RouteViolationEvidencePage';
import ShipmentPerformancePage from './features/shipment/ShipmentPerformancePage';
import ServicePointsPage from './features/networkMap/ServicePointsPage';
import Level2RoutesPage from './features/networkMap/Level2RoutesPage';
import DeliveryRoutesPage from './features/networkMap/DeliveryRoutesPage';
import IntegratedMapPage from './features/networkMap/IntegratedMapPage';
import { PlaceholderPage } from './components/common/Containers';
import { ErrorLayout } from './components/common/StateLayouts';

function HomeRoute() {
  const { user } = useAuth();
  const target = getDefaultRouteForRole(user?.role);

  if (target !== '/') {
    return <Navigate to={target} replace />;
  }

  return <DashboardHome />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route
            path="/dev/shared-components"
            element={
              <ProtectedRoute allowedRoles={[ROLE_ADMIN]}>
                <SharedComponentsDemo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dev/shared-layout"
            element={
              <ProtectedRoute allowedRoles={[ROLE_ADMIN]}>
                <SharedLayoutDemo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<HomeRoute />} />

            <Route path="f11" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><F11Quality /></ProtectedRoute>} />
            <Route path="f12" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><F12Quality /></ProtectedRoute>} />
            <Route path="f41" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><F41Quality /></ProtectedRoute>} />
            <Route path="import" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><DataImportCenter /></ProtectedRoute>} />
            <Route path="kpi-config" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><KpiConfiguration /></ProtectedRoute>} />
            <Route path="system-info" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><SystemInformation /></ProtectedRoute>} />

            <Route path="f13">
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><DashboardPage /></ProtectedRoute>} />
              <Route path="ranking/bcvh" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><BcvhRankingPage /></ProtectedRoute>} />
              <Route path="ranking/route" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><RoutePerformancePage /></ProtectedRoute>} />
              <Route path="ranking/route/violations" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><RouteViolationEvidencePage /></ProtectedRoute>} />
              <Route path="ranking/shipment" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><ShipmentPerformancePage /></ProtectedRoute>} />
              <Route path="pareto" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><PlaceholderPage title="Pareto / RCA" /></ProtectedRoute>} />
              <Route path="evidence" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><PlaceholderPage title="Evidence List" /></ProtectedRoute>} />
              <Route path="message" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><PlaceholderPage title="Message Center" /></ProtectedRoute>} />
            </Route>

            <Route path="network-map">
              <Route path="service-points" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><ServicePointsPage /></ProtectedRoute>} />
              <Route path="level2-routes" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><Level2RoutesPage /></ProtectedRoute>} />
              <Route path="delivery-routes" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><DeliveryRoutesPage /></ProtectedRoute>} />
              <Route path="integrated" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><IntegratedMapPage /></ProtectedRoute>} />
            </Route>
          </Route>

          <Route
            path="*"
            element={
              <div className="h-screen bg-white">
                <ErrorLayout error={{ message: 'Không tìm thấy trang web. URL không hợp lệ hoặc đã bị thay đổi.' }} />
              </div>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
