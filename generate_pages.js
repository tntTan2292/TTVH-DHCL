const fs = require('fs');
const path = require('path');

const pages = [
  { file: 'DashboardHome.jsx', title: 'Dashboard Home', desc: 'Tổng quan hệ thống TTVH-DHCL' },
  { file: 'F13Dashboard.jsx', title: 'F1.3 Dashboard', desc: 'Tổng quan ĐHCL F1.3' },
  { file: 'F13BcvhRanking.jsx', title: 'BCVH Ranking', desc: 'Xếp hạng Bưu cục Văn hóa xã' },
  { file: 'F13RouteRanking.jsx', title: 'Tuyến Ranking', desc: 'Xếp hạng Tuyến phát' },
  { file: 'F13RCA.jsx', title: 'Phân tích RCA', desc: 'Root Cause Analysis F1.3' },
  { file: 'F13Pareto.jsx', title: 'Phân tích Pareto', desc: 'Biểu đồ Pareto lỗi F1.3' },
  { file: 'F11Quality.jsx', title: 'F1.1 Quality', desc: 'Quản lý chất lượng F1.1' },
  { file: 'F12Quality.jsx', title: 'F1.2 Quality', desc: 'Quản lý chất lượng F1.2' },
  { file: 'F41Quality.jsx', title: 'F4.1 Quality', desc: 'Quản lý chất lượng F4.1' },
  { file: 'DataImportCenter.jsx', title: 'Data Import Center', desc: 'Trung tâm nhập liệu hệ thống' },
  { file: 'KpiConfiguration.jsx', title: 'KPI Configuration', desc: 'Cấu hình chỉ tiêu KPI' },
  { file: 'SystemInformation.jsx', title: 'System Information', desc: 'Thông tin hệ thống' }
];

const pagesDir = path.join(__dirname, 'frontend', 'src', 'pages');
if (!fs.existsSync(pagesDir)) fs.mkdirSync(pagesDir, { recursive: true });

pages.forEach(p => {
  const content = `export default function ${p.file.replace('.jsx', '')}() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-vnpost-blue-dark">${p.title}</h1>
      <p className="text-gray-600 mt-2">${p.desc}</p>
      <div className="mt-8 p-12 bg-white rounded-xl border border-dashed border-gray-300 text-center text-gray-400">
        Coming Soon
      </div>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(pagesDir, p.file), content);
});

console.log('Created pages successfully.');
