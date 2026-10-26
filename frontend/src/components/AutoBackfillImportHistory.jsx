import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  User,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Zap,
  Upload,
  ChevronLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import api from '../api/client';
import {
  buildImportLogQueryParams,
  formatAuditValue
} from './autoBackfillUiHelpers';

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const INDICATORS = ['ALL', 'F1.1', 'F1.2', 'F1.3', 'F4.1', 'F4.2', 'BF-PHAT'];
const LANES = ['ALL', 'HUE', 'TCT'];
const MODES = [
  { value: 'ALL', label: 'Tất cả chế độ' },
  { value: 'REFRESH_DAY', label: 'Bù theo ngày (REFRESH_DAY)' },
  { value: 'REFRESH_WINDOW', label: 'Bù theo cửa sổ (REFRESH_WINDOW)' },
  { value: 'MANUAL_UPLOAD', label: 'Nạp thủ công (MANUAL_UPLOAD)' },
  { value: 'MANUAL_REIMPORT', label: 'Nhập lại thủ công (MANUAL_REIMPORT)' },
  { value: 'NEW', label: 'Nạp mới (NEW)' },
  { value: 'REIMPORT', label: 'Tái nạp (REIMPORT)' },
];
const STATUSES = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'SUCCESS', label: 'Thành công (SUCCESS)' },
  { value: 'FAILED', label: 'Thất bại (FAILED)' },
];

/**
 * Status badge renderer for import log status
 */
function LogStatusBadge({ status }) {
  const st = (status || '').toUpperCase();
  if (st === 'COMPLETED' || st === 'SUCCESS') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
        <span>Hoàn tất</span>
      </span>
    );
  }
  if (st === 'FAILED' || st === 'ERROR') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
        <XCircle className="h-3 w-3 text-rose-600" />
        <span>Thất bại</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 border border-slate-200">
      <span>{status || 'chưa ghi nhận'}</span>
    </span>
  );
}

/**
 * Mode badge renderer
 */
function LogModeBadge({ mode }) {
  if (!mode) {
    return <span className="text-xs text-slate-400 italic">chưa ghi nhận</span>;
  }
  const isAuto = mode.includes('REFRESH') || mode.includes('AUTO');
  const isManual = mode.includes('MANUAL');
  const badgeClass = isAuto
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : isManual
      ? 'bg-teal-50 text-teal-700 border-teal-200'
      : 'bg-purple-50 text-purple-700 border-purple-200';

  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${badgeClass}`}>
      {isAuto ? <Zap className="h-2.5 w-2.5 text-amber-500 fill-amber-400" /> : <Upload className="h-2.5 w-2.5" />}
      <span>{mode}</span>
    </span>
  );
}

/**
 * AutoBackfillImportHistory
 * Nhật ký lịch sử nạp dữ liệu (Audit Log) theo dõi: Ai import, lúc nào, chế độ nào, số dòng thay thế.
 * Nguồn: GET /import/log (Admin only).
 */
export default function AutoBackfillImportHistory({ isAdmin = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
    hasPrevious: false,
    hasNext: false
  });

  // Filter state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [indicator, setIndicator] = useState('ALL');
  const [lane, setLane] = useState('ALL');
  const [actor, setActor] = useState('');
  const [importMode, setImportMode] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchLog = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildImportLogQueryParams({
        date_from: dateFrom,
        date_to: dateTo,
        indicator,
        lane,
        actor,
        import_mode: importMode,
        status,
        page: currentPage,
        pageSize
      });

      const response = await api.get('/import/log', { params: queryParams });
      if (response?.data?.success) {
        setItems(response.data.data.items || []);
        if (response.data.data.pagination) {
          setPagination(response.data.data.pagination);
        }
      } else {
        setError(response?.data?.error?.message || 'Không thể tải lịch sử import.');
      }
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
        err?.message ||
        'Lỗi kết nối khi tải lịch sử import.'
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin, dateFrom, dateTo, indicator, lane, actor, importMode, status, currentPage, pageSize]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  const handleResetFilters = () => {
    setDateFrom('');
    setDateTo('');
    setIndicator('ALL');
    setLane('ALL');
    setActor('');
    setImportMode('ALL');
    setStatus('ALL');
    setCurrentPage(1);
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <p className="mt-2 text-sm font-semibold">Chức năng Lịch sử Import chỉ dành cho Quản trị viên (Admin).</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Header Card */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700 border border-indigo-100">
            <History className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Lịch sử Import Dữ liệu (Audit Log)
              </h3>
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700 border border-indigo-200">
                GET /import/log
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi chi tiết các lần nạp: Người thực hiện, chế độ, số dòng thay thế và giờ Việt Nam. Dòng cũ hiển thị &quot;chưa ghi nhận&quot;.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchLog}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span>Bộ lọc Lịch sử</span>
          </div>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Filter 1: Từ ngày */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Từ ngày (nghiệp vụ)</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Filter 2: Đến ngày */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Đến ngày (nghiệp vụ)</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Filter 3: Chỉ tiêu */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Chỉ tiêu</label>
            <select
              value={indicator}
              onChange={(e) => {
                setIndicator(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              {INDICATORS.map((ind) => (
                <option key={ind} value={ind}>
                  {ind === 'ALL' ? 'Tất cả chỉ tiêu' : ind}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Nguồn Lane */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Nguồn dữ liệu</label>
            <select
              value={lane}
              onChange={(e) => {
                setLane(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              {LANES.map((l) => (
                <option key={l} value={l}>
                  {l === 'ALL' ? 'Tất cả nguồn' : l}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 5: Người thực hiện (Actor) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Người thực hiện</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Nhập tên người dùng..."
                value={actor}
                onChange={(e) => {
                  setActor(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-7 pr-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <User className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Filter 6: Chế độ nạp */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Chế độ</label>
            <select
              value={importMode}
              onChange={(e) => {
                setImportMode(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer"
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs border-b border-slate-200 text-xs font-bold uppercase text-slate-600">
              <tr>
                <th className="px-3.5 py-3 w-14 text-center">ID</th>
                <th className="px-3.5 py-3 min-w-[150px]">Giờ thực hiện (VN)</th>
                <th className="px-3.5 py-3 min-w-[110px]">Ngày Dữ liệu</th>
                <th className="px-3.5 py-3 w-24">Chỉ tiêu</th>
                <th className="px-3.5 py-3 w-20">Nguồn</th>
                <th className="px-3.5 py-3 min-w-[130px]">Người thực hiện</th>
                <th className="px-3.5 py-3 min-w-[160px]">Chế độ</th>
                <th className="px-3.5 py-3 min-w-[120px] text-right">Dòng thay thế</th>
                <th className="px-3.5 py-3 min-w-[110px] text-center">Trạng thái</th>
                <th className="px-3.5 py-3 min-w-[110px] text-right">Tổng bản ghi</th>
                <th className="px-3.5 py-3 min-w-[180px]">File / Nguồn kích hoạt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto h-6 w-6 text-slate-400 animate-spin mb-2" />
                    <span>Đang tải lịch sử import...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <Database className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-700">Chưa có bản ghi lịch sử phù hợp</p>
                    <p className="text-slate-400 mt-1">Vui lòng thay đổi tiêu chí bộ lọc ngày, chỉ tiêu hoặc người dùng.</p>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const actorVal = formatAuditValue(row.actor);
                  const modeVal = formatAuditValue(row.import_mode);
                  const replacedVal = formatAuditValue(row.replaced_row_count);
                  const timeVnVal = formatAuditValue(row.created_at_vn);

                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      {/* ID */}
                      <td className="px-3.5 py-2.5 text-center font-mono text-slate-400">
                        #{row.id}
                      </td>

                      {/* Giờ VN */}
                      <td className="px-3.5 py-2.5 font-medium text-slate-900 whitespace-nowrap">
                        {timeVnVal === 'chưa ghi nhận' ? (
                          <span className="text-slate-400 italic">chưa ghi nhận</span>
                        ) : (
                          <span>{timeVnVal}</span>
                        )}
                      </td>

                      {/* Ngày dữ liệu */}
                      <td className="px-3.5 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                        {row.ngay_do_kiem || '—'}
                      </td>

                      {/* Chỉ tiêu */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-bold text-slate-700">
                          {row.indicator || 'F1.3'}
                        </span>
                      </td>

                      {/* Nguồn */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600">
                          {row.source_lane || '—'}
                        </span>
                      </td>

                      {/* Người thực hiện (actor) */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {actorVal === 'chưa ghi nhận' ? (
                          <span className="text-slate-400 italic">chưa ghi nhận</span>
                        ) : (
                          <span className="font-semibold text-indigo-900 flex items-center gap-1">
                            <User className="h-3 w-3 text-indigo-500" />
                            <span>{actorVal}</span>
                          </span>
                        )}
                      </td>

                      {/* Chế độ (import_mode) */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        {modeVal === 'chưa ghi nhận' ? (
                          <span className="text-slate-400 italic">chưa ghi nhận</span>
                        ) : (
                          <LogModeBadge mode={modeVal} />
                        )}
                      </td>

                      {/* Số dòng thay thế */}
                      <td className="px-3.5 py-2.5 text-right font-medium whitespace-nowrap">
                        {replacedVal === 'chưa ghi nhận' ? (
                          <span className="text-slate-400 italic">chưa ghi nhận</span>
                        ) : (
                          <span className="font-bold text-amber-700">
                            {Number(replacedVal).toLocaleString('vi-VN')} dòng
                          </span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                        <LogStatusBadge status={row.status} />
                      </td>

                      {/* Tổng bản ghi / Lỗi */}
                      <td className="px-3.5 py-2.5 text-right font-mono whitespace-nowrap">
                        <span className="font-bold text-slate-800">
                          {Number(row.total_records || 0).toLocaleString('vi-VN')}
                        </span>
                        {Number(row.error_records || 0) > 0 && (
                          <span className="ml-1 text-[11px] text-rose-600 font-semibold">
                            (lỗi {row.error_records})
                          </span>
                        )}
                      </td>

                      {/* File name / Trigger source */}
                      <td className="px-3.5 py-2.5 truncate max-w-[220px]" title={row.file_name || row.trigger_source}>
                        <span className="text-slate-600 truncate block">
                          {row.file_name || row.trigger_source || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Bar */}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold text-slate-600 gap-3">
          <div className="flex items-center gap-2">
            <span>Hiển thị:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} dòng/trang
                </option>
              ))}
            </select>
            <span className="text-slate-500 pl-2">
              Tổng số: <strong>{pagination.totalItems}</strong> bản ghi
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevious || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Trước</span>
            </button>
            <span className="font-bold text-slate-800">
              Trang {pagination.page} / {pagination.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNext || loading}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <span>Sau</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
