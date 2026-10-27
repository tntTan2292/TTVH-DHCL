import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Play,
  RefreshCw,
  X,
  XCircle
} from 'lucide-react';
import api from '../api/client';
import {
  JOB_LOG_PAGE_SIZE_OPTIONS,
  buildJobLogQueryParams,
  translateJobState,
  jobErrorText,
  formatVietnamDateTime,
  formatJobDuration
} from './autoBackfillUiHelpers';

const INDICATOR_OPTIONS = ['ALL', 'F1.1', 'F1.2', 'F1.3', 'F4.1', 'F4.2', 'BF-PHAT'];
const LANE_OPTIONS = ['ALL', 'HUE', 'TCT'];
const IMPORT_MODE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả chế độ' },
  { value: 'NEW', label: 'Nhập mới (NEW)' },
  { value: 'REIMPORT', label: 'Tái nạp (REIMPORT)' },
  { value: 'REFRESH_WINDOW', label: 'Bù cửa sổ (REFRESH_WINDOW)' },
  { value: 'REFRESH_DAY', label: 'Bù ngày (REFRESH_DAY)' }
];

export default function AutoBackfillJobLog({ isAdmin = false, onSwitchToFileLog = null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [stateCounts, setStateCounts] = useState({});

  // Filters state
  const [indicatorFilter, setIndicatorFilter] = useState('ALL');
  const [laneFilter, setLaneFilter] = useState('ALL');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [businessDateFrom, setBusinessDateFrom] = useState('');
  const [businessDateTo, setBusinessDateTo] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [runIdFilter, setRunIdFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Detail Modal for selected Run/Job
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [runDetailData, setRunDetailData] = useState(null);
  const [runDetailError, setRunDetailError] = useState(null);

  // Fetch Jobs
  const fetchJobs = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const params = buildJobLogQueryParams({
        indicator: indicatorFilter,
        lane: laneFilter,
        state: stateFilter,
        actor: actorFilter,
        import_mode: modeFilter,
        business_date_from: businessDateFrom || undefined,
        business_date_to: businessDateTo || undefined,
        created_from: createdFrom || undefined,
        created_to: createdTo || undefined,
        run_id: runIdFilter || undefined,
        page,
        pageSize
      });

      const res = await api.get('/import/auto-backfill/jobs', { params });
      if (res.data?.success) {
        setJobs(res.data.data?.items || []);
        setTotal(res.data.data?.total || 0);
        setStateCounts(res.data.data?.stateCounts || {});
      } else {
        setError(res.data?.error?.message || 'Không thể tải nhật ký import.');
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi gọi API nhật ký import.');
    } finally {
      setLoading(false);
    }
  }, [
    isAdmin,
    indicatorFilter,
    laneFilter,
    stateFilter,
    actorFilter,
    modeFilter,
    businessDateFrom,
    businessDateTo,
    createdFrom,
    createdTo,
    runIdFilter,
    page,
    pageSize
  ]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Open Run detail
  const handleOpenRunDetail = async (runId) => {
    if (!runId) return;
    setSelectedRunId(runId);
    setRunDetailLoading(true);
    setRunDetailError(null);
    try {
      const res = await api.get(`/import/auto-backfill/runs/${runId}`);
      if (res.data?.success) {
        setRunDetailData(res.data.data);
      } else {
        setRunDetailError(res.data?.error?.message || 'Không thể tải chi tiết tiến trình.');
      }
    } catch (err) {
      setRunDetailError(err?.response?.data?.error?.message || err?.message || 'Lỗi khi tải chi tiết tiến trình.');
    } finally {
      setRunDetailLoading(false);
    }
  };

  const handleClearFilters = () => {
    setIndicatorFilter('ALL');
    setLaneFilter('ALL');
    setStateFilter('ALL');
    setActorFilter('');
    setModeFilter('ALL');
    setBusinessDateFrom('');
    setBusinessDateTo('');
    setCreatedFrom('');
    setCreatedTo('');
    setRunIdFilter('');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      {/* AREA HEADER & LOG TYPE SELECTOR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-xl bg-blue-50 p-2 text-blue-700">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Nhật ký Import (Tiến trình nạp tự động)</h2>
                <p className="text-xs text-slate-500">
                  Ghi lại toàn bộ tiến trình (jobs) nạp qua hàng đợi tự động, lịch sử thực thi, lỗi chi tiết và hướng xử lý
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* SUB-NAV SWITCHER: JOB LOG VS FILE LOG */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm"
              >
                Nhật ký Job (Tất cả tiến trình)
              </button>
              {onSwitchToFileLog && (
                <button
                  type="button"
                  onClick={onSwitchToFileLog}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Lịch sử Tệp (import_log)</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={fetchJobs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        {/* STATE CHIPS BAR (WITH stateCounts FROM API) */}
        <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-slate-500 mr-1">Trạng thái:</span>
          
          <button
            type="button"
            onClick={() => { setStateFilter('ALL'); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-bold transition border ${
              stateFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Tất cả ({total})
          </button>

          {/* FAILED_TERMINAL FIRST & PROMINENT FOR ONE-CLICK ERROR ACCESS */}
          <button
            type="button"
            onClick={() => { setStateFilter('FAILED_TERMINAL'); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-bold transition border flex items-center gap-1 ${
              stateFilter === 'FAILED_TERMINAL'
                ? 'bg-rose-700 text-white border-rose-700 shadow-sm'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <XCircle className="h-3 w-3" />
            <span>Thất bại ({stateCounts.FAILED_TERMINAL || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => { setStateFilter('SUCCESS'); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-bold transition border flex items-center gap-1 ${
              stateFilter === 'SUCCESS'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            <span>Thành công ({stateCounts.SUCCESS || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => { setStateFilter('RUNNING'); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-bold transition border flex items-center gap-1 ${
              stateFilter === 'RUNNING'
                ? 'bg-blue-700 text-white border-blue-700 shadow-sm'
                : 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <Play className="h-3 w-3 fill-current" />
            <span>Đang chạy ({stateCounts.RUNNING || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => { setStateFilter('QUEUED'); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-bold transition border flex items-center gap-1 ${
              stateFilter === 'QUEUED'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>Đang chờ ({stateCounts.QUEUED || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => { setStateFilter('CANCELLED'); setPage(1); }}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
              stateFilter === 'CANCELLED'
                ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
          >
            Đã hủy ({stateCounts.CANCELLED || 0})
          </button>

          {Boolean(stateCounts.SKIPPED_ALREADY_SUCCESS) && (
            <button
              type="button"
              onClick={() => { setStateFilter('SKIPPED_ALREADY_SUCCESS'); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                stateFilter === 'SKIPPED_ALREADY_SUCCESS'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Bỏ qua ({stateCounts.SKIPPED_ALREADY_SUCCESS || 0})
            </button>
          )}

          {Boolean(stateCounts.RECOVERY_CHECK) && (
            <button
              type="button"
              onClick={() => { setStateFilter('RECOVERY_CHECK'); setPage(1); }}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition border ${
                stateFilter === 'RECOVERY_CHECK'
                  ? 'bg-purple-700 text-white border-purple-700 shadow-sm'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
            >
              Khôi phục ({stateCounts.RECOVERY_CHECK || 0})
            </button>
          )}
        </div>

        {/* DETAILED FILTERS GRID */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <label className="block text-slate-500 font-semibold mb-1">Từ ngày dữ liệu:</label>
            <input
              type="date"
              value={businessDateFrom}
              onChange={(e) => { setBusinessDateFrom(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Đến ngày dữ liệu:</label>
            <input
              type="date"
              value={businessDateTo}
              onChange={(e) => { setBusinessDateTo(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Chỉ tiêu:</label>
            <select
              value={indicatorFilter}
              onChange={(e) => { setIndicatorFilter(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {INDICATOR_OPTIONS.map((ind) => (
                <option key={ind} value={ind}>{ind === 'ALL' ? 'Tất cả chỉ tiêu' : ind}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Nguồn lane:</label>
            <select
              value={laneFilter}
              onChange={(e) => { setLaneFilter(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANE_OPTIONS.map((lane) => (
                <option key={lane} value={lane}>{lane === 'ALL' ? 'Tất cả nguồn' : `Nguồn ${lane}`}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Người chạy (Actor):</label>
            <input
              type="text"
              placeholder="VD: admin..."
              value={actorFilter}
              onChange={(e) => { setActorFilter(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-semibold mb-1">Chế độ import:</label>
            <select
              value={modeFilter}
              onChange={(e) => { setModeFilter(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {IMPORT_MODE_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>Ngày tạo (giờ VN):</span>
            <input
              type="date"
              value={createdFrom}
              onChange={(e) => { setCreatedFrom(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm"
            />
            <span>→</span>
            <input
              type="date"
              value={createdTo}
              onChange={(e) => { setCreatedTo(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            className="font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      </div>

      {/* ERROR MESSAGE */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* JOBS TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Thời gian tạo</th>
                <th className="px-4 py-3">Ngày DL</th>
                <th className="px-4 py-3">Chỉ tiêu</th>
                <th className="px-4 py-3">Nguồn</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Người chạy</th>
                <th className="px-4 py-3">Chế độ</th>
                <th className="px-4 py-3 text-center">Lần thử</th>
                <th className="px-4 py-3 text-right">Dòng</th>
                <th className="px-4 py-3 text-right">Thời lượng</th>
                <th className="px-4 py-3 min-w-[240px]">Lỗi & Hành động yêu cầu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && jobs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    Đang tải nhật ký import...
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400">
                    Không tìm thấy lượt nạp nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const stateInfo = translateJobState(job.state);
                  const isFailed = job.state === 'FAILED_TERMINAL';
                  const errorLabel = jobErrorText(job.last_error_signature || job.last_result_code);

                  return (
                    <tr
                      key={job.id}
                      onClick={() => handleOpenRunDetail(job.run_id)}
                      className={`hover:bg-blue-50/40 cursor-pointer transition ${
                        isFailed ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap text-slate-600">
                        {formatVietnamDateTime(job.created_at)}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900 whitespace-nowrap">
                        {job.business_date}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-800 whitespace-nowrap">
                        {job.indicator}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-600 whitespace-nowrap">
                        {job.source_lane}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${stateInfo.badgeClass}`}>
                          {stateInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                        {job.actor || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                        <span className="font-mono text-[11px]">{job.import_mode || '—'}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center font-medium text-slate-700 whitespace-nowrap">
                        {job.attempt_count}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800 whitespace-nowrap">
                        {job.row_count != null ? Number(job.row_count).toLocaleString('vi-VN') : '—'}
                        {Boolean(job.replaced_row_count) && (
                          <span className="text-[10px] text-amber-700 block">
                            (-{Number(job.replaced_row_count).toLocaleString('vi-VN')})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-600 whitespace-nowrap">
                        {formatJobDuration(job.duration_ms)}
                      </td>
                      <td className="px-4 py-2.5">
                        {isFailed ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-rose-800 block">
                              {errorLabel || 'Lỗi không xác định'}
                            </span>
                            {job.last_error_message && (
                              <p className="text-[11px] text-slate-700 line-clamp-2" title={job.last_error_message}>
                                {job.last_error_message}
                              </p>
                            )}
                            {job.action_required && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                💡 {job.action_required}
                              </span>
                            )}
                          </div>
                        ) : job.state === 'SUCCESS' ? (
                          <span className="text-emerald-700 font-medium">Hoàn tất</span>
                        ) : (
                          <span className="text-slate-400 italic">Đang chờ xử lý</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50 gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              Hiển thị <strong>{jobs.length > 0 ? (page - 1) * pageSize + 1 : 0}</strong> - <strong>{Math.min(page * pageSize, total)}</strong> trên tổng số <strong>{total.toLocaleString('vi-VN')}</strong> lượt nạp
            </span>

            <div className="flex items-center gap-1">
              <span>Mỗi trang:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 font-semibold text-slate-800 focus:outline-none"
              >
                {JOB_LOG_PAGE_SIZE_OPTIONS.map((sz) => (
                  <option key={sz} value={sz}>{sz}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Trước</span>
            </button>
            <span className="px-2 font-bold text-slate-800">
              Trang {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
            >
              <span>Sau</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* RUN DETAIL MODAL */}
      {selectedRunId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500">Tiến trình #{selectedRunId}</span>
                  {runDetailData?.run?.status && (
                    <span className="rounded-full bg-blue-100 text-blue-800 font-bold px-2 py-0.5 text-xs">
                      {runDetailData.run.status}
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-1">
                  Chi tiết Lượt nạp & Sự kiện thực thi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRunId(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1 text-xs">
              {runDetailLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                  Đang tải chi tiết tiến trình...
                </div>
              ) : runDetailError ? (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
                  {runDetailError}
                </div>
              ) : runDetailData ? (
                <>
                  {/* METADATA SUMMARY */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block">Chỉ tiêu & Nguồn:</span>
                      <span className="font-bold text-slate-900">
                        {runDetailData.run.requested_indicator || 'Nhiều chỉ tiêu'} • {runDetailData.run.requested_lane || 'Tất cả nguồn'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Người yêu cầu:</span>
                      <span className="font-bold text-slate-900">
                        {runDetailData.run.requested_by || 'system'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Khoảng ngày:</span>
                      <span className="font-medium text-slate-800">
                        {runDetailData.run.from_date || '—'} → {runDetailData.run.to_date || '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Thời gian tạo:</span>
                      <span className="font-medium text-slate-800">
                        {formatVietnamDateTime(runDetailData.run.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* JOBS IN THIS RUN */}
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2">
                      Danh sách Job trong lượt ({runDetailData.jobs?.length || 0}):
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {(runDetailData.jobs || []).map((j) => (
                        <div
                          key={j.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{j.business_date}</span>
                            <span className="text-slate-500 ml-2">• {j.indicator} ({j.source_lane})</span>
                            <span className="text-slate-400 ml-2 text-[10px]">({j.import_mode})</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            j.state === 'SUCCESS' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                            j.state === 'FAILED_TERMINAL' ? 'bg-rose-50 text-rose-800 border border-rose-200' :
                            'bg-blue-50 text-blue-800 border border-blue-200'
                          }`}>
                            {j.state}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* EVENTS TIMELINE */}
                  <div>
                    <h4 className="font-bold text-slate-900 mb-2">
                      Lịch sử sự kiện (Events):
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200 font-mono text-[11px]">
                      {(runDetailData.events || []).length === 0 ? (
                        <span className="text-slate-400 italic">Chưa có sự kiện nào được ghi nhận.</span>
                      ) : (
                        runDetailData.events.map((evt, idx) => (
                          <div key={idx} className="flex items-start gap-2 py-0.5 border-b border-slate-100 last:border-0">
                            <span className="text-slate-400 whitespace-nowrap">
                              {formatVietnamDateTime(evt.created_at)}
                            </span>
                            <span className="font-bold text-slate-800">{evt.event_type}</span>
                            <span className="text-slate-600">{evt.message || JSON.stringify(evt.payload || {})}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setSelectedRunId(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
