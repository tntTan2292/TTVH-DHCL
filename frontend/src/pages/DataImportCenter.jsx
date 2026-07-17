import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, HardDrive, XCircle } from 'lucide-react';
import api from '../api/client';
import UploadWidget from '../components/UploadWidget';
import { buildImportReconciliationContext } from './importDashboardReconciliation';

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';

const vietnamDateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: VIETNAM_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric'
});

const formatVietnamDateTime = (value) => {
  if (!value) return 'Chưa có dữ liệu';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Không xác định';
  return vietnamDateTimeFormatter.format(date);
};

export default function DataImportCenter() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchStatus = useCallback(async ({ requestedPage = page, requestedPageSize = pageSize } = {}) => {
    setLoading(true);
    setStatusError(null);
    try {
      const res = await api.get('/import/f13/status', {
        params: {
          page: requestedPage,
          pageSize: requestedPageSize
        }
      });
      if (res.data.success) {
        setStatus(res.data.data);
        const nextPage = res.data.data?.pagination?.page;
        if (nextPage && nextPage !== page) {
          setPage(nextPage);
        }
      }
    } catch (err) {
      console.error('[DataImportCenter] fetchStatus error:', err);
      setStatusError('Không thể tải trạng thái import. Vui lòng kiểm tra kết nối backend hoặc thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    fetchStatus({ requestedPage: page, requestedPageSize: pageSize });
    const interval = setInterval(() => {
      fetchStatus({ requestedPage: page, requestedPageSize: pageSize });
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, page, pageSize]);

  const pagination = status?.pagination || {
    page,
    pageSize,
    totalItems: 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false
  };

  const visibleStart = pagination.totalItems === 0
    ? 0
    : ((pagination.page - 1) * pagination.pageSize) + 1;
  const visibleEnd = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  const handleRefresh = () => {
    fetchStatus({ requestedPage: page, requestedPageSize: pageSize });
  };

  const handlePageSizeChange = (event) => {
    const nextPageSize = Number(event.target.value);
    setPageSize(nextPageSize);
    setPage(1);
  };

  const handleUploadSuccess = () => {
    setPage(1);
    fetchStatus({ requestedPage: 1, requestedPageSize: pageSize });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-vnpost-blue-dark">Data Import Center</h1>
          <p className="text-gray-500 mt-1">Trung tâm nạp dữ liệu ngày cho Dashboard điều hành</p>
        </div>
        <button onClick={handleRefresh} className="px-4 py-2 bg-vnpost-blue text-white rounded-lg hover:bg-blue-800 transition-colors shadow-sm">
          Làm mới
        </button>
      </div>

      {statusError && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-700">{statusError}</p>
        </div>
      )}

      <div className="mb-8">
        <UploadWidget onUploadSuccess={handleUploadSuccess} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Chờ xử lý</p>
            <p className="text-3xl font-black text-vnpost-orange">{status?.pendingCount ?? 0}</p>
          </div>
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-vnpost-orange">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Thành công</p>
            <p className="text-3xl font-black text-green-600">{status?.successCount ?? 0}</p>
          </div>
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-green-600">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Thất bại</p>
            <p className="text-3xl font-black text-red-600">{status?.failCount ?? 0}</p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-600">
            <XCircle size={24} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-500 mb-1">Import gần nhất</p>
            <p className="text-sm font-bold text-gray-800 break-words mt-2">
              {formatVietnamDateTime(status?.lastImport)}
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-vnpost-blue shrink-0 ml-2">
            <HardDrive size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-gray-800">Nhật ký Import</h2>
            <p className="text-sm text-gray-500 mt-1">
              Hiển thị {visibleStart.toLocaleString('vi-VN')}-{visibleEnd.toLocaleString('vi-VN')} trên tổng số {pagination.totalItems.toLocaleString('vi-VN')} lần import
            </p>
            <p className="mt-1 text-xs font-semibold text-vnpost-blue-dark">
              Dùng nút Đối chiếu Dashboard để mở đúng ngày import với ngữ cảnh Tất cả BCVH.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            Số dòng mỗi trang
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-gray-700 focus:border-vnpost-blue focus:outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} dòng</option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-white border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-bold">Thời gian</th>
                <th className="px-6 py-4 font-bold">Tên File</th>
                <th className="px-6 py-4 font-bold text-center">Ngày số liệu</th>
                <th className="px-6 py-4 font-bold text-right">Số BG</th>
                <th className="px-6 py-4 font-bold text-right text-amber-600">Bỏ qua</th>
                <th className="px-6 py-4 font-bold text-right text-red-600">Lỗi</th>
                <th className="px-6 py-4 font-bold text-center">Trạng thái</th>
                <th className="px-6 py-4 font-bold text-center">Đối chiếu</th>
              </tr>
            </thead>
            <tbody>
              {status?.recentLogs?.map((log) => {
                const reconciliation = buildImportReconciliationContext(log);

                return (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 text-gray-600">{formatVietnamDateTime(log.ngay_import)}</td>
                    <td className="px-6 py-3 font-semibold text-vnpost-blue-dark">{log.ten_file}</td>
                    <td className="px-6 py-3 text-center font-medium text-gray-600">{log.ngay_so_lieu}</td>
                    <td className="px-6 py-3 text-right font-bold text-gray-700">
                      {(log.so_luong_bg ?? 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-amber-600">
                      {(log.so_bi_bo_qua ?? 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-red-600">
                      {(log.so_loi ?? 0).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {log.trang_thai === 'SUCCESS' ? (
                        <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 font-bold">Thành công</span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-800 font-bold">Lỗi</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {reconciliation.canOpenDashboard ? (
                        <Link
                          to={reconciliation.dashboardUrl}
                          className="inline-flex rounded-lg bg-vnpost-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800"
                          aria-label={`Đối chiếu dashboard cho import ${reconciliation.importLogId} ngày ${reconciliation.dataDate}`}
                        >
                          Đối chiếu Dashboard
                        </Link>
                      ) : (
                        <span className="text-xs font-medium text-gray-400">Không khả dụng</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!status?.recentLogs?.length && (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-gray-400">
                    {loading ? 'Đang tải dữ liệu...' : 'Không có dữ liệu nhật ký'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium text-gray-600">
            Trang {pagination.page.toLocaleString('vi-VN')} / {pagination.totalPages.toLocaleString('vi-VN')}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={!pagination.hasPrevious || loading}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-white"
            >
              Trang trước
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={!pagination.hasNext || loading}
              className="px-4 py-2 rounded-lg bg-vnpost-blue text-white text-sm font-semibold hover:bg-blue-800 disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
