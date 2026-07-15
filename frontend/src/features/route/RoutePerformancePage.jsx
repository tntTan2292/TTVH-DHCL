import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer, KPICard, SectionHeader, StatusBadge } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
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

export default function RoutePerformancePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const fromDate = searchParams.get('from_date') || '2026-06-23';
  const toDate = searchParams.get('to_date') || '2026-06-23';
  const interval = searchParams.get('interval') || 'daily';
  const bcvhId = searchParams.get('bcvh_id') || 'BC_HUE01';
  const bcvhName = searchParams.get('bcvh_name') || 'BCVH TP Huế';
  const search = searchParams.get('search') || '';

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  const summaryStats = useMemo(() => ([
    { label: 'Route theo dõi', value: '08', delta: 'Shell value', tone: 'primary' },
    { label: 'BCVH context', value: bcvhName, delta: bcvhId, tone: 'warning' },
    { label: 'Interval', value: interval, delta: 'URL state', tone: 'success' },
    { label: 'Search', value: search || 'N/A', delta: 'URL state', tone: 'danger' },
  ]), [bcvhId, bcvhName, interval, search]);

  const intervalLabel = interval === 'daily' ? 'Một ngày' : interval === 'weekly' ? 'Theo tuần' : 'Lũy kế';

  return (
    <PageContainer
      title="Route Performance Center"
      subtitle="Route shell của QIS V2. Đang giữ đúng kiến trúc đã Freeze, chưa gắn API hay business logic."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Route Shell" tone="info" />
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
            <KPICard
              key={item.label}
              label={item.label}
              value={item.value}
              delta={item.delta}
              tone={item.tone}
            />
          ))}
        </div>

        <SectionHeader
          title="Executive Brief Area"
          subtitle="Khối executive mở đầu cho Route Performance Center."
        />
        <RouteExecutiveBrief
          fromDate={fromDate}
          toDate={toDate}
          bcvhName={bcvhName}
          intervalLabel={intervalLabel}
        />

        <SectionHeader
          title="Priority Analysis Area"
          subtitle="Khối ưu tiên tuyến cần điều hành trước."
        />
        <RoutePriorityAnalysis />

        <SectionHeader
          title="Root Cause Area"
          subtitle="Khối truy vết nguyên nhân và pattern theo tuyến."
        />
        <RouteRootCause />

        <SectionHeader
          title="Recommendation Area"
          subtitle="Khối khuyến nghị và điều hướng xuống Shipment."
        />
        <RouteRecommendation />

        <SectionHeader
          title="Shipment Drill-down Area"
          subtitle="Khu điều hướng sang Shipment Performance Center."
        />
        <RouteDrilldown />
      </div>
    </PageContainer>
  );
}
