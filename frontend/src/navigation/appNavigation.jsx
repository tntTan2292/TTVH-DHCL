import { Activity, BarChart2, FileSpreadsheet, Info, LayoutDashboard, MapPin, PieChart, Settings, Target, Database } from 'lucide-react';
import { ROLE_ADMIN, normalizeRole } from '../auth/roles';

const NETWORK_MANAGEMENT_GROUP = {
  title: 'Quản lý mạng lưới',
  icon: <MapPin size={20} />,
  subItems: [
    { name: 'Mạng điểm phục vụ', path: '/network-map/service-points', icon: <MapPin size={18} /> },
    { name: 'Mạng đường thư cấp 2', path: '/network-map/level2-routes', icon: <MapPin size={18} /> },
    { name: 'Sơ đồ tuyến phát', path: '/network-map/delivery-routes', icon: <MapPin size={18} /> },
    { name: 'Bản đồ tích hợp', path: '/network-map/integrated', icon: <MapPin size={18} /> },
  ],
};

const F13_GROUP = {
  title: 'F1.3 Quality Management',
  icon: <Target size={20} />,
  subItems: [
    { name: 'Operation Dashboard', path: '/f13/dashboard', icon: <Target size={18} /> },
    { name: 'BCVH Ranking', path: '/f13/ranking/bcvh', icon: <BarChart2 size={18} /> },
    { name: 'Tuyến Ranking', path: '/f13/ranking/route', icon: <BarChart2 size={18} /> },
    { name: 'Pareto / RCA', path: '/f13/pareto', icon: <PieChart size={18} />, roles: [ROLE_ADMIN] },
    { name: 'Evidence', path: '/f13/evidence', icon: <Database size={18} />, roles: [ROLE_ADMIN] },
    { name: 'Message Center', path: '/f13/message', icon: <Info size={18} />, roles: [ROLE_ADMIN] },
  ],
};

const ADMIN_ONLY_GROUP = {
  title: 'System Administration',
  icon: <Settings size={20} />,
  roles: [ROLE_ADMIN],
  subItems: [
    { name: 'Data Import Center', path: '/import', icon: <FileSpreadsheet size={18} /> },
    { name: 'KPI Configuration', path: '/kpi-config', icon: <Settings size={18} /> },
    { name: 'System Information', path: '/system-info', icon: <Info size={18} /> },
  ],
};

const ROOT_ITEMS = [
  { name: 'Dashboard Home', path: '/', icon: <LayoutDashboard size={20} />, roles: [ROLE_ADMIN] },
  F13_GROUP,
  NETWORK_MANAGEMENT_GROUP,
  { name: 'F1.1 Quality Management', path: '/f11', icon: <Activity size={20} />, roles: [ROLE_ADMIN] },
  { name: 'F1.2 Quality Management', path: '/f12', icon: <Activity size={20} />, roles: [ROLE_ADMIN] },
  { name: 'F4.1 Quality Management', path: '/f41', icon: <Activity size={20} />, roles: [ROLE_ADMIN] },
  ADMIN_ONLY_GROUP,
];

function isAllowed(item, role) {
  const currentRole = normalizeRole(role);
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(currentRole);
}

export function getNavigationForRole(role) {
  return ROOT_ITEMS
    .filter((item) => isAllowed(item, role))
    .map((item) => {
      if (!item.subItems) return item;
      return {
        ...item,
        subItems: item.subItems.filter((subItem) => isAllowed(subItem, role)),
      };
    });
}

export function getDashboardQuickLinks(role) {
  return [
    { label: 'F1.3 Dashboard', path: '/f13/dashboard', color: 'bg-vnpost-blue', description: 'KPI chất lượng phát liên tỉnh' },
    { label: 'Xếp hạng BCVH', path: '/f13/ranking/bcvh', color: 'bg-green-600', description: 'So sánh hiệu quả theo bưu cục' },
    { label: 'Data Import Center', path: '/import', color: 'bg-vnpost-orange', description: 'Nạp & quản lý dữ liệu Excel', roles: [ROLE_ADMIN] },
  ].filter((item) => isAllowed(item, role));
}
