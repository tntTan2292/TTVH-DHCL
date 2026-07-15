import { EmptyState, CardContainer } from '../../components/shared/SharedComponents';

export default function RouteDrilldown({ drilldownContext = [] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <CardContainer title="Shipment Drill-down">
        <EmptyState
          title="Shipment drill-down placeholder"
          description="Đây là khu vực điều hướng sang Shipment Performance Center trong các ticket tiếp theo."
        />
      </CardContainer>
      <CardContainer title="Navigation Map">
        <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
          <p>Dashboard → BCVH Performance Center → Route Performance Center → Shipment Performance Center</p>
          {drilldownContext.length > 0 ? drilldownContext.map((item) => (
            <p key={item}>{item}</p>
          )) : <p>Context hiện tại chỉ là shell, chưa truyền dữ liệu nghiệp vụ.</p>}
        </div>
      </CardContainer>
      <CardContainer title="Shared Layout Integration">
        <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
          <p>Đang dùng Shared Layout, Breadcrumb và Global Filter Bar của hệ thống.</p>
          <p>Không hardcode logic, không ảnh hưởng BCVH.</p>
        </div>
      </CardContainer>
    </div>
  );
}
