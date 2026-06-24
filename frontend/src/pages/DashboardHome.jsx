import { Target, CheckCircle2, Clock, CalendarSync } from 'lucide-react';

export default function DashboardHome() {
  const kpis = [
    { label: 'Tổng số chỉ tiêu', value: '142', icon: <Target size={24} className="text-vnpost-blue" />, bg: 'bg-blue-50' },
    { label: 'Đã triển khai', value: '98', icon: <CheckCircle2 size={24} className="text-green-600" />, bg: 'bg-green-50' },
    { label: 'Chờ triển khai', value: '44', icon: <Clock size={24} className="text-orange-600" />, bg: 'bg-orange-50' },
    { label: 'Dữ liệu mới nhất', value: '18/06/2026', icon: <CalendarSync size={24} className="text-vnpost-orange" />, bg: 'bg-orange-50/50' },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-vnpost-blue-dark">Dashboard Tổng Quan</h1>
          <p className="text-gray-500 mt-1">Hệ thống điều hành chất lượng TTVH-DHCL</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${kpi.bg}`}>
              {kpi.icon}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500">{kpi.label}</p>
              <p className="text-2xl font-black text-gray-800 mt-0.5">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-12 bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 min-h-[400px]">
        <Target size={48} className="text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-500 mb-2">Tính năng đang phát triển</h3>
        <p className="text-sm text-center max-w-md">
          Khu vực hiển thị biểu đồ phân tích và bảng xếp hạng tổng thể của tất cả các chuyên đề sẽ sớm được cập nhật trong phiên bản tiếp theo.
        </p>
      </div>
    </div>
  );
}
