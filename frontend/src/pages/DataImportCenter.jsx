import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarDays, CheckCircle2, Clock, Database, HardDrive, Play, RefreshCw, RotateCcw, Search, Square, XCircle } from 'lucide-react';
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

const toDateInputValue = (date) => date.toISOString().slice(0, 10);

const formatBusinessDate = (value) => value || 'Chưa có dữ liệu';

const formatMonthList = (months = []) => {
  if (!months.length) return 'Chưa có dữ liệu';
  if (months.length <= 8) return months.join(', ');
  return `${months.slice(0, 8).join(', ')} +${months.length - 8} tháng`;
};

const formatDateList = (dates = []) => dates.length ? dates.join(', ') : 'Không có';

const defaultBackfillWindow = () => {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  return {
    fromDate: toDateInputValue(start),
    toDate: toDateInputValue(end)
  };
};

const formatQueueErrorMessage = (message) => {
  if (!message) return '-';
  if (message.includes('DKCL Hue automation is disabled by configuration')) {
    return 'Tự động nạp Huế F1.3 đang tắt trong cấu hình backend.';
  }
  return message;
};

const getApiErrorCode = (error, fallback = 'API_ERROR') => (
  error?.response?.data?.error?.code ||
  (error?.response?.status ? `HTTP_${error.response.status}` : fallback)
);

const getApiErrorDetail = (error) => {
  const message = error?.response?.data?.error?.message;
  return message ? ` (${message})` : '';
};

export default function DataImportCenter() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusError, setStatusError] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [backfillWindow, setBackfillWindow] = useState(defaultBackfillWindow);
  const [scanResult, setScanResult] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [coverageError, setCoverageError] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [queue, setQueue] = useState(null);
  const [queueError, setQueueError] = useState(null);
  const [queueSubmitting, setQueueSubmitting] = useState(false);
  const [refreshDates, setRefreshDates] = useState([]);
  const [tctSessionLoading, setTctSessionLoading] = useState(false);
  const [tctWindow, setTctWindow] = useState(defaultBackfillWindow);
  const [tctCoverage, setTctCoverage] = useState(null);
  const [tctCoverageError, setTctCoverageError] = useState(null);
  const [tctScanResult, setTctScanResult] = useState(null);
  const [tctScanLoading, setTctScanLoading] = useState(false);
  const [tctScanError, setTctScanError] = useState(null);
  const [tctSelectedDates, setTctSelectedDates] = useState([]);
  const [tctRefreshDates, setTctRefreshDates] = useState([]);
  const [tctSessionStatus, setTctSessionStatus] = useState(null);
  const [tctSessionError, setTctSessionError] = useState(null);
  const [tctQueue, setTctQueue] = useState(null);
  const [tctQueueError, setTctQueueError] = useState(null);
  const [tctQueueSubmitting, setTctQueueSubmitting] = useState(false);
  const [hueSessionStatus, setHueSessionStatus] = useState(null);
  const [hueSessionError, setHueSessionError] = useState(null);
  const [hueSessionLoading, setHueSessionLoading] = useState(false);
  const [importMode, setImportMode] = useState('HUE');

  const preflightHueSession = useCallback(async () => {
    setHueSessionError(null);
    try {
      const res = await api.post('/import/dkcl/session/preflight', { source: 'HUE' });
      setHueSessionStatus(res.data.data?.status || 'SESSION_CHECK_FAILED');
    } catch (err) {
      const status = err.response?.data?.data?.status || (err.response?.status === 401 ? 'AUTHENTICATION_REQUIRED' : 'SESSION_CHECK_FAILED');
      setHueSessionStatus(status);
      setHueSessionError(err.response?.data?.data?.error?.message || `Không thể kiểm tra phiên Huế F1.3. Mã lỗi: ${getApiErrorCode(err, 'HUE_SESSION_PREFLIGHT_ERROR')}`);
    }
  }, []);

  const preflightTctSession = useCallback(async () => {
    setTctSessionError(null);
    try {
      const res = await api.post('/import/dkcl/session/preflight', { source: 'TCT' });
      setTctSessionStatus(res.data.data?.status || 'SESSION_CHECK_FAILED');
    } catch (err) {
      const status = err.response?.data?.data?.status || (err.response?.status === 401 ? 'AUTHENTICATION_REQUIRED' : 'SESSION_CHECK_FAILED');
      setTctSessionStatus(status);
      setTctSessionError(err.response?.data?.data?.error?.message || `Không thể kiểm tra phiên TCT. Mã lỗi: ${getApiErrorCode(err, 'TCT_SESSION_PREFLIGHT_ERROR')}`);
    }
  }, []);

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
      preflightHueSession();
      preflightTctSession();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, page, pageSize, preflightHueSession, preflightTctSession]);

  const fetchCoverage = useCallback(async (range = null) => {
    setCoverageError(null);
    try {
      const res = await api.get('/import/dkcl/hue/f13/coverage-summary', {
        params: range ? {
          from_date: range.fromDate,
          to_date: range.toDate
        } : {}
      });
      if (res.data.success) {
        setCoverage(res.data.data);
      }
    } catch (err) {
      console.error('[DataImportCenter] fetchCoverage error:', err);
      setCoverageError(`Không thể tải tổng quan dữ liệu Huế F1.3. Mã lỗi: ${getApiErrorCode(err, 'COVERAGE_API_ERROR')}${getApiErrorDetail(err)}`);
    }
  }, []);

  const handleInteractiveHueLogin = async () => {
    setHueSessionError(null);
    setHueSessionLoading(true);
    try {
      const res = await api.post('/import/dkcl/session/interactive-auth', { source: 'HUE' });
      setHueSessionStatus(res.data.data?.status || 'SESSION_CHECK_FAILED');
      if (res.data.data?.status === 'SESSION_VALID') {
        setHueSessionError(null);
      }
    } catch (err) {
      const status = err.response?.data?.data?.status || 'AUTHENTICATION_REQUIRED';
      setHueSessionStatus(status);
      setHueSessionError(err.response?.data?.data?.error?.message || 'Không thể hoàn tất đăng nhập Huế DKCL.');
    } finally {
      setHueSessionLoading(false);
    }
  };

  useEffect(() => {
    fetchCoverage();
    preflightHueSession();
  }, [fetchCoverage, preflightHueSession]);

  const fetchTctCoverage = useCallback(async (range = null) => {
    setTctCoverageError(null);
    try {
      const res = await api.get('/import/dkcl/tct/f13/coverage-summary', {
        params: range ? {
          from_date: range.fromDate,
          to_date: range.toDate
        } : {}
      });
      if (res.data.success) {
        setTctCoverage(res.data.data);
      }
    } catch (err) {
      console.error('[DataImportCenter] fetchTctCoverage error:', err);
      setTctCoverageError(`Không thể tải tổng quan dữ liệu TCT F1.3. Mã lỗi: ${getApiErrorCode(err, 'TCT_COVERAGE_API_ERROR')}${getApiErrorDetail(err)}`);
    }
  }, []);

  useEffect(() => {
    fetchTctCoverage();
    preflightTctSession();
  }, [fetchTctCoverage, preflightTctSession]);

  const fetchQueue = useCallback(async (queueId) => {
    if (!queueId) return;
    try {
      const res = await api.get(`/import/dkcl/hue/f13/backfill-queue/${queueId}`);
      if (res.data.success) {
        setQueue(res.data.data);
      }
    } catch (err) {
      console.error('[DataImportCenter] fetchQueue error:', err);
    }
  }, []);

  const fetchActiveQueue = useCallback(async () => {
    try {
      const res = await api.get('/import/dkcl/hue/f13/backfill-queue/active');
      if (res.data.success) {
        setQueue(res.data.data);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('[DataImportCenter] fetchActiveQueue error:', err);
      }
    }
  }, []);

  useEffect(() => {
    fetchActiveQueue();
  }, [fetchActiveQueue]);

  const fetchTctQueue = useCallback(async (queueId) => {
    if (!queueId) return;
    try {
      const res = await api.get(`/import/dkcl/tct/f13/backfill-queue/${queueId}`);
      if (res.data.success) setTctQueue(res.data.data);
    } catch (err) {
      console.error('[DataImportCenter] fetchTctQueue error:', err);
    }
  }, []);

  const fetchActiveTctQueue = useCallback(async () => {
    try {
      const res = await api.get('/import/dkcl/tct/f13/backfill-queue/active');
      if (res.data.success) setTctQueue(res.data.data);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('[DataImportCenter] fetchActiveTctQueue error:', err);
      }
    }
  }, []);

  useEffect(() => {
    fetchActiveTctQueue();
  }, [fetchActiveTctQueue]);

  useEffect(() => {
    const active = queue && !['SUCCESS', 'FAILED', 'AUTHENTICATION_REQUIRED', 'STOPPED'].includes(queue.status);
    if (!active) return undefined;
    const interval = setInterval(() => {
      fetchQueue(queue.queueId);
      fetchStatus({ requestedPage: page, requestedPageSize: pageSize });
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchQueue, fetchStatus, page, pageSize, queue]);

  useEffect(() => {
    const active = tctQueue && !['SUCCESS', 'FAILED', 'AUTHENTICATION_REQUIRED', 'STOPPED'].includes(tctQueue.status);
    if (!active) return undefined;
    const interval = setInterval(() => {
      fetchTctQueue(tctQueue.queueId);
      fetchStatus({ requestedPage: page, requestedPageSize: pageSize });
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchTctQueue, page, pageSize, tctQueue]);

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

  const handleBackfillWindowChange = (field, value) => {
    setBackfillWindow((current) => ({ ...current, [field]: value }));
  };

  const handleTctWindowChange = (field, value) => {
    setTctWindow((current) => ({ ...current, [field]: value }));
  };

  const handleScanMissingDates = async () => {
    setScanLoading(true);
    setScanError(null);
    setSelectedDates([]);
    try {
      const res = await api.get('/import/dkcl/hue/f13/missing-dates', {
        params: {
          from_date: backfillWindow.fromDate,
          to_date: backfillWindow.toDate
        }
      });
      if (res.data.success) {
        setScanResult(res.data.data);
        fetchCoverage(backfillWindow);
      }
    } catch (err) {
      console.error('[DataImportCenter] scanMissingDates error:', err);
      setScanResult(null);
      setScanError(`Không thể quét ngày thiếu Huế F1.3. Mã lỗi: ${getApiErrorCode(err, 'SCAN_API_ERROR')}${getApiErrorDetail(err)}`);
    } finally {
      setScanLoading(false);
    }
  };

  const handleScanTctMissingDates = async ({ sessionReadyOverride = false } = {}) => {
    if (!sessionReadyOverride && tctSessionStatus !== 'SESSION_VALID') {
      setTctScanError('TCT chưa sẵn sàng. Hãy đăng nhập và xác nhận trang nguồn F1.3 trước khi quét.');
      return;
    }
    setTctScanLoading(true);
    setTctScanError(null);
    setTctSelectedDates([]);
    setTctRefreshDates([]);
    try {
      const res = await api.get('/import/dkcl/tct/f13/missing-dates', {
        params: {
          from_date: tctWindow.fromDate,
          to_date: tctWindow.toDate
        }
      });
      if (res.data.success) {
        setTctScanResult(res.data.data);
        fetchTctCoverage(tctWindow);
      }
    } catch (err) {
      console.error('[DataImportCenter] scanTctMissingDates error:', err);
      setTctScanResult(null);
      setTctScanError(`Không thể quét ngày thiếu TCT F1.3. Mã lỗi: ${getApiErrorCode(err, 'TCT_SCAN_API_ERROR')}${getApiErrorDetail(err)}`);
    } finally {
      setTctScanLoading(false);
    }
  };

  const toggleSelectedDate = (date, status) => {
    setSelectedDates((current) => {
      const isSelected = current.includes(date);
      if (isSelected) {
        if (status === 'COMPLETE') {
          setRefreshDates((refCurrent) => refCurrent.filter((item) => item !== date));
        }
        return current.filter((item) => item !== date);
      } else {
        if (status === 'COMPLETE') {
          setRefreshDates((refCurrent) => [...refCurrent, date].sort());
        }
        return [...current, date].sort();
      }
    });
  };

  const toggleTctSelectedDate = (date, status) => {
    setTctSelectedDates((current) => {
      const isSelected = current.includes(date);
      if (isSelected) {
        if (status === 'COMPLETE') {
          setTctRefreshDates((refCurrent) => refCurrent.filter((item) => item !== date));
        }
        return current.filter((item) => item !== date);
      } else {
        if (status === 'COMPLETE') {
          setTctRefreshDates((refCurrent) => [...refCurrent, date].sort());
        }
        return [...current, date].sort();
      }
    });
  };

  const selectableScanRows = scanResult?.results?.filter((item) => item.selectable) || [];
  const allSelectableDates = selectableScanRows.map((item) => item.measurement_date);
  const allSelectableChosen = allSelectableDates.length > 0 && allSelectableDates.every((date) => selectedDates.includes(date));
  const tctSelectableScanRows = tctScanResult?.results?.filter((item) => item.selectable) || [];
  const tctAllSelectableDates = tctSelectableScanRows.map((item) => item.measurement_date);
  const tctAllSelectableChosen = tctAllSelectableDates.length > 0 && tctAllSelectableDates.every((date) => tctSelectedDates.includes(date));

  const toggleAllSelectableDates = () => {
    if (allSelectableChosen) {
      setSelectedDates([]);
      setRefreshDates([]);
    } else {
      setSelectedDates(allSelectableDates);
      const completeSelectables = selectableScanRows
        .filter((item) => item.status === 'COMPLETE')
        .map((item) => item.measurement_date);
      setRefreshDates(completeSelectables);
    }
  };

  const toggleAllTctSelectableDates = () => {
    if (tctAllSelectableChosen) {
      setTctSelectedDates([]);
      setTctRefreshDates([]);
    } else {
      setTctSelectedDates(tctAllSelectableDates);
      const completeSelectables = tctSelectableScanRows
        .filter((item) => item.status === 'COMPLETE')
        .map((item) => item.measurement_date);
      setTctRefreshDates(completeSelectables);
    }
  };

  const queueIsActive = queue && !['SUCCESS', 'FAILED', 'AUTHENTICATION_REQUIRED', 'STOPPED'].includes(queue.status);
  const tctQueueIsActive = tctQueue && !['SUCCESS', 'FAILED', 'AUTHENTICATION_REQUIRED', 'BLOCKED', 'STOPPED'].includes(tctQueue.status);
  const tctSessionReady = tctSessionStatus === 'SESSION_VALID';
  const hueSessionReady = hueSessionStatus === 'SESSION_VALID';
  const tctUpdateDisabled = !tctSessionReady || (tctSessionReady && tctSelectedDates.length === 0) || tctQueueSubmitting || tctQueueIsActive;
  const updateDisabled = !hueSessionReady || (hueSessionReady && selectedDates.length === 0) || queueSubmitting || queueIsActive;

  const handleStartBackfillQueue = async () => {
    setQueueSubmitting(true);
    setQueueError(null);
    try {
      const res = await api.post('/import/dkcl/hue/f13/backfill-queue', {
        dates: selectedDates,
        refresh_dates: refreshDates
      });
      if (res.data.success) {
        setQueue(res.data.data);
        setSelectedDates([]);
        setRefreshDates([]);
      }
    } catch (err) {
      console.error('[DataImportCenter] startBackfillQueue error:', err);
      setQueueError(err.response?.data?.error?.message || 'Không thể tạo hàng đợi bù dữ liệu Huế F1.3.');
    } finally {
      setQueueSubmitting(false);
    }
  };

  const handleStartTctBackfillQueue = async () => {
    if (!tctSessionReady) {
      await handleInteractiveTctLogin();
      return;
    }
    const selectableDateSet = new Set([
      ...tctSelectableScanRows.map((item) => item.measurement_date),
      ...tctRefreshDates
    ]);
    const allowedDates = tctSelectedDates.filter((date) => selectableDateSet.has(date));
    setTctQueueSubmitting(true);
    setTctQueueError(null);
    try {
      const res = await api.post('/import/dkcl/tct/f13/backfill-queue', {
        dates: allowedDates,
        refresh_dates: tctRefreshDates.filter((date) => allowedDates.includes(date))
      });
      if (res.data.success) {
        setTctQueue(res.data.data);
        setTctSelectedDates([]);
        setTctRefreshDates([]);
      }
    } catch (err) {
      console.error('[DataImportCenter] startTctBackfillQueue error:', err);
      const code = getApiErrorCode(err, 'TCT_QUEUE_API_ERROR');
      const message = err.response?.data?.error?.message || 'Không thể tạo hàng đợi bù dữ liệu TCT F1.3.';
      setTctQueueError(`${message} Mã lỗi: ${code}`);
      if (code === 'AUTHENTICATION_REQUIRED') setTctSessionStatus('AUTHENTICATION_REQUIRED');
      if (code === 'SESSION_CHECK_FAILED') setTctSessionStatus('SESSION_CHECK_FAILED');
    } finally {
      setTctQueueSubmitting(false);
    }
  };

  const handleStopQueue = async () => {
    if (!queue?.queueId) return;
    setQueueError(null);
    try {
      const res = await api.post(`/import/dkcl/hue/f13/backfill-queue/${queue.queueId}/stop`);
      if (res.data.success) setQueue(res.data.data);
    } catch (err) {
      console.error('[DataImportCenter] stopBackfillQueue error:', err);
      setQueueError(err.response?.data?.error?.message || 'Không thể dừng hàng đợi.');
    }
  };

  const handleStopTctQueue = async () => {
    if (!tctQueue?.queueId) return;
    setTctQueueError(null);
    try {
      const res = await api.post(`/import/dkcl/tct/f13/backfill-queue/${tctQueue.queueId}/stop`);
      if (res.data.success) setTctQueue(res.data.data);
    } catch (err) {
      console.error('[DataImportCenter] stopTctBackfillQueue error:', err);
      setTctQueueError(err.response?.data?.error?.message || 'Không thể dừng hàng đợi TCT.');
    }
  };

  const handleRetryTctQueueItem = async (item) => {
    if (!tctQueue?.queueId) return;
    setTctQueueError(null);
    try {
      const res = await api.post(`/import/dkcl/tct/f13/backfill-queue/${tctQueue.queueId}/retry`, {
        measurement_date: item.measurementDate
      });
      if (res.data.success) setTctQueue(res.data.data);
    } catch (err) {
      console.error('[DataImportCenter] retryTctBackfillQueueItem error:', err);
      setTctQueueError(err.response?.data?.error?.message || 'Không thể thử lại ngày TCT đã chọn.');
    }
  };

  const handleInteractiveTctLogin = async () => {
    setTctSessionError(null);
    setTctSessionLoading(true);
    try {
      const res = await api.post('/import/dkcl/session/interactive-auth', { source: 'TCT' });
      setTctSessionStatus(res.data.data?.status || 'SESSION_CHECK_FAILED');
      if (res.data.data?.status === 'SESSION_VALID') {
        setTctSessionError(null);
        await handleScanTctMissingDates({ sessionReadyOverride: true });
      }
    } catch (err) {
      const status = err.response?.data?.data?.status || 'AUTHENTICATION_REQUIRED';
      setTctSessionStatus(status);
      setTctSessionError(err.response?.data?.data?.error?.message || 'Không thể hoàn tất đăng nhập TCT DKCL.');
    } finally {
      setTctSessionLoading(false);
    }
  };

  const handleRetryQueueItem = async (item) => {
    if (!queue?.queueId) return;
    setQueueError(null);
    try {
      const res = await api.post(`/import/dkcl/hue/f13/backfill-queue/${queue.queueId}/retry`, {
        measurement_date: item.measurementDate
      });
      if (res.data.success) setQueue(res.data.data);
    } catch (err) {
      console.error('[DataImportCenter] retryBackfillQueueItem error:', err);
      setQueueError(err.response?.data?.error?.message || 'Không thể thử lại ngày đã chọn.');
    }
  };

  const queueStatusClass = (itemStatus) => {
    if (itemStatus === 'SUCCESS') return 'bg-green-100 text-green-800';
    if (itemStatus === 'RUNNING') return 'bg-blue-100 text-blue-800';
    if (itemStatus === 'QUEUED') return 'bg-gray-100 text-gray-700';
    if (itemStatus === 'BLOCKED') return 'bg-amber-100 text-amber-800';
    if (itemStatus === 'STOPPED' || itemStatus === 'SKIPPED') return 'bg-slate-100 text-slate-700';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="w-full px-4 py-6 md:px-8 max-w-7xl mx-auto">
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

      <div className="mb-6 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold text-gray-700">Nguồn import</span>
          <button
            type="button"
            onClick={() => setImportMode('HUE')}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              importMode === 'HUE'
                ? 'bg-vnpost-blue text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Huế
          </button>
          <button
            type="button"
            onClick={() => setImportMode('TCT')}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              importMode === 'TCT'
                ? 'bg-vnpost-blue text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Tổng công ty
          </button>
        </div>
      </div>

      {importMode === 'TCT' && (
      <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" data-testid="tct-f13-manual-backfill-section">
        <div className="px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Database size={18} className="text-vnpost-blue" />
                Tổng quan dữ liệu TCT F1.3
              </h2>
              <p className="text-sm text-gray-500 mt-1">Quét vùng ngày do người vận hành chọn để xác định ngày TCT đã có, đã hoàn tất và còn thiếu.</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Checkpoint này chuẩn bị danh sách ngày thiếu; Update TCT, queue, tải file, Stop và Retry thuộc checkpoint sau.</p>
            </div>
            <div className="flex flex-col items-start gap-2 md:items-end">
              <button
                type="button"
                onClick={() => {
                  fetchTctCoverage(tctScanResult ? tctWindow : null);
                  preflightTctSession();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
                title="Làm mới tổng quan TCT và kiểm tra phiên"
              >
                <RefreshCw size={15} />
                Làm mới
              </button>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  tctSessionStatus === 'SESSION_VALID'
                    ? 'bg-green-100 text-green-800'
                    : tctSessionStatus === 'AUTHENTICATION_REQUIRED'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                }`}
                aria-label={tctSessionStatus === 'SESSION_VALID' ? 'Phiên hợp lệ, chưa kiểm tra xuất dữ liệu' : 'Chưa sẵn sàng'}
                data-testid="tct-session-status"
              >
                {tctSessionStatus === 'SESSION_VALID' ? 'SESSION_VALID - Chưa kiểm tra xuất' : (tctSessionStatus || 'Chưa kiểm tra phiên TCT')}
              </span>
            </div>
          </div>

          {tctSessionError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              <div>{tctSessionError}</div>
            </div>
          )}

          {!tctSessionReady && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800" data-testid="tct-not-ready">
              <span>Chưa sẵn sàng: số liệu bên dưới chỉ là local evidence đã nhập, không phải kết quả quét mới từ TCT.</span>
              <button
                type="button"
                onClick={handleInteractiveTctLogin}
                disabled={tctSessionLoading}
                className="ml-3 mt-2 inline-flex items-center justify-center rounded-lg bg-vnpost-blue px-3 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {tctSessionLoading ? 'Đang mở browser...' : 'Mở đăng nhập TCT'}
              </button>
            </div>
          )}

          {tctCoverageError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {tctCoverageError}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-500">Năm có dữ liệu</p>
              <p className="mt-1 text-sm font-black text-gray-900">{formatDateList(tctCoverage?.available_years)}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 lg:col-span-2">
              <p className="text-xs font-bold uppercase text-gray-500">Tháng có dữ liệu</p>
              <p className="mt-1 text-sm font-black text-gray-900">{formatMonthList(tctCoverage?.available_months)}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-700">Ngày đầu</p>
              <p className="mt-1 text-sm font-black text-blue-900">{formatBusinessDate(tctCoverage?.first_business_date)}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-700">Ngày cuối</p>
              <p className="mt-1 text-sm font-black text-blue-900">{formatBusinessDate(tctCoverage?.last_business_date)}</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-bold uppercase text-green-700">Ngày đã nhập</p>
              <p className="mt-1 text-2xl font-black text-green-700">{tctCoverage?.imported_dates_count ?? 0}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-500">Import TCT thành công mới nhất</p>
              <p className="mt-1 text-sm font-bold text-gray-900">
                {tctCoverage?.latest_successful_import
                  ? `${tctCoverage.latest_successful_import.business_date} ┬╖ ${formatVietnamDateTime(tctCoverage.latest_successful_import.imported_at)}`
                  : 'Chưa có dữ liệu'}
              </p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-700">Ngày thiếu trong khoảng quét</p>
              <p className="mt-1 text-2xl font-black text-amber-700">{tctCoverage?.selected_range?.missing_dates_count ?? tctScanResult?.missing_count ?? 0}</p>
              <p className="mt-1 text-xs font-semibold text-amber-800">{formatDateList(tctCoverage?.selected_range?.missing_dates || tctScanResult?.missing_dates)}</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-bold uppercase text-green-700">Ngày đã hoàn tất trong khoảng quét</p>
              <p className="mt-1 text-2xl font-black text-green-700">{tctCoverage?.selected_range?.imported_dates_count ?? tctScanResult?.complete_count ?? 0}</p>
              <p className="mt-1 text-xs font-semibold text-green-800">{formatDateList(tctCoverage?.selected_range?.completed_dates || tctScanResult?.completed_dates)}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-slate-50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays size={18} className="text-vnpost-blue" />
              Bù dữ liệu thủ công TCT F1.3
            </h2>
            <p className="text-sm text-gray-500 mt-1">Chọn khoảng ngày, quét dữ liệu quốc gia hiện có và chọn ngày thiếu để chuẩn bị cho checkpoint queue/import.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Từ ngày
              <input
                type="date"
                value={tctWindow.fromDate}
                onChange={(event) => handleTctWindowChange('fromDate', event.target.value)}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-vnpost-blue focus:outline-none"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Đến ngày
              <input
                type="date"
                value={tctWindow.toDate}
                onChange={(event) => handleTctWindowChange('toDate', event.target.value)}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-vnpost-blue focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={handleScanTctMissingDates}
              disabled={tctScanLoading || !tctSessionReady}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-vnpost-blue px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              title="Quét ngày thiếu TCT F1.3"
            >
              {tctScanLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              Quét
            </button>
          </div>
        </div>

        {tctScanError && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {tctScanError}
          </div>
        )}

        {tctScanResult && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-5">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase text-gray-500">Tổng ngày</p>
                <p className="mt-1 text-2xl font-black text-gray-900">{tctScanResult.total_days}</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase text-amber-700">Thiếu</p>
                <p className="mt-1 text-2xl font-black text-amber-700">{tctScanResult.missing_count}</p>
              </div>
              <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                <p className="text-xs font-bold uppercase text-green-700">Đã hoàn tất</p>
                <p className="mt-1 text-2xl font-black text-green-700">{tctScanResult.complete_count}</p>
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <p className="text-xs font-bold uppercase text-blue-700">Có thể xử lý lại</p>
                <p className="mt-1 text-2xl font-black text-blue-700">{tctScanResult.incomplete_count ?? tctScanResult.manual_review_count}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
              <button
                type="button"
                onClick={toggleAllTctSelectableDates}
                disabled={tctAllSelectableDates.length === 0}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                {tctAllSelectableChosen ? 'Bỏ chọn tất cả' : 'Chọn tất cả ngày có thể xử lý'}
              </button>
              <button
                type="button"
                onClick={handleStartTctBackfillQueue}
                disabled={tctUpdateDisabled}
                data-testid="tct-backfill-update"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-vnpost-orange px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-500"
                title="Tạo hàng đợi bù dữ liệu TCT F1.3"
              >
                {tctQueueSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                {tctRefreshDates.length > 0 ? `Re-Update (${tctSelectedDates.length})` : (tctSessionReady ? `Update (${tctSelectedDates.length})` : 'Mở đăng nhập để Update')}
              </button>
            </div>

            {tctQueueError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {tctQueueError}
                {tctSessionStatus === 'AUTHENTICATION_REQUIRED' && (
                  <button
                    type="button"
                    onClick={handleInteractiveTctLogin}
                    className="ml-0 mt-3 inline-flex items-center justify-center rounded-lg bg-vnpost-blue px-3 py-2 text-sm font-bold text-white hover:bg-blue-800 md:ml-3 md:mt-0"
                  >
                    Đăng nhập lại
                  </button>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Chọn</th>
                    <th className="px-4 py-3 font-bold">Ngày dữ liệu</th>
                    <th className="px-4 py-3 font-bold">Trạng thái</th>
                    <th className="px-4 py-3 font-bold text-right">Đơn vị xếp hạng</th>
                    <th className="px-4 py-3 font-bold">Bằng chứng</th>
                  </tr>
                </thead>
                <tbody>
                  {tctScanResult.results.map((item) => (
                    <tr key={`tct-${item.measurement_date}`} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={tctSelectedDates.includes(item.measurement_date)}
                          onChange={() => toggleTctSelectedDate(item.measurement_date, item.status)}
                          disabled={!item.selectable}
                          className="h-4 w-4 rounded border-gray-300 text-vnpost-blue focus:ring-vnpost-blue"
                          aria-label={`Chọn ngày TCT ${item.measurement_date}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">{item.measurement_date}</td>
                      <td className="px-4 py-3">
                        {item.status === 'COMPLETE' && (
                          <button
                            type="button"
                            onClick={() => toggleTctSelectedDate(item.measurement_date, item.status)}
                            className="mr-2 rounded border border-vnpost-blue px-2 py-1 text-xs font-bold text-vnpost-blue hover:bg-blue-50"
                          >
                            Update lại
                          </button>
                        )}
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.status === 'MISSING'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'COMPLETE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {item.status === 'COMPLETE' ? 'Đã có — có thể cập nhật lại' : (item.status === 'INCOMPLETE' ? 'Xử lý lại' : item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">{item.evidence.distinct_ranked_unit_count.toLocaleString('vi-VN')}/34</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-500">
                        {item.evidence.reason || `${item.evidence.success_log_count} log thành công`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tctQueue && (
          <div className="border-t border-gray-100 p-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-bold text-gray-900">TCT Queue {tctQueue.queueId}</h3>
                <p className="mt-1 text-sm text-gray-500">{tctQueue.restartNotice}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${queueStatusClass(tctQueue.status)}`}>{tctQueue.status}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                  {tctQueue.progress.completed}/{tctQueue.progress.total}
                </span>
                <button
                  type="button"
                  onClick={handleStopTctQueue}
                  disabled={!tctQueueIsActive || tctQueue.stopRequested}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
                  title="Dừng sau khi ngày TCT đang chạy kết thúc"
                >
                  <Square size={15} />
                  Stop
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Ngày</th>
                    <th className="px-4 py-3 font-bold">Trạng thái</th>
                    <th className="px-4 py-3 font-bold">Run ID</th>
                    <th className="px-4 py-3 font-bold text-right">Đơn vị</th>
                    <th className="px-4 py-3 font-bold text-right">Huế KPI</th>
                    <th className="px-4 py-3 font-bold text-right">Hạng</th>
                    <th className="px-4 py-3 font-bold">Bằng chứng / lỗi</th>
                    <th className="px-4 py-3 font-bold text-center">Retry</th>
                  </tr>
                </thead>
                <tbody>
                  {tctQueue.items.map((item) => (
                    <tr key={`${tctQueue.queueId}-${item.measurementDate}`} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3 font-bold text-gray-800">{item.measurementDate}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${queueStatusClass(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-500">{item.runId || item.evidence.run_id || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {item.evidence.parsed_ranked_unit_count ?? item.evidence.imported_database_row_count ?? '-'}/{item.evidence.total_ranked_population ?? 34}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {item.evidence.hue_kpi === null || item.evidence.hue_kpi === undefined ? '-' : `${(Number(item.evidence.hue_kpi) * 100).toFixed(2)}%`}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {item.evidence.hue_rank ? `${item.evidence.hue_rank}/${item.evidence.total_ranked_population ?? 34}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-500">
                        <div>{item.evidence.downloaded_filename || formatQueueErrorMessage(item.evidence.error_message)}</div>
                        <div className="mt-1">Tệp tạm đã xóa: {item.evidence.temp_file_deleted === null || item.evidence.temp_file_deleted === undefined ? '-' : (item.evidence.temp_file_deleted ? 'Có' : 'Không')}</div>
                        {item.evidence.error_code && <div className="mt-1 font-bold text-red-700">{item.evidence.error_code}</div>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRetryTctQueueItem(item)}
                          disabled={(!['FAILED', 'AUTHENTICATION_REQUIRED'].includes(item.status) && !(tctQueue?.status === 'BLOCKED' && item.status === 'QUEUED')) || tctQueueIsActive}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                          title="Retry ngày TCT bị lỗi hoặc cần đăng nhập"
                        >
                          <RotateCcw size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {importMode === 'HUE' && (
      <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-white">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Database size={18} className="text-vnpost-blue" />
                Tổng quan dữ liệu Huế F1.3
              </h2>
              <p className="text-sm text-gray-500 mt-1">Xem nhanh dữ liệu đã có và ngày còn thiếu, không cần đọc bảng nhật ký import.</p>
            </div>
            <button
              type="button"
              onClick={() => fetchCoverage(scanResult ? backfillWindow : null)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
              title="Làm mới tổng quan dữ liệu"
            >
              <RefreshCw size={15} />
              Làm mới
            </button>
          </div>

          {coverageError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {coverageError}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-500">Năm có dữ liệu</p>
              <p className="mt-1 text-sm font-black text-gray-900">{formatDateList(coverage?.available_years)}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 lg:col-span-2">
              <p className="text-xs font-bold uppercase text-gray-500">Tháng có dữ liệu</p>
              <p className="mt-1 text-sm font-black text-gray-900">{formatMonthList(coverage?.available_months)}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-700">Ngày đầu</p>
              <p className="mt-1 text-sm font-black text-blue-900">{formatBusinessDate(coverage?.first_business_date)}</p>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-bold uppercase text-blue-700">Ngày cuối</p>
              <p className="mt-1 text-sm font-black text-blue-900">{formatBusinessDate(coverage?.last_business_date)}</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-bold uppercase text-green-700">Ngày đã nhập</p>
              <p className="mt-1 text-2xl font-black text-green-700">{coverage?.imported_dates_count ?? 0}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase text-gray-500">Import thành công mới nhất</p>
              <p className="mt-1 text-sm font-bold text-gray-900">
                {coverage?.latest_successful_import
                  ? `${coverage.latest_successful_import.business_date} ┬╖ ${formatVietnamDateTime(coverage.latest_successful_import.imported_at)}`
                  : 'Chưa có dữ liệu'}
              </p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-bold uppercase text-amber-700">Ngày thiếu trong khoảng quét</p>
              <p className="mt-1 text-2xl font-black text-amber-700">{coverage?.selected_range?.missing_dates_count ?? scanResult?.missing_count ?? 0}</p>
              <p className="mt-1 text-xs font-semibold text-amber-800">{formatDateList(coverage?.selected_range?.missing_dates || scanResult?.missing_dates)}</p>
            </div>
            <div className="rounded-lg border border-green-100 bg-green-50 p-4">
              <p className="text-xs font-bold uppercase text-green-700">Ngày đã có trong khoảng quét</p>
              <p className="mt-1 text-2xl font-black text-green-700">{coverage?.selected_range?.imported_dates_count ?? scanResult?.complete_count ?? 0}</p>
              <p className="mt-1 text-xs font-semibold text-green-800">{formatDateList(coverage?.selected_range?.completed_dates || scanResult?.completed_dates)}</p>
            </div>
          </div>
          
          {hueSessionError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              <div>{hueSessionError}</div>
            </div>
          )}

          {!hueSessionReady && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800" data-testid="hue-not-ready">
              <span>Chưa sẵn sàng: số liệu bên dưới chỉ là local evidence đã nhập, không phải kết quả quét mới từ Huế.</span>
              <button
                type="button"
                onClick={handleInteractiveHueLogin}
                disabled={hueSessionLoading}
                className="ml-3 mt-2 inline-flex items-center justify-center rounded-lg bg-vnpost-blue px-3 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {hueSessionLoading ? 'Đang mở browser...' : 'Mở đăng nhập Huế'}
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-slate-50 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays size={18} className="text-vnpost-blue" />
              Bù dữ liệu thủ công Huế F1.3
            </h2>
            <p className="text-sm text-gray-500 mt-1">Quét ngày thiếu và chọn ngày cần nạp bổ sung qua hàng đợi tuần tự.</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Hàng đợi đang lưu trong bộ nhớ ứng dụng; restart backend có thể xóa trạng thái đang chạy.</p>
            {!queue && (
              <p className="mt-1 text-xs font-semibold text-slate-400">Nếu vừa refresh và không thấy queue cũ, backend có thể đã restart hoặc queue trong bộ nhớ đã kết thúc/không còn active.</p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Từ ngày
              <input
                type="date"
                value={backfillWindow.fromDate}
                onChange={(event) => handleBackfillWindowChange('fromDate', event.target.value)}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-vnpost-blue focus:outline-none"
              />
            </label>
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
              Đến ngày
              <input
                type="date"
                value={backfillWindow.toDate}
                onChange={(event) => handleBackfillWindowChange('toDate', event.target.value)}
                className="mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 focus:border-vnpost-blue focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={handleScanMissingDates}
              disabled={scanLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-vnpost-blue px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50"
              title="Quét ngày thiếu Huế F1.3"
            >
              {scanLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              Quét
            </button>
          </div>
        </div>

        {scanError && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {scanError}
          </div>
        )}

        {scanResult && (
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-5">
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-bold uppercase text-gray-500">Tổng ngày</p>
                <p className="mt-1 text-2xl font-black text-gray-900">{scanResult.total_days}</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-4">
                <p className="text-xs font-bold uppercase text-amber-700">Thiếu</p>
                <p className="mt-1 text-2xl font-black text-amber-700">{scanResult.missing_count}</p>
              </div>
              <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                <p className="text-xs font-bold uppercase text-green-700">Đã có</p>
                <p className="mt-1 text-2xl font-black text-green-700">{scanResult.complete_count}</p>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50 p-4">
                <p className="text-xs font-bold uppercase text-red-700">Cần soát xét</p>
                <p className="mt-1 text-2xl font-black text-red-700">{scanResult.manual_review_count}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-3">
              <button
                type="button"
                onClick={toggleAllSelectableDates}
                disabled={allSelectableDates.length === 0}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                {allSelectableChosen ? 'Bỏ chọn tất cả' : 'Chọn tất cả ngày có thể xử lý'}
              </button>
              <button
                type="button"
                onClick={handleStartBackfillQueue}
                disabled={updateDisabled}
                data-testid="hue-backfill-update"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-vnpost-orange px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-500"
                title="Tạo hàng đợi bù dữ liệu Huế F1.3"
              >
                {queueSubmitting ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
                {refreshDates.length > 0 ? `Re-Update (${selectedDates.length})` : (hueSessionReady ? `Update (${selectedDates.length})` : 'Mở đăng nhập để Update')}
              </button>
            </div>

            {queueError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {queueError}
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Chọn</th>
                    <th className="px-4 py-3 font-bold">Ngày dữ liệu</th>
                    <th className="px-4 py-3 font-bold">Trạng thái</th>
                    <th className="px-4 py-3 font-bold text-right">Dòng DB</th>
                    <th className="px-4 py-3 font-bold">Bằng chứng</th>
                  </tr>
                </thead>
                <tbody>
                  {scanResult.results.map((item) => (
                    <tr key={item.measurement_date} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedDates.includes(item.measurement_date)}
                          onChange={() => toggleSelectedDate(item.measurement_date, item.status)}
                          disabled={!item.selectable}
                          className="h-4 w-4 rounded border-gray-300 text-vnpost-blue focus:ring-vnpost-blue"
                          aria-label={`Chọn ngày ${item.measurement_date}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-800">{item.measurement_date}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.status === 'MISSING'
                            ? 'bg-amber-100 text-amber-800'
                            : item.status === 'COMPLETE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status === 'COMPLETE' ? 'Đã có — có thể cập nhật lại' : item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">{item.evidence.row_count.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-500">
                        {item.evidence.reason || item.evidence.standardized_filename}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {queue && (
          <div className="border-t border-gray-100 p-6">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Queue {queue.queueId}</h3>
                <p className="mt-1 text-sm text-gray-500">{queue.restartNotice}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${queueStatusClass(queue.status)}`}>{queue.status}</span>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                  {queue.progress.completed}/{queue.progress.total}
                </span>
                <button
                  type="button"
                  onClick={handleStopQueue}
                  disabled={!queueIsActive || queue.stopRequested}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
                  title="Dừng sau khi ngày đang chạy kết thúc"
                >
                  <Square size={15} />
                  Stop
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-sm text-left">
                <thead className="bg-white text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Ngày</th>
                    <th className="px-4 py-3 font-bold">Trạng thái</th>
                    <th className="px-4 py-3 font-bold">Run ID</th>
                    <th className="px-4 py-3 font-bold text-right">Workbook</th>
                    <th className="px-4 py-3 font-bold text-right">DB</th>
                    <th className="px-4 py-3 font-bold text-right">Log</th>
                    <th className="px-4 py-3 font-bold">Bằng chứng / lỗi</th>
                    <th className="px-4 py-3 font-bold text-center">Retry</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.items.map((item) => (
                    <tr key={`${queue.queueId}-${item.measurementDate}`} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3 font-bold text-gray-800">{item.measurementDate}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${queueStatusClass(item.status)}`}>{item.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-500">{item.runId || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {item.evidence.workbook_row_count?.toLocaleString('vi-VN') || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {item.evidence.imported_database_row_count?.toLocaleString('vi-VN') || '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-semibold text-gray-600">
                        S {item.evidence.success_log_count} / E {item.evidence.error_log_count}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-500">
                        <div>{item.evidence.exported_filename || formatQueueErrorMessage(item.evidence.error_message)}</div>
                        {item.evidence.error_code && <div className="mt-1 font-bold text-red-700">{item.evidence.error_code}</div>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleRetryQueueItem(item)}
                          disabled={!['FAILED', 'AUTHENTICATION_REQUIRED'].includes(item.status) || queueIsActive}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                          title="Retry item that failed or requires authentication"
                        >
                          <RotateCcw size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

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
