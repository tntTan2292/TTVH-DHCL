import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardHome from './pages/DashboardHome';
// Import D7 Foundation F1.3 Layout and Pages
import F13Layout from './layouts/F13Layout';
import DashboardPage from './features/dashboard/DashboardPage';
import { PlaceholderPage } from './components/common/Containers';

// Old F11, F12, F41, System modules
import F11Quality from './pages/F11Quality';
import F12Quality from './pages/F12Quality';
import F41Quality from './pages/F41Quality';
import DataImportCenter from './pages/DataImportCenter';
import KpiConfiguration from './pages/KpiConfiguration';
import SystemInformation from './pages/SystemInformation';
import { ErrorLayout } from './components/common/StateLayouts';

function App() {
  return (
    <Router>
      <Routes>
        {/* OLD ARCHITECTURE ROUTES */}
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="f11" element={<F11Quality />} />
          <Route path="f12" element={<F12Quality />} />
          <Route path="f41" element={<F41Quality />} />
          <Route path="import" element={<DataImportCenter />} />
          <Route path="kpi-config" element={<KpiConfiguration />} />
          <Route path="system-info" element={<SystemInformation />} />
        </Route>

        {/* NEW D7.1 ARCHITECTURE ROUTES (MODULE ISOLATION) */}
        <Route path="/f13/*" element={<F13Layout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="ranking/bcvh" element={<PlaceholderPage title="BCVH Ranking" />} />
          <Route path="ranking/route" element={<PlaceholderPage title="Route Ranking" />} />
          <Route path="rca" element={<PlaceholderPage title="Pareto RCA" />} />
          <Route path="evidence" element={<PlaceholderPage title="Evidence List" />} />
          <Route path="messages" element={<PlaceholderPage title="Message Center" />} />
          <Route path="*" element={<ErrorLayout error={{ message: "Không tìm thấy trang web. URL không hợp lệ hoặc đã bị thay đổi." }} />} />
        </Route>
        
        {/* GLOBAL CATCH-ALL */}
        <Route path="*" element={
          <div className="h-screen bg-white">
            <ErrorLayout error={{ message: "Không tìm thấy trang web. URL không hợp lệ hoặc đã bị thay đổi." }} />
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
