import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer, KPICard, SectionHeader, StatusBadge, LoadingState, ErrorState } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import f13DashboardClient from '../../api/F13DashboardClient';
import RouteExecutiveBrief from './RouteExecutiveBrief';
import RoutePriorityAnalysis from './RoutePriorityAnalysis';
import RouteRootCause from './RouteRootCause';
import RouteRecommendation from './RouteRecommendation';
import RouteDrilldown from './RouteDrilldown';

const BCVH_OPTIONS = [
  { value: 'all', label: 'Tất cả BCVH' },
  { value: 'BC_HUE01', label: 'BCVH TP Huế' },
  { value: 'BC_HUE02', label: 'BCVH Hương Thủy' },
  { value: 'BC_HUE03', label: 'BCVH Phú Lộc' },
];

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function RoutePerformancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [selectedRouteId, setSelectedRouteId] = useState('');

  const fromDate = searchParams.get('from_date') || '2026-06-23';
  const toDate = searchParams.get('to_date') || '2026-06-23';
  const interval = searchParams.get('interval') || 'daily';
  const bcvhId = searchParams.get('bcvh_id') || 'BC_HUE01';
  const bcvhName = searchParams.get('bcvh_name') || 'BCVH TP Huế';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'passed_rate';
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
    const fetchRoute = async () => {
      try {
        setStatus('loading');
        setError(null);
        const result = await f13DashboardClient.getRouteRanking(fromDate, bcvhId, 1, 1000, sort, order);
        if (!mounted) return;
        setRows(Array.isArray(result.data) ? result.data : []);
        setMeta(result.meta || {});
        const firstSelectable = (Array.isArray(result.data) ? result.data : []).find((item) => item?.id || item?.ma_tuyen);
        setSelectedRouteId((prev) => prev || firstSelectable?.id || firstSelectable?.ma_tuyen || '');
        setStatus('success');
      } catch (e) {
        if (!mounted) return;
        setError({ message: e.message || 'Không thể tải dữ liệu tuyến' });
        setStatus('error');
      }
    };

    if (fromDate && bcvhId) fetchRoute();
    return () => {
      mounted = false;
    };
  }, [bcvhId, fromDate, order, sort]);

  const intervalLabel = interval === 'daily' ? 'Một ngày' : interval === 'weekly' ? 'Theo tuần' : 'Lũy kế';

  const filteredRows = useMemo(() => {
    let list = [...rows];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => (item.name || item.ten_tuyen || item.code || '').toLowerCase().includes(q));
    }
    return list;
  }, [rows, search]);

  const visibleRows = useMemo(() => filteredRows.slice(0, 3), [filteredRows]);
  const selectedRow = useMemo(() => {
    if (!filteredRows.length) return null;
    return filteredRows.find((item) => (item.id || item.ma_tuyen) === selectedRouteId) || filteredRows[0];
  }, [filteredRows, selectedRouteId]);

  const summaryStats = useMemo(() => ([
    { label: 'Route theo dõi', value: toNumber(meta?.total_records || filteredRows.length || rows.length).toLocaleString('vi-VN'), delta: 'Runtime value', tone: 'primary' },
    { label: 'BCVH context', value: bcvhName, delta: bcvhId, tone: 'warning' },
    { label: 'Interval', value: intervalLabel, delta: 'URL state', tone: 'success' },
    { label: 'Search', value: search || 'N/A', delta: 'URL state', tone: 'danger' },
  ]), [bcvhId, bcvhName, filteredRows.length, intervalLabel, meta?.total_records, rows.length, search]);

  const executiveContext = [
    { label: 'BCVH', value: bcvhName },
    { label: 'Interval', value: intervalLabel },
    { label: 'Date Window', value: `${fromDate} → ${toDate}` },
  ];
  const impactItems = [
    { label: 'Coverage', value: `Routes: ${filteredRows.length || rows.length}` },
    { label: 'Selection', value: selectedRow?.name || selectedRow?.ten_tuyen || 'N/A' },
  ];
  const priorityItems = visibleRows.map((item) => ({
    label: item.name || item.ten_tuyen || item.code || 'Route',
    value: `${Number(item.passed_rate ?? item.kpi_2026 ?? 0).toFixed(1)}%`,
  }));
  const severityItems = [
    { label: 'High', tone: 'red' },
    { label: 'Medium', tone: 'amber' },
    { label: 'Low', tone: 'green' },
    { label: 'N/A', tone: 'neutral' },
  ];
  const rootCauseItems = [
    `• Runtime rows loaded: ${rows.length}`,
    `• Selected route: ${selectedRow ? (selectedRow.name || selectedRow.ten_tuyen) : 'N/A'}`,
    '• No extra backend calculation introduced',
  ];
  const recommendationItems = [
    { label: 'Ưu tiên xử lý', value: selectedRow ? (selectedRow.name || selectedRow.ten_tuyen) : 'Runtime recommendation placeholder' },
    { label: 'Lý do', value: selectedRow ? `Based on runtime score ${Number(selectedRow.passed_rate ?? selectedRow.kpi_2026 ?? 0).toFixed(1)}%` : 'Runtime rationale unavailable' },
  ];
  const drilldownContext = [
    `BCVH context: ${bcvhName}`,
    `Route context: ${selectedRow ? (selectedRow.name || selectedRow.ten_tuyen) : 'N/A'}`,
    `Date window: ${fromDate} → ${toDate}`,
    `Sort: ${sort}/${order}`,
  ];

  if (status === 'loading') {
    return (
      <PageContainer title="Route Performance Center" subtitle="Đang tải runtime-backed content cho Route.">
        <LoadingState label="Đang tải dữ liệu Route runtime..." />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer title="Route Performance Center" subtitle="Runtime-backed content chưa sẵn sàng.">
        <ErrorState description={error?.message} />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Route Performance Center"
      subtitle="Route runtime view theo kiến trúc đã Freeze."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Route Runtime" tone="info" />
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
              <StatusBadge label={BCVH_OPTIONS.find((item) => item.value === bcvhId)?.label || bcvhName} tone="info" />
              <StatusBadge label={intervalLabel} tone="neutral" />
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((item) => (
            <KPICard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
          ))}
        </div>

        <SectionHeader title="Executive Brief Area" subtitle="Khối executive mở đầu cho Route Performance Center." />
        <RouteExecutiveBrief
          fromDate={fromDate}
          toDate={toDate}
          bcvhName={bcvhName}
          executiveContext={executiveContext}
          impactItems={impactItems}
        />

        <SectionHeader title="Priority Analysis Area" subtitle="Khối ưu tiên tuyến cần điều hành trước." />
        <RoutePriorityAnalysis priorityItems={priorityItems} severityItems={severityItems} />

        <SectionHeader title="Root Cause Area" subtitle="Khối truy vết nguyên nhân và pattern theo tuyến." />
        <RouteRootCause rootCauseItems={rootCauseItems} trendLabel={`Route trend window: ${fromDate} → ${toDate}`} />

        <SectionHeader title="Recommendation Area" subtitle="Khối khuyến nghị và điều hướng xuống Shipment." />
        <RouteRecommendation
          recommendationItems={recommendationItems}
          drilldownLabel="Mở Shipment Performance Center"
        />

        <SectionHeader title="Shipment Drill-down Area" subtitle="Khu điều hướng sang Shipment Performance Center." />
        <RouteDrilldown
          drilldownContext={drilldownContext}
        />
      </div>
    </PageContainer>
  );
}
