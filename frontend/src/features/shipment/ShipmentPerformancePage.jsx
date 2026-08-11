import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter } from 'lucide-react';
import { PageContainer, KPICard, SectionHeader, StatusBadge, LoadingState, ErrorState, EmptyState } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import f13DashboardClient from '../../api/F13DashboardClient';
import { resolveDefaultRouteDate } from '../route/routeRankingCalculations';
import ShipmentExecutiveBrief from './ShipmentExecutiveBrief';
import ShipmentImpactOverview from './ShipmentImpactOverview';
import ShipmentTimeline from './ShipmentTimeline';
import ShipmentRootCause from './ShipmentRootCause';
import ShipmentEvidenceSummary from './ShipmentEvidenceSummary';
import ShipmentRecommendation from './ShipmentRecommendation';
import ShipmentDrilldown from './ShipmentDrilldown';
import { calculateDelayHours, fetchAllEvidenceRows } from './shipmentPerformanceData';

const ALL_ROUTES_OPTION = { value: '', label: 'Tất cả tuyến' };

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toText(value, fallback = 'N/A') {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value);
}

function formatTime(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('vi-VN');
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
  const [truncated, setTruncated] = useState(false);

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
    updateParams({ route_id: value, route_name: value ? (option?.label || '') : '' });
  };

  // Fetches the complete matching Evidence set for the current date/BCVH/route — walks every
  // backend page instead of the previous single hardcoded pageSize=1000 request, so search,
  // sort, and counts below always reflect the full result, never a silently truncated slice.
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
        );
        const result = await fetchAllEvidenceRows(fetchPage);
        if (!mounted) return;

        const mappedRows = result.rows.map((item) => {
          const shipmentKey = item.ma_bg || item.id || item.shipment_id || 'N/A';
          const delayHours = calculateDelayHours(item.thoi_gian_ptc, item.thoi_gian_nop_tien, item.extended_data);

          return {
            id: shipmentKey,
            shipmentId: shipmentKey,
            shipmentName: item.ten_bg || shipmentKey,
            bcvhId: item.ma_bcvh || bcvhId,
            bcvhName: item.ten_bcvh || bcvhName,
            routeId: item.ma_tuyen || routeIdParam,
            routeName: item.ten_tuyen || routeName,
            status: item.danh_gia_2026 || 'Không đạt',
            pickupTime: item.thoi_gian_ptc || null,
            handoverTime: item.thoi_gian_nop_tien || null,
            delayHours,
            delayLabel: delayHours === null ? 'N/A' : `${delayHours.toFixed(1)}h`,
            extendedData: item.extended_data || {},
          };
        });

        setRuntimeRows(mappedRows);
        setMeta(result.meta || {});
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
    // when the actual query (date/BCVH/route) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisDate, bcvhId, routeIdParam, metaStatus]);

  const intervalLabel = interval === 'daily' ? 'Một ngày' : interval === 'weekly' ? 'Theo tuần' : 'Lũy kế';

  const filteredRows = useMemo(() => {
    let list = [...runtimeRows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => (
        [item.shipmentId, item.shipmentName, item.routeName, item.routeId, item.bcvhName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      ));
    }
    return list;
  }, [runtimeRows, search]);

  const sortedRows = useMemo(() => sortShipmentRows(filteredRows, sort, order), [filteredRows, order, sort]);

  const selectedShipment = useMemo(() => {
    if (!sortedRows.length) return null;
    return sortedRows.find((item) => item.shipmentId === shipmentId) || sortedRows[0] || null;
  }, [shipmentId, sortedRows]);

  useEffect(() => {
    if (!sortedRows.length) return;
    if (shipmentId && sortedRows.some((item) => item.shipmentId === shipmentId)) return;
    const firstSelectable = sortedRows[0];
    if (firstSelectable?.shipmentId) {
      updateParam('shipment_id', firstSelectable.shipmentId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shipmentId, sortedRows]);

  const summaryStats = useMemo(() => ([
    { label: 'Evidence runtime', value: toNumber(meta?.pagination?.total_items ?? sortedRows.length ?? runtimeRows.length).toLocaleString('vi-VN'), delta: 'Toàn bộ tập kết quả', tone: 'primary' },
    { label: 'BCVH context', value: bcvhName || 'N/A', delta: bcvhId || 'N/A', tone: 'warning' },
    { label: 'Route context', value: routeName, delta: routeIdParam || ALL_ROUTES_OPTION.label, tone: 'success' },
    { label: 'Selected shipment', value: selectedShipment?.shipmentId || 'N/A', delta: selectedShipment?.status || 'N/A', tone: 'danger' },
  ]), [bcvhId, bcvhName, meta?.pagination?.total_items, routeIdParam, routeName, runtimeRows.length, selectedShipment, sortedRows.length]);

  const shipmentContext = [
    { label: 'Shipment ID', value: selectedShipment?.shipmentId || 'N/A' },
    { label: 'BCVH', value: selectedShipment?.bcvhName || bcvhName },
    { label: 'Route', value: selectedShipment?.routeName || routeName },
    { label: 'Result', value: selectedShipment?.status || 'N/A' },
  ];

  const impactContext = [
    { label: 'Delay', value: selectedShipment?.delayLabel || 'N/A' },
    { label: 'Search', value: search || 'N/A' },
    { label: 'Runtime rows', value: toNumber(sortedRows.length).toLocaleString('vi-VN') },
  ];

  const timelineItems = selectedShipment
    ? [
        `Shipment: ${selectedShipment.shipmentId}`,
        `Pickup: ${formatTime(selectedShipment.pickupTime)}`,
        `Handover: ${formatTime(selectedShipment.handoverTime)}`,
        `Delay: ${selectedShipment.delayLabel || 'N/A'}`,
        `Status: ${selectedShipment.status}`,
      ]
    : ['No shipment selected'];

  const rootCauseItems = selectedShipment
    ? [
        `• Shipment ${selectedShipment.shipmentId} is the active runtime selection`,
        `• Route context: ${selectedShipment.routeName}`,
        `• Delay signal: ${selectedShipment.delayLabel || 'N/A'}`,
      ]
    : ['• No runtime shipment data'];

  const evidenceContext = [
    `Source: runtime evidence-list (full result set)`,
    `BCVH context: ${bcvhName}`,
    `Route context: ${routeName}`,
    `Sort/order: ${sort}/${order}`,
  ];

  const recommendationItems = selectedShipment
    ? [
        { label: 'Ưu tiên xử lý', value: selectedShipment.shipmentId },
        { label: 'Lý do', value: `Delay ${selectedShipment.delayLabel || 'N/A'} on ${selectedShipment.routeName}` },
      ]
    : [
        { label: 'Ưu tiên xử lý', value: 'N/A' },
        { label: 'Lý do', value: 'Chưa có shipment runtime hợp lệ' },
      ];

  const drilldownContext = [
    `BCVH: ${bcvhName}`,
    `Route: ${routeName}`,
    `Shipment: ${selectedShipment?.shipmentId || 'N/A'}`,
    `Shipment contract prepared for Evidence Center`,
    `Date window: ${fromDate} → ${toDate}`,
    `Sort: ${sort}/${order}`,
  ];

  const handleSelectShipment = (nextShipmentId) => {
    updateParam('shipment_id', nextShipmentId);
  };

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

  if (status === 'loading') {
    return (
      <PageContainer title="Evidence — Chi tiết bưu gửi" subtitle="Đang tải runtime-backed content cho Evidence.">
        <LoadingState label="Đang tải dữ liệu Evidence..." />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer title="Evidence — Chi tiết bưu gửi" subtitle="Runtime-backed content chưa sẵn sàng.">
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

  if (!sortedRows.length) {
    return (
      <PageContainer title="Evidence — Chi tiết bưu gửi" subtitle="Runtime-backed content theo kiến trúc đã Freeze.">
        <div className="space-y-5">
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
          <EmptyState
            title="Không có Evidence phù hợp"
            description="Không tìm thấy bưu gửi Không đạt nào phù hợp với ngày/BCVH/tuyến hiện tại. Hãy đổi bộ lọc hoặc chọn 'Tất cả tuyến'."
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Evidence — Chi tiết bưu gửi"
      subtitle="Evidence runtime view theo kiến trúc đã Freeze."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Evidence Runtime" tone="info" />
          <StatusBadge label={intervalLabel} tone="success" />
          <StatusBadge label={`Ngày: ${analysisDate}`} tone="neutral" />
        </div>
      }
    >
      <div className="space-y-5">
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

        {truncated && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Tập kết quả vượt giới hạn an toàn khi tải — một số bản ghi có thể chưa được hiển thị. Hãy thu hẹp bộ lọc (chọn một Tuyến cụ thể) để xem đầy đủ.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((item) => (
            <KPICard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
          ))}
        </div>

        <SectionHeader title="Executive Brief Area" subtitle="Khối dẫn nhập điều hành cấp shipment." />
        <div className="grid gap-5 xl:grid-cols-2">
          <ShipmentExecutiveBrief shipmentContext={shipmentContext} />
          <ShipmentImpactOverview impactItems={impactContext} />
        </div>

        <SectionHeader title="Shipment Analysis Area" subtitle="Khối timeline và nguyên nhân cho shipment." />
        <div className="grid gap-5 xl:grid-cols-2">
          <ShipmentTimeline timelineItems={timelineItems} />
          <ShipmentRootCause rootCauseItems={rootCauseItems} />
        </div>

        <SectionHeader title="Evidence Summary Area" subtitle="Khối evidence readiness, selection và recommendation." />
        <div className="grid gap-5 xl:grid-cols-2">
          <ShipmentEvidenceSummary
            evidenceContext={evidenceContext}
            shipmentRows={sortedRows}
            selectedShipmentId={selectedShipment?.shipmentId || ''}
            onSelectShipment={handleSelectShipment}
          />
          <ShipmentRecommendation recommendationItems={recommendationItems} />
        </div>

        <SectionHeader title="Evidence Drill-down Area" subtitle="Chuẩn bị context cho Evidence Center." />
        <ShipmentDrilldown drilldownContext={drilldownContext} />
      </div>
    </PageContainer>
  );
}
