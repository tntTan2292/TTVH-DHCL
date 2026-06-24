import { useState, useEffect } from 'react';
import axios from 'axios';
import { HardDrive, CheckCircle2, XCircle, Clock, UploadCloud } from 'lucide-react';

export default function DataImportCenter() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5050/api/import/f13/status');
      if (res.data.success) {
        setStatus(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStatus();
    // Auto refresh every 5s
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-vnpost-blue-dark">Data Import Center</h1>
          <p className="text-gray-500 mt-1">Mini Dashboard - Quản lý quá trình đồng bộ tự động F1.3</p>
        </div>
        <button onClick={fetchStatus} className="px-4 py-2 bg-vnpost-blue text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm">
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Chờ xử lý (Incoming)</p>
            <p className="text-3xl font-black text-vnpost-orange">{status?.pendingCount || 0}</p>
          </div>
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-vnpost-orange">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Thành công</p>
            <p className="text-3xl font-black text-green-600">{status?.successCount || 0}</p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Thất bại</p>
            <p className="text-3xl font-black text-red-600">{status?.failCount || 0}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
            <XCircle size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Import Gần Nhất</p>
            <p className="text-sm font-bold text-gray-800 break-words mt-2">
              {status?.lastImport ? new Date(status.lastImport).toLocaleString('vi-VN') : 'Chưa có dữ liệu'}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-vnpost-blue shrink-0 ml-2">
            <HardDrive size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-bold text-gray-800">Nhật ký Import (20 dòng gần nhất)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold">Thời gian</th>
                <th className="px-6 py-4 font-bold">Tên File</th>
                <th className="px-6 py-4 font-bold text-center">Ngày số liệu</th>
                <th className="px-6 py-4 font-bold text-right">Số BG</th>
                <th className="px-6 py-4 font-bold text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {status?.recentLogs?.map((log) => (
                <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-600">
                    {new Date(log.ngay_import).toLocaleString('vi-VN')}
                  </td>
                  <td className="px-6 py-3 font-semibold text-vnpost-blue-dark">
                    {log.ten_file}
                  </td>
                  <td className="px-6 py-3 text-center font-medium text-gray-600">
                    {log.ngay_so_lieu}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-gray-700">
                    {log.so_luong_bg.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-center">
                    {log.trang_thai === 'SUCCESS' ? (
                      <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 font-bold">Thành công</span>
                    ) : log.trang_thai === 'FAILED' ? (
                      <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-800 font-bold">Lỗi</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs bg-orange-100 text-orange-800 font-bold">Đang chạy</span>
                    )}
                  </td>
                </tr>
              ))}
              {!status?.recentLogs?.length && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-400">Không có dữ liệu nhật ký</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
