import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Lock,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  XCircle,
  Zap
} from 'lucide-react';
import api from '../api/client';

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

  // Filters
  const [indicatorFilter, setIndicatorFilter] = useState('ALL');
  const [laneFilter, setLaneFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Active Run State
  const [activeRunId, setActiveRunId] = useState(null);
  const [runData, setRunData] = useState(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runActionLoading, setRunActionLoading] = useState(false);
  const [runError, setRunError] = useState(null);

  // Audit Events & PO Report
  const [showEvents, setShowEvents] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [showReport, setShowReport] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Interactive login state
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState(null);

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
      setCoverageError(`Không thể quét dữ liệu bù tự động. Mã lỗi: ${getApiErrorCode(err, 'COVERAGE_ERROR')} - ${getApiErrorMessage(err)}`);
    } finally {
      setCoverageLoading(false);
    }
  }, [indicatorFilter, laneFilter]);

  // Fetch Run Details
  const fetchRunDetails = useCallback(async (runId) => {
    if (!runId) return;
    setRunLoading(true);
    try {
      const res = await api.get(`/import/auto-backfill/runs/${runId}`);
      if (res.data.success) {
        setRunData(res.data.data);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] fetchRunDetails error:', err);
      setRunError(`Không thể lấy chi tiết tiến trình ${runId}. ${getApiErrorMessage(err)}`);
    } finally {
      setRunLoading(false);
    }
  }, []);

  // Fetch Events
  const fetchEvents = useCallback(async (runId) => {
    if (!runId) return;
    setEventsLoading(true);
    try {
      const res = await api.get(`/import/auto-backfill/runs/${runId}/events`);
      if (res.data.success) {
        setEvents(res.data.data?.events || res.data.data || []);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] fetchEvents error:', err);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  // Fetch Report
  const fetchReport = useCallback(async (runId) => {
    if (!runId) return;
    setReportLoading(true);
    try {
      const res = await api.get(`/import/auto-backfill/runs/${runId}/report`);
      if (res.data.success) {
        setReport(res.data.data);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] fetchReport error:', err);
    } finally {
      setReportLoading(false);
    }
  }, []);

  // Initial load & Polling
  useEffect(() => {
    fetchCoverage();
  }, [fetchCoverage]);

  useEffect(() => {
    if (!activeRunId) return undefined;
    fetchRunDetails(activeRunId);

    const isNonTerminal = runData?.run?.state && !['COMPLETED', 'CANCELLED'].includes(runData.run.state);
    const intervalTime = isNonTerminal ? 3000 : 8000;

    const interval = setInterval(() => {
      fetchRunDetails(activeRunId);
      if (showEvents) fetchEvents(activeRunId);
      if (showReport) fetchReport(activeRunId);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [activeRunId, fetchRunDetails, runData?.run?.state, showEvents, fetchEvents, showReport, fetchReport]);

  // Handle Create Run
  const handleCreateRun = async () => {
    setRunActionLoading(true);
    setRunError(null);
    setLoginMessage(null);
    try {
      const body = {};
      if (indicatorFilter !== 'ALL') body.indicator = indicatorFilter;
      if (laneFilter !== 'ALL') body.lane = laneFilter;

      const res = await api.post('/import/auto-backfill/runs', body);
      if (res.data.success) {
        const newRunId = res.data.data?.run?.id || res.data.data?.run_id || res.data.data?.id;
        if (newRunId) {
          setActiveRunId(newRunId);
          await fetchRunDetails(newRunId);
        }
        await fetchCoverage();
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] handleCreateRun error:', err);
      setRunError(`Không thể tạo tiến trình bù tự động: ${getApiErrorMessage(err)}`);
    } finally {
      setRunActionLoading(false);
    }
  };

  // Handle Pause Run
  const handlePauseRun = async () => {
    if (!activeRunId) return;
    setRunActionLoading(true);
    setRunError(null);
    try {
      const res = await api.post(`/import/auto-backfill/runs/${activeRunId}/pause`);
      if (res.data.success) {
        await fetchRunDetails(activeRunId);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] handlePauseRun error:', err);
      setRunError(`Không thể tạm dừng tiến trình: ${getApiErrorMessage(err)}`);
    } finally {
      setRunActionLoading(false);
    }
  };

  // Handle Resume Run
  const handleResumeRun = async () => {
    if (!activeRunId) return;
    setRunActionLoading(true);
    setRunError(null);
    try {
      const res = await api.post(`/import/auto-backfill/runs/${activeRunId}/resume`);
      if (res.data.success) {
        await fetchRunDetails(activeRunId);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] handleResumeRun error:', err);
      setRunError(`Không thể tiếp tục tiến trình: ${getApiErrorMessage(err)}`);
    } finally {
      setRunActionLoading(false);
    }
  };

  // Handle Reset Circuit
  const handleResetCircuit = async () => {
    if (!activeRunId) return;
    setRunActionLoading(true);
    setRunError(null);
    try {
      const res = await api.post(`/import/auto-backfill/runs/${activeRunId}/circuit/reset`);
      if (res.data.success) {
        await fetchRunDetails(activeRunId);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] handleResetCircuit error:', err);
      setRunError(`Không thể khôi phục mạch ngắt: ${getApiErrorMessage(err)}`);
    } finally {
      setRunActionLoading(false);
    }
  };

  // Handle Interactive Login
  const handleInteractiveLogin = async (source) => {
    setLoginLoading(true);
    setLoginMessage(null);
    try {
      const res = await api.post('/import/dkcl/session/interactive-auth', { source });
      const status = res.data.data?.status || 'SESSION_CHECK_FAILED';
      if (status === 'SESSION_VALID') {
        setLoginMessage({ type: 'success', text: `Phiên ${source} đã xác thực thành công. Bạn có thể nhấn Tiếp tục tiến trình.` });
      } else {
        setLoginMessage({ type: 'amber', text: `Trạng thái phiên ${source}: ${status}. Hãy hoàn tất đăng nhập trên cửa sổ trình duyệt vừa mở.` });
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] handleInteractiveLogin error:', err);
      setLoginMessage({ type: 'error', text: `Không thể mở đăng nhập ${source}: ${getApiErrorMessage(err)}` });
    } finally {
      setLoginLoading(false);
    }
  };

  // Filter items for table view
  const rawItems = coverageData?.items || [];
  const filteredItems = rawItems.filter((item) => {
    if (indicatorFilter !== 'ALL' && item.indicator !== indicatorFilter) return false;
    if (laneFilter !== 'ALL' && item.source_lane !== laneFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });

  // Calculate summary numbers
  const totalScanned = rawItems.length;
  const missingCount = rawItems.filter((item) => item.status === 'MISSING').length;
  const successCount = rawItems.filter((item) => item.status === 'SUCCESS').length;
  const runnableJobsCount = coverageData?.runnable_portal_jobs ?? rawItems.filter((item) => item.queue_eligible).length;
  const manualOnlyCount = rawItems.filter((item) => ['MANUAL_ONLY_MISSING', 'MANUAL_REVIEW_REQUIRED'].includes(item.status)).length;

  const currentRun = runData?.run || null;
  const runState = currentRun?.state || null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8" data-testid="auto-backfill-operator-panel">
      {/* Panel Header */}
      <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-slate-900 to-vnpost-blue-dark text-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Zap size={22} className="text-yellow-400 animate-pulse" />
            <h2 className="text-lg font-bold">Nền tảng Tự động Bù dữ liệu (Auto Backfill V2)</h2>
            <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-200 border border-blue-400/30">
              Governance Standard
            </span>
          </div>
          <p className="text-xs text-blue-100 mt-1">
            Tự động bù ngày thiếu từ <strong>01/01/2026</strong> đến <strong>N-1</strong> cho <strong>F1.3 & F4.1</strong> từ nguồn Huế và TCT. Thứ tự ưu tiên: Ngày mới nhất trước.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchCoverage}
            disabled={coverageLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-sm hover:bg-white/20 transition-all disabled:opacity-50"
            title="Quét lại vùng dữ liệu bù tự động"
          >
            <RefreshCw size={14} className={coverageLoading ? 'animate-spin' : ''} />
            Quét lại Coverage
          </button>
        </div>
      </div>

      {/* Control & Selection Filters Bar */}
      <div className="p-6 bg-slate-50/70 border-b border-gray-100 space-y-4">
        {/* Indicator & Lane Choice Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Choice 1: Indicator */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Chỉ tiêu (Indicator)</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-200/60 rounded-xl">
              {[
                { code: 'ALL', label: 'Tất cả' },
                { code: 'F1.3', label: 'F1.3 KPI' },
                { code: 'F4.1', label: 'F4.1 Phát BC' }
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setIndicatorFilter(item.code)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    indicatorFilter === item.code
                      ? 'bg-vnpost-blue text-white shadow-sm'
                      : 'text-gray-700 hover:bg-white/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Choice 2: Source Lane */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Nguồn dữ liệu (Source Lane)</label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-200/60 rounded-xl">
              {[
                { code: 'ALL', label: 'Tất cả nguồn' },
                { code: 'HUE', label: 'HUE (Huế)' },
                { code: 'TCT', label: 'TCT (Tổng Cty)' }
              ].map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLaneFilter(item.code)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    laneFilter === item.code
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'text-gray-700 hover:bg-white/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Choice 3: Status Filter */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Trạng thái Coverage</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-800 focus:border-vnpost-blue focus:outline-none shadow-sm"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="MISSING">Thiếu dữ liệu (MISSING)</option>
              <option value="SUCCESS">Đã hoàn tất (SUCCESS)</option>
              <option value="INCOMPLETE">Chưa hoàn tất (INCOMPLETE)</option>
              <option value="MANUAL_REVIEW_REQUIRED">Cần soát xét (REVIEW_REQ)</option>
              <option value="MANUAL_ONLY_MISSING">Chưa có Adapter (MANUAL_ONLY)</option>
            </select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-2">
          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
            <p className="text-[11px] font-bold uppercase text-gray-400">Tổng ngày quét</p>
            <p className="mt-0.5 text-xl font-black text-gray-900">{totalScanned}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 shadow-xs">
            <p className="text-[11px] font-bold uppercase text-amber-700">Ngày còn thiếu</p>
            <p className="mt-0.5 text-xl font-black text-amber-700">{missingCount}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50/70 p-3 shadow-xs">
            <p className="text-[11px] font-bold uppercase text-green-700">Đã hoàn tất</p>
            <p className="mt-0.5 text-xl font-black text-green-700">{successCount}</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 shadow-xs">
            <p className="text-[11px] font-bold uppercase text-blue-700">Nạp tự động khả thi</p>
            <p className="mt-0.5 text-xl font-black text-blue-900">{runnableJobsCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-100/70 p-3 shadow-xs col-span-2 sm:col-span-1">
            <p className="text-[11px] font-bold uppercase text-slate-600">Thủ công / Soát xét</p>
            <p className="mt-0.5 text-xl font-black text-slate-800">{manualOnlyCount}</p>
          </div>
        </div>

        {/* Action Controls & Run Execution Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-gray-200/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateRun}
              disabled={runActionLoading || runnableJobsCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-vnpost-blue px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 transition-all shadow-md disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
            >
              {runActionLoading ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
              Tạo Tiến trình Bù Tự động ({runnableJobsCount} việc)
            </button>
            {activeRunId && (
              <span className="text-xs font-bold text-gray-600 bg-gray-200 px-3 py-1.5 rounded-lg">
                Run ID: <code className="text-vnpost-blue font-mono">{activeRunId}</code>
              </span>
            )}
          </div>

          {/* Active Run Controls */}
          {activeRunId && runState && (
            <div className="flex flex-wrap items-center gap-2">
              {['RUNNING', 'PLANNED'].includes(runState) && (
                <button
                  type="button"
                  onClick={handlePauseRun}
                  disabled={runActionLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  <Pause size={14} />
                  Tạm dừng (Pause)
                </button>
              )}
              {['PAUSED', 'WAITING_AUTH'].includes(runState) && (
                <button
                  type="button"
                  onClick={handleResumeRun}
                  disabled={runActionLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  <Play size={14} />
                  Tiếp tục (Resume)
                </button>
              )}
              {runState === 'CIRCUIT_OPEN' && (
                <button
                  type="button"
                  onClick={handleResetCircuit}
                  disabled={runActionLoading}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 animate-bounce"
                >
                  <RotateCcw size={14} />
                  Khôi phục Mạch (Reset Circuit)
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error & Warning Messages */}
      {coverageError && (
        <div className="mx-6 mt-4 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3 text-red-800 text-xs font-semibold">
          <AlertTriangle size={18} className="shrink-0 text-red-600 mt-0.5" />
          <div>{coverageError}</div>
        </div>
      )}
      {runError && (
        <div className="mx-6 mt-4 p-4 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3 text-red-800 text-xs font-semibold">
          <XCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
          <div>{runError}</div>
        </div>
      )}

      {/* Special Safety & Operator Guidance Cards */}
      {/* 1. WAITING_AUTH Guidance */}
      {runState === 'WAITING_AUTH' && (
        <div className="mx-6 mt-4 p-5 rounded-2xl border-2 border-amber-300 bg-amber-50/90 shadow-xs space-y-3" data-testid="waiting-auth-banner">
          <div className="flex items-start gap-3">
            <Lock size={22} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">Yêu cầu Đăng nhập Hệ thống Nguồn (WAITING_AUTH)</h4>
              <p className="text-xs text-amber-800 mt-1">
                Tiến trình tự động tạm dừng an toàn do hết hạn phiên làm việc trên Cổng thông tin. Vui lòng mở cửa sổ đăng nhập bên dưới để xác thực thủ công, sau đó nhấn <strong>Tiếp tục tiến trình</strong>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 pt-1 pl-8">
            <button
              type="button"
              onClick={() => handleInteractiveLogin('HUE')}
              disabled={loginLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-vnpost-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
            >
              Mở đăng nhập Huế
            </button>
            <button
              type="button"
              onClick={() => handleInteractiveLogin('TCT')}
              disabled={loginLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-purple-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-800 disabled:opacity-50"
            >
              Mở đăng nhập TCT
            </button>
            <button
              type="button"
              onClick={handleResumeRun}
              disabled={runActionLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-700 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-green-800 disabled:opacity-50"
            >
              Xác nhận & Tiếp tục tiến trình
            </button>
          </div>
          {loginMessage && (
            <div className={`ml-8 mt-2 p-2.5 rounded-lg text-xs font-semibold ${
              loginMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'
            }`}>
              {loginMessage.text}
            </div>
          )}
        </div>
      )}

      {/* 2. CIRCUIT_OPEN Guidance */}
      {runState === 'CIRCUIT_OPEN' && (
        <div className="mx-6 mt-4 p-5 rounded-2xl border-2 border-red-300 bg-red-50/90 shadow-xs space-y-3" data-testid="circuit-open-banner">
          <div className="flex items-start gap-3">
            <ShieldAlert size={22} className="text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900">Mạch Tự Động Ngắt Bảo Vệ (CIRCUIT_OPEN)</h4>
              <p className="text-xs text-red-800 mt-1">
                Phát hiện <strong>5 lần lỗi liên tiếp cùng chữ ký hệ thống</strong> trong cùng phạm vi Adapter/Source. Tiến trình tự động khóa để bảo vệ hệ thống khỏi lặp lỗi tràn mạng.
              </p>
              <p className="text-xs font-bold text-red-900 mt-1.5">
                Hành động cần thực hiện: Kiểm tra mạng/kết nối portal, sau đó nhấn nút <strong>Khôi phục Mạch (Reset Circuit)</strong> để giải phóng mạch và tiếp tục.
              </p>
            </div>
          </div>
          <div className="pl-8 pt-1">
            <button
              type="button"
              onClick={handleResetCircuit}
              disabled={runActionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 shadow-sm disabled:opacity-50"
            >
              <RotateCcw size={15} />
              Khôi phục Mạch & Thử lại (Reset Circuit)
            </button>
          </div>
        </div>
      )}

      {/* 3. BLOCKED_INTEGRITY Guidance */}
      {runState === 'BLOCKED_INTEGRITY' && (
        <div className="mx-6 mt-4 p-5 rounded-2xl border-2 border-slate-400 bg-slate-100 shadow-xs" data-testid="blocked-integrity-banner">
          <div className="flex items-start gap-3">
            <XCircle size={22} className="text-slate-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-slate-900">Khóa An Toàn Toàn Vẹn Dữ Liệu (BLOCKED_INTEGRITY)</h4>
              <p className="text-xs text-slate-700 mt-1">
                Phát hiện lỗi vi phạm cấu trúc dữ liệu hoặc kiểm tra toàn vẹn không đạt. Tiến trình đã bị ngắt tức thì để tránh gây sai lệch database.
              </p>
              <p className="text-xs font-bold text-slate-900 mt-1.5">
                Hành động cần thực hiện: Liên hệ QTV hệ thống để soát xét file nguồn thô hoặc kiểm tra log chi tiết trước khi khởi tạo lại.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Run Status & Jobs Summary */}
      {activeRunId && runData && (
        <div className="mx-6 mt-4 p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-vnpost-blue" />
              <span className="text-xs font-bold uppercase text-gray-700">Trạng thái Tiến trình Hiện tại:</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                runState === 'RUNNING' ? 'bg-blue-600 text-white animate-pulse' :
                runState === 'PAUSED' ? 'bg-amber-500 text-white' :
                runState === 'WAITING_AUTH' ? 'bg-amber-600 text-white' :
                runState === 'CIRCUIT_OPEN' ? 'bg-red-600 text-white' :
                runState === 'BLOCKED_INTEGRITY' ? 'bg-slate-700 text-white' :
                runState === 'COMPLETED' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-800'
              }`}>
                {runState || 'KHÔNG XÁC ĐỊNH'}
              </span>
            </div>
            {runData.progress && (
              <p className="text-xs font-semibold text-gray-600">
                Tiến độ: <strong className="text-gray-900">{runData.progress.completed || 0}/{runData.progress.total || 0}</strong> việc hoàn thành ({runData.progress.percent || 0}%)
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const next = !showEvents;
                setShowEvents(next);
                if (next) fetchEvents(activeRunId);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              <Clock size={14} />
              {showEvents ? 'Ẩn Nhật ký Events' : 'Xem Nhật ký Events'}
              {showEvents ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !showReport;
                setShowReport(next);
                if (next) fetchReport(activeRunId);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
            >
              <FileText size={14} />
              {showReport ? 'Ẩn Báo cáo PO' : 'Xem Báo cáo PO'}
              {showReport ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Events Audit Log Timeline */}
      {showEvents && activeRunId && (
        <div className="mx-6 mt-4 p-5 rounded-xl border border-gray-200 bg-slate-900 text-gray-100 text-xs font-mono space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white flex items-center gap-2 font-sans">
              <Clock size={16} className="text-blue-400" />
              Nhật ký Sự kiện Append-Only Audit (Run {activeRunId})
            </h4>
            <button
              type="button"
              onClick={() => fetchEvents(activeRunId)}
              className="text-[11px] font-sans font-semibold text-blue-300 hover:underline"
            >
              Cập nhật
            </button>
          </div>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
            {eventsLoading ? (
              <p className="text-gray-400 font-sans italic">Đang tải nhật ký...</p>
            ) : events.length === 0 ? (
              <p className="text-gray-400 font-sans italic">Chưa có sự kiện nào được ghi nhận.</p>
            ) : (
              events.map((ev, idx) => (
                <div key={ev.id || idx} className="p-2 rounded bg-slate-800/80 border border-slate-700/60 leading-relaxed">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="font-bold text-blue-300">{ev.event_type || ev.type}</span>
                    <span>{ev.created_at || ev.timestamp}</span>
                  </div>
                  <p className="text-slate-200 mt-1">{ev.message || JSON.stringify(ev.payload || ev)}</p>
                  {ev.action_required && (
                    <p className="text-amber-400 font-bold mt-1">➔ Action: {ev.action_required}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PO Reconciliation Report Card */}
      {showReport && activeRunId && (
        <div className="mx-6 mt-4 p-5 rounded-xl border border-blue-200 bg-blue-50/70 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-blue-200 pb-2">
            <h4 className="font-bold text-blue-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-700" />
              Báo cáo Đối chiếu Kết quả cho Product Owner (Run {activeRunId})
            </h4>
            <button
              type="button"
              onClick={() => fetchReport(activeRunId)}
              className="font-semibold text-blue-700 hover:underline"
            >
              Cập nhật
            </button>
          </div>
          {reportLoading ? (
            <p className="text-gray-500 italic">Đang tổng hợp báo cáo...</p>
          ) : report ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-lg border border-blue-100">
                <div>
                  <span className="text-gray-500 block">Tổng công việc</span>
                  <strong className="text-sm text-gray-900">{report.totals?.total_jobs || report.total_jobs || 0}</strong>
                </div>
                <div>
                  <span className="text-green-700 block">Thành công</span>
                  <strong className="text-sm text-green-700">{report.totals?.success || report.success_jobs || 0}</strong>
                </div>
                <div>
                  <span className="text-amber-700 block">Đang chờ / Tạm dừng</span>
                  <strong className="text-sm text-amber-700">{report.totals?.pending || report.pending_jobs || 0}</strong>
                </div>
                <div>
                  <span className="text-red-700 block">Thất bại / Cần xử lý</span>
                  <strong className="text-sm text-red-700">{report.totals?.failed || report.failed_jobs || 0}</strong>
                </div>
              </div>
              {report.action_required && (
                <div className="p-3 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 font-bold">
                  Khuyến nghị cho PO: {report.action_required}
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 italic">Chưa có dữ liệu báo cáo.</p>
          )}
        </div>
      )}

      {/* Main Coverage & Missing Dates Table */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <Calendar size={16} className="text-vnpost-blue" />
              Danh sách Ngày Quét & Trạng thái Bù Dữ liệu ({filteredItems.length} ngày)
            </h3>
            <p className="text-xs text-gray-500">Sắp xếp ngày mới nhất lên đầu (`06/06` rule). Hiển thị chi tiết trạng thái từng ngày.</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-2xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-gray-600 uppercase font-bold border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 min-w-[90px]">Chỉ tiêu</th>
                <th className="px-4 py-3 min-w-[80px]">Nguồn</th>
                <th className="px-4 py-3 min-w-[110px]">Ngày số liệu</th>
                <th className="px-4 py-3 min-w-[160px]">Trạng thái Coverage</th>
                <th className="px-4 py-3 min-w-[110px]">Phương thức</th>
                <th className="px-4 py-3 min-w-[220px]">Bằng chứng & Khuyến nghị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {coverageLoading ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-vnpost-blue" />
                    Đang quét dữ liệu bù tự động...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                    Không tìm thấy ngày nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isSuccess = item.status === 'SUCCESS';
                  const isMissing = item.status === 'MISSING';
                  const isManualOnly = item.status === 'MANUAL_ONLY_MISSING';
                  const isReviewReq = item.status === 'MANUAL_REVIEW_REQUIRED';

                  return (
                    <tr key={`${item.indicator}-${item.source_lane}-${item.business_date}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                      {/* Indicator Badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-black ${
                          item.indicator === 'F1.3' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-teal-100 text-teal-800 border border-teal-200'
                        }`}>
                          {item.indicator}
                        </span>
                      </td>

                      {/* Source Lane Badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-black ${
                          item.source_lane === 'HUE' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {item.source_lane}
                        </span>
                      </td>

                      {/* Business Date */}
                      <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">
                        {item.business_date}
                      </td>

                      {/* Coverage Status Badge */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isSuccess ? 'bg-green-100 text-green-800' :
                          isMissing ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                          isReviewReq ? 'bg-red-100 text-red-800 border border-red-200' :
                          isManualOnly ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isSuccess && <CheckCircle2 size={13} className="text-green-600 shrink-0" />}
                          {isMissing && <AlertTriangle size={13} className="text-amber-600 shrink-0" />}
                          {isReviewReq && <XCircle size={13} className="text-red-600 shrink-0" />}
                          {isManualOnly && <Lock size={13} className="text-slate-500 shrink-0" />}
                          {item.status}
                        </span>
                      </td>

                      {/* Automation Mode */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.automation_mode === 'AUTOMATED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.automation_mode}
                        </span>
                      </td>

                      {/* Evidence & Details */}
                      <td className="px-4 py-3 text-gray-600 max-w-md">
                        <p className="truncate font-medium" title={item.completion_reason || item.queue_ineligible_reason || ''}>
                          {item.completion_reason || (isManualOnly ? 'Chưa đăng ký Portal Adapter tự động' : 'Chờ xử lý hàng đợi')}
                        </p>
                        {item.evidence && typeof item.evidence === 'object' && (
                          <span className="text-[10px] text-gray-400 font-mono block truncate mt-0.5">
                            {JSON.stringify(item.evidence)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
