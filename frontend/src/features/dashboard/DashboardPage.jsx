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

const EXECUTIVE_SUMMARY = {
  title: 'Executive Summary',
  headline: 'Tổng quan điều hành của QIS V2.',
  items: [
    { label: 'Scope', value: 'Dashboard Shell' },
    { label: 'Status', value: 'Ready for widgets' },
  ],
};

const RECOMMENDATION = {
  recommendation: 'Ưu tiên theo dõi các BCVH nằm trong nhóm cần chú ý.',
  rationale: 'Recommendation chỉ là lớp hiển thị tối thiểu, không suy luận business mới.',
  priority: 'High',
};

const PLACEHOLDER_ROWS = [
  { id: 'nav-1', name: 'Executive Summary', status: 'Ready', score: 'Rendered' },
  { id: 'nav-2', name: 'Recommendation', status: 'Ready', score: 'Rendered' },
  { id: 'nav-3', name: 'Daily Brief', status: 'Ready', score: 'Rendered' },
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
    { key: 'status', label: 'Trạng thái', render: (row) => <StatusBadge label={row.status} tone="success" /> },
    { key: 'score', label: 'Giá trị', cellClassName: 'text-right', render: (row) => row.score },
  ];

  return (
    <PageContainer
      title="Executive Dashboard"
      subtitle="Dashboard Shell của QIS V2. Phần logic nghiệp vụ sẽ tiếp tục được bổ sung ở ticket sau."
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

        <SectionHeader title="Executive Header" subtitle="Khối đầu tiên của Dashboard, dùng widget placeholder có cấu trúc rõ ràng." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard label="KPI" value="--" delta="Placeholder" tone="primary" />
          <KPICard label="Đạt" value="--" delta="Placeholder" tone="success" />
          <KPICard label="Không đạt" value="--" delta="Placeholder" tone="danger" />
          <KPICard label="Xếp hạng" value="--" delta="Placeholder" tone="warning" />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <ExecutiveSummaryCard {...EXECUTIVE_SUMMARY} />
          <RecommendationCard title="Recommendation" {...RECOMMENDATION} />
        </div>

        <SectionHeader title="Daily Brief & Message" subtitle="Hai khu vực này hiển thị tối thiểu để giữ đúng shell." />
        <div className="grid gap-5 xl:grid-cols-2">
          <CardContainer title="Daily Brief">
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">Bản tin điều hành sẽ được thay bằng dữ liệu runtime ở ticket sau.</p>
              <p className="text-sm font-medium text-[var(--color-text-main)]">Current ticket only renders the shell and minimal widget structure.</p>
            </div>
          </CardContainer>
          <CardContainer title="Message">
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-text-muted)]">Khu vực message hiển thị placeholder để chuẩn bị gắn message runtime.</p>
              <p className="text-sm font-medium text-[var(--color-text-main)]">No extra business logic is introduced here.</p>
            </div>
          </CardContainer>
        </div>

        <SectionHeader title="Navigation Integration Table" subtitle="Bảng tích hợp điều hướng xác nhận shell đã sẵn sàng." />
        <div className="overflow-hidden rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm">
          <StandardTable columns={placeholderColumns} rows={PLACEHOLDER_ROWS} emptyMessage="Không có placeholder" />
        </div>

        <SectionHeader title="Widget Placeholder Summary" subtitle="Các vị trí widget còn lại đang ở mức nền, không hardcode business." />
        <div className="grid gap-5 xl:grid-cols-3">
          <CardContainer title="Widget Placeholder 1">
            <p className="text-sm text-[var(--color-text-muted)]">Executive first view.</p>
          </CardContainer>
          <CardContainer title="Widget Placeholder 2">
            <p className="text-sm text-[var(--color-text-muted)]">Recommendation surface.</p>
          </CardContainer>
          <CardContainer title="Widget Placeholder 3">
            <p className="text-sm text-[var(--color-text-muted)]">Message / integration surface.</p>
          </CardContainer>
        </div>
      </div>
    </PageContainer>
  );
}
