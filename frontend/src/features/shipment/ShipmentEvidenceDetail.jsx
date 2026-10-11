import React from 'react';
import { AlertTriangle, Clock, Info } from 'lucide-react';
import { CardContainer, StatusBadge, EmptyState } from '../../components/shared/SharedComponents';

// Evidence-detail panel — Phase 2 rebuild (F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md
// Section 5): MERGE of the old ShipmentTimeline widget and REDESIGN of the old
// ShipmentRootCause widget into a single panel.
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

  const isFailed = shipment.status === 'Không đạt' || shipment.statusGroup === 'failed';
  const isDelayedCash = isFailed && shipment.violationReason === 'Chậm nộp tiền';
  const resultTone = shipment.status === 'Đạt' ? 'success' : shipment.status === 'Chuyển hoàn' ? 'neutral' : 'danger';

  return (
    <CardContainer
      title="Bằng chứng chi tiết"
      subtitle={`Mã bưu gửi ${shipment.shipmentId}`}
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">BCVH</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{shipment.bcvhName || 'N/A'}</p>
          </div>
          <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Tuyến</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{shipment.routeName || 'N/A'}</p>
          </div>
          <div className="rounded-xl bg-slate-50/80 border border-slate-100 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Ngày</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{shipment.analysisDate || 'N/A'}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={`Kết quả: ${shipment.status || 'N/A'}`} tone={resultTone} />
          {isFailed && shipment.violationReason ? (
            <StatusBadge
              label={`Nhóm vi phạm: ${shipment.violationReason}`}
              tone={isDelayedCash ? 'warning' : 'danger'}
            />
          ) : null}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-slate-800">
            <Clock size={15} className="text-slate-400" />
            Mốc thời gian
          </p>
          <div className="space-y-1.5 rounded-xl border border-slate-200/80 bg-white/60 p-3.5 text-sm shadow-2xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[var(--color-text-muted)] font-medium">PTC</span>
              <span className="font-mono text-xs font-semibold text-slate-800">{shipment.pickupTime || 'Chưa có dữ liệu'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[var(--color-text-muted)] font-medium">Nộp tiền</span>
              <span className="font-mono text-xs font-semibold text-slate-800">{shipment.handoverTime || 'Chưa có dữ liệu'}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-2 mt-1">
              <span className="text-[var(--color-text-muted)] font-medium">Độ trễ</span>
              <span className="font-mono text-xs font-bold text-rose-600">{isFailed ? (shipment.delayLabel || 'Chưa đủ dữ liệu') : '—'}</span>
            </div>
          </div>
          {isDelayedCash ? (
            <p className="mt-2.5 flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-xl">
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <span>Phân loại "Chậm nộp tiền" theo quy tắc thời gian nộp tiền vượt quá 3.0 giờ kể từ thời điểm PTC (RULE_F13_302).</span>
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-dashed border-slate-200 p-3.5 bg-slate-50/40">
          <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Info size={14} className="text-slate-400" />
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
