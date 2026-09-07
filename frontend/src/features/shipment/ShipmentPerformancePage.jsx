import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { AlertTriangle, Filter, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageContainer, KPICard, StatusBadge, LoadingState, ErrorState, EmptyState } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import f13DashboardClient from '../../api/F13DashboardClient';
import { resolveDefaultRouteDate } from '../route/routeRankingCalculations';
import { buildViolationGroupTabs, buildBackToRouteRankingLink, isValidReturnTo } from '../route/routeViolationEvidenceData';
import ShipmentEvidenceSummary from './ShipmentEvidenceSummary';
import ShipmentEvidenceDetail from './ShipmentEvidenceDetail';
import {
  formatSearchResultSummary,
  groupRowsByRoute,
} from './shipmentPerformanceData';

const ALL_ROUTES_OPTION = { value: '', label: 'Tất cả tuyến' };
const DEFAULT_REASON = 'delayed_cash';
const PAGE_SIZE = 50;

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toText(value, fallback = 'N/A') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function sortShipmentRows(rows, sort, order) {
  const factor = order === 'desc' ? -1 : 1;
  const sorted = [...rows];
  const key = sort || 'delay_hours';

  sorted.sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return (aValue - bValue) * factor;
    }

    const aText = toText(aValue, '').toLowerCase();
    const bText = toText(bValue, '').toLowerCase();
    return aText.localeCompare(bText, 'vi-VN') * factor;
  });

  return sorted;
}

export default function ShipmentPerformancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [runtimeRows, setRuntimeRows] = useState([]);
  const [statusSummary, setStatusSummary] = useState({ all: 0, passed: 0, failed: 0, returned: 0, identity_ok: true });
  const [violationSummary, setViolationSummary] = useState({});
  const [pagination, setPagination] = useState({ page: 1, page_size: PAGE_SIZE, total_items: 0, total_pages: 0 });
  const [searchMeta, setSearchMeta] = useState({ keyword: '', active: false, matched_items: null, matched_routes: null });
  const [scopeGuard, setScopeGuard] = useState({ scope_rows: 0, limit: 200000, exceeded: false });
  const [periodMeta, setPeriodMeta] = useState({ key: 'day', start: null, end: null, days_in_period: 1 });
  const [collapsedRouteIds, setCollapsedRouteIds] = useState(() => new Set());

  const [metaStatus, setMetaStatus] = useState('loading');
  const [metaMaxDate, setMetaMaxDate] = useState(null);
  const [bcvhOptions, setBcvhOptions] = useState([]);

  const [routeStatus, setRouteStatus] = useState('idle');
  const [routeOptions, setRouteOptions] = useState([]);

  const fromDateParam = searchParams.get('from_date') || '';
  const toDateParam = searchParams.get('to_date') || '';
  const bcvhIdParam = searchParams.get('bcvh_id') || '';
  const bcvhNameParam = searchParams.get('bcvh_name') || '';
  const routeIdParam = searchParams.get('route_id') || '';
  const routeNameParam = searchParams.get('route_name') || '';
  const shipmentId = searchParams.get('shipment_id') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'delay_hours';
  const order = searchParams.get('order') || 'asc';
  const periodParam = searchParams.get('period') || 'day';
  const statusParam = searchParams.get('status') || 'all';
  const reasonParam = searchParams.get('reason') || DEFAULT_REASON;
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const returnToParam = searchParams.get('return_to') || '';
  const hasValidReturnTo = isValidReturnTo(returnToParam);
  const backToRouteRankingLink = hasValidReturnTo ? buildBackToRouteRankingLink(returnToParam) : null;

  const fromDate = resolveDefaultRouteDate({ param: fromDateParam, metaMaxDate });
  const toDate = resolveDefaultRouteDate({ param: toDateParam, metaMaxDate });
  const analysisDate = resolveDefaultRouteDate({ param: toDateParam || fromDateParam, metaMaxDate });

  const bcvhId = bcvhIdParam || bcvhOptions[0]?.value || '';
  const bcvhName = bcvhNameParam || bcvhOptions.find((opt) => opt.value === bcvhId)?.label || bcvhId;
  const routeName = routeIdParam ? (routeNameParam || routeOptions.find((opt) => opt.value === routeIdParam)?.label || routeIdParam) : ALL_ROUTES_OPTION.label;

  const updateParams = (patch) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    setSearchParams(params);
  };

  const updateParam = (key, value) => updateParams({ [key]: value });

  useEffect(() => {
    let mounted = true;
    const fetchMeta = async () => {
      try {
        const result = await f13DashboardClient.getDashboardMeta();
        if (!mounted) return;
        setMetaMaxDate(result?.data?.max_date || null);
        const units = Array.isArray(result?.data?.bcvh_units) ? result.data.bcvh_units : [];
        setBcvhOptions(units.map((unit) => ({
          value: unit.ma_bcvh || unit.value,
          label: unit.ten_bcvh ? `BCVH ${unit.ten_bcvh.replace(/^BCVH\s+/i, '')}` : (unit.label || unit.ma_bcvh),
        })));
        setMetaStatus('ready');
      } catch {
        if (!mounted) return;
        setMetaMaxDate(null);
        setBcvhOptions([]);
        setMetaStatus('error');
      }
    };
    fetchMeta();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchRoutes = async () => {
      try {
        setRouteStatus('loading');
        const result = await f13DashboardClient.getRouteRanking(analysisDate, bcvhId, 1, 1000, 'ten_tuyen', 'asc', 'all');
        if (!mounted) return;
        const rows = Array.isArray(result?.data) ? result.data : [];
        setRouteOptions(rows.map((row) => ({ value: row.ma_tuyen, label: row.ten_tuyen || row.ma_tuyen })));
        setRouteStatus('ready');
      } catch {
        if (!mounted) return;
        setRouteOptions([]);
        setRouteStatus('error');
      }
    };
    if (analysisDate && bcvhId) {
      fetchRoutes();
    }
    return () => { mounted = false; };
  }, [analysisDate, bcvhId]);

  useEffect(() => {
    if (routeStatus !== 'ready') return;
    if (!routeIdParam) return;
    const stillValid = routeOptions.some((opt) => opt.value === routeIdParam);
    if (!stillValid) {
      updateParams({ route_id: '', route_name: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStatus, routeOptions, routeIdParam]);

  const handleBcvhChange = (value) => {
    const option = bcvhOptions.find((opt) => opt.value === value);
    updateParams({ bcvh_id: value, bcvh_name: option?.label || '', route_id: '', route_name: '', page: '' });
  };

  const handleRouteChange = (value) => {
    const option = routeOptions.find((opt) => opt.value === value);
    updateParams({ route_id: value, route_name: value ? (option?.label || '') : '', page: '' });
  };

  const handlePeriodChange = (nextPeriod) => {
    updateParams({ period: nextPeriod, page: '' });
  };

  const handleStatusChange = (nextStatus) => {
    // When leaving 'failed', reset reason. When entering 'failed', default reason to 'all'
    const patch = { status: nextStatus, page: '' };
    if (nextStatus !== 'failed') {
      patch.reason = '';
    } else if (!reasonParam || reasonParam === 'all') {
      patch.reason = 'all';
    }
    updateParams(patch);
  };

  const handleReasonChange = (slug) => {
    updateParams({ reason: slug, page: '' });
  };

  const handlePageChange = (newPage) => {
    updateParam('page', newPage > 1 ? String(newPage) : '');
  };

  // F13-ROUTE-EVIDENCE-STATUS-02: Server-side paginated query via GET /f13/evidence
  useEffect(() => {
    let mounted = true;

    const fetchEvidence = async () => {
      try {
        setStatus('loading');
        setError(null);

        const apiReason = statusParam === 'failed' ? (reasonParam || 'all') : 'all';
        const result = await f13DashboardClient.getEvidence({
          bcvh: bcvhId,
          anchor_date: analysisDate,
          period: periodParam,
          route: routeIdParam || 'all',
          status: statusParam,
          reason: apiReason,
          search: search.trim() || undefined,
          sort,
          order,
          page: currentPage,
          page_size: PAGE_SIZE,
        });

        if (!mounted) return;

        const rows = Array.isArray(result?.data) ? result.data : [];
        const mappedRows = rows.map((item) => {
          const shipmentKey = item.ma_bg || item.id || item.shipment_id || 'N/A';
          const statusLabel = item.danh_gia_2026 || (item.status_group === 'passed' ? 'Đạt' : item.status_group === 'returned' ? 'Chuyển hoàn' : 'Không đạt');
          const delayHours = item.do_tre_gio ?? null;

          return {
            id: shipmentKey,
            shipmentId: shipmentKey,
            shipmentName: item.ten_bg || shipmentKey,
            bcvhId: item.ma_bcvh || bcvhId,
            bcvhName: item.ten_bcvh || bcvhName,
            routeId: item.ma_tuyen || routeIdParam,
            routeName: item.ten_tuyen || routeName,
            status: statusLabel,
            statusGroup: item.status_group || (statusLabel === 'Đạt' ? 'passed' : statusLabel === 'Chuyển hoàn' ? 'returned' : 'failed'),
            violationReason: item.violation_reason || null,
            pickupTime: item.thoi_gian_ptc || null,
            handoverTime: item.thoi_gian_nop_tien || null,
            delayHours,
            delayLabel: delayHours === null || delayHours === undefined ? 'Chưa đủ dữ liệu' : `${Number(delayHours).toFixed(1)}h`,
            analysisDate: item.ngay_do_kiem || analysisDate,
            extendedData: item.extended_data || {},
          };
        });

        setRuntimeRows(mappedRows);
        setStatusSummary(result?.meta?.status_summary || { all: 0, passed: 0, failed: 0, returned: 0, identity_ok: true });
        setViolationSummary(result?.meta?.violation_summary || {});
        setPagination(result?.meta?.pagination || { page: currentPage, page_size: PAGE_SIZE, total_items: mappedRows.length, total_pages: 1 });
        setSearchMeta(result?.meta?.search || { keyword: search.trim(), active: Boolean(search.trim()), matched_items: null, matched_routes: null });
        setScopeGuard(result?.meta?.scope_guard || { scope_rows: 0, limit: 200000, exceeded: false });
        setPeriodMeta(result?.meta?.period || { key: periodParam, start: null, end: null, days_in_period: 1 });
        setStatus('success');
      } catch (e) {
        if (!mounted) return;
        setError({ message: e.message || 'Không thể tải dữ liệu shipment' });
        setStatus('error');
      }
    };

    if (analysisDate && bcvhId) {
      fetchEvidence();
    } else if (metaStatus === 'error') {
      setStatus('error');
      setError({ message: 'Không thể xác định ngày dữ liệu hoặc BCVH hợp lệ mới nhất.' });
    } else if (metaStatus === 'ready' && (!analysisDate || !bcvhId)) {
      setStatus('error');
      setError({ message: 'Không có dữ liệu ngày hoặc BCVH hợp lệ trong hệ thống.' });
    }

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisDate, bcvhId, routeIdParam, periodParam, statusParam, reasonParam, search, sort, order, currentPage, metaStatus]);

  const isSearchActive = Boolean(search.trim());
  const violationTabs = useMemo(() => buildViolationGroupTabs(violationSummary), [violationSummary]);

  // Client-side sort fallback for current page rows if needed
  const sortedRows = useMemo(() => sortShipmentRows(runtimeRows, sort, order), [runtimeRows, order, sort]);

  // AC-17/AC-18/AC-22: while a keyword is active, current page rows group by real route identity
  const groupedRows = useMemo(() => (isSearchActive ? groupRowsByRoute(sortedRows) : []), [isSearchActive, sortedRows]);

  const expandedRouteIds = useMemo(
    () => new Set(groupedRows.map((g) => g.routeId || g.routeName).filter((key) => !collapsedRouteIds.has(key))),
    [groupedRows, collapsedRouteIds],
  );
  const handleToggleRouteGroup = (key) => {
    setCollapsedRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // AC-15: selection exists ONLY when shipment_id is present in the URL AND still matches a visible row
  const selectedShipment = useMemo(() => {
    if (!shipmentId) return null;
    return sortedRows.find((item) => item.shipmentId === shipmentId) || null;
  }, [shipmentId, sortedRows]);

  // AC-19: three counts, always visibly distinct
  const contextTotal = toNumber(pagination.total_items);
  const searchResultCount = isSearchActive ? (searchMeta.matched_items ?? pagination.total_items) : null;

  const handleSelectShipment = (nextShipmentId) => {
    updateParam('shipment_id', nextShipmentId);
  };

  const handleClearSearch = () => updateParams({ search: '', page: '' });
  const handleViewAllRoutes = () => updateParams({ route_id: '', route_name: '', page: '' });

  const emptyStateContent = useMemo(() => {
    if (scopeGuard.exceeded) {
      return {
        title: 'Phạm vi tìm kiếm vượt quá giới hạn an toàn',
        description: `Phạm vi tìm kiếm (${scopeGuard.scope_rows.toLocaleString('vi-VN')} dòng) vượt quá giới hạn an toàn ${scopeGuard.limit.toLocaleString('vi-VN')} dòng. Vui lòng thu hẹp bộ lọc bằng cách chọn một Tuyến cụ thể hoặc chuyển về kỳ Ngày.`,
        action: (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePeriodChange('day')}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Chuyển sang kỳ Ngày
            </button>
          </div>
        ),
      };
    }

    if (search.trim()) {
      return {
        title: 'Không tìm thấy kết quả phù hợp',
        description: `Không tìm thấy kết quả phù hợp với từ khóa '${search.trim()}'.`,
        action: (
          <button
            type="button"
            onClick={handleClearSearch}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Xóa từ khóa
          </button>
        ),
      };
    }

    if (routeIdParam) {
      return {
        title: `Tuyến ${routeIdParam} - ${routeName} không có bưu gửi vi phạm`,
        description: `Ngày ${analysisDate} · BCVH ${bcvhName}. Tuyến này không có bưu gửi nào khớp với bộ lọc đang chọn trong bối cảnh hiện tại.`,
        action: (
          <button
            type="button"
            onClick={handleViewAllRoutes}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Xem Tất cả tuyến
          </button>
        ),
      };
    }

    return {
      title: 'Không có Evidence trong bối cảnh này',
      description: `Ngày ${analysisDate} · BCVH ${bcvhName}. Không có bưu gửi nào ở bất kỳ tuyến nào khớp với bộ lọc hiện tại.`,
      action: null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, routeIdParam, routeName, analysisDate, bcvhName, scopeGuard]);

  const routeSelector = (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs transition-all duration-150 hover:border-blue-400 hover:bg-slate-50/50 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
      <Filter size={16} className="text-slate-400 shrink-0" />
      <select
        value={routeIdParam}
        onChange={(e) => handleRouteChange(e.target.value)}
        disabled={routeStatus !== 'ready'}
        className="border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Bộ lọc Tuyến"
      >
        <option value={ALL_ROUTES_OPTION.value}>{ALL_ROUTES_OPTION.label}</option>
        {routeOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );

  const periodSelector = (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xs transition-all duration-150 hover:border-blue-400 hover:bg-slate-50/50 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600">
      <Calendar size={16} className="text-slate-400 shrink-0" />
      <select
        value={periodParam}
        onChange={(e) => handlePeriodChange(e.target.value)}
        className="border-none bg-transparent text-sm font-medium text-slate-800 focus:outline-none focus:ring-0 cursor-pointer"
        aria-label="Kỳ phân tích"
      >
        <option value="day">Kỳ ngày ({analysisDate})</option>
        <option value="month_to_anchor">
          Kỳ tháng {periodMeta.start && periodMeta.end ? `(${periodMeta.start} → ${periodMeta.end})` : 'lũy kế'}
        </option>
      </select>
    </div>
  );

  // Status Strip (Dải trạng thái) — PO-approved §7.2: 4 cards
  const statusStrip = (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: 'all', label: 'Tất cả trạng thái', count: statusSummary.all, color: 'border-slate-300 hover:border-slate-400', activeBg: 'bg-slate-800 text-white border-slate-800', badgeTone: 'neutral' },
          { key: 'passed', label: 'Đạt', count: statusSummary.passed, color: 'border-emerald-300 hover:border-emerald-400', activeBg: 'bg-emerald-700 text-white border-emerald-700', badgeTone: 'success' },
          { key: 'failed', label: 'Không đạt', count: statusSummary.failed, color: 'border-rose-300 hover:border-rose-400', activeBg: 'bg-rose-700 text-white border-rose-700', badgeTone: 'danger' },
          { key: 'returned', label: 'Chuyển hoàn', count: statusSummary.returned, color: 'border-slate-300 hover:border-slate-400', activeBg: 'bg-slate-600 text-white border-slate-600', badgeTone: 'neutral' },
        ].map((item) => {
          const isActive = statusParam === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleStatusChange(item.key)}
              className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition-all duration-150 ${
                isActive
                  ? `${item.activeBg} shadow-sm ring-2 ring-offset-1 ring-blue-500`
                  : `bg-white ${item.color} text-slate-800 shadow-xs hover:bg-slate-50`
              }`}
            >
              <div>
                <p className={`text-xs font-semibold ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                  {item.label}
                </p>
                <p className="mt-0.5 text-xl font-black">
                  {toNumber(item.count).toLocaleString('vi-VN')}
                </p>
              </div>
              <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {statusSummary.all > 0 ? `${((toNumber(item.count) / statusSummary.all) * 100).toFixed(1)}%` : '0%'}
              </span>
            </button>
          );
        })}
      </div>

      {!statusSummary.identity_ok && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-medium text-rose-800">
          <AlertTriangle size={15} className="shrink-0 text-rose-600" />
          <span>Cảnh báo đối soát: Tổng số bưu gửi (all) không khớp tổng Đạt + Không đạt + Chuyển hoàn.</span>
        </div>
      )}
    </div>
  );

  // Violation group tabs — §7.3 & T-F03: Rendered ONLY when status === 'failed'
  const violationTabsBar = statusParam === 'failed' ? (
    <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-xs">
      <div className="flex flex-wrap gap-1.5">
        {violationTabs.map((tab) => {
          const isActive = reasonParam === tab.slug;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => handleReasonChange(tab.slug)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-all ${
                isActive
                  ? tab.highlight
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-[var(--color-primary-600)] text-white shadow-xs'
                  : tab.highlight
                    ? 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100/80'
                    : 'bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab.highlight && <AlertTriangle size={14} className={isActive ? 'text-white' : 'text-amber-600'} />}
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold ${
                isActive
                  ? 'bg-white/20 text-white'
                  : tab.highlight
                    ? 'bg-amber-200/80 text-amber-950'
                    : 'bg-slate-200 text-slate-800'
              }`}>
                {tab.count.toLocaleString('vi-VN')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  // AC-16: search result summary
  const searchResultSummary = isSearchActive ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
      <p className="text-sm font-medium text-blue-900">
        {formatSearchResultSummary({
          count: searchMeta.matched_items ?? pagination.total_items,
          routeCount: searchMeta.matched_routes ?? (groupedRows.length || 1),
          keyword: search.trim(),
        })}
      </p>
      <button
        type="button"
        onClick={handleClearSearch}
        className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100"
      >
        Xóa từ khóa
      </button>
    </div>
  ) : null;

  // Server Pagination component
  const paginationControls = (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
      <div className="text-sm text-slate-600 font-medium">
        Hiển thị <strong>{pagination.total_items > 0 ? (pagination.page - 1) * pagination.page_size + 1 : 0} - {Math.min(pagination.page * pagination.page_size, pagination.total_items)}</strong> trong tổng số <strong>{pagination.total_items.toLocaleString('vi-VN')}</strong> bưu gửi
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500 mr-2 font-medium">
          Trang <strong>{pagination.page}</strong> / <strong>{pagination.total_pages || 1}</strong>
        </span>
        <button
          type="button"
          onClick={() => handlePageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          aria-label="Trang trước"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <ChevronLeft size={15} />
          <span>Trước</span>
        </button>
        <button
          type="button"
          onClick={() => handlePageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.total_pages}
          aria-label="Trang sau"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <span>Sau</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );

  const backLinkElement = hasValidReturnTo ? (
    <div className="px-6 pt-5 md:px-8 md:pt-6 -mb-2">
      <Link
        to={backToRouteRankingLink}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-[var(--color-primary-700)]"
      >
        <span aria-hidden="true">←</span>
        <span>Quay lại Tuyến Ranking</span>
      </Link>
    </div>
  ) : null;

  if (status === 'loading') {
    return (
      <div className="flex h-full flex-col">
        {backLinkElement}
        <PageContainer title="Chi tiết bưu gửi F1.3" subtitle="Đang tải dữ liệu Evidence.">
          <LoadingState label="Đang tải dữ liệu Evidence..." />
        </PageContainer>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col">
        {backLinkElement}
        <PageContainer title="Chi tiết bưu gửi F1.3" subtitle="Không thể tải dữ liệu Evidence.">
          <ErrorState
            description={error?.message}
            action={
              <button
                onClick={() => setSearchParams(searchParams)}
                className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white"
              >
                Thử lại
              </button>
            }
          />
        </PageContainer>
      </div>
    );
  }

  const filterBar = (
    <GlobalFilterBar
      fromDate={fromDate}
      toDate={toDate}
      onFromDateChange={(value) => updateParams({ from_date: value, page: '' })}
      onToDateChange={(value) => updateParams({ to_date: value, page: '' })}
      bcvhValue={bcvhId}
      onBcvhChange={handleBcvhChange}
      bcvhOptions={bcvhOptions}
      searchValue={search}
      onSearchChange={(value) => updateParams({ search: value, page: '' })}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {periodSelector}
          {routeSelector}
        </div>
      }
    />
  );

  if (!sortedRows.length) {
    return (
      <div className="flex h-full flex-col">
        {backLinkElement}
        <PageContainer title="Chi tiết bưu gửi F1.3" subtitle="Context/filter · trạng thái · bằng chứng chi tiết.">
          <div className="space-y-5">
            {filterBar}
            {statusStrip}
            {violationTabsBar}
            <EmptyState
              title={emptyStateContent.title}
              description={emptyStateContent.description}
              action={emptyStateContent.action}
            />
          </div>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {backLinkElement}
      <PageContainer
        title="Chi tiết bưu gửi F1.3"
        subtitle="Context/filter · trạng thái · bằng chứng chi tiết."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge label={`BCVH: ${bcvhName}`} tone="info" />
            <StatusBadge label={`Tuyến: ${routeName}`} tone="neutral" />
            <StatusBadge
              label={periodParam === 'month_to_anchor' ? `Kỳ tháng: ${periodMeta.start} → ${periodMeta.end}` : `Ngày: ${analysisDate}`}
              tone="success"
            />
          </div>
        }
      >
        <div className="space-y-5">
          {filterBar}

          {statusStrip}

          {searchResultSummary}

          <div className="grid gap-4 sm:grid-cols-3">
            <KPICard label="Tổng Evidence (bối cảnh)" value={contextTotal.toLocaleString('vi-VN')} delta="Theo bộ lọc hiện tại" tone="primary" />
            <KPICard
              label="Kết quả tìm kiếm"
              value={searchResultCount === null ? '—' : searchResultCount.toLocaleString('vi-VN')}
              delta={isSearchActive ? `Cho '${search.trim()}'` : 'Không có từ khóa'}
              tone="warning"
            />
            <KPICard label="Bưu gửi đang chọn" value={selectedShipment?.shipmentId || 'Chưa chọn'} delta={selectedShipment?.status || 'N/A'} tone="danger" />
          </div>

          {violationTabsBar}

          <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-4 xl:col-span-2">
              <ShipmentEvidenceSummary
                mode={isSearchActive ? 'grouped' : 'flat'}
                rows={sortedRows}
                groups={groupedRows}
                showRouteColumn={!routeIdParam}
                selectedShipmentId={selectedShipment?.shipmentId || ''}
                onSelectShipment={handleSelectShipment}
                expandedRouteIds={expandedRouteIds}
                onToggleRouteGroup={handleToggleRouteGroup}
              />
              {paginationControls}
            </div>
            <div>
              <ShipmentEvidenceDetail shipment={selectedShipment} />
            </div>
          </div>
        </div>
      </PageContainer>
    </div>
  );
}
