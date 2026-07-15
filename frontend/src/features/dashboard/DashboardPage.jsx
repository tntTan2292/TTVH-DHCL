import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PageContainer,
  SectionHeader,
  CardContainer,
  KPICard,
  ExecutiveSummaryCard,
  RecommendationCard,
  StandardTable,
  StatusBadge,
} from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';

const BCVH_OPTIONS = [
  { value: 'all', label: 'Tất cả BCVH' },
  { value: 'BC_HUE01', label: 'BCVH TP Huế' },
  { value: 'BC_HUE02', label: 'BCVH Hương Thủy' },
  { value: 'BC_HUE03', label: 'BCVH Phú Lộc' },
];

const PLACEHOLDER_ROWS = [
  { id: 'ph-1', name: 'Executive Summary', status: 'Placeholder', score: 'N/A' },
  { id: 'ph-2', name: 'Daily Brief', status: 'Placeholder', score: 'N/A' },
  { id: 'ph-3', name: 'Recommendation', status: 'Placeholder', score: 'N/A' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const fromDate = searchParams.get('from_date') || '2026-06-23';
  const toDate = searchParams.get('to_date') || '2026-06-23';
  const interval = searchParams.get('interval') || 'daily';
  const kpi = searchParams.get('kpi') || 'all';
  const maBcvh = searchParams.get('ma_bcvh') || 'all';
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

  const placeholderColumns = [
    { key: 'name', label: 'Widget', render: (row) => <strong>{row.name}</strong> },
    { key: 'status', label: 'Trạng thái', render: (row) => <StatusBadge label={row.status} tone="warning" /> },
    { key: 'score', label: 'Giá trị', cellClassName: 'text-right', render: (row) => row.score },
  ];

  return (
    <PageContainer
      title="Executive Dashboard"
      subtitle="Dashboard Shell của QIS V2. Business logic, API và KPI calculation sẽ được gắn ở các ticket sau."
      action={
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-surface-200)] bg-white p-2 shadow-sm">
          <button
            onClick={() => navigate('/f13/ranking/bcvh')}
            className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-700)]"
          >
            Mở BCVH Ranking
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <GlobalFilterBar
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={(value) => updateParam('from_date', value)}
          onToDateChange={(value) => updateParam('to_date', value)}
          kpiValue={kpi}
          onKpiChange={(value) => updateParam('kpi', value)}
          bcvhValue={maBcvh}
          onBcvhChange={(value) => updateParam('ma_bcvh', value)}
          searchValue={search}
          onSearchChange={(value) => updateParam('search', value)}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={interval === 'daily' ? 'Daily' : interval === 'weekly' ? 'Weekly' : 'Monthly'} tone="info" />
              <StatusBadge label="Dashboard Shell" tone="success" />
            </div>
          }
        />

        <SectionHeader
          title="Executive Header"
          subtitle="Khối tổng quan đầu tiên, dùng placeholder để chuẩn bị gắn widget theo IA Freeze."
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard label="KPI" value="--" delta="Placeholder" tone="primary" />
          <KPICard label="Đạt" value="--" delta="Placeholder" tone="success" />
          <KPICard label="Không đạt" value="--" delta="Placeholder" tone="danger" />
          <KPICard label="Xếp hạng" value="--" delta="Placeholder" tone="warning" />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <ExecutiveSummaryCard
            title="Executive Summary"
            headline="Placeholder widget dành cho Executive Brief và Summary."
            items={[
              { label: 'Current State', value: 'Placeholder' },
              { label: 'Next Step', value: 'Pending ticket' },
            ]}
          />
          <RecommendationCard
            title="Recommendation"
            recommendation="Placeholder recommendation card cho Dashboard Shell."
            rationale="Business logic và recommendation engine sẽ được gắn ở ticket sau."
            priority="High"
          />
        </div>

        <SectionHeader
          title="Widget Placeholder"
          subtitle="Các khối này xác nhận shell đã sẵn sàng cho widget thực sự."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <CardContainer title="Daily Brief Placeholder">
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">Bản tin điều hành nhanh sẽ được gắn sau.</p>
              <p className="text-sm text-[var(--color-text-main)] font-medium">No business logic in this ticket.</p>
            </div>
          </CardContainer>
          <CardContainer title="Recommendation / Message Placeholder">
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">Message generation và recommendation chỉ là placeholder tại shell level.</p>
              <p className="text-sm text-[var(--color-text-main)] font-medium">Reusable shell only.</p>
            </div>
          </CardContainer>
        </div>

        <SectionHeader
          title="Navigation Integration"
          subtitle="Đường đi tới ranking và các center đã sẵn sàng."
        />
        <div className="overflow-hidden rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm">
          <StandardTable
            columns={placeholderColumns}
            rows={PLACEHOLDER_ROWS}
            emptyMessage="Không có placeholder"
          />
        </div>
      </div>
    </PageContainer>
  );
}
