import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Filter } from 'lucide-react';
import { PageContainer, KPICard, StatusBadge, LoadingState, ErrorState, EmptyState } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import f13DashboardClient from '../../api/F13DashboardClient';
import { resolveDefaultRouteDate } from '../route/routeRankingCalculations';
import { buildViolationGroupTabs } from '../route/routeViolationEvidenceData';
import ShipmentEvidenceSummary from './ShipmentEvidenceSummary';
import ShipmentEvidenceDetail from './ShipmentEvidenceDetail';
import {
  calculateDelayHours,
  fetchAllEvidenceRows,
  matchesSearchQuery,
  formatSearchResultSummary,
  groupRowsByRoute,
} from './shipmentPerformanceData';

const ALL_ROUTES_OPTION = { value: '', label: 'Tất cả tuyến' };
const DEFAULT_REASON = 'delayed_cash';

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
  const [meta, setMeta] = useState({});
  const [violationSummary, setViolationSummary] = useState({});
  const [truncated, setTruncated] = useState(false);
  const [collapsedRouteIds, setCollapsedRouteIds] = useState(() => new Set());

  const [metaStatus, setMetaStatus] = useState('loading');
  const [metaMaxDate, setMetaMaxDate] = useState(null);
  const [bcvhOptions, setBcvhOptions] = useState([]);

  const [routeStatus, setRouteStatus] = useState('idle');
  const [routeOptions, setRouteOptions] = useState([]);

  const fromDateParam = searchParams.get('from_date') || '';
  const toDateParam = searchParams.get('to_date') || '';
  const interval = searchParams.get('interval') || 'daily';
  const bcvhIdParam = searchParams.get('bcvh_id') || '';
  const bcvhNameParam = searchParams.get('bcvh_name') || '';
  // Empty route_id means "Tất cả tuyến" — never a fabricated route ID.
  const routeIdParam = searchParams.get('route_id') || '';
  const routeNameParam = searchParams.get('route_name') || '';
  const shipmentId = searchParams.get('shipment_id') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'delay_hours';
  const order = searchParams.get('order') || 'asc';
  // Violation group tab (AC-1..AC-9 reconciliation contract, unchanged): default is
  // "Chậm nộp tiền", matching the pre-existing RouteViolationEvidencePage default —
  // no new business decision, just the same accepted default carried into the merged
  // screen.
  const reasonParam = searchParams.get('reason') || DEFAULT_REASON;

  // Same single-day analysis contract already established by Dashboard/BCVH Ranking/Tuyến
  // Ranking: GlobalFilterBar exposes two date fields, but only one authoritative evaluation
  // day (ngay_do_kiem) drives the query — resolved via the same shared helper Route Ranking
  // already uses, never a from_date–to_date range filter.
  const fromDate = resolveDefaultRouteDate({ param: fromDateParam, metaMaxDate });
  const toDate = resolveDefaultRouteDate({ param: toDateParam, metaMaxDate });
  const analysisDate = resolveDefaultRouteDate({ param: toDateParam || fromDateParam, metaMaxDate });

  // Real BCVH, sourced from bcvhOptions — never a hand-typed fallback code/name.
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

  // Real BCVH list from the same /f13/dashboard/meta contract Route Ranking already uses —
  // never a hand-typed BCVH list.
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

  // Real Tuyến list, dependent on the selected BCVH+date, from the same /f13/ranking/route
  // contract Route Ranking already uses (route_type=all so every route is offered, not only
  // the postman-classified default) — never a hand-typed route list.
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

  // Changing BCVH can make the current route_id invalid for the new BCVH/date — reset to
  // "Tất cả tuyến" rather than silently keep querying a route_id that no longer applies.
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
    // Explicit BCVH re-selection always resets Tuyến to "Tất cả tuyến" — the previously
    // selected route belongs to the old BCVH's route list.
    updateParams({ bcvh_id: value, bcvh_name: option?.label || '', route_id: '', route_name: '' });
  };

  const handleRouteChange = (value) => {
    const option = routeOptions.find((opt) => opt.value === value);
    // AC-20: the Tuyến dropdown is a separate, independent filter from search — it is
    // never implicitly changed by a keyword and never overridden by it.
    updateParams({ route_id: value, route_name: value ? (option?.label || '') : '' });
  };

  const handleReasonChange = (slug) => {
    updateParam('reason', slug === DEFAULT_REASON ? '' : slug);
  };

  // Fetches the complete matching Evidence set for the current date/BCVH/route/violation
  // group — walks every backend page instead of a single fixed-size request, so search,
  // sort, and counts below always reflect the full result, never a silently truncated
  // slice. `reason` participates in the query so violation group tabs are server-scoped,
  // consistent with the reconciliation contract (Section 3.3): meta.violation_summary is
  // computed over the whole "Không đạt" set regardless of the active tab, while the rows
  // themselves are scoped to the active tab.
  useEffect(() => {
    let mounted = true;

    const fetchEvidence = async () => {
      try {
        setStatus('loading');
        setError(null);

        const fetchPage = (page, pageSize) => f13DashboardClient.getEvidenceList(
          analysisDate,
          bcvhId,
          routeIdParam || undefined,
          page,
          pageSize,
          reasonParam === 'all' ? undefined : reasonParam,
        );
        const result = await fetchAllEvidenceRows(fetchPage);
        if (!mounted) return;

        const mappedRows = result.rows.map((item) => {
          const shipmentKey = item.ma_bg || item.id || item.shipment_id || 'N/A';
          const delayHours = item.do_tre_gio ?? calculateDelayHours(item.thoi_gian_ptc, item.thoi_gian_nop_tien, item.extended_data);

          return {
            id: shipmentKey,
            shipmentId: shipmentKey,
            shipmentName: item.ten_bg || shipmentKey,
            bcvhId: item.ma_bcvh || bcvhId,
            bcvhName: item.ten_bcvh || bcvhName,
            routeId: item.ma_tuyen || routeIdParam,
            routeName: item.ten_tuyen || routeName,
            status: item.danh_gia_2026 || 'Không đạt',
            violationReason: item.violation_reason || null,
            pickupTime: item.thoi_gian_ptc || null,
            handoverTime: item.thoi_gian_nop_tien || null,
            delayHours,
            delayLabel: delayHours === null || delayHours === undefined ? 'N/A' : `${Number(delayHours).toFixed(1)}h`,
            analysisDate,
            extendedData: item.extended_data || {},
          };
        });

        setRuntimeRows(mappedRows);
        setMeta(result.meta || {});
        setViolationSummary(result.meta?.violation_summary || {});
        setTruncated(result.truncated);
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
    // bcvhName/routeName are display-only fallbacks used inside the mapper, not fetch
    // inputs — including them would refetch on every label resolution instead of only
    // when the actual query (date/BCVH/route/reason) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisDate, bcvhId, routeIdParam, reasonParam, metaStatus]);

  const intervalLabel = interval === 'daily' ? 'Một ngày' : interval === 'weekly' ? 'Theo tuần' : 'Lũy kế';

  // DEFECT A remediation: matchesSearchQuery matches route/BCVH names exactly first
  // (this alone already covers real route codes, which are digits with no diacritics),
  // and only then falls back to a diacritic-insensitive comparison — so a manager
  // typing "Huong Phong" still finds "Hương Phong" without ever weakening exact code
  // search.
  const filteredRows = useMemo(() => {
    if (!search.trim()) return runtimeRows;
    return runtimeRows.filter((item) => matchesSearchQuery(
      [item.shipmentId, item.shipmentName, item.routeName, item.routeId, item.bcvhName],
      search,
    ));
  }, [runtimeRows, search]);

  const sortedRows = useMemo(() => sortShipmentRows(filteredRows, sort, order), [filteredRows, order, sort]);

  // AC-17/AC-18/AC-22: while a keyword is active, results group by real route identity.
  const groupedRows = useMemo(() => (search.trim() ? groupRowsByRoute(sortedRows) : []), [search, sortedRows]);
  const isSearchActive = Boolean(search.trim());

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

  // AC-15: a keyword only ever filters — it never selects a row on its own. Selection
  // exists only when shipment_id is present in the URL AND still matches a visible row;
  // there is no fallback to "the first row."
  const selectedShipment = useMemo(() => {
    if (!shipmentId) return null;
    return sortedRows.find((item) => item.shipmentId === shipmentId) || null;
  }, [shipmentId, sortedRows]);

  const violationTabs = useMemo(() => buildViolationGroupTabs(violationSummary), [violationSummary]);

  // AC-19: three counts, always visibly distinct — never conflated into one number.
  const contextTotal = toNumber(meta?.pagination?.total_items ?? runtimeRows.length);
  const searchResultCount = isSearchActive ? filteredRows.length : null;

  const handleSelectShipment = (nextShipmentId) => {
    updateParam('shipment_id', nextShipmentId);
  };

  const handleClearSearch = () => updateParam('search', '');
  const handleViewAllRoutes = () => updateParams({ route_id: '', route_name: '' });

  // DEFECT B remediation (2026-08-11): distinguish the empty-result reasons that were
  // previously collapsed into one generic "no evidence, try filters or Tất cả tuyến"
  // message. sortedRows can only be empty two ways — filteredRows/search reduced a
  // non-empty runtimeRows to zero, or runtimeRows itself is already zero — so exactly
  // these cases are distinguished, never guessed:
  //   1. A keyword is active and it matched nothing — the keyword is named as the
  //      reason, regardless of whether a specific route is selected. Verified
  //      root-cause finding: this is the only case where the previous unconditional
  //      "chọn Tất cả tuyến" suggestion made no sense — the route/BCVH/date context
  //      may be entirely correct and simply have no shipment matching that keyword.
  //   2. No keyword, a specific Tuyến is selected, and the API returned zero rows for
  //      it — this route genuinely has no vi phạm bưu gửi for this day/BCVH. Verified
  //      directly against the operational database for the reported case (Tuyến
  //      53579015 — "535790 - Hương Phong", BCVH A Lưới, 2026-08-10): exactly 2 real
  //      shipments that day, both "Đạt", zero "Không đạt" — the filter is correct;
  //      this was never a filter defect, only a missing empty-state distinction.
  //   3. No keyword, "Tất cả tuyến" selected, and the API returned zero rows across
  //      every route for this BCVH/date — nothing to suggest switching to (already
  //      there), so no "chọn Tất cả tuyến" text is shown.
  const emptyStateContent = useMemo(() => {
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
        description: `Ngày ${analysisDate} · BCVH ${bcvhName}. Đây là kết quả thật — tuyến này không có bưu gửi Không đạt trong bối cảnh hiện tại, không phải lỗi bộ lọc.`,
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
      description: `Ngày ${analysisDate} · BCVH ${bcvhName}. Không có bưu gửi Không đạt nào ở bất kỳ tuyến nào trong bối cảnh hiện tại.`,
      action: null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, routeIdParam, routeName, analysisDate, bcvhName]);

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

  // Violation group tabs — server-sourced counts only, never counted client-side.
  const violationTabsBar = (
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
  );

  // AC-16: the exact required summary line, only rendered while a keyword is active.
  const searchResultSummary = isSearchActive ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
      <p className="text-sm font-medium text-blue-900">
        {formatSearchResultSummary({ count: filteredRows.length, routeCount: groupedRows.length, keyword: search.trim() })}
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

  if (status === 'loading') {
    return (
      <PageContainer title="Evidence — Chi tiết bưu gửi vi phạm" subtitle="Đang tải dữ liệu Evidence.">
        <LoadingState label="Đang tải dữ liệu Evidence..." />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer title="Evidence — Chi tiết bưu gửi vi phạm" subtitle="Không thể tải dữ liệu Evidence.">
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
    );
  }

  const filterBar = (
    <GlobalFilterBar
      fromDate={fromDate}
      toDate={toDate}
      onFromDateChange={(value) => updateParam('from_date', value)}
      onToDateChange={(value) => updateParam('to_date', value)}
      bcvhValue={bcvhId}
      onBcvhChange={handleBcvhChange}
      bcvhOptions={bcvhOptions}
      searchValue={search}
      onSearchChange={(value) => updateParam('search', value)}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {routeSelector}
          <StatusBadge label={intervalLabel} tone="neutral" />
        </div>
      }
    />
  );

  if (!sortedRows.length) {
    return (
      <PageContainer title="Evidence — Chi tiết bưu gửi vi phạm" subtitle="Context/filter · nhóm vi phạm · bằng chứng chi tiết.">
        <div className="space-y-5">
          {filterBar}
          {violationTabsBar}
          <EmptyState
            title={emptyStateContent.title}
            description={emptyStateContent.description}
            action={emptyStateContent.action}
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Evidence — Chi tiết bưu gửi vi phạm"
      subtitle="Context/filter · nhóm vi phạm · bằng chứng chi tiết."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={`BCVH: ${bcvhName}`} tone="info" />
          <StatusBadge label={`Tuyến: ${routeName}`} tone="neutral" />
          <StatusBadge label={`Ngày: ${analysisDate}`} tone="success" />
        </div>
      }
    >
      <div className="space-y-5">
        {filterBar}

        {truncated && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Tập kết quả vượt giới hạn an toàn khi tải — một số bản ghi có thể chưa được hiển thị. Hãy thu hẹp bộ lọc (chọn một Tuyến cụ thể) để xem đầy đủ.
          </div>
        )}

        {searchResultSummary}

        <div className="grid gap-4 sm:grid-cols-3">
          <KPICard label="Tổng Evidence (bối cảnh)" value={contextTotal.toLocaleString('vi-VN')} delta="Trước tìm kiếm" tone="primary" />
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
          <div className="xl:col-span-2">
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
          </div>
          <div>
            <ShipmentEvidenceDetail shipment={selectedShipment} />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
