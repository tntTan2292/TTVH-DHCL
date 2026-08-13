import { AlertTriangle, Clock, Info } from 'lucide-react';
import { CardContainer, StatusBadge, EmptyState } from '../../components/shared/SharedComponents';

// Evidence-detail panel — Phase 2 rebuild (F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md
// Section 5): MERGE of the old ShipmentTimeline widget and REDESIGN of the old
// ShipmentRootCause widget into a single panel. Populated ONLY on an explicit row
// selection (AC-15) — never auto-selected by a keyword search, and the caller (
// ShipmentPerformancePage) never seeds a default selection either.
export default function ShipmentEvidenceDetail({ shipment = null }) {
  if (!shipment) {
    return (
      <CardContainer title="Bằng chứng chi tiết">
        <EmptyState
          title="Chưa chọn bưu gửi"
          description="Chọn một bưu gửi để xem bằng chứng chi tiết."
        />
      </CardContainer>
    );
  }

  const isDelayedCash = shipment.violationReason === 'Chậm nộp tiền';
  const resultTone = shipment.status === 'Đạt' ? 'success' : 'danger';

  return (
    <CardContainer
      title="Bằng chứng chi tiết"
      subtitle={`Mã bưu gửi ${shipment.shipmentId}`}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[var(--color-surface-50)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">BCVH</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{shipment.bcvhName || 'N/A'}</p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-50)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Tuyến</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{shipment.routeName || 'N/A'}</p>
          </div>
          <div className="rounded-xl bg-[var(--color-surface-50)] p-3">
            <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Ngày</p>
            <p className="mt-1 text-sm font-semibold text-[var(--color-text-main)]">{shipment.analysisDate || 'N/A'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={`Kết quả: ${shipment.status || 'N/A'}`} tone={resultTone} />
          {shipment.violationReason ? (
            <StatusBadge
              label={`Nhóm vi phạm: ${shipment.violationReason}`}
              tone={isDelayedCash ? 'warning' : 'danger'}
            />
          ) : null}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-main)]">
            <Clock size={15} className="text-[var(--color-text-muted)]" />
            Mốc thời gian
          </p>
          <div className="space-y-1.5 rounded-xl border border-[var(--color-surface-200)] p-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[var(--color-text-muted)]">PTC</span>
              <span className="font-mono text-xs text-[var(--color-text-main)]">{shipment.pickupTime || 'Chưa có dữ liệu'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[var(--color-text-muted)]">Nộp tiền</span>
              <span className="font-mono text-xs text-[var(--color-text-main)]">{shipment.handoverTime || 'Chưa có dữ liệu'}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-[var(--color-surface-200)] pt-1.5">
              <span className="text-[var(--color-text-muted)]">Độ trễ</span>
              <span className="font-mono text-xs font-bold text-[var(--color-text-main)]">{shipment.delayLabel || 'N/A'}</span>
            </div>
          </div>
          {isDelayedCash ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-800">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-600" />
              Phân loại "Chậm nộp tiền" theo quy tắc thời gian nộp tiền vượt quá 3.0 giờ kể từ thời điểm PTC (RULE_F13_302).
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-dashed border-[var(--color-surface-200)] p-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-main)]">
            <Info size={15} className="text-[var(--color-text-muted)]" />
            Chuyển sang Action Center
          </p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Chưa khả dụng — Action Center chưa được triển khai trong hệ thống.
          </p>
        </div>
      </div>
    </CardContainer>
  );
}
