import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer, KPICard, SectionHeader, StatusBadge, LoadingState, ErrorState, EmptyState } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import f13DashboardClient from '../../api/F13DashboardClient';
import ShipmentExecutiveBrief from './ShipmentExecutiveBrief';
import ShipmentImpactOverview from './ShipmentImpactOverview';
import ShipmentTimeline from './ShipmentTimeline';
import ShipmentRootCause from './ShipmentRootCause';
import ShipmentEvidenceSummary from './ShipmentEvidenceSummary';
import ShipmentRecommendation from './ShipmentRecommendation';
import ShipmentDrilldown from './ShipmentDrilldown';

const SHIPMENT_OPTIONS = [
  { value: 'all', label: 'Tất cả shipment' },
];

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

function calculateDelayHours(ptc, nopTien, extendedData) {
  if (extendedData && typeof extendedData === 'object') {
    const delay = extendedData.do_tre_gio ?? extendedData.delay_hours ?? extendedData.delayHours;
    if (delay !== undefined && delay !== null && delay !== '') {
      return Number(delay);
    }
  }

  if (!ptc || !nopTien) return null;
  const ptcDate = new Date(ptc);
  const nopTienDate = new Date(nopTien);
  if (Number.isNaN(ptcDate.getTime()) || Number.isNaN(nopTienDate.getTime())) return null;
  return Number(((nopTienDate - ptcDate) / (1000 * 60 * 60)).toFixed(1));
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

  const fromDate = searchParams.get('from_date') || '2026-06-23';
  const toDate = searchParams.get('to_date') || '2026-06-23';
  const interval = searchParams.get('interval') || 'daily';
  const bcvhId = searchParams.get('bcvh_id') || 'BC_HUE01';
  const bcvhName = searchParams.get('bcvh_name') || 'BCVH TP Huế';
  const routeId = searchParams.get('route_id') || 'R_HUE01_01';
  const routeName = searchParams.get('route_name') || 'Tuyến Phường Phú Hội';
  const shipmentId = searchParams.get('shipment_id') || '';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'delay_hours';
  const order = searchParams.get('order') || 'asc';

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  useEffect(() => {
    let mounted = true;

    const fetchShipmentRuntime = async () => {
      try {
        setStatus('loading');
        setError(null);

        const result = await f13DashboardClient.getShipmentEvidenceList(fromDate, bcvhId, routeId, 1, 1000);
        if (!mounted) return;

        const rows = Array.isArray(result?.data) ? result.data : [];
        const mappedRows = rows.map((item) => {
          const shipmentKey = item.ma_bg || item.id || item.shipment_id || 'N/A';
          const delayHours = calculateDelayHours(item.thoi_gian_ptc, item.thoi_gian_nop_tien, item.extended_data);

          return {
            id: shipmentKey,
            shipmentId: shipmentKey,
            shipmentName: item.ten_bg || shipmentKey,
            bcvhId: item.ma_bcvh || bcvhId,
            bcvhName: item.ten_bcvh || bcvhName,
            routeId: item.ma_tuyen || routeId,
            routeName: item.ten_tuyen || routeName,
            status: item.ket_qua_f13 || 'Không đạt',
            pickupTime: item.thoi_gian_ptc || null,
            handoverTime: item.thoi_gian_nop_tien || null,
            delayHours,
            delayLabel: delayHours === null ? 'N/A' : `${delayHours.toFixed(1)}h`,
            extendedData: item.extended_data || {},
          };
        });

        setRuntimeRows(mappedRows);
        setMeta(result?.meta || {});
        setStatus('success');
      } catch (e) {
        if (!mounted) return;
        setError({ message: e.message || 'Không thể tải dữ liệu shipment' });
        setStatus('error');
      }
    };

    if (fromDate && bcvhId && routeId) {
      fetchShipmentRuntime();
    }

    return () => {
      mounted = false;
    };
  }, [bcvhId, bcvhName, fromDate, routeId, routeName]);

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
    { label: 'Shipment runtime', value: toNumber(meta?.totalItems || sortedRows.length || runtimeRows.length).toLocaleString('vi-VN'), delta: 'Runtime value', tone: 'primary' },
    { label: 'BCVH context', value: bcvhName, delta: bcvhId, tone: 'warning' },
    { label: 'Route context', value: routeName, delta: routeId, tone: 'success' },
    { label: 'Selected shipment', value: selectedShipment?.shipmentId || 'N/A', delta: selectedShipment?.status || 'N/A', tone: 'danger' },
  ]), [bcvhId, bcvhName, meta?.totalItems, runtimeRows.length, routeId, routeName, selectedShipment, sortedRows.length]);

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
    `Source: runtime evidence-list`,
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

  if (status === 'loading') {
    return (
      <PageContainer title="Shipment Performance Center" subtitle="Đang tải runtime-backed content cho Shipment.">
        <LoadingState label="Đang tải dữ liệu Shipment runtime..." />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer title="Shipment Performance Center" subtitle="Runtime-backed content chưa sẵn sàng.">
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
      <PageContainer title="Shipment Performance Center" subtitle="Runtime-backed content theo kiến trúc đã Freeze.">
        <div className="space-y-5">
          <GlobalFilterBar
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={(value) => updateParam('from_date', value)}
            onToDateChange={(value) => updateParam('to_date', value)}
            bcvhValue={bcvhId}
            onBcvhChange={(value) => updateParam('bcvh_id', value)}
            searchValue={search}
            onSearchChange={(value) => updateParam('search', value)}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={SHIPMENT_OPTIONS[0].label} tone="info" />
                <StatusBadge label={intervalLabel} tone="neutral" />
              </div>
            }
          />
          <EmptyState
            title="Không có shipment runtime"
            description="Không tìm thấy shipment nào phù hợp với context hiện tại. Hãy đổi bộ lọc hoặc kiểm tra nguồn dữ liệu."
          />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Shipment Performance Center"
      subtitle="Shipment runtime view theo kiến trúc đã Freeze."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Shipment Runtime" tone="info" />
          <StatusBadge label={intervalLabel} tone="success" />
          <StatusBadge label="Shared Layout Ready" tone="neutral" />
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
          onBcvhChange={(value) => updateParam('bcvh_id', value)}
          searchValue={search}
          onSearchChange={(value) => updateParam('search', value)}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={SHIPMENT_OPTIONS[0].label} tone="info" />
              <StatusBadge label={intervalLabel} tone="neutral" />
            </div>
          }
        />

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
