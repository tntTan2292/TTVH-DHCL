import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  Grid,
  History,
  List,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  UserCheck,
  X
} from 'lucide-react';
import api from '../api/client';
import {
  groupItemsByIndicatorAndMonth,
  paginateItems,
  resolveDynamicIndicators,
  resolveEffectiveRunState,
  resolveNoCodeStatus,
  resolveRunActionButtons,
  resolveWaitingAuthLanes
} from './autoBackfillUiHelpers';

const getApiErrorCode = (error, fallback = 'API_ERROR') => (
  error?.response?.data?.error?.code ||
  (error?.response?.status ? `HTTP_${error.response.status}` : fallback)
);

const getApiErrorMessage = (error, fallback = 'Đã xảy ra lỗi khi gọi API.') => (
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback
);

export default function AutoBackfillOperatorPanel() {
  // State for coverage scan
  const [coverageData, setCoverageData] = useState(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState(null);

  // Filters & Pagination
  const [indicatorFilter, setIndicatorFilter] = useState('ALL');
  const [laneFilter, setLaneFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Run Creation Target Selection (Safety Lock - Point 3)
  const [runTargetIndicator, setRunTargetIndicator] = useState('ALL');
  const [runTargetMonth, setRunTargetMonth] = useState('ALL');

  // UI View Mode: 'GROUPED_MONTH' | 'TABLE'
  const [viewMode, setViewMode] = useState('GROUPED_MONTH');

  // Active Run State
  const [activeRunId, setActiveRunId] = useState(null);
  const [runData, setRunData] = useState(null);
  const [runActionLoading, setRunActionLoading] = useState(false);
  const [runError, setRunError] = useState(null);

  // Audit Events & PO Report Drawers
  const [showEvents, setShowEvents] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [showExceptionHistory, setShowExceptionHistory] = useState(false);
  const [exceptionsList, setExceptionsList] = useState([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);

  // Exception Modals (Real API Calls)
  const [confirmModalItem, setConfirmModalItem] = useState(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  const [revokeModalItem, setRevokeModalItem] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeError, setRevokeError] = useState(null);

  // Notification Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Coverage
  const fetchCoverage = useCallback(async () => {
    setCoverageLoading(true);
    setCoverageError(null);
    try {
      const params = {};
      if (indicatorFilter !== 'ALL') params.indicator = indicatorFilter;
      if (laneFilter !== 'ALL') params.lane = laneFilter;

      const res = await api.get('/import/auto-backfill/coverage', { params });
      if (res.data.success) {
        setCoverageData(res.data.data);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] fetchCoverage error:', err);
      setCoverageError(getApiErrorMessage(err, 'Không thể tải thông tin bao phủ dữ liệu.'));
    } finally {
      setCoverageLoading(false);
    }
  }, [indicatorFilter, laneFilter]);

  // Fetch Run Status
  const fetchRunStatus = useCallback(async (runId) => {
    if (!runId) return;
    try {
      const res = await api.get(`/import/auto-backfill/runs/${runId}`);
      if (res.data.success) {
        setRunData(res.data.data);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] fetchRunStatus error:', err);
    }
  }, []);

  // Fetch Events
  const fetchEvents = useCallback(async (runId) => {
    if (!runId) return;
    setEventsLoading(true);
    try {
      const res = await api.get(`/import/auto-backfill/runs/${runId}/events`);
      if (res.data.success) {
        setEvents(res.data.data.items || []);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] fetchEvents error:', err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // Fetch Exception History
  const fetchExceptionHistory = useCallback(async () => {
    setExceptionsLoading(true);
    try {
      const res = await api.get('/import/auto-backfill/coverage/exceptions');
      if (res.data.success) {
        setExceptionsList(res.data.data.items || []);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] fetchExceptionHistory error:', err);
    } finally {
      setExceptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoverage();
  }, [fetchCoverage]);

  useEffect(() => {
    if (activeRunId) {
      fetchRunStatus(activeRunId);
      const interval = setInterval(() => {
        fetchRunStatus(activeRunId);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [activeRunId, fetchRunStatus]);

  // Handlers for Run Actions
  const handleCreateRun = async () => {
    if (!runTargetIndicator || !runTargetMonth) return;
    setRunActionLoading(true);
    setRunError(null);
    try {
      let from_date = null;
      let to_date = null;
      if (runTargetMonth !== 'ALL') {
        const [year, month] = runTargetMonth.split('-').map(Number);
        const lastDay = new Date(year, month, 0).getDate();
        from_date = `${runTargetMonth}-01`;
        to_date = `${runTargetMonth}-${String(lastDay).padStart(2, '0')}`;
      }

      const payload = {
        requested_lane: laneFilter !== 'ALL' ? laneFilter : 'ALL',
        lane: laneFilter !== 'ALL' ? laneFilter : null,
        indicator: runTargetIndicator !== 'ALL' ? runTargetIndicator : null,
        month: runTargetMonth,
        from_date,
        to_date
      };
      const res = await api.post('/import/auto-backfill/runs', payload);
      if (res.data.success) {
        const newRun = res.data.data;
        setActiveRunId(newRun.run_id);
        setRunData(newRun);
        showToast(`Đã tạo tiến trình bù #${newRun.run_id} cho chỉ tiêu ${runTargetIndicator} (${runTargetMonth})`);
        fetchCoverage();
      }
    } catch (err) {
      setRunError(getApiErrorMessage(err, 'Không thể khởi tạo tiến trình bù tự động.'));
    } finally {
      setRunActionLoading(false);
    }
  };

  const handlePauseRun = async () => {
    if (!activeRunId) return;
    setRunActionLoading(true);
    try {
      const res = await api.post(`/import/auto-backfill/runs/${activeRunId}/pause`);
      if (res.data.success) {
        fetchRunStatus(activeRunId);
        showToast('Đã tạm dừng tiến trình bù.');
      }
    } catch (err) {
      setRunError(getApiErrorMessage(err, 'Không thể tạm dừng.'));
    } finally {
      setRunActionLoading(false);
    }
  };

  const handleResumeRun = async () => {
    if (!activeRunId) return;
    setRunActionLoading(true);
    try {
      const res = await api.post(`/import/auto-backfill/runs/${activeRunId}/resume`);
      if (res.data.success) {
        fetchRunStatus(activeRunId);
        showToast('Đã tiếp tục tiến trình bù.');
      }
    } catch (err) {
      setRunError(getApiErrorMessage(err, 'Không thể tiếp tục.'));
    } finally {
      setRunActionLoading(false);
    }
  };

  const handleResetCircuit = async () => {
    if (!activeRunId) return;
    setRunActionLoading(true);
    try {
      const res = await api.post(`/import/auto-backfill/runs/${activeRunId}/circuit/reset`);
      if (res.data.success) {
        fetchRunStatus(activeRunId);
        showToast('Đã khôi phục mạch an toàn.');
      }
    } catch (err) {
      setRunError(getApiErrorMessage(err, 'Không thể khôi phục mạch.'));
    } finally {
      setRunActionLoading(false);
    }
  };

  // Real PO Exception Confirmation API Call (Fix Point 1: exception_type included!)
  const handleConfirmExemption = async () => {
    if (!confirmModalItem || !confirmReason.trim()) return;
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      const payload = {
        indicator: confirmModalItem.indicator,
        source_lane: confirmModalItem.source_lane,
        business_date: confirmModalItem.business_date,
        exception_type: 'PO_EXEMPTED', // CRITICAL FIX: Explicit backend contract field
        reason: confirmReason.trim()
      };
      const res = await api.post('/import/auto-backfill/coverage/exceptions', payload);
      if (res.data.success) {
        showToast(`Đã xác nhận không phát sinh dữ liệu cho ${confirmModalItem.indicator} (${confirmModalItem.source_lane}) ngày ${confirmModalItem.business_date}`);
        setConfirmModalItem(null);
        setConfirmReason('');
        fetchCoverage();
      }
    } catch (err) {
      setConfirmError(getApiErrorMessage(err, 'Không thể xác nhận ngoại lệ.'));
    } finally {
      setConfirmLoading(false);
    }
  };

  // Real PO Exception Revoke API Call
  const handleRevokeExemption = async () => {
    if (!revokeModalItem || !revokeReason.trim()) return;
    setRevokeLoading(true);
    setRevokeError(null);
    try {
      const exceptionId = revokeModalItem.exception_id || revokeModalItem.id;
      const res = await api.post(`/import/auto-backfill/coverage/exceptions/${exceptionId}/revoke`, {
        reason: revokeReason.trim()
      });
      if (res.data.success) {
        showToast('Đã hoàn tác ngoại lệ thành công');
        setRevokeModalItem(null);
        setRevokeReason('');
        fetchCoverage();
        if (showExceptionHistory) fetchExceptionHistory();
      }
    } catch (err) {
      setRevokeError(getApiErrorMessage(err, 'Không thể hoàn tác ngoại lệ.'));
    } finally {
      setRevokeLoading(false);
    }
  };

  // Dynamic Indicator Cards & Filter Options
  const indicatorsList = useMemo(() => {
    return resolveDynamicIndicators(coverageData);
  }, [coverageData]);

  const rawCoverageItems = useMemo(() => {
    return coverageData?.items || [];
  }, [coverageData]);

  // Derived Month Options
  const monthOptions = useMemo(() => {
    const monthsSet = new Set();
    rawCoverageItems.forEach((i) => {
      if (i.business_date && i.business_date.length >= 7) {
        monthsSet.add(i.business_date.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [rawCoverageItems]);

  // Filtered Coverage Items
  const filteredCoverageItems = useMemo(() => {
    return rawCoverageItems.filter((item) => {
      if (indicatorFilter !== 'ALL' && item.indicator !== indicatorFilter) return false;
      if (laneFilter !== 'ALL' && item.source_lane !== laneFilter) return false;
      if (monthFilter !== 'ALL' && (!item.business_date || !item.business_date.startsWith(monthFilter))) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'MISSING' && !['TRUE_MISSING', 'MISSING', 'MANUAL_ONLY_MISSING'].includes(item.status)) return false;
        if (statusFilter === 'COMPLETE' && !['DATA_COMPLETE_WITH_EVIDENCE', 'SUCCESS'].includes(item.status)) return false;
        if (statusFilter === 'LEGACY' && item.status !== 'LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE') return false;
        if (statusFilter === 'NO_DATA' && item.status !== 'VERIFIED_NO_DATA') return false;
        if (statusFilter === 'PO_EXEMPTED' && item.status !== 'PO_EXEMPTED') return false;
        if (statusFilter === 'REVIEW' && item.status !== 'MANUAL_REVIEW_REQUIRED') return false;
      }
      return true;
    });
  }, [rawCoverageItems, indicatorFilter, laneFilter, monthFilter, statusFilter]);

  // Smart Grouping by Indicator × Month
  const monthlyGroups = useMemo(() => {
    return groupItemsByIndicatorAndMonth(filteredCoverageItems);
  }, [filteredCoverageItems]);

  // Pagination for Table View
  const paginatedCoverage = useMemo(() => {
    return paginateItems(filteredCoverageItems, currentPage, pageSize);
  }, [filteredCoverageItems, currentPage, pageSize]);

  // Effective Run State & Active Job Granular Visibility (Point 4)
  const effectiveRunState = useMemo(() => {
    return resolveEffectiveRunState(runData?.run);
  }, [runData]);

  const actionButtons = useMemo(() => {
    return resolveRunActionButtons(effectiveRunState);
  }, [effectiveRunState]);

  const waitingLanes = useMemo(() => {
    return resolveWaitingAuthLanes(runData?.run, runData?.jobs);
  }, [runData]);

  const activeExecutingJob = useMemo(() => {
    const jobs = runData?.jobs || [];
    return (
      jobs.find((j) => ['RUNNING', 'LEASED', 'RECOVERY_CHECK'].includes(j.state || j.status || j.safety_state)) ||
      jobs.find((j) => (j.state || j.safety_state) === 'WAITING_AUTH') ||
      null
    );
  }, [runData]);

  return (
    <div className="flex flex-col gap-6 font-sans text-slate-800">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HERO CONTROL HEADER - SYSTEM DESIGN TOKENS ALIGNED (Point 2) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Trung tâm Điều hành Bù dữ liệu Tự động</h2>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-[var(--color-vnpost-blue)] border border-blue-100">
                QIS V2 Platform
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Tự động rà soát ngày thiếu, nạp bù dữ liệu từ Portal Huế/TCT và quản lý ngoại lệ nghiệp vụ cho người No-code.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => fetchCoverage()}
              disabled={coverageLoading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${coverageLoading ? 'animate-spin' : ''}`} />
              <span>Quét phủ dữ liệu</span>
            </button>

            <button
              onClick={() => {
                setShowExceptionHistory(true);
                fetchExceptionHistory();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <History className="h-4 w-4 text-purple-600" />
              <span>Lịch sử Ngoại lệ PO</span>
            </button>
          </div>
        </div>

        {/* SAFE RUN CREATION CONTROLS (Point 3) */}
        {!activeRunId && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tạo tiến trình bù an toàn:</span>
            
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Chỉ tiêu:</label>
              <select
                value={runTargetIndicator}
                onChange={(e) => setRunTargetIndicator(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả chỉ tiêu</option>
                {indicatorsList.map((ind) => (
                  <option key={ind.code} value={ind.code}>{ind.code} ({ind.displayName})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">Tháng:</label>
              <select
                value={runTargetMonth}
                onChange={(e) => setRunTargetMonth(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả các tháng</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCreateRun}
              disabled={runActionLoading || !runTargetIndicator || !runTargetMonth}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[var(--color-vnpost-blue)] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[var(--color-vnpost-blue-dark)] disabled:opacity-40"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Kích hoạt Bù: {runTargetIndicator === 'ALL' ? 'Tất cả' : runTargetIndicator} ({runTargetMonth === 'ALL' ? 'Tất cả tháng' : runTargetMonth})</span>
            </button>
          </div>
        )}

        {/* ACTIVE RUN CONTROL & GRANULAR ACTIVE JOB VISIBILITY (Point 4) */}
        {activeRunId && runData && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900 text-sm">Tiến trình #{runData.run.run_id}</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  effectiveRunState === 'RUNNING' ? 'bg-blue-50 text-blue-800 border border-blue-200' :
                  effectiveRunState === 'PAUSED' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                  effectiveRunState === 'CIRCUIT_OPEN' ? 'bg-red-50 text-red-800 border border-red-200' :
                  'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {effectiveRunState || 'PENDING'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {actionButtons.canPause && (
                  <button
                    onClick={handlePauseRun}
                    disabled={runActionLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm hover:bg-amber-100"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    <span>Tạm dừng</span>
                  </button>
                )}

                {actionButtons.canResume && (
                  <button
                    onClick={handleResumeRun}
                    disabled={runActionLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    <span>Tiếp tục Run</span>
                  </button>
                )}

                {actionButtons.canResetCircuit && (
                  <button
                    onClick={handleResetCircuit}
                    disabled={runActionLoading}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-900 shadow-sm hover:bg-red-100"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Khôi phục Mạch</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowEvents(true);
                    fetchEvents(activeRunId);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  <Activity className="h-3.5 w-3.5 text-blue-600" />
                  <span>Audit Logs</span>
                </button>
              </div>
            </div>

            {/* GRANULAR JOB STATUS & WAITING_AUTH WARNING (Point 4) */}
            <div className="flex flex-wrap items-center justify-between border-t border-slate-200 pt-3 text-xs">
              {activeExecutingJob ? (
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
                  <span>Đang xử lý: <strong className="text-slate-900">Chỉ tiêu {activeExecutingJob.indicator} × Nguồn {activeExecutingJob.source_lane} × Ngày {activeExecutingJob.business_date}</strong></span>
                </div>
              ) : (
                <span className="text-slate-500">Đang khởi tạo các luồng bù dữ liệu...</span>
              )}

              {(waitingLanes.length > 0 || effectiveRunState === 'WAITING_AUTH') && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300 animate-bounce">
                  <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>Cần đăng nhập thủ công [{waitingLanes.join(' / ') || 'Portal'}]</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DYNAMIC INDICATOR HEALTH CARDS GRID (Point 5: Unique Calendar Date Count) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {indicatorsList.map((ind) => (
          <div
            key={ind.code}
            onClick={() => setIndicatorFilter(indicatorFilter === ind.code ? 'ALL' : ind.code)}
            className={`cursor-pointer rounded-2xl border p-5 transition shadow-sm ${
              indicatorFilter === ind.code
                ? 'border-[var(--color-vnpost-blue)] bg-blue-50/50 ring-2 ring-[var(--color-vnpost-blue)]/20'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-lg px-2 py-1 text-xs font-bold border ${ind.badgeClass}`}>
                {ind.code}
              </span>
              <span className="text-xs font-medium text-slate-500">Nguồn: {ind.supportedLanes.join(', ')}</span>
            </div>
            <h3 className="mt-2 text-base font-bold text-slate-900 line-clamp-1">{ind.displayName}</h3>
            <div className="mt-4 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-extrabold text-amber-600">{ind.missingCount}</span>
                <span className="ml-1.5 text-xs text-slate-500">ngày lịch còn thiếu</span>
              </div>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                {ind.successCount} ngày xong
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* CONTROL & FILTER BAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Filter className="h-4 w-4 text-slate-500" />
              <span>Bộ lọc:</span>
            </div>

            {/* Indicator Filter */}
            <select
              value={indicatorFilter}
              onChange={(e) => {
                setIndicatorFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả Chỉ tiêu</option>
              {indicatorsList.map((ind) => (
                <option key={ind.code} value={ind.code}>
                  {ind.code} — {ind.displayName}
                </option>
              ))}
            </select>

            {/* Lane Filter */}
            <select
              value={laneFilter}
              onChange={(e) => {
                setLaneFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả Nguồn (HUE/TCT)</option>
              <option value="HUE">Nguồn Huế (F1.3 HUE)</option>
              <option value="TCT">Nguồn Tổng công ty (TCT)</option>
            </select>

            {/* Month Filter */}
            <select
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả Tháng</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Tất cả Trạng thái (6 loại)</option>
              <option value="MISSING">Thật sự còn thiếu</option>
              <option value="COMPLETE">Đã hoàn tất</option>
              <option value="LEGACY">Dữ liệu cũ đã có</option>
              <option value="NO_DATA">Không phát sinh dữ liệu</option>
              <option value="PO_EXEMPTED">PO đã xác nhận</option>
              <option value="REVIEW">Cần PO kiểm tra</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                onClick={() => setViewMode('GROUPED_MONTH')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  viewMode === 'GROUPED_MONTH' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="h-3.5 w-3.5" />
                <span>Nhóm theo Tháng</span>
              </button>
              <button
                onClick={() => setViewMode('TABLE')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition ${
                  viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Bảng Chi tiết</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: SMART MONTHLY GROUPING ACCORDION VIEW */}
      {viewMode === 'GROUPED_MONTH' && (
        <div className="flex flex-col gap-4">
          {monthlyGroups.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
              <h3 className="mt-3 text-lg font-bold text-slate-900">Không có dữ liệu phù hợp bộ lọc</h3>
              <p className="mt-1 text-sm text-slate-500">Tất cả các ngày trong phạm vi lựa chọn đã được xử lý hoàn tất hoặc ngoại lệ.</p>
            </div>
          ) : (
            monthlyGroups.map((group) => (
              <MonthlyAccordionGroup
                key={`${group.indicator}::${group.yearMonth}`}
                group={group}
                onConfirmClick={(item) => {
                  setConfirmModalItem(item);
                  setConfirmReason('');
                }}
                onRevokeClick={(item) => {
                  setRevokeModalItem(item);
                  setRevokeReason('');
                }}
              />
            ))
          )}
        </div>
      )}

      {/* VIEW MODE 2: TABLE VIEW WITH BOUNDED HEIGHT & PAGINATION */}
      {viewMode === 'TABLE' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Ngày Nghiệp vụ</th>
                  <th className="px-5 py-3.5">Chỉ tiêu</th>
                  <th className="px-5 py-3.5">Nguồn Lane</th>
                  <th className="px-5 py-3.5">Trạng thái No-Code</th>
                  <th className="px-5 py-3.5 text-right">Thao tác Ngoại lệ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCoverage.pageItems.map((item, idx) => {
                  const statusInfo = resolveNoCodeStatus(item.status);
                  return (
                    <tr key={`${item.indicator}-${item.source_lane}-${item.business_date}-${idx}`} className="hover:bg-slate-50/80 transition">
                      <td className="px-5 py-3.5 font-bold text-slate-900">{item.business_date}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-700">{item.indicator}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                          {item.source_lane}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${statusInfo.badgeClass}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {['TRUE_MISSING', 'MISSING', 'MANUAL_REVIEW_REQUIRED'].includes(item.status) && (
                          <button
                            onClick={() => {
                              setConfirmModalItem(item);
                              setConfirmReason('');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                            <span>Xác nhận Không phát sinh</span>
                          </button>
                        )}

                        {item.status === 'PO_EXEMPTED' && (
                          <button
                            onClick={() => {
                              setRevokeModalItem(item);
                              setRevokeReason('');
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                            <span>Hoàn tác</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PAGINATION BAR */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span>Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm"
              >
                <option value={10}>10 dòng/trang</option>
                <option value={20}>20 dòng/trang</option>
                <option value={50}>50 dòng/trang</option>
              </select>
              <span>trên tổng {paginatedCoverage.totalItems} ngày</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!paginatedCoverage.hasPrev}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Trang trước</span>
              </button>
              <span className="text-xs font-bold text-slate-800">
                Trang {paginatedCoverage.currentPage} / {paginatedCoverage.totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(paginatedCoverage.totalPages, p + 1))}
                disabled={!paginatedCoverage.hasNext}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
              >
                <span>Trang sau</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL PO EXEMPTION CONFIRMATION MODAL */}
      {confirmModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                  <UserCheck className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận Ngày Không phát sinh Dữ liệu</h3>
              </div>
              <button onClick={() => setConfirmModalItem(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
              <div>Định danh khóa: <strong className="text-slate-900">{confirmModalItem.indicator} × Nguồn {confirmModalItem.source_lane} × Ngày {confirmModalItem.business_date}</strong></div>
              <div>Trạng thái hiện tại: <span className="font-semibold text-amber-800">{confirmModalItem.status}</span></div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700">Lý do xác nhận của PO (Bắt buộc):</label>
              <textarea
                value={confirmReason}
                onChange={(e) => setConfirmReason(e.target.value)}
                placeholder="VD: Ngày nghỉ lễ Quốc Khánh 02/09 portal không phát sinh bưu gửi..."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {confirmError && (
              <div className="mt-3 text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {confirmError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModalItem(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmExemption}
                disabled={confirmLoading || !confirmReason.trim()}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
              >
                {confirmLoading ? 'Đang lưu...' : 'Xác nhận Lưu Ngoại lệ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL EXCEPTION REVOKE MODAL */}
      {revokeModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-slate-100 p-2 text-slate-700">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Hoàn tác Ngoại lệ PO</h3>
              </div>
              <button onClick={() => setRevokeModalItem(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
              <div>Định danh ngoại lệ ID: <strong className="text-slate-900">{revokeModalItem.exception_id || revokeModalItem.id}</strong></div>
              <div>Ngày: <strong>{revokeModalItem.business_date}</strong> ({revokeModalItem.indicator} - {revokeModalItem.source_lane})</div>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700">Lý do hoàn tác (Bắt buộc):</label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="VD: Cần khôi phục quét lại dữ liệu bổ sung..."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {revokeError && (
              <div className="mt-3 text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {revokeError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setRevokeModalItem(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleRevokeExemption}
                disabled={revokeLoading || !revokeReason.trim()}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-900 disabled:opacity-50"
              >
                {revokeLoading ? 'Đang xử lý...' : 'Xác nhận Hoàn tác'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OUT EXCEPTION HISTORY DRAWER */}
      {showExceptionHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white p-6 shadow-2xl flex flex-col h-full border-l border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-bold text-slate-900">Lịch sử Ngoại lệ PO</h3>
              </div>
              <button onClick={() => setShowExceptionHistory(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3">
              {exceptionsLoading ? (
                <div className="py-12 text-center text-sm text-slate-500">Đang tải lịch sử ngoại lệ...</div>
              ) : exceptionsList.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">Chưa có bản ghi ngoại lệ nào.</div>
              ) : (
                exceptionsList.map((exc) => (
                  <div key={exc.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{exc.indicator} × {exc.source_lane} × {exc.business_date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        exc.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {exc.status === 'ACTIVE' ? 'Đang hiệu lực' : 'Đã hoàn tác'}
                      </span>
                    </div>
                    <div className="text-slate-600">Loại: <strong className="text-slate-800">{exc.exception_type}</strong></div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200 italic">"{exc.reason}"</div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Tạo bởi: {exc.created_by_user_id || 'PO Admin'}</span>
                      <span>{new Date(exc.created_at).toLocaleString('vi-VN')}</span>
                    </div>

                    {exc.status === 'ACTIVE' && (
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => {
                            setRevokeModalItem(exc);
                            setRevokeReason('');
                          }}
                          className="text-xs text-red-600 font-semibold hover:underline"
                        >
                          [Hoàn tác ngoại lệ này]
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SLIDE-OUT AUDIT EVENTS DRAWER */}
      {showEvents && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white p-6 shadow-2xl flex flex-col h-full border-l border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Nhật ký Audit Events Run #{activeRunId}</h3>
              </div>
              <button onClick={() => setShowEvents(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-2">
              {eventsLoading ? (
                <div className="py-12 text-center text-sm text-slate-500">Đang tải nhật ký sự kiện...</div>
              ) : events.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-500">Chưa có sự kiện audit nào.</div>
              ) : (
                events.map((ev, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{ev.event_type}</span>
                      <span className="text-slate-400 font-normal">{new Date(ev.created_at).toLocaleTimeString('vi-VN')}</span>
                    </div>
                    <p className="text-slate-600">{ev.details ? JSON.stringify(ev.details) : 'Không có chi tiết'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// SUBCOMPONENT: SMART MONTHLY ACCORDION GROUP
function MonthlyAccordionGroup({ group, onConfirmClick, onRevokeClick }) {
  const [isOpen, setIsOpen] = useState(group.counts.missing > 0 || group.counts.reviewReq > 0);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex cursor-pointer items-center justify-between bg-slate-50/80 px-6 py-4 transition hover:bg-slate-100/80 border-b border-slate-200"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white p-1.5 text-slate-600 shadow-xs border border-slate-200">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-slate-900">{group.indicator}</span>
              <span className="text-sm font-semibold text-slate-600">— Tháng {group.yearMonth}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng {group.counts.total} bản ghi • {group.counts.complete} xong • {group.counts.legacy} dữ liệu cũ • {group.counts.noData} không phát sinh
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {group.counts.missing > 0 ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300">
              Còn thiếu {group.counts.missing} bản ghi
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-300">
              100% Hoàn tất
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="divide-y divide-slate-100">
          {group.items.map((item, idx) => {
            const statusInfo = resolveNoCodeStatus(item.status);
            return (
              <div key={idx} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/60 transition text-sm">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-900 w-24">{item.business_date}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    Nguồn {item.source_lane}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-medium border ${statusInfo.badgeClass}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {statusInfo.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {['TRUE_MISSING', 'MISSING', 'MANUAL_REVIEW_REQUIRED'].includes(item.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onConfirmClick(item);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      <span>Xác nhận Không phát sinh</span>
                    </button>
                  )}

                  {item.status === 'PO_EXEMPTED' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRevokeClick(item);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                    >
                      <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                      <span>Hoàn tác</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
