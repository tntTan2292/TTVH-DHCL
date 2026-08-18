import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Filter,
  Grid,
  List,
  Lock,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  XCircle
} from 'lucide-react';
import api from '../api/client';
import {
  aggregateReportTotals,
  groupItemsByDate,
  groupItemsByIndicator,
  resolveEffectiveRunState,
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

  // Filters
  const [indicatorFilter, setIndicatorFilter] = useState('ALL');
  const [laneFilter, setLaneFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // UI View Mode: 'TABLE' | 'TIMELINE'
  const [viewMode, setViewMode] = useState('TIMELINE');

  // Active Run State
  const [activeRunId, setActiveRunId] = useState(null);
  const [runData, setRunData] = useState(null);
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
    try {
      const res = await api.get(`/import/auto-backfill/runs/${runId}`);
      if (res.data.success) {
        setRunData(res.data.data);
      }
    } catch (err) {
      console.error('[AutoBackfillOperatorPanel] fetchRunDetails error:', err);
      setRunError(`Không thể lấy chi tiết tiến trình ${runId}. ${getApiErrorMessage(err)}`);
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

    const runObj = runData?.run;
    const effectiveState = resolveEffectiveRunState(runObj);
    const isNonTerminal = effectiveState && !['COMPLETED', 'COMPLETED_WITH_ERRORS', 'CANCELLED'].includes(effectiveState);
    const intervalTime = isNonTerminal ? 3000 : 8000;

    const interval = setInterval(() => {
      fetchRunDetails(activeRunId);
      if (showEvents) fetchEvents(activeRunId);
      if (showReport) fetchReport(activeRunId);
    }, intervalTime);

    return () => clearInterval(interval);
  }, [activeRunId, fetchRunDetails, runData?.run, showEvents, fetchEvents, showReport, fetchReport]);

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

  // Items processing
  const rawItems = coverageData?.items || [];
  const filteredItems = rawItems.filter((item) => {
    if (indicatorFilter !== 'ALL' && item.indicator !== indicatorFilter) return false;
    if (laneFilter !== 'ALL' && item.source_lane !== laneFilter) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    return true;
  });

  // Calculate summary numbers
  const runnableJobsCount = coverageData?.runnable_portal_jobs ?? rawItems.filter((item) => item.queue_eligible).length;
  const manualOnlyCount = rawItems.filter((item) => ['MANUAL_ONLY_MISSING', 'MANUAL_REVIEW_REQUIRED'].includes(item.status)).length;

  // Indicator Health Stats
  const itemsByIndicator = groupItemsByIndicator(rawItems);
  const f13Items = itemsByIndicator['F1.3'] || [];
  const f41Items = itemsByIndicator['F4.1'] || [];

  const f13Missing = f13Items.filter((i) => i.status === 'MISSING').length;
  const f13Success = f13Items.filter((i) => i.status === 'SUCCESS').length;
  const f41Missing = f41Items.filter((i) => i.status === 'MISSING').length;
  const f41Success = f41Items.filter((i) => i.status === 'SUCCESS').length;

  // Date groups for timeline card view
  const dateGroups = groupItemsByDate(filteredItems);

  // Run contracts resolution
  const currentRun = runData?.run || null;
  const currentJobs = runData?.jobs || [];
  const effectiveRunState = resolveEffectiveRunState(currentRun);
  const runActionButtons = resolveRunActionButtons(effectiveRunState);
  const waitingLanes = resolveWaitingAuthLanes(currentRun, currentJobs);

  // PO Report Aggregation
  const reportTotals = aggregateReportTotals(report);

  return (
    <div className="space-y-6" data-testid="auto-backfill-operator-panel">
      {/* 1. HERO GLASS COMMAND HEADER */}
      <div className="relative rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 p-6 md:p-8 text-white shadow-2xl border border-slate-800 backdrop-blur-xl overflow-hidden">
        {/* Ambient Glow Elements */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-md">
                <Sparkles size={13} className="text-yellow-400" />
                PLATFORM V2.0 ENGINE
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800/80 text-slate-300 border border-slate-700">
                <Clock size={13} className="text-slate-400" />
                Asia/Ho_Chi_Minh timezone (01/01/2026 ➔ N-1)
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Trung tâm Bù dữ liệu Tự động
            </h2>
            <p className="text-xs lg:text-sm text-slate-300 max-w-2xl">
              Quét độc lập diện rộng, xác định chính xác ngày thiếu dữ liệu theo <strong>Chỉ tiêu</strong> &amp; <strong>Nguồn thông tin</strong>. Ưu tiên tiến trình theo thứ tự ngày mới nhất trước.
            </p>
          </div>

          {/* Quick Command Action Group */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={fetchCoverage}
              disabled={coverageLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 px-4 py-2.5 text-xs font-bold text-white border border-white/20 backdrop-blur-md transition-all shadow-md disabled:opacity-50"
            >
              <RefreshCw size={15} className={coverageLoading ? 'animate-spin' : ''} />
              Quét lại Coverage
            </button>

            <button
              type="button"
              onClick={handleCreateRun}
              disabled={runActionLoading || runnableJobsCount === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-vnpost-blue via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 px-6 py-2.5 text-xs font-extrabold text-white transition-all shadow-lg shadow-blue-600/30 border border-blue-400/30 disabled:opacity-40 disabled:pointer-events-none"
            >
              {runActionLoading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
              Tạo Tiến trình Bù Tự động ({runnableJobsCount} ngày)
            </button>
          </div>
        </div>

        {/* 2. INDICATOR HEALTH CARDS GRID (F1.3 vs F4.1) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
          {/* Card 1: F1.3 Indicator */}
          <div
            onClick={() => setIndicatorFilter('F1.3')}
            className={`p-4 rounded-xl border backdrop-blur-md cursor-pointer transition-all duration-200 ${
              indicatorFilter === 'F1.3'
                ? 'bg-blue-950/80 border-blue-500/60 ring-2 ring-blue-500/30 shadow-lg shadow-blue-950/50'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-400 uppercase tracking-wider">Chỉ tiêu F1.3 (KPI)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {f13Items.length} ngày quét
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-white">{f13Missing}</span>
                <span className="text-xs font-semibold text-amber-400 ml-1.5">ngày thiếu</span>
              </div>
              <div className="text-xs font-bold text-emerald-400">
                {f13Success} hoàn tất
              </div>
            </div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${f13Items.length ? (f13Success / f13Items.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Card 2: F4.1 Indicator */}
          <div
            onClick={() => setIndicatorFilter('F4.1')}
            className={`p-4 rounded-xl border backdrop-blur-md cursor-pointer transition-all duration-200 ${
              indicatorFilter === 'F4.1'
                ? 'bg-teal-950/80 border-teal-500/60 ring-2 ring-teal-500/30 shadow-lg shadow-teal-950/50'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-400 uppercase tracking-wider">Chỉ tiêu F4.1 (Phát BC)</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-400/30">
                {f41Items.length} ngày quét
              </span>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-white">{f41Missing}</span>
                <span className="text-xs font-semibold text-amber-400 ml-1.5">ngày thiếu</span>
              </div>
              <div className="text-xs font-bold text-emerald-400">
                {f41Success} hoàn tất
              </div>
            </div>
            <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-teal-500 h-1.5 rounded-full"
                style={{ width: `${f41Items.length ? (f41Success / f41Items.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Card 3: Runnable Jobs */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">Khả thi nạp tự động</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{runnableJobsCount}</span>
              <span className="text-xs font-bold text-indigo-300">đã đăng ký Adapter</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 truncate">Sẵn sàng kích hoạt qua Portal API</p>
          </div>

          {/* Card 4: Manual / Review Required */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
            <span className="text-xs font-black text-amber-400 uppercase tracking-wider">Cần Soát xét / Thủ công</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{manualOnlyCount}</span>
              <span className="text-xs font-bold text-amber-300">yêu cầu xử lý</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-400 truncate">Không hỗ trợ Portal Adapter tự động</p>
          </div>
        </div>
      </div>

      {/* 3. SAFETY & OPERATOR GUIDANCE BANNERS */}
      {coverageError && (
        <div className="p-4 rounded-2xl border border-red-300 bg-red-50 text-red-900 text-xs font-semibold flex items-start gap-3 shadow-md">
          <AlertTriangle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>{coverageError}</div>
        </div>
      )}
      {runError && (
        <div className="p-4 rounded-2xl border border-red-300 bg-red-50 text-red-900 text-xs font-semibold flex items-start gap-3 shadow-md">
          <XCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>{runError}</div>
        </div>
      )}

      {/* WAITING_AUTH Guidance Card */}
      {effectiveRunState === 'WAITING_AUTH' && (
        <div className="p-5 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/80 backdrop-blur-md shadow-lg space-y-4" data-testid="waiting-auth-banner">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-md">
              <Lock size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-950">Yêu cầu Đăng nhập Hệ thống Nguồn (WAITING_AUTH)</h4>
              <p className="text-xs text-amber-900 mt-1">
                Tiến trình tự động tạm dừng an toàn do hết hạn phiên làm việc trên Cổng thông tin.
                {waitingLanes.length > 0 && (
                  <span> Nguồn đang chờ xác thực: <strong>{waitingLanes.join(', ')}</strong>.</span>
                )}
                {' '}Vui lòng mở cửa sổ đăng nhập bên dưới để hoàn tất xác thực, sau đó nhấn <strong>Tiếp tục tiến trình</strong>.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pl-12">
            {(waitingLanes.length === 0 || waitingLanes.includes('HUE')) && (
              <button
                type="button"
                onClick={() => handleInteractiveLogin('HUE')}
                disabled={loginLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 active:scale-95 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50"
                data-testid="btn-login-hue"
              >
                <Lock size={14} />
                Mở đăng nhập Huế
              </button>
            )}
            {(waitingLanes.length === 0 || waitingLanes.includes('TCT')) && (
              <button
                type="button"
                onClick={() => handleInteractiveLogin('TCT')}
                disabled={loginLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-700 active:scale-95 px-4 py-2 text-xs font-bold text-white shadow-md hover:from-purple-700 hover:to-pink-800 disabled:opacity-50"
                data-testid="btn-login-tct"
              >
                <Lock size={14} />
                Mở đăng nhập TCT
              </button>
            )}
            <button
              type="button"
              onClick={handleResumeRun}
              disabled={runActionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-4 py-2 text-xs font-bold text-white shadow-md disabled:opacity-50"
              data-testid="btn-resume-from-auth"
            >
              <Play size={14} />
              Xác nhận &amp; Tiếp tục tiến trình
            </button>
          </div>
          {loginMessage && (
            <div className={`ml-12 p-3 rounded-xl text-xs font-bold ${
              loginMessage.type === 'success' ? 'bg-green-100 text-green-900 border border-green-200' : 'bg-amber-100 text-amber-950 border border-amber-200'
            }`}>
              {loginMessage.text}
            </div>
          )}
        </div>
      )}

      {/* CIRCUIT_OPEN Guidance Card */}
      {effectiveRunState === 'CIRCUIT_OPEN' && (
        <div className="p-5 rounded-2xl border-2 border-red-500 bg-gradient-to-r from-red-500/10 via-red-50 to-rose-50/80 backdrop-blur-md shadow-lg space-y-4" data-testid="circuit-open-banner">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-red-600 text-white shadow-md">
              <ShieldAlert size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-red-950">Mạch Tự Động Ngắt Bảo Vệ (CIRCUIT_OPEN)</h4>
              <p className="text-xs text-red-900 mt-1">
                Phát hiện <strong>5 lần lỗi liên tiếp cùng chữ ký hệ thống</strong> trong cùng phạm vi Adapter/Source. Tiến trình tự động khóa để bảo vệ hệ thống khỏi lặp lỗi tràn mạng.
              </p>
              <p className="text-xs font-bold text-red-950 mt-1">
                Hành động cần thực hiện: Kiểm tra mạng/kết nối portal, sau đó nhấn <strong>Khôi phục Mạch (Reset Circuit)</strong> để tiếp tục.
              </p>
            </div>
          </div>
          <div className="pl-12">
            <button
              type="button"
              onClick={handleResetCircuit}
              disabled={runActionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 px-5 py-2.5 text-xs font-bold text-white shadow-md disabled:opacity-50 animate-pulse"
            >
              <RotateCcw size={15} />
              Khôi phục Mạch &amp; Thử lại (Reset Circuit)
            </button>
          </div>
        </div>
      )}

      {/* BLOCKED_INTEGRITY Guidance Card */}
      {effectiveRunState === 'BLOCKED_INTEGRITY' && (
        <div className="p-5 rounded-2xl border-2 border-slate-500 bg-slate-900 text-white shadow-lg space-y-3" data-testid="blocked-integrity-banner">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-slate-800 text-red-400 border border-slate-700">
              <XCircle size={22} />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">Khóa An Toàn Toàn Vẹn Dữ Liệu (BLOCKED_INTEGRITY)</h4>
              <p className="text-xs text-slate-300 mt-1">
                Phát hiện lỗi vi phạm cấu trúc dữ liệu hoặc kiểm tra toàn vẹn không đạt. Tiến trình đã bị ngắt tức thì để tránh gây sai lệch database.
              </p>
              <p className="text-xs font-bold text-amber-400 mt-1.5">
                Hành động cần thực hiện: Liên hệ QTV hệ thống để soát xét file nguồn thô hoặc kiểm tra log chi tiết trước khi khởi tạo lại.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. ACTIVE RUN CONTROL & MONITOR BAR */}
      {activeRunId && currentRun && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-vnpost-blue text-white shadow-sm">
                <Activity size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-slate-500">Tiến trình ID:</span>
                  <code className="text-xs font-mono font-bold text-vnpost-blue bg-blue-100/80 px-2 py-0.5 rounded border border-blue-200">{activeRunId}</code>
                  <span
                    data-testid="effective-run-state-badge"
                    className={`rounded-full px-3 py-0.5 text-xs font-black shadow-xs ${
                      effectiveRunState === 'RUNNING' ? 'bg-blue-600 text-white animate-pulse' :
                      effectiveRunState === 'PAUSED' ? 'bg-amber-500 text-white' :
                      effectiveRunState === 'PAUSING' ? 'bg-amber-400 text-white' :
                      effectiveRunState === 'WAITING_AUTH' ? 'bg-amber-600 text-white' :
                      effectiveRunState === 'CIRCUIT_OPEN' ? 'bg-red-600 text-white' :
                      effectiveRunState === 'BLOCKED_INTEGRITY' ? 'bg-slate-800 text-white' :
                      effectiveRunState === 'COMPLETED' ? 'bg-emerald-600 text-white' :
                      effectiveRunState === 'COMPLETED_WITH_ERRORS' ? 'bg-orange-600 text-white' :
                      'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {effectiveRunState || 'KHÔNG XÁC ĐỊNH'}
                  </span>
                </div>
                {runData.progress && (
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    Tiến độ hoàn thành: <strong className="text-slate-900 font-bold">{runData.progress.completed || 0}/{runData.progress.total || 0}</strong> việc ({runData.progress.percent || 0}%)
                  </p>
                )}
              </div>
            </div>

            {/* Run Action Buttons */}
            <div className="flex flex-wrap items-center gap-2" data-testid="run-action-controls">
              {runActionButtons.canPause && (
                <button
                  type="button"
                  onClick={handlePauseRun}
                  disabled={runActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100/80 hover:bg-amber-200 active:scale-95 px-4 py-2 text-xs font-bold text-amber-950 transition-all shadow-xs disabled:opacity-50"
                  data-testid="btn-pause-run"
                >
                  <Pause size={14} />
                  Tạm dừng (Pause)
                </button>
              )}
              {runActionButtons.canResume && (
                <button
                  type="button"
                  onClick={handleResumeRun}
                  disabled={runActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-4 py-2 text-xs font-bold text-white transition-all shadow-md disabled:opacity-50"
                  data-testid="btn-resume-run"
                >
                  <Play size={14} />
                  Tiếp tục (Resume)
                </button>
              )}
              {runActionButtons.canResetCircuit && (
                <button
                  type="button"
                  onClick={handleResetCircuit}
                  disabled={runActionLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 px-4 py-2 text-xs font-bold text-white transition-all shadow-md disabled:opacity-50 animate-bounce"
                  data-testid="btn-reset-circuit"
                >
                  <RotateCcw size={14} />
                  Khôi phục Mạch (Reset Circuit)
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const next = !showEvents;
                  setShowEvents(next);
                  if (next) fetchEvents(activeRunId);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs"
              >
                <Clock size={14} />
                {showEvents ? 'Ẩn Events' : 'Xem Audit Events'}
                {showEvents ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = !showReport;
                  setShowReport(next);
                  if (next) fetchReport(activeRunId);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs"
              >
                <FileText size={14} />
                {showReport ? 'Ẩn Báo cáo PO' : 'Xem Báo cáo PO'}
                {showReport ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Events Timeline Drawer */}
          {showEvents && (
            <div className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono space-y-3 border border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 font-sans">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Clock size={15} className="text-blue-400" />
                  Nhật ký Sự kiện Append-Only Audit (Run {activeRunId})
                </h4>
                <button
                  type="button"
                  onClick={() => fetchEvents(activeRunId)}
                  className="text-xs text-blue-400 hover:underline"
                >
                  Cập nhật
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {eventsLoading ? (
                  <p className="text-slate-400 font-sans italic">Đang tải nhật ký...</p>
                ) : events.length === 0 ? (
                  <p className="text-slate-400 font-sans italic">Chưa có sự kiện nào được ghi nhận.</p>
                ) : (
                  events.map((ev, idx) => (
                    <div key={ev.id || idx} className="p-2.5 rounded bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span className="font-bold text-blue-300">{ev.event_type || ev.type}</span>
                        <span>{ev.created_at || ev.timestamp}</span>
                      </div>
                      <p className="text-slate-200 mt-1">{ev.message || JSON.stringify(ev.payload || ev)}</p>
                      {ev.action_required && (
                        <p className="text-amber-400 font-bold mt-1">➔ Action required: {ev.action_required}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PO Report Drawer */}
          {showReport && (
            <div className="p-5 rounded-xl bg-white border border-blue-200 shadow-sm text-xs space-y-3" data-testid="po-report-card">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <FileText size={16} className="text-vnpost-blue" />
                  Báo cáo Đối chiếu Kết quả cho Product Owner (Run {activeRunId})
                </h4>
                <button
                  type="button"
                  onClick={() => fetchReport(activeRunId)}
                  className="font-bold text-vnpost-blue hover:underline"
                >
                  Cập nhật
                </button>
              </div>
              {reportLoading ? (
                <p className="text-slate-400 italic">Đang tổng hợp báo cáo...</p>
              ) : report ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-slate-500 block font-semibold">Tổng công việc</span>
                      <strong className="text-base text-slate-900" data-testid="report-total-jobs">{reportTotals.total}</strong>
                    </div>
                    <div>
                      <span className="text-emerald-700 block font-semibold">Thành công</span>
                      <strong className="text-base text-emerald-700" data-testid="report-success-jobs">{reportTotals.success}</strong>
                    </div>
                    <div>
                      <span className="text-amber-700 block font-semibold">Đang chờ / Tạm dừng</span>
                      <strong className="text-base text-amber-700" data-testid="report-pending-jobs">{reportTotals.pending}</strong>
                    </div>
                    <div>
                      <span className="text-red-700 block font-semibold">Thất bại / Soát xét</span>
                      <strong className="text-base text-red-700" data-testid="report-failed-jobs">{reportTotals.failed}</strong>
                    </div>
                  </div>
                  {report.action_required && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 font-bold">
                      Khuyến nghị cho PO: {report.action_required}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 italic">Chưa có dữ liệu báo cáo.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. FILTERING & MULTI-VIEW NAVIGATION BAR */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Filter size={18} className="text-vnpost-blue" />
              Bộ lọc &amp; Hiển thị Trạng thái Bù Dữ liệu ({filteredItems.length} mục)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Tùy chọn lọc nhanh theo Chỉ tiêu, Nguồn và Trạng thái. Tùy chọn giao diện xem Dạng Bảng hoặc Thẻ Ngày.</p>
          </div>

          {/* View Mode Toggle Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('TIMELINE')}
              className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'TIMELINE'
                  ? 'bg-vnpost-blue text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <Grid size={14} />
              Thẻ Ngày (Timeline)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-vnpost-blue text-white shadow-sm'
                  : 'text-slate-600 hover:bg-white/60'
              }`}
            >
              <List size={14} />
              Bảng Chi tiết (Table)
            </button>
          </div>
        </div>

        {/* Filter Segmented Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filter 1: Indicator */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Lọc Chỉ tiêu</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
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
                      ? 'bg-vnpost-blue text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white/80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter 2: Source Lane */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Lọc Nguồn Nạp</label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
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
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-white/80'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filter 3: Status dropdown */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Lọc Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-vnpost-blue focus:outline-none shadow-xs"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="MISSING">Thiếu dữ liệu (MISSING)</option>
              <option value="SUCCESS">Đã hoàn tất (SUCCESS)</option>
              <option value="INCOMPLETE">Chưa hoàn tất (INCOMPLETE)</option>
              <option value="MANUAL_REVIEW_REQUIRED">Cần soát xét (REVIEW_REQ)</option>
              <option value="MANUAL_ONLY_MISSING">Chưa hỗ trợ Adapter (MANUAL_ONLY)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 6. MAIN CONTENT AREA: TIMELINE CARD VIEW vs TABLE VIEW */}
      {coverageLoading ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200">
          <RefreshCw size={28} className="animate-spin mx-auto text-vnpost-blue mb-3" />
          <p className="text-sm font-bold text-slate-700">Đang quét vùng dữ liệu bù tự động...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200">
          <AlertCircle size={28} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-bold text-slate-700">Không tìm thấy dữ liệu phù hợp với bộ lọc.</p>
        </div>
      ) : viewMode === 'TIMELINE' ? (
        /* VIEW 1: TIMELINE DATE CARDS (Extensible for multi-indicators) */
        <div className="space-y-4">
          {dateGroups.map((group) => (
            <div key={group.date} className="bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md transition-all p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <Calendar size={18} className="text-vnpost-blue" />
                  <span className="text-sm font-black text-slate-900">{group.date}</span>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  {group.items.length} chỉ tiêu/nguồn
                </span>
              </div>

              {/* Items grid for this date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {group.items.map((item, idx) => {
                  const isSuccess = item.status === 'SUCCESS';
                  const isMissing = item.status === 'MISSING';
                  const isReviewReq = item.status === 'MANUAL_REVIEW_REQUIRED';
                  const isManualOnly = item.status === 'MANUAL_ONLY_MISSING';

                  return (
                    <div
                      key={`${item.indicator}-${item.source_lane}-${idx}`}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isSuccess ? 'bg-emerald-50/60 border-emerald-200' :
                        isMissing ? 'bg-amber-50/80 border-amber-200 ring-1 ring-amber-300/50' :
                        isReviewReq ? 'bg-red-50/80 border-red-200' :
                        'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            item.indicator === 'F1.3' ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'
                          }`}>
                            {item.indicator}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                            item.source_lane === 'HUE' ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {item.source_lane}
                          </span>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <div className="flex items-center gap-1.5">
                        {isSuccess && <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />}
                        {isMissing && <AlertTriangle size={15} className="text-amber-600 shrink-0" />}
                        {isReviewReq && <XCircle size={15} className="text-red-600 shrink-0" />}
                        {isManualOnly && <Lock size={15} className="text-slate-500 shrink-0" />}
                        <span className={`text-xs font-bold ${
                          isSuccess ? 'text-emerald-800' :
                          isMissing ? 'text-amber-900' :
                          isReviewReq ? 'text-red-800' : 'text-slate-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-2 truncate font-medium" title={item.completion_reason || ''}>
                        {item.completion_reason || (isManualOnly ? 'Chưa hỗ trợ Adapter' : 'Sẵn sàng nạp')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* VIEW 2: GRANULAR TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-950 text-white uppercase font-bold">
                <tr>
                  <th className="px-4 py-3.5">Chỉ tiêu</th>
                  <th className="px-4 py-3.5">Nguồn</th>
                  <th className="px-4 py-3.5">Ngày số liệu</th>
                  <th className="px-4 py-3.5">Trạng thái Coverage</th>
                  <th className="px-4 py-3.5">Phương thức</th>
                  <th className="px-4 py-3.5">Bằng chứng / Khuyến nghị</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredItems.map((item, idx) => {
                  const isSuccess = item.status === 'SUCCESS';
                  const isMissing = item.status === 'MISSING';
                  const isManualOnly = item.status === 'MANUAL_ONLY_MISSING';
                  const isReviewReq = item.status === 'MANUAL_REVIEW_REQUIRED';

                  return (
                    <tr key={`${item.indicator}-${item.source_lane}-${item.business_date}-${idx}`} className="hover:bg-blue-50/50 transition-colors">
                      <td className="px-4 py-3 font-black">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-black ${
                          item.indicator === 'F1.3' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-teal-100 text-teal-800 border border-teal-200'
                        }`}>
                          {item.indicator}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-black ${
                          item.source_lane === 'HUE' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {item.source_lane}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900 whitespace-nowrap">
                        {item.business_date}
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
                          isSuccess ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          isMissing ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs' :
                          isReviewReq ? 'bg-red-100 text-red-800 border border-red-200' :
                          isManualOnly ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {isSuccess && <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />}
                          {isMissing && <AlertTriangle size={13} className="text-amber-600 shrink-0" />}
                          {isReviewReq && <XCircle size={13} className="text-red-600 shrink-0" />}
                          {isManualOnly && <Lock size={13} className="text-slate-500 shrink-0" />}
                          {item.status}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.automation_mode === 'AUTOMATED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {item.automation_mode}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600 max-w-md">
                        <p className="truncate font-medium" title={item.completion_reason || ''}>
                          {item.completion_reason || (isManualOnly ? 'Chưa hỗ trợ Adapter' : 'Sẵn sàng nạp')}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
