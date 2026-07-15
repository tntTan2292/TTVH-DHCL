import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer, KPICard, SectionHeader, StatusBadge } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import ShipmentExecutiveBrief from './ShipmentExecutiveBrief';
import ShipmentTimeline from './ShipmentTimeline';
import ShipmentRootCause from './ShipmentRootCause';
import ShipmentRecommendation from './ShipmentRecommendation';
import ShipmentDrilldown from './ShipmentDrilldown';

const SHIPMENT_OPTIONS = [
  { value: 'all', label: 'Tất cả shipment' },
];

export default function ShipmentPerformancePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const fromDate = searchParams.get('from_date') || '2026-06-23';
  const toDate = searchParams.get('to_date') || '2026-06-23';
  const interval = searchParams.get('interval') || 'daily';
  const bcvhId = searchParams.get('bcvh_id') || 'BC_HUE01';
  const bcvhName = searchParams.get('bcvh_name') || 'BCVH TP Huế';
  const routeId = searchParams.get('route_id') || 'R_HUE01_01';
  const routeName = searchParams.get('route_name') || 'Tuyến Phường Phú Hội';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'f13_303_rate';
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

  const intervalLabel = interval === 'daily' ? 'Một ngày' : interval === 'weekly' ? 'Theo tuần' : 'Lũy kế';
  const summaryStats = useMemo(() => ([
    { label: 'Shipment theo dõi', value: '06', delta: 'Shell value', tone: 'primary' },
    { label: 'BCVH context', value: bcvhName, delta: bcvhId, tone: 'warning' },
    { label: 'Route context', value: routeName, delta: routeId, tone: 'success' },
    { label: 'Sort', value: `${sort}/${order}`, delta: 'URL state', tone: 'danger' },
  ]), [bcvhId, bcvhName, order, routeId, routeName, sort]);

  const shipmentContext = [
    { label: 'BCVH', value: bcvhName },
    { label: 'Route', value: routeName },
    { label: 'Window', value: `${fromDate} → ${toDate}` },
  ];
  const routeContext = [
    { label: 'Interval', value: intervalLabel },
    { label: 'Search', value: search || 'N/A' },
  ];
  const timelineItems = [
    'Pickup placeholder',
    'Transit placeholder',
    'Delivery placeholder',
  ];
  const rootCauseItems = [
    '• Shipment root cause placeholder',
    '• No backend dependency',
    '• No KPI calculation',
  ];
  const evidenceContext = [
    `BCVH context: ${bcvhName}`,
    `Route context: ${routeName}`,
    `Sort/order: ${sort}/${order}`,
  ];
  const recommendationItems = [
    { label: 'Ưu tiên xử lý', value: routeName },
    { label: 'Lý do', value: `Based on context ${fromDate} → ${toDate}` },
  ];
  const drilldownContext = [
    `BCVH: ${bcvhName}`,
    `Route: ${routeName}`,
    `Shipment contract prepared for Evidence Center`,
  ];

  return (
    <PageContainer
      title="Shipment Performance Center"
      subtitle="Shipment shell của QIS V2. Dựng theo kiến trúc đã Freeze, chưa gắn runtime."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Shipment Shell" tone="info" />
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
        <ShipmentExecutiveBrief shipmentContext={shipmentContext} routeContext={routeContext} />

        <SectionHeader title="Shipment Timeline Area" subtitle="Khối timeline cho shipment." />
        <ShipmentTimeline timelineItems={timelineItems} />

        <SectionHeader title="Root Cause Area" subtitle="Khối nguyên nhân và evidence summary." />
        <ShipmentRootCause evidenceContext={evidenceContext} rootCauseItems={rootCauseItems} />

        <SectionHeader title="Recommendation Area" subtitle="Khối khuyến nghị và drill-down sang Evidence." />
        <ShipmentRecommendation
          recommendationItems={recommendationItems}
          drilldownLabel="Mở Evidence Center"
        />

        <SectionHeader title="Evidence Drill-down Area" subtitle="Chuẩn bị context cho Evidence Center." />
        <ShipmentDrilldown drilldownContext={drilldownContext} />
      </div>
    </PageContainer>
  );
}
