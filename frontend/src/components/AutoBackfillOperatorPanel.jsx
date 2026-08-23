import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CheckSquare,
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
  RotateCw,
  ShieldAlert,
  Square,
  UserCheck,
  X
} from 'lucide-react';
import api from '../api/client';
import {
  groupItemsByIndicatorAndMonth,
  paginateItems,
  resolveDynamicIndicators,
  resolveEffectiveRunState,
  resolveIndicatorGridClass,
  resolveNoCodeStatus,
  resolveRunActionButtons,
  resolveWaitingAuthLanes
} from './autoBackfillUiHelpers';

const getApiErrorMessage = (error, fallback = 'Đã xảy ra lỗi khi gọi API.') => (
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  fallback
);

// Statuses that genuinely mean the manual DKCL login failed/expired. LOGIN_IN_PROGRESS
// (and any other transitional status) is NOT an error -- it just means the browser window
// is open and waiting on the PO, same as DataImportCenter.jsx's preflightHueSession/preflightTctSession.
const AUTH_LOGIN_ERROR_STATUSES = new Set(['SESSION_CHECK_FAILED', 'LOGIN_TIMEOUT', 'AUTHENTICATION_REQUIRED']);
const AUTH_LOGIN_POLL_INTERVAL_MS = 5000;
const AUTH_LOGIN_POLL_MAX_ATTEMPTS = 60; // 5 minutes, matching the backend's ~4-minute manualAuthWaitMs plus buffer

const getItemKey = (item) => `${(item.indicator || '').trim().toUpperCase()}::${(item.source_lane || '').trim().toUpperCase()}::${item.business_date}`;

const isActionableForExemption = (item) => ['TRUE_MISSING', 'MISSING', 'MANUAL_ONLY_MISSING', 'MANUAL_REVIEW_REQUIRED'].includes(item.status);

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

  // Run Creation Target Selection (Safety Lock)
  const [runTargetIndicator, setRunTargetIndicator] = useState('ALL');
  const [runTargetMonth, setRunTargetMonth] = useState('ALL');

  // UI View Mode: 'GROUPED_MONTH' | 'TABLE'
  const [viewMode, setViewMode] = useState('GROUPED_MONTH');

  // Active Run State
  const [activeRunId, setActiveRunId] = useState(null);
  const [runData, setRunData] = useState(null);
  const [runActionLoading, setRunActionLoading] = useState(false);
  const [runError, setRunError] = useState(null);

  // Manual DKCL Login (WAITING_AUTH remediation) -- reuses POST /import/dkcl/session/interactive-auth,
  // the same endpoint already proven working in DataImportCenter.jsx (handleInteractiveHueLogin/handleInteractiveTctLogin).
  const [authLoginLoading, setAuthLoginLoading] = useState(false);
  const [authLoginError, setAuthLoginError] = useState(null);
  const [authLoginPending, setAuthLoginPending] = useState(false);
  const authLoginPollRef = useRef(null);

  // Drawers & Modals
  const [showEvents, setShowEvents] = useState(false);
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [showExceptionHistory, setShowExceptionHistory] = useState(false);
  const [exceptionsList, setExceptionsList] = useState([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);

  // Per-Lane Missing Dates Detail Modal
  const [selectedLaneModal, setSelectedLaneModal] = useState(null);

  // Exception Modals (Single API Calls)
  const [confirmModalItem, setConfirmModalItem] = useState(null);
  const [confirmReason, setConfirmReason] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState(null);

  const [revokeModalItem, setRevokeModalItem] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [revokeError, setRevokeError] = useState(null);

  // Single-Date Reimport Modal State
  const [reimportModalItem, setReimportModalItem] = useState(null);
  const [reimportLoading, setReimportLoading] = useState(false);
  const [reimportError, setReimportError] = useState(null);

  // Bulk Selection State
  const [selectedBulkKeys, setSelectedBulkKeys] = useState(new Set());
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResultReport, setBulkResultReport] = useState(null);

  // Bulk Reimport State (Point 1)
  const [showBulkReimportModal, setShowBulkReimportModal] = useState(false);
  const [bulkReimportLoading, setBulkReimportLoading] = useState(false);
  const [bulkReimportReport, setBulkReimportReport] = useState(null);

  // Notification Toast
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Toggle Bulk Select Item
  const toggleSelectBulkItem = (item) => {
    const key = getItemKey(item);
    setSelectedBulkKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Select/Unselect All Items in a list
  const toggleSelectAllItems = (itemsList) => {
    const itemKeys = itemsList.map(getItemKey);
    const allSelected = itemKeys.length > 0 && itemKeys.every((k) => selectedBulkKeys.has(k));

    setSelectedBulkKeys((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        itemKeys.forEach((k) => next.delete(k));
      } else {
        itemKeys.forEach((k) => next.add(k));
      }
      return next;
    });
  };

  const clearBulkSelection = () => {
    setSelectedBulkKeys(new Set());
  };

  // Fetch Coverage with exception_id merging
  const fetchCoverage = useCallback(async () => {
    setCoverageLoading(true);
    setCoverageError(null);
    try {
      const params = {};
      if (indicatorFilter !== 'ALL') params.indicator = indicatorFilter;
      if (laneFilter !== 'ALL') params.lane = laneFilter;

      const [resCoverage, resExceptions] = await Promise.all([
        api.get('/import/auto-backfill/coverage', { params }),
        api.get('/import/auto-backfill/coverage/exceptions').catch(() => ({ data: { success: false } }))
      ]);

      if (resCoverage.data.success) {
        const rawData = resCoverage.data.data;
        const exceptionsList = resExceptions.data?.success ? (resExceptions.data.data.items || []) : [];
        
        const excMap = new Map();
        exceptionsList.forEach((exc) => {
          if (exc.status === 'ACTIVE') {
            const key = `${(exc.indicator || '').trim().toUpperCase()}::${(exc.source_lane || '').trim().toUpperCase()}::${exc.business_date}`;
            excMap.set(key, exc);
          }
        });

        const mergedItems = (rawData.items || []).map((item) => {
          const itemKey = `${(item.indicator || '').trim().toUpperCase()}::${(item.source_lane || '').trim().toUpperCase()}::${item.business_date}`;
          const activeExc = excMap.get(itemKey) || item.exception;
          const exception_id = activeExc?.id || activeExc?.exception_id || item.exception_id || null;
          return {
            ...item,
            exception_id,
            exception: activeExc || item.exception
          };
        });

        setCoverageData({
          ...rawData,
          items: mergedItems
        });
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
        setActiveRunId(newRun.run.id);
        setRunData(newRun);
        showToast(`Đã tạo tiến trình bù #${newRun.run.id} cho chỉ tiêu ${runTargetIndicator} (${runTargetMonth})`);
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

  const stopAuthLoginPolling = useCallback(() => {
    if (authLoginPollRef.current) {
      clearInterval(authLoginPollRef.current);
      authLoginPollRef.current = null;
    }
  }, []);

  // Stop any in-flight polling on unmount, or when the active run changes (a stale poll
  // for a lane tied to a run the PO already navigated away from must not keep running).
  useEffect(() => stopAuthLoginPolling, [stopAuthLoginPolling]);
  useEffect(() => {
    stopAuthLoginPolling();
    setAuthLoginPending(false);
  }, [activeRunId, stopAuthLoginPolling]);

  // Poll POST /import/dkcl/session/preflight every few seconds while a manual login is
  // in progress -- same endpoint/pattern DataImportCenter.jsx uses (preflightHueSession/
  // preflightTctSession) to detect SESSION_VALID without the PO needing to press anything.
  const startAuthLoginPolling = useCallback((lane) => {
    stopAuthLoginPolling();
    let attempts = 0;
    authLoginPollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await api.post('/import/dkcl/session/preflight', { source: lane });
        const status = res.data.data?.status;
        if (status === 'SESSION_VALID') {
          stopAuthLoginPolling();
          setAuthLoginPending(false);
          setAuthLoginError(null);
          if (activeRunId) fetchRunStatus(activeRunId);
          return;
        }
        if (AUTH_LOGIN_ERROR_STATUSES.has(status)) {
          stopAuthLoginPolling();
          setAuthLoginPending(false);
          setAuthLoginError(res.data.data?.error?.message || `Không thể hoàn tất đăng nhập ${lane} DKCL.`);
          return;
        }
        // Still LOGIN_IN_PROGRESS or another transitional status -- keep waiting.
      } catch (err) {
        const status = err.response?.data?.data?.status;
        if (AUTH_LOGIN_ERROR_STATUSES.has(status)) {
          stopAuthLoginPolling();
          setAuthLoginPending(false);
          setAuthLoginError(err.response?.data?.data?.error?.message || `Không thể hoàn tất đăng nhập ${lane} DKCL.`);
          return;
        }
        // Transient/network hiccup during polling -- keep retrying until the attempt cap.
      }
      if (attempts >= AUTH_LOGIN_POLL_MAX_ATTEMPTS) {
        stopAuthLoginPolling();
        setAuthLoginPending(false);
        setAuthLoginError(`Hết thời gian chờ đăng nhập ${lane} DKCL. Vui lòng thử lại.`);
      }
    }, AUTH_LOGIN_POLL_INTERVAL_MS);
  }, [activeRunId, fetchRunStatus, stopAuthLoginPolling]);

  // Open manual DKCL login browser window for a WAITING_AUTH lane. Same API contract as
  // DataImportCenter.jsx's handleInteractiveHueLogin/handleInteractiveTctLogin, trimmed down:
  // this panel doesn't track the full lifecycle_state, only enough to unblock the banner.
  const handleOpenManualLogin = async (lane) => {
    setAuthLoginError(null);
    setAuthLoginPending(false);
    setAuthLoginLoading(true);
    try {
      const res = await api.post('/import/dkcl/session/interactive-auth', { source: lane });
      const status = res.data.data?.status;
      if (status === 'SESSION_VALID') {
        setAuthLoginError(null);
        if (activeRunId) {
          fetchRunStatus(activeRunId);
        }
      } else if (AUTH_LOGIN_ERROR_STATUSES.has(status)) {
        setAuthLoginError(res.data.data?.error?.message || `Không thể hoàn tất đăng nhập ${lane} DKCL.`);
      } else {
        // LOGIN_IN_PROGRESS (or any other transitional status): the browser just opened and
        // is waiting on the PO to log in -- this is normal, not an error. Poll for completion.
        setAuthLoginPending(true);
        startAuthLoginPolling(lane);
      }
    } catch (err) {
      setAuthLoginError(err.response?.data?.error?.message || err.response?.data?.data?.error?.message || `Không thể hoàn tất đăng nhập ${lane} DKCL.`);
    } finally {
      setAuthLoginLoading(false);
    }
  };

  // Single-Date Reimport API Handler
  const handleConfirmReimport = async () => {
    if (!reimportModalItem) return;
    setReimportLoading(true);
    setReimportError(null);
    try {
      const payload = {
        indicator: reimportModalItem.indicator,
        requested_lane: reimportModalItem.source_lane,
        lane: reimportModalItem.source_lane,
        month: reimportModalItem.business_date.slice(0, 7),
        from_date: reimportModalItem.business_date,
        to_date: reimportModalItem.business_date
      };
      const res = await api.post('/import/auto-backfill/runs', payload);
      if (res.data.success) {
        const newRun = res.data.data;
        setActiveRunId(newRun.run.id);
        setRunData(newRun);
        showToast(`Đã khởi tạo yêu cầu nhập lại cho ${reimportModalItem.indicator} (${reimportModalItem.source_lane}) ngày ${reimportModalItem.business_date}`);
        setReimportModalItem(null);
        fetchCoverage();
      }
    } catch (err) {
      setReimportError(getApiErrorMessage(err, 'Không thể khởi tạo yêu cầu nhập lại cho ngày này.'));
    } finally {
      setReimportLoading(false);
    }
  };

  // Real Single PO Exception Confirmation API Call
  const handleConfirmExemption = async () => {
    if (!confirmModalItem || !confirmReason.trim()) return;
    setConfirmLoading(true);
    setConfirmError(null);
    try {
      const payload = {
        indicator: confirmModalItem.indicator,
        source_lane: confirmModalItem.source_lane,
        business_date: confirmModalItem.business_date,
        exception_type: 'PO_EXEMPTED',
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
    const exceptionId = revokeModalItem.exception_id || revokeModalItem.exception?.id || revokeModalItem.id;
    if (!exceptionId) {
      setRevokeError('Không tìm thấy ID bản ghi ngoại lệ PO để hoàn tác. Vui lòng thử tải lại trang.');
      return;
    }
    setRevokeLoading(true);
    setRevokeError(null);
    try {
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

  // Bulk Exception Confirmation Execution Handler
  const handleExecuteBulkConfirm = async () => {
    if (!bulkReason.trim() || selectedBulkKeys.size === 0) return;
    setBulkLoading(true);
    setBulkResultReport(null);

    const selectedItems = rawCoverageItems.filter((item) => selectedBulkKeys.has(getItemKey(item)));
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const item of selectedItems) {
      try {
        const payload = {
          indicator: item.indicator,
          source_lane: item.source_lane,
          business_date: item.business_date,
          exception_type: 'PO_EXEMPTED',
          reason: bulkReason.trim()
        };
        const res = await api.post('/import/auto-backfill/coverage/exceptions', payload);
        if (res.data.success) {
          successCount++;
          results.push({ item, success: true });
        } else {
          failCount++;
          results.push({ item, success: false, error: res.data.error?.message || 'Lỗi API' });
        }
      } catch (err) {
        failCount++;
        results.push({ item, success: false, error: getApiErrorMessage(err, 'Lỗi kết nối API') });
      }
    }

    setBulkLoading(false);
    setBulkResultReport({ successCount, failCount, total: selectedItems.length, results });

    if (successCount > 0) {
      fetchCoverage();
    }
    if (failCount === 0) {
      showToast(`Đã loại bỏ phát sinh thành công cho ${successCount}/${selectedItems.length} ngày`);
      clearBulkSelection();
      setShowBulkConfirmModal(false);
    }
  };

  // Bulk Reimport Execution Handler (Point 1)
  const handleExecuteBulkReimport = async () => {
    if (selectedBulkKeys.size === 0) return;
    setBulkReimportLoading(true);
    setBulkReimportReport(null);

    const selectedItems = rawCoverageItems.filter((item) => selectedBulkKeys.has(getItemKey(item)));
    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const item of selectedItems) {
      try {
        const payload = {
          indicator: item.indicator,
          requested_lane: item.source_lane,
          lane: item.source_lane,
          month: item.business_date.slice(0, 7),
          from_date: item.business_date,
          to_date: item.business_date
        };
        const res = await api.post('/import/auto-backfill/runs', payload);
        if (res.data.success) {
          successCount++;
          results.push({ item, success: true, run_id: res.data.data?.run?.id });
        } else {
          failCount++;
          results.push({ item, success: false, error: res.data.error?.message || 'Lỗi API' });
        }
      } catch (err) {
        failCount++;
        results.push({ item, success: false, error: getApiErrorMessage(err, 'Lỗi kết nối API') });
      }
    }

    setBulkReimportLoading(false);
    setBulkReimportReport({ successCount, failCount, total: selectedItems.length, results });

    if (successCount > 0) {
      const lastSuccessfulRun = results.find((r) => r.success)?.run_id;
      if (lastSuccessfulRun) {
        setActiveRunId(lastSuccessfulRun);
      }
      fetchCoverage();
    }
    if (failCount === 0) {
      showToast(`Đã tạo thành công ${successCount}/${selectedItems.length} yêu cầu nhập lại`);
      clearBulkSelection();
      setShowBulkReimportModal(false);
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
      const itemInd = (item.indicator || '').trim().toUpperCase();
      const itemLane = (item.source_lane || item.lane || '').trim().toUpperCase();

      if (indicatorFilter !== 'ALL' && itemInd !== indicatorFilter.toUpperCase()) return false;
      if (laneFilter !== 'ALL' && itemLane !== laneFilter.toUpperCase()) return false;
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

  // Table View Select All helper
  const isAllTableItemsSelected = useMemo(() => {
    const keys = paginatedCoverage.pageItems.map(getItemKey);
    return keys.length > 0 && keys.every((k) => selectedBulkKeys.has(k));
  }, [paginatedCoverage.pageItems, selectedBulkKeys]);

  // Effective Run State & Active Job Granular Visibility
  const effectiveRunState = useMemo(() => {
    return resolveEffectiveRunState(runData?.run);
  }, [runData]);

  const actionButtons = useMemo(() => {
    return resolveRunActionButtons(effectiveRunState);
  }, [effectiveRunState]);

  const waitingLanes = useMemo(() => {
    return resolveWaitingAuthLanes(runData?.run, runData?.jobs);
  }, [runData]);

  // Once the run leaves WAITING_AUTH (resumed, completed, cancelled, ...), any stale manual-login
  // error/pending banner from a previous WAITING_AUTH episode must clear itself automatically.
  useEffect(() => {
    if (effectiveRunState !== 'WAITING_AUTH') {
      setAuthLoginError(null);
      setAuthLoginPending(false);
    }
  }, [effectiveRunState]);

  const activeExecutingJob = useMemo(() => {
    const jobs = runData?.jobs || [];
    return (
      jobs.find((j) => ['RUNNING', 'LEASED', 'RECOVERY_CHECK'].includes(j.state || j.status || j.safety_state)) ||
      jobs.find((j) => (j.state || j.safety_state) === 'WAITING_AUTH') ||
      null
    );
  }, [runData]);

  return (
    <div className="flex flex-col gap-6 font-sans text-slate-800 relative pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-sm font-medium ${
          toast.type === 'error' ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="h-5 w-5 text-red-600" /> : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* HERO CONTROL HEADER */}
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

        {/* SAFE RUN CREATION CONTROLS */}
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

        {/* ACTIVE RUN CONTROL & GRANULAR ACTIVE JOB VISIBILITY */}
        {activeRunId && runData && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900 text-sm">Tiến trình #{runData.run.id}</span>
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

            {/* GRANULAR JOB STATUS & WAITING_AUTH WARNING */}
            <div className="flex flex-wrap items-center justify-between border-t border-slate-200 pt-3 text-xs">
              {activeExecutingJob ? (
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <Activity className="h-4 w-4 text-blue-600 animate-pulse" />
                  <span>Đang xử lý: <strong className="text-slate-900">Chỉ tiêu {activeExecutingJob.indicator} × Nguồn {activeExecutingJob.source_lane} × Ngày {activeExecutingJob.business_date}</strong></span>
                </div>
              ) : effectiveRunState === 'COMPLETED' ? (
                <span className="text-slate-500">Đã hoàn tất</span>
              ) : effectiveRunState === 'COMPLETED_WITH_ERRORS' ? (
                <span className="text-slate-500">Hoàn tất có lỗi</span>
              ) : effectiveRunState === 'CANCELLED' ? (
                <span className="text-slate-500">Đã huỷ</span>
              ) : (
                <span className="text-slate-500">Đang khởi tạo các luồng bù dữ liệu...</span>
              )}

              {(waitingLanes.length > 0 || effectiveRunState === 'WAITING_AUTH') && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-900 border border-amber-300 animate-bounce">
                  <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>Cần đăng nhập thủ công [{waitingLanes.join(' / ') || 'Portal'}]</span>
                  {waitingLanes.map((lane) => (
                    <button
                      key={lane}
                      type="button"
                      onClick={() => handleOpenManualLogin(lane)}
                      disabled={authLoginLoading || authLoginPending}
                      className="inline-flex items-center justify-center rounded-lg bg-vnpost-blue px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-50"
                    >
                      {authLoginLoading ? 'Đang mở trình duyệt...' : authLoginPending ? 'Đang chờ đăng nhập...' : `Mở đăng nhập ${lane}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {authLoginPending && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                Đang chờ bạn đăng nhập trong cửa sổ vừa mở… Banner này sẽ tự tắt khi đăng nhập xong.
              </div>
            )}

            {authLoginError && (
              <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
                {authLoginError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* DYNAMIC INDICATOR HEALTH CARDS GRID */}
      <div className={resolveIndicatorGridClass(indicatorsList.length)}>
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
              <span className="text-xs font-medium text-slate-500">Tổng: {ind.missingCount} ngày lịch thiếu</span>
            </div>
            
            <h3 className="mt-2 text-base font-bold text-slate-900 line-clamp-1">{ind.displayName}</h3>

            {/* PER-LANE BREAKDOWN */}
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              {ind.supportedLanes.map((lane) => {
                const laneData = ind.lanesBreakdown?.[lane] || {
                  missingCount: 0,
                  reviewReqCount: 0,
                  unresolvedCount: 0,
                  successCount: 0,
                  missingItems: [],
                  actionableItems: [],
                  isFullyComplete: false
                };
                const hasUnresolved = (laneData.unresolvedCount || 0) > 0 || (laneData.missingCount || 0) > 0 || (laneData.reviewReqCount || 0) > 0;
                const itemsToShowInModal = laneData.actionableItems && laneData.actionableItems.length > 0 ? laneData.actionableItems : laneData.missingItems || [];

                return (
                  <div
                    key={lane}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasUnresolved && itemsToShowInModal.length > 0) {
                        setSelectedLaneModal({
                          indicator: ind.code,
                          displayName: ind.displayName,
                          lane,
                          missingCount: itemsToShowInModal.length,
                          missingItems: itemsToShowInModal
                        });
                      }
                    }}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 hover:bg-blue-50/80 transition border border-slate-200 group"
                  >
                    <span className="text-xs font-bold text-slate-800">
                      Nguồn {lane === 'HUE' ? 'Huế' : lane}:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${
                        hasUnresolved ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        laneData.isFullyComplete ? 'bg-emerald-100 text-emerald-900 border-emerald-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {hasUnresolved
                          ? (laneData.missingCount > 0 && laneData.reviewReqCount > 0
                              ? `Thiếu ${laneData.missingCount} · Kiểm tra ${laneData.reviewReqCount}`
                              : laneData.missingCount > 0
                              ? `Thiếu ${laneData.missingCount} ngày`
                              : `Cần kiểm tra ${laneData.reviewReqCount} ngày`)
                          : laneData.isFullyComplete
                          ? '100% Hoàn tất'
                          : 'Đã giải quyết'}
                      </span>
                      {hasUnresolved && itemsToShowInModal.length > 0 && (
                        <span className="text-[11px] text-blue-700 font-bold group-hover:underline">
                          [Xem ngày]
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
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
                selectedBulkKeys={selectedBulkKeys}
                onToggleSelectItem={toggleSelectBulkItem}
                onToggleSelectAllItems={toggleSelectAllItems}
                onConfirmClick={(item) => {
                  setConfirmModalItem(item);
                  setConfirmReason('');
                }}
                onRevokeClick={(item) => {
                  setRevokeModalItem(item);
                  setRevokeReason('');
                }}
                onReimportClick={(item) => {
                  setReimportModalItem(item);
                  setReimportError(null);
                }}
              />
            ))
          )}
        </div>
      )}

      {/* VIEW MODE 2: TABLE VIEW WITH BULK CHECKBOXES & PER-ROW REIMPORT */}
      {viewMode === 'TABLE' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3.5 w-12 text-center">
                    <button
                      type="button"
                      onClick={() => toggleSelectAllItems(paginatedCoverage.pageItems)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      {isAllTableItemsSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-3.5">Ngày Nghiệp vụ</th>
                  <th className="px-5 py-3.5">Chỉ tiêu</th>
                  <th className="px-5 py-3.5">Nguồn Lane</th>
                  <th className="px-5 py-3.5">Trạng thái No-Code</th>
                  <th className="px-5 py-3.5 text-right">Thao tác Ngoại lệ & Bù</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedCoverage.pageItems.map((item, idx) => {
                  const statusInfo = resolveNoCodeStatus(item.status);
                  const isActionable = isActionableForExemption(item);
                  const isSelected = selectedBulkKeys.has(getItemKey(item));

                  return (
                    <tr key={`${item.indicator}-${item.source_lane}-${item.business_date}-${idx}`} className={`hover:bg-slate-50/80 transition ${isSelected ? 'bg-blue-50/40' : ''}`}>
                      <td className="px-4 py-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleSelectBulkItem(item)}
                          className="text-slate-400 hover:text-blue-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-blue-600 fill-blue-50" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>
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
                        <div className="flex items-center justify-end gap-2">
                          {/* PER-ROW REIMPORT BUTTON */}
                          <button
                            onClick={() => {
                              setReimportModalItem(item);
                              setReimportError(null);
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[var(--color-vnpost-blue)] hover:bg-blue-100 transition"
                            title="Yêu cầu nạp lại dữ liệu cho ngày này"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                            <span>Nhập lại</span>
                          </button>

                          {isActionable && (
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
                        </div>
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

      {/* FLOATING BULK ACTION BAR */}
      {selectedBulkKeys.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 rounded-2xl bg-slate-900 px-6 py-3.5 text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 text-sm font-bold">
            <CheckSquare className="h-5 w-5 text-amber-400" />
            <span>Đã chọn {selectedBulkKeys.size} ngày</span>
          </div>

          <div className="flex items-center gap-2">
            {/* BULK REIMPORT BUTTON (Point 1) */}
            <button
              onClick={() => {
                setShowBulkReimportModal(true);
                setBulkReimportReport(null);
              }}
              className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition shadow-sm flex items-center gap-1.5"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>Nhập lại {selectedBulkKeys.size} ngày đã chọn</span>
            </button>

            {/* RENAMED BULK EXEMPTION BUTTON (Point 2) */}
            <button
              onClick={() => {
                setShowBulkConfirmModal(true);
                setBulkReason('');
                setBulkResultReport(null);
              }}
              className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-sm"
            >
              Cập nhật dữ liệu - Loại bỏ phát sinh cho {selectedBulkKeys.size} ngày
            </button>

            <button
              onClick={clearBulkSelection}
              className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
            >
              Hủy chọn
            </button>
          </div>
        </div>
      )}

      {/* BULK REIMPORT CONFIRMATION MODAL (Point 1) */}
      {showBulkReimportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-100 p-2 text-blue-700">
                  <RotateCw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Xác nhận Nhập lại Dữ liệu Hàng loạt</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tạo các yêu cầu nạp lại dữ liệu riêng cho <strong>{selectedBulkKeys.size} ngày</strong> đã chọn.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBulkReimportModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto max-h-48 rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-800 block mb-1">Danh sách ngày sẽ nhập lại ({selectedBulkKeys.size}):</span>
              {Array.from(selectedBulkKeys).map((key) => {
                const [ind, lane, date] = key.split('::');
                return (
                  <div key={key} className="flex items-center justify-between py-0.5 border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-900">{date}</span>
                    <span className="text-slate-500">{ind} — Nguồn {lane}</span>
                  </div>
                );
              })}
            </div>

            {bulkReimportReport && (
              <div className="mt-3 text-xs rounded-xl p-3 border bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900">
                  Kết quả tạo yêu cầu: {bulkReimportReport.successCount}/{bulkReimportReport.total} thành công
                  {bulkReimportReport.failCount > 0 && <span className="text-red-600 ml-2">({bulkReimportReport.failCount} thất bại)</span>}
                </div>
                {bulkReimportReport.results.filter(r => !r.success).map((r, i) => (
                  <div key={i} className="text-red-600">
                    • {r.item.indicator} × {r.item.source_lane} × {r.item.business_date}: {r.error}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBulkReimportModal(false)}
                disabled={bulkReimportLoading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteBulkReimport}
                disabled={bulkReimportLoading}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkReimportLoading ? `Đang gửi ${selectedBulkKeys.size} yêu cầu...` : `Xác nhận Nhập lại ${selectedBulkKeys.size} ngày`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE-DATE REIMPORT CONFIRMATION MODAL */}
      {reimportModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-blue-100 p-2 text-blue-700">
                  <RotateCw className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận Yêu cầu Nhập lại Dữ liệu</h3>
              </div>
              <button onClick={() => setReimportModalItem(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
              <div>Khóa nghiệp vụ: <strong className="text-slate-900">{reimportModalItem.indicator} × Nguồn {reimportModalItem.source_lane} × Ngày {reimportModalItem.business_date}</strong></div>
              <div>Trạng thái hiện tại: <span className="font-semibold text-blue-800">{reimportModalItem.status}</span></div>
              <p className="mt-2 text-slate-500 italic">
                Hệ thống sẽ tạo 1 tiến trình bù tự động giới hạn chính xác cho ngày <strong>{reimportModalItem.business_date}</strong> để tải lại dữ liệu từ Portal.
              </p>
            </div>

            {reimportError && (
              <div className="mt-3 text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                {reimportError}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setReimportModalItem(null)}
                disabled={reimportLoading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmReimport}
                disabled={reimportLoading}
                className="rounded-xl bg-[var(--color-vnpost-blue)] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-vnpost-blue-dark)] disabled:opacity-50"
              >
                {reimportLoading ? 'Đang gửi yêu cầu...' : 'Xác nhận Nhập lại'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK CONFIRMATION MODAL (RENAMED BUTTON TITLE) */}
      {showBulkConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-amber-100 p-2 text-amber-700">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Cập nhật dữ liệu - Loại bỏ phát sinh Hàng loạt</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Áp dụng 1 lý do ngoại lệ cho <strong>{selectedBulkKeys.size} ngày</strong> đã chọn.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBulkConfirmModal(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto max-h-40 rounded-xl bg-slate-50 p-3 border border-slate-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-slate-800 block mb-1">Danh sách ngày được chọn ({selectedBulkKeys.size}):</span>
              {Array.from(selectedBulkKeys).map((key) => {
                const [ind, lane, date] = key.split('::');
                return (
                  <div key={key} className="flex items-center justify-between py-0.5 border-b border-slate-100 last:border-0">
                    <span className="font-semibold text-slate-900">{date}</span>
                    <span className="text-slate-500">{ind} — {lane}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-700">Lý do xác nhận của PO (Áp dụng cho tất cả ngày đã chọn):</label>
              <textarea
                value={bulkReason}
                onChange={(e) => setBulkReason(e.target.value)}
                placeholder="VD: Nghỉ lễ Quốc Khánh hoặc đợt rà soát dữ liệu đã được PO xác nhận không phát sinh bưu gửi..."
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {bulkResultReport && (
              <div className="mt-3 text-xs rounded-xl p-3 border bg-slate-50 space-y-1">
                <div className="font-bold text-slate-900">
                  Kết quả xử lý: {bulkResultReport.successCount}/{bulkResultReport.total} thành công
                  {bulkResultReport.failCount > 0 && <span className="text-red-600 ml-2">({bulkResultReport.failCount} thất bại)</span>}
                </div>
                {bulkResultReport.results.filter(r => !r.success).map((r, i) => (
                  <div key={i} className="text-red-600">
                    • {r.item.indicator} × {r.item.source_lane} × {r.item.business_date}: {r.error}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBulkConfirmModal(false)}
                disabled={bulkLoading}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteBulkConfirm}
                disabled={bulkLoading || !bulkReason.trim()}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
              >
                {bulkLoading ? `Đang xử lý ${selectedBulkKeys.size} ngày...` : `Loại bỏ phát sinh ${selectedBulkKeys.size} ngày`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PER-LANE MISSING DATES MODAL */}
      {selectedLaneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Danh sách Ngày thiếu: {selectedLaneModal.indicator} ({selectedLaneModal.lane === 'HUE' ? 'Nguồn Huế' : selectedLaneModal.lane})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  Tổng {selectedLaneModal.missingCount} ngày thiếu dữ liệu cần PO xem xét hoặc ngoại lệ.
                </p>
              </div>
              <button onClick={() => setSelectedLaneModal(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto divide-y divide-slate-100 pr-1">
              {selectedLaneModal.missingItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 hover:bg-slate-50 px-2 rounded-lg transition">
                  <div>
                    <span className="font-bold text-slate-900 text-sm">{item.business_date}</span>
                    <span className="ml-2 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedLaneModal(null);
                        setReimportModalItem(item);
                        setReimportError(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-[var(--color-vnpost-blue)] hover:bg-blue-100 transition shadow-xs"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Nhập lại</span>
                    </button>

                    <button
                      onClick={() => {
                        setSelectedLaneModal(null);
                        setConfirmModalItem(item);
                        setConfirmReason('');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition shadow-xs"
                    >
                      <UserCheck className="h-3.5 w-3.5 text-amber-700" />
                      <span>Xác nhận Không phát sinh</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLaneModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Đóng
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
              <div>Định danh ngoại lệ ID: <strong className="text-slate-900">{revokeModalItem.exception_id || revokeModalItem.exception?.id || revokeModalItem.id || 'N/A'}</strong></div>
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
function MonthlyAccordionGroup({ group, selectedBulkKeys, onToggleSelectItem, onToggleSelectAllItems, onConfirmClick, onRevokeClick, onReimportClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const [accordionPage, setAccordionPage] = useState(1);
  const [accordionPageSize, setAccordionPageSize] = useState(10);

  const paginatedGroup = useMemo(() => {
    return paginateItems(group.items, accordionPage, accordionPageSize);
  }, [group.items, accordionPage, accordionPageSize]);

  const isAllGroupPageSelected = useMemo(() => {
    const keys = paginatedGroup.pageItems.map(getItemKey);
    return keys.length > 0 && keys.every((k) => selectedBulkKeys.has(k));
  }, [paginatedGroup.pageItems, selectedBulkKeys]);

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
          {group.counts.complete === group.counts.total ? (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-300">
              100% Hoàn tất
            </span>
          ) : (group.counts.missing > 0 || group.counts.reviewReq > 0) ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300">
              {group.counts.missing > 0 && group.counts.reviewReq > 0
                ? `Còn thiếu ${group.counts.missing} · Cần kiểm tra ${group.counts.reviewReq} bản ghi`
                : group.counts.missing > 0
                ? `Còn thiếu ${group.counts.missing} bản ghi`
                : `Cần PO kiểm tra ${group.counts.reviewReq} bản ghi`}
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-300">
              Đã giải quyết {group.counts.total} bản ghi
            </span>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="flex flex-col">
          {/* Group Header Checkbox Bar */}
          <div className="bg-slate-100/60 px-6 py-2 border-b border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelectAllItems(paginatedGroup.pageItems);
              }}
              className="flex items-center gap-2 text-slate-700 hover:text-blue-700 font-bold"
            >
              {isAllGroupPageSelected ? (
                <CheckSquare className="h-4 w-4 text-blue-600" />
              ) : (
                <Square className="h-4 w-4 text-slate-400" />
              )}
              <span>Chọn tất cả {paginatedGroup.pageItems.length} ngày trên trang này</span>
            </button>
            <span>Hiển thị {paginatedGroup.pageItems.length}/{group.items.length} bản ghi</span>
          </div>

          <div className="divide-y divide-slate-100">
            {paginatedGroup.pageItems.map((item, idx) => {
              const statusInfo = resolveNoCodeStatus(item.status);
              const isActionable = isActionableForExemption(item);
              const isSelected = selectedBulkKeys.has(getItemKey(item));

              return (
                <div key={idx} className={`flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/80 transition text-sm ${isSelected ? 'bg-blue-50/40' : ''}`}>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelectItem(item);
                      }}
                      className="text-slate-400 hover:text-blue-600"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600 fill-blue-50" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>

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
                    {/* PER-ROW REIMPORT BUTTON */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onReimportClick(item);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-[var(--color-vnpost-blue)] hover:bg-blue-100 transition"
                      title="Yêu cầu nạp lại dữ liệu cho ngày này"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Nhập lại</span>
                    </button>

                    {isActionable && (
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

          {/* Internal Accordion Pagination Bar */}
          {paginatedGroup.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-2.5 text-xs font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <span>Số dòng:</span>
                <select
                  value={accordionPageSize}
                  onChange={(e) => {
                    setAccordionPageSize(Number(e.target.value));
                    setAccordionPage(1);
                  }}
                  className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-semibold text-slate-700"
                >
                  <option value={10}>10 dòng/trang</option>
                  <option value={20}>20 dòng/trang</option>
                  <option value={50}>50 dòng/trang</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAccordionPage((p) => Math.max(1, p - 1))}
                  disabled={!paginatedGroup.hasPrev}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-100 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Trước</span>
                </button>
                <span className="font-bold text-slate-800">
                  Trang {paginatedGroup.currentPage} / {paginatedGroup.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setAccordionPage((p) => Math.min(paginatedGroup.totalPages, p + 1))}
                  disabled={!paginatedGroup.hasNext}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-100 disabled:opacity-40"
                >
                  <span>Sau</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
