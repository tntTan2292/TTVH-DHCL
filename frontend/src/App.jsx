import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardHome from './pages/DashboardHome';
import LoginPage from './pages/LoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import SharedComponentsDemo from './pages/SharedComponentsDemo';
import SharedLayoutDemo from './pages/SharedLayoutDemo';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './auth/AuthContext';

// Old F11, F12, F41, System modules
import F11Quality from './pages/F11Quality';
import F12Quality from './pages/F12Quality';
import F41Quality from './pages/F41Quality';
import DataImportCenter from './pages/DataImportCenter';
import KpiConfiguration from './pages/KpiConfiguration';
import SystemInformation from './pages/SystemInformation';

// D7 Foundation F1.3 Pages & Containers
import DashboardPage from './features/dashboard/DashboardPage';
import BcvhRankingPage from './features/ranking/BcvhRankingPage';
import RoutePerformancePage from './features/route/RoutePerformancePage';
import { PlaceholderPage } from './components/common/Containers';
import { ErrorLayout } from './components/common/StateLayouts';

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
              <ProtectedRoute allowedRoles={['admin']}>
                <SharedComponentsDemo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dev/shared-layout"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <SharedLayoutDemo />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />

            {/* OLD ARCHITECTURE ROUTES */}
            <Route path="f11" element={<F11Quality />} />
            <Route path="f12" element={<F12Quality />} />
            <Route path="f41" element={<F41Quality />} />
            <Route path="import" element={<DataImportCenter />} />
            <Route path="kpi-config" element={<KpiConfiguration />} />
            <Route path="system-info" element={<SystemInformation />} />

            {/* D7.1 ARCHITECTURE MERGE (F1.3 FEATURE MODULE) */}
            <Route path="f13">
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="ranking/bcvh" element={<BcvhRankingPage />} />
              <Route path="ranking/route" element={<RoutePerformancePage />} />
              <Route path="pareto" element={<PlaceholderPage title="Pareto / RCA" />} />
              <Route path="evidence" element={<PlaceholderPage title="Evidence List" />} />
              <Route path="message" element={<PlaceholderPage title="Message Center" />} />
            </Route>
          </Route>

          {/* GLOBAL CATCH-ALL */}
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
