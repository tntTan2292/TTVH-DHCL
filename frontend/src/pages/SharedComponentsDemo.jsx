import {
  PageContainer,
  SectionHeader,
  KPICard,
  ExecutiveSummaryCard,
  RecommendationCard,
  StatusBadge,
  SeverityBadge,
  StandardTable,
  EmptyState,
  LoadingState,
  ErrorState,
} from '../components/shared/SharedComponents';

export default function SharedComponentsDemo() {
  const columns = [
    { key: 'name', label: 'Tên', render: (row) => <strong>{row.name}</strong> },
    { key: 'status', label: 'Trạng thái' },
    { key: 'score', label: 'Điểm', cellClassName: 'text-right', render: (row) => <span>{row.score}</span> },
  ];

  const rows = [
    { id: 1, name: 'BCVH Thuận Hóa', status: 'Active', score: '95.2%' },
    { id: 2, name: 'BCVH Hương Thủy', status: 'Monitor', score: '93.8%' },
  ];

  return (
    <PageContainer
      title="Shared Components Demo"
      subtitle="Trang kiểm thử nội bộ để xác nhận component foundation render độc lập."
      action={<StatusBadge label="Foundation Ready" tone="success" />}
    >
      <div className="space-y-6">
        <SectionHeader title="KPI / Summary / Recommendation" subtitle="Các card cốt lõi dùng chung cho Dashboard và Center." />
        <div className="grid gap-4 lg:grid-cols-3">
          <KPICard label="KPI F1.3" value="95.2%" delta="+1.3% so với hôm qua" trend="Up" />
          <ExecutiveSummaryCard
            title="Executive Summary"
            headline="Tổng quan tình hình đang ở mức ổn định."
            items={[
              { label: 'Đơn vị đạt', value: '8/12' },
              { label: 'Cần chú ý', value: '4' },
            ]}
          />
          <RecommendationCard
            title="Recommendation"
            recommendation="Ưu tiên rà soát nhóm BCVH có xu hướng giảm."
            rationale="Card chỉ hiển thị khuyến nghị, không chứa logic nghiệp vụ."
            priority="High"
          />
        </div>

        <SectionHeader title="Badges / Table" subtitle="Kiểm thử trạng thái hiển thị và bảng chuẩn." />
        <div className="flex flex-wrap gap-2">
          <StatusBadge label="Active" tone="success" />
          <StatusBadge label="Pending" tone="warning" />
          <SeverityBadge label="High" severity="High" />
          <SeverityBadge label="Medium" severity="Medium" />
        </div>
        <StandardTable columns={columns} rows={rows} emptyMessage="Không có bản ghi phù hợp" />

        <SectionHeader title="States" subtitle="Empty, loading, error state phải render độc lập." />
        <div className="grid gap-4 lg:grid-cols-3">
          <EmptyState title="Không có dữ liệu" description="Khối này dùng cho trạng thái rỗng tiêu chuẩn." />
          <LoadingState />
          <ErrorState title="Không tải được dữ liệu" description="Dùng để kiểm thử fallback khi API lỗi." />
        </div>
      </div>
    </PageContainer>
  );
}
