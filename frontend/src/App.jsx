import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardHome from './pages/DashboardHome';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import SharedComponentsDemo from './pages/SharedComponentsDemo';
import SharedLayoutDemo from './pages/SharedLayoutDemo';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { IndicatorProvider } from './features/indicator/IndicatorContext.js';
import { F11_INDICATOR, F12_INDICATOR, F41_INDICATOR, F42_INDICATOR } from './features/indicator/indicatorConfig.js';
import { ROLE_ADMIN, ROLE_VIEWER, getDefaultRouteForRole } from './auth/roles';

import DataImportCenter from './pages/DataImportCenter';
import KpiConfiguration from './pages/KpiConfiguration';
import SystemInformation from './pages/SystemInformation';
import ChangePasswordPage from './pages/ChangePasswordPage';
import UserManagementPage from './pages/UserManagementPage';

import F13V2DayPage from './features/f13v2/F13V2DayPage';
import F13V2WeekPage from './features/f13v2/F13V2WeekPage';
import F13V2MonthPage from './features/f13v2/F13V2MonthPage';
import F13V2JourneyPage from './features/f13v2/F13V2JourneyPage';
import F13V2WhyPage from './features/f13v2/F13V2WhyPage';
import HangTonPage from './features/hangton/HangTonPage';
import BcvhRankingPage from './features/ranking/BcvhRankingPage';
import RoutePerformancePage from './features/route/RoutePerformancePage';
import { translateLegacyViolationsSearch } from './features/route/routeViolationEvidenceData';
import { translateLegacyF13DashboardSearch } from './navigation/urlPreservation';
import ShipmentPerformancePage from './features/shipment/ShipmentPerformancePage';
import ServicePointsPage from './features/networkMap/ServicePointsPage';
import Level2RoutesPage from './features/networkMap/Level2RoutesPage';
import DeliveryRoutesPage from './features/networkMap/DeliveryRoutesPage';
import IntegratedMapPage from './features/networkMap/IntegratedMapPage';
import PostmanCatalogPage from './features/networkMap/postmanCatalog/PostmanCatalogPage';
import OpsJournalPage from './features/ops-journal/OpsJournalPage';
import MyTasksPage from './features/ops-journal/MyTasksPage';
import { PlaceholderPage } from './components/common/Containers';
import { ErrorLayout } from './components/common/StateLayouts';

function HomeRoute() {
  const { user } = useAuth();
  if (user?.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  if (user?.access?.home) {
    return <DashboardHome />;
  }

  const target = getDefaultRouteForRole(user?.role);
  if (target !== '/' && !user?.access) {
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
// "unauthorized". Phase 4 (PO-accepted) permanently retired the old standalone violations
// component; this redirect never depended on it and keeps working unchanged.
function LegacyRouteViolationsRedirect() {
  const location = useLocation();
  const translated = translateLegacyViolationsSearch(location.search);
  return <Navigate to={`/f13/evidence${translated ? `?${translated}` : ''}`} replace />;
}

// TIME-AXIS-TEMPLATE-01: Theo ngày / tuần / tháng of the other indicators (PO accepted 2026-11-03).
const TIME_AXIS_INDICATORS = [F11_INDICATOR, F12_INDICATOR, F41_INDICATOR, F42_INDICATOR];
const TIME_AXIS_PAGES = [['ngay', F13V2DayPage], ['tuan', F13V2WeekPage], ['thang', F13V2MonthPage]];

// The old F1.3 Bảng điều hành is retired (PO 2026-11-03): its path stays for old links, the login default and the Home cards.
function LegacyF13DashboardRedirect() {
  const location = useLocation();
  return <Navigate to={`/f13/v2/ngay${translateLegacyF13DashboardSearch(location.search)}`} replace />;
}

// The old Bảng điều hành and Phân tích pages of F1.1, F1.2, F4.1, F4.2 are retired (PO 2026-11-03): old links keep the day and unit.
function LegacyTimeAxisRedirect({ to }) {
  const location = useLocation();
  return <Navigate to={`${to}${translateLegacyF13DashboardSearch(location.search)}`} replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/change-password" element={<ProtectedRoute><ChangePasswordPage /></ProtectedRoute>} />
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

            <Route path="f11" element={<Navigate to="/f11/v2/ngay" replace />} />
            <Route path="f11/dashboard" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyTimeAxisRedirect to="/f11/v2/ngay" /></ProtectedRoute>} />
            <Route path="f11/ranking/bcvh" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyTimeAxisRedirect to="/f11/v2/tuan" /></ProtectedRoute>} />
            <Route path="f12" element={<Navigate to="/f12/v2/ngay" replace />} />
            <Route path="f12/dashboard" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyTimeAxisRedirect to="/f12/v2/ngay" /></ProtectedRoute>} />
            <Route path="f12/ranking/bcvh" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyTimeAxisRedirect to="/f12/v2/tuan" /></ProtectedRoute>} />
            <Route path="f41" element={<Navigate to="/f41/v2/ngay" replace />} />
            <Route path="f41/dashboard" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyTimeAxisRedirect to="/f41/v2/ngay" /></ProtectedRoute>} />
            <Route path="f41/ranking/bcvh" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyTimeAxisRedirect to="/f41/v2/tuan" /></ProtectedRoute>} />
            <Route path="f42" element={<Navigate to="/f42/v2/ngay" replace />} />
            <Route path="f42/dashboard" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyTimeAxisRedirect to="/f42/v2/ngay" /></ProtectedRoute>} />
            <Route path="f42/ranking/bcvh" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyTimeAxisRedirect to="/f42/v2/tuan" /></ProtectedRoute>} />
            <Route path="hangton" element={<Navigate to="/hangton/overview" replace />} />
            <Route path="hangton/:tab" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><HangTonPage /></ProtectedRoute>} />
            <Route path="ops-journal" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><OpsJournalPage /></ProtectedRoute>} />
            <Route path="ops-journal/my-tasks" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><MyTasksPage /></ProtectedRoute>} />
            <Route path="my-tasks" element={<Navigate to="/ops-journal/my-tasks" replace />} />
            <Route path="admin/users" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><UserManagementPage /></ProtectedRoute>} />
            <Route path="import" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><DataImportCenter /></ProtectedRoute>} />
            <Route path="kpi-config" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><KpiConfiguration /></ProtectedRoute>} />
            <Route path="system-info" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><SystemInformation /></ProtectedRoute>} />

            <Route path="f13">
              <Route index element={<Navigate to="v2/ngay" replace />} />
              <Route path="dashboard" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyF13DashboardRedirect /></ProtectedRoute>} />
              <Route path="ranking/bcvh" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><BcvhRankingPage /></ProtectedRoute>} />
              <Route path="ranking/route" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><RoutePerformancePage /></ProtectedRoute>} />
              <Route path="ranking/route/violations" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyRouteViolationsRedirect /></ProtectedRoute>} />
              <Route path="ranking/shipment" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><LegacyShipmentRedirect /></ProtectedRoute>} />
              <Route path="pareto" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><PlaceholderPage title="Pareto / RCA" /></ProtectedRoute>} />
              <Route path="evidence" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><ShipmentPerformancePage /></ProtectedRoute>} />
              <Route path="message" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN]}><PlaceholderPage title="Message Center" /></ProtectedRoute>} />
            </Route>

            <Route path="f13/v2">
              <Route index element={<Navigate to="ngay" replace />} />
              <Route path="ngay" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><F13V2DayPage /></ProtectedRoute>} />
              <Route path="tuan" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><F13V2WeekPage /></ProtectedRoute>} />
              <Route path="thang" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><F13V2MonthPage /></ProtectedRoute>} />
              <Route path="hanh-trinh" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><F13V2JourneyPage /></ProtectedRoute>} />
              <Route path="why" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><F13V2WhyPage /></ProtectedRoute>} />
              <Route path="nguyen-nhan" element={<Navigate to="../why" replace />} />
            </Route>

            {TIME_AXIS_INDICATORS.map((indicator) => (
              <Route key={indicator.id} path={`${indicator.id}/v2`}>
                <Route index element={<Navigate to="ngay" replace />} />
                {TIME_AXIS_PAGES.map(([path, Page]) => (
                  <Route
                    key={path}
                    path={path}
                    element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><IndicatorProvider indicator={indicator}><Page /></IndicatorProvider></ProtectedRoute>}
                  />
                ))}
              </Route>
            ))}

            <Route path="network-map">
              <Route path="service-points" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><ServicePointsPage /></ProtectedRoute>} />
              <Route path="level2-routes" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><Level2RoutesPage /></ProtectedRoute>} />
              <Route path="delivery-routes" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><DeliveryRoutesPage /></ProtectedRoute>} />
              <Route path="integrated" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><IntegratedMapPage /></ProtectedRoute>} />
              <Route path="postman-catalog" element={<ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}><PostmanCatalogPage /></ProtectedRoute>} />
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
