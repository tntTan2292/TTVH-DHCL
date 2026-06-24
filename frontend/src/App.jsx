import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import DashboardHome from './pages/DashboardHome';
import F13Dashboard from './pages/F13Dashboard';
import F13BcvhRanking from './pages/F13BcvhRanking';
import F13RouteRanking from './pages/F13RouteRanking';
import F13RCA from './pages/F13RCA';
import F13Pareto from './pages/F13Pareto';
import F11Quality from './pages/F11Quality';
import F12Quality from './pages/F12Quality';
import F41Quality from './pages/F41Quality';
import DataImportCenter from './pages/DataImportCenter';
import KpiConfiguration from './pages/KpiConfiguration';
import SystemInformation from './pages/SystemInformation';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="f13/dashboard" element={<F13Dashboard />} />
          <Route path="f13/bcvh-ranking" element={<F13BcvhRanking />} />
          <Route path="f13/route-ranking" element={<F13RouteRanking />} />
          <Route path="f13/rca" element={<F13RCA />} />
          <Route path="f13/pareto" element={<F13Pareto />} />
          <Route path="f11" element={<F11Quality />} />
          <Route path="f12" element={<F12Quality />} />
          <Route path="f41" element={<F41Quality />} />
          <Route path="import" element={<DataImportCenter />} />
          <Route path="kpi-config" element={<KpiConfiguration />} />
          <Route path="system-info" element={<SystemInformation />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
