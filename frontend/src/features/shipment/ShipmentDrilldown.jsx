import { EmptyState, CardContainer } from '../../components/shared/SharedComponents';

export default function ShipmentDrilldown({ drilldownContext = [] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <CardContainer title="Evidence Drill-down">
        <EmptyState
          title="Evidence drill-down placeholder"
          description="Đây là khu vực điều hướng sang Evidence Center trong các ticket tiếp theo."
        />
      </CardContainer>
      <CardContainer title="Navigation Map">
        <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
          <p>Dashboard → BCVH Performance Center → Route Performance Center → Shipment Performance Center → Evidence Center</p>
          {drilldownContext.length > 0 ? drilldownContext.map((item) => <p key={item}>{item}</p>) : <p>Context placeholder</p>}
        </div>
      </CardContainer>
      <CardContainer title="Shared Layout Integration">
        <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
          <p>Đang dùng Shared Layout, Breadcrumb và Global Filter Bar của hệ thống.</p>
          <p>Không hardcode logic, không ảnh hưởng Route hay BCVH.</p>
        </div>
      </CardContainer>
    </div>
  );
}
