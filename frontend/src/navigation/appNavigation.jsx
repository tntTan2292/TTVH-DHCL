import { Activity, BarChart2, Database, FileSpreadsheet, Info, MapPin, Settings, Target, Users } from 'lucide-react';
import { ROLE_ADMIN, normalizeRole } from '../auth/roles';

const F11_GROUP = {
  title: 'F1.1 – Chất lượng toàn trình nội tỉnh',
  name: 'F1.1 – Chất lượng toàn trình nội tỉnh',
  icon: <Activity size={18} />,
  subItems: [
    { name: 'Bảng điều hành', path: '/f11/dashboard', icon: <Target size={18} /> },
    { name: 'Phân tích BCVH', path: '/f11/ranking/bcvh', icon: <BarChart2 size={18} /> },
  ],
};

const F12_GROUP = {
  title: 'F1.2 – Thu gom liên tỉnh',
  name: 'F1.2 – Thu gom liên tỉnh',
  icon: <Activity size={18} />,
  subItems: [
    { name: 'Bảng điều hành', path: '/f12/dashboard', icon: <Target size={18} /> },
    { name: 'Phân tích đơn vị chấp nhận', path: '/f12/ranking/bcvh', icon: <BarChart2 size={18} /> },
  ],
};

const F13_GROUP = {
  title: 'F1.3 – Chất lượng phát liên tỉnh',
  name: 'F1.3 – Chất lượng phát liên tỉnh',
  icon: <Target size={18} />,
  subItems: [
    { name: 'Bảng điều hành', path: '/f13/dashboard', icon: <Target size={18} /> },
    { name: 'Phân tích BCVH', path: '/f13/ranking/bcvh', icon: <BarChart2 size={18} /> },
    { name: 'Phân tích tuyến phát', path: '/f13/ranking/route', icon: <BarChart2 size={18} /> },
    { name: 'Dữ liệu minh chứng', path: '/f13/evidence', icon: <Database size={18} /> },
  ],
};

const F41_GROUP = {
  title: 'F4.1 – Chất lượng phát thành công bưu cục',
  name: 'F4.1 – Chất lượng phát thành công bưu cục',
  icon: <Activity size={18} />,
  subItems: [
    { name: 'Bảng điều hành', path: '/f41/dashboard', icon: <Target size={18} /> },
    { name: 'Phân tích BCVH', path: '/f41/ranking/bcvh', icon: <BarChart2 size={18} /> },
  ],
};

const QUALITY_MANAGEMENT_GROUP = {
  title: 'Quản lý chất lượng',
  icon: <Activity size={20} />,
  subItems: [
    F11_GROUP,
    F12_GROUP,
    F13_GROUP,
    F41_GROUP,
  ],
};

const NETWORK_MANAGEMENT_GROUP = {
  title: 'Quản lý mạng lưới',
  icon: <MapPin size={20} />,
  subItems: [
    { name: 'Mạng điểm phục vụ', path: '/network-map/service-points', icon: <MapPin size={18} /> },
    { name: 'Mạng đường thư cấp 2', path: '/network-map/level2-routes', icon: <MapPin size={18} /> },
    { name: 'Sơ đồ tuyến phát', path: '/network-map/delivery-routes', icon: <MapPin size={18} /> },
    { name: 'Bản đồ tích hợp', path: '/network-map/integrated', icon: <MapPin size={18} /> },
    { name: 'Rà soát danh mục bưu tá', path: '/network-map/postman-catalog', icon: <Users size={18} /> },
  ],
};

const ADMIN_ONLY_GROUP = {
  title: 'Quản trị hệ thống',
  icon: <Settings size={20} />,
  roles: [ROLE_ADMIN],
  subItems: [
    { name: 'Trung tâm nạp dữ liệu', path: '/import', icon: <FileSpreadsheet size={18} /> },
    { name: 'Cấu hình chỉ tiêu', path: '/kpi-config', icon: <Settings size={18} /> },
    { name: 'Thông tin hệ thống', path: '/system-info', icon: <Info size={18} /> },
  ],
};

const ROOT_ITEMS = [
  QUALITY_MANAGEMENT_GROUP,
  NETWORK_MANAGEMENT_GROUP,
  ADMIN_ONLY_GROUP,
];

function isAllowed(item, role) {
  const currentRole = normalizeRole(role);
  if (!item.roles || item.roles.length === 0) return true;
  return item.roles.includes(currentRole);
}

function filterNavItems(items, role) {
  return items
    .filter((item) => isAllowed(item, role))
    .map((item) => {
      if (!item.subItems) return item;
      return {
        ...item,
        subItems: filterNavItems(item.subItems, role),
      };
    });
}

export function getNavigationForRole(role) {
  return filterNavItems(ROOT_ITEMS, role);
}

export function getDashboardQuickLinks(role) {
  return [
    { label: 'F1.3 – Bảng điều hành', path: '/f13/dashboard', color: 'bg-vnpost-blue', description: 'KPI chất lượng phát liên tỉnh' },
    { label: 'Phân tích BCVH', path: '/f13/ranking/bcvh', color: 'bg-green-600', description: 'So sánh hiệu quả theo bưu cục' },
    { label: 'Trung tâm nạp dữ liệu', path: '/import', color: 'bg-vnpost-orange', description: 'Nạp & quản lý dữ liệu Excel', roles: [ROLE_ADMIN] },
  ].filter((item) => isAllowed(item, role));
}
