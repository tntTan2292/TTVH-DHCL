import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { translateLegacyViolationsSearch } from './features/route/routeViolationEvidenceData';
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

// /f13/ranking/shipment is not deleted (Product Owner decision, 2026-08-11): it now redirects
// to the canonical /f13/evidence route, preserving the full query string / deep-link context
// (from_date, bcvh_id, bcvh_name, route_id, route_name, shipment_id, ...).
function LegacyShipmentRedirect() {
  const location = useLocation();
  return <Navigate to={`/f13/evidence${location.search}`} replace />;
}

// /f13/ranking/route/violations is not deleted (Product Owner Phase 3 decision,
// F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md Section 6): Tuyến Ranking's
// drill-down button now targets /f13/evidence directly, and this path becomes a
// translating redirect for old links/bookmarks — `date` becomes both `from_date` and
// `to_date` (the same value), while bcvh_id/bcvh_name/route_id/route_name/reason/
// return_to pass through unchanged, so an old bookmark lands on the exact day it was
// saved for rather than silently on the newest imported day. Widened to admin+viewer to
// match the destination — a viewer following an old link is redirected, not bounced to
// "unauthorized". The RouteViolationEvidencePage component itself is retired only in
// Phase 4, once accepted; it is simply no longer reachable via this path.
function LegacyRouteViolationsRedirect() {
  const location = useLocation();
  const translated = translateLegacyViolationsSearch(location.search);
  return <Navigate to={`/f13/evidence${translated ? `?${translated}` : ''}`} replace />;
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
              <Route path="ranking/route/violations" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyRouteViolationsRedirect /></ProtectedRoute>} />
              <Route path="ranking/shipment" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyShipmentRedirect /></ProtectedRoute>} />
              <Route path="pareto" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><PlaceholderPage title="Pareto / RCA" /></ProtectedRoute>} />
              <Route path="evidence" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><ShipmentPerformancePage /></ProtectedRoute>} />
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
