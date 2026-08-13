import { ChevronDown, ChevronRight } from 'lucide-react';
import { StandardTable, StatusBadge, EmptyState } from '../../components/shared/SharedComponents';

// Primary violation table — Phase 2 rebuild (F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md
// Section 5): KEEP + REDESIGN of the widget that used to hold the shipment candidate list.
// Two render modes:
//   - 'flat'    — no active search keyword: a single table of every row in the selected
//                 violation group, in the order supplied by the caller.
//   - 'grouped' — a keyword is active (AC-17/AC-18): every route the search matched
//                 appears as its own expandable group, keyed by real ma_tuyen (AC-22).
// Neither mode ever selects a row on its own — selection only happens via an explicit
// click (AC-15), handled entirely by the caller.
function buildColumns({ showRouteColumn, selectedShipmentId, onSelectShipment }) {
  const columns = [
    {
      key: 'shipmentId',
      label: 'Mã BG',
      render: (row) => (
        <button
          type="button"
          onClick={() => onSelectShipment?.(row.shipmentId)}
          className={`font-mono text-xs font-bold rounded border px-2 py-0.5 transition-colors ${
            selectedShipmentId === row.shipmentId
              ? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
              : 'border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200'
          }`}
        >
          {row.shipmentId}
        </button>
      ),
    },
  ];

  if (showRouteColumn) {
    columns.push({
      key: 'routeName',
      label: 'Tuyến',
      className: 'hidden sm:table-cell',
      cellClassName: 'hidden sm:table-cell',
      render: (row) => (row.routeId ? `${row.routeId} - ${row.routeName}` : row.routeName || 'N/A'),
    });
  }

  columns.push(
    {
      key: 'violationReason',
      label: 'Lý do vi phạm',
      render: (row) => {
        const reason = row.violationReason || 'N/A';
        const isDelayedCash = reason === 'Chậm nộp tiền';
        return (
          <StatusBadge label={reason} tone={isDelayedCash ? 'warning' : 'danger'} />
        );
      },
    },
    {
      key: 'pickupTime',
      label: 'PTC',
      className: 'hidden sm:table-cell',
      cellClassName: 'hidden sm:table-cell font-mono text-xs',
      render: (row) => row.pickupTime || 'Chưa có dữ liệu',
    },
    {
      key: 'handoverTime',
      label: 'Nộp tiền',
      className: 'hidden sm:table-cell',
      cellClassName: 'hidden sm:table-cell font-mono text-xs',
      render: (row) => row.handoverTime || 'Chưa có dữ liệu',
    },
    {
      key: 'delayLabel',
      label: 'Độ trễ',
      cellClassName: 'font-mono text-xs font-bold',
    },
  );

  return columns;
}

export default function ShipmentEvidenceSummary({
  mode = 'flat',
  rows = [],
  groups = [],
  showRouteColumn = true,
  selectedShipmentId = '',
  onSelectShipment = () => {},
  expandedRouteIds = new Set(),
  onToggleRouteGroup = () => {},
}) {
  const columns = buildColumns({ showRouteColumn, selectedShipmentId, onSelectShipment });

  if (mode === 'grouped') {
    if (!groups.length) {
      return (
        <EmptyState
          title="Không có kết quả"
          description="Không có bưu gửi nào khớp với từ khóa trong bối cảnh hiện tại."
        />
      );
    }

    return (
      <div className="space-y-3">
        {groups.map((group) => {
          const groupKey = group.routeId || group.routeName;
          const isExpanded = expandedRouteIds.has(groupKey);
          return (
            <div key={groupKey} className="overflow-hidden rounded-xl border border-[var(--color-surface-200)] bg-white">
              <button
                type="button"
                onClick={() => onToggleRouteGroup(groupKey)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--color-surface-50)]"
                aria-expanded={isExpanded}
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-main)]">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  {group.routeId ? `${group.routeId} - ${group.routeName}` : group.routeName}
                </span>
                <StatusBadge label={`${group.count} bưu gửi`} tone="info" />
              </button>
              {isExpanded ? (
                <div className="overflow-x-auto border-t border-[var(--color-surface-200)]">
                  <StandardTable
                    columns={columns.filter((c) => c.key !== 'routeName')}
                    rows={group.rows}
                    className="rounded-none border-none shadow-none"
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <EmptyState
        title="Không có bưu gửi"
        description="Không có bưu gửi nào trong nhóm vi phạm đang chọn."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <StandardTable columns={columns} rows={rows} />
    </div>
  );
}
