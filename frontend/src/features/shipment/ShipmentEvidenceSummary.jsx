import React from 'react';
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { StandardTable, StatusBadge, EmptyState } from '../../components/shared/SharedComponents';

// Primary violation table — Phase 2 rebuild (F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md
// Section 5): KEEP + REDESIGN of the widget that used to hold the shipment candidate list.
function buildColumns({ showRouteColumn, selectedShipmentId, onSelectShipment }) {
  const columns = [
    {
      key: 'shipmentId',
      label: 'Mã BG',
      render: (row) => (
        <button
          type="button"
          onClick={() => onSelectShipment?.(row.shipmentId)}
          className={`font-mono text-xs font-bold rounded-lg border px-2.5 py-1 transition-all cursor-pointer ${
            selectedShipmentId === row.shipmentId
              ? 'border-blue-400 bg-blue-50 text-[var(--color-vnpost-blue)] shadow-xs'
              : 'border-slate-200/80 bg-white/80 text-slate-800 hover:bg-slate-100 hover:border-slate-300'
          }`}
        >
          {row.shipmentId}
        </button>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row) => {
        const status = row.status || (row.statusGroup === 'passed' ? 'Đạt' : row.statusGroup === 'returned' ? 'Chuyển hoàn' : 'Không đạt');
        const tone = status === 'Đạt' ? 'success' : status === 'Chuyển hoàn' ? 'neutral' : 'danger';
        return <StatusBadge label={status} tone={tone} />;
      },
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
        if (row.status !== 'Không đạt' && row.statusGroup !== 'failed') return '—';
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
      render: (row) => {
        if (row.status !== 'Không đạt' && row.statusGroup !== 'failed') return '—';
        return row.delayLabel || 'Chưa đủ dữ liệu';
      },
    },
  );

  return columns;
}

function RouteGroupPagination({ pagination, onPageChange }) {
  if (!pagination || !pagination.total_items) return null;
  const { page, page_size: pageSize, total_items: totalItems, total_pages: totalPages } = pagination;
  if (totalItems <= pageSize && totalPages <= 1) return null;

  const rangeStart = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
      <span className="text-xs font-medium text-slate-600">
        Hiển thị <strong>{rangeStart}-{rangeEnd}</strong> / <strong>{totalItems.toLocaleString('vi-VN')}</strong> bưu gửi của tuyến này
      </span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 mr-1 font-medium">
          Trang <strong>{page}</strong> / <strong>{totalPages || 1}</strong>
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Trang trước của tuyến"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white cursor-pointer"
        >
          <ChevronLeft size={13} />
          <span>Trước</span>
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Trang sau của tuyến"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white cursor-pointer"
        >
          <span>Sau</span>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
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
  onRouteGroupPageChange = () => {},
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
            <div key={groupKey} className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xs shadow-2xs">
              <button
                type="button"
                onClick={() => onToggleRouteGroup(groupKey)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50/80 transition-colors cursor-pointer"
                aria-expanded={isExpanded}
              >
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  {isExpanded ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
                  {group.routeId ? `${group.routeId} - ${group.routeName}` : group.routeName}
                </span>
                <StatusBadge label={`${group.count} bưu gửi`} tone="info" />
              </button>
              {isExpanded ? (
                <div className="overflow-x-auto border-t border-slate-100">
                  <StandardTable
                    columns={columns.filter((c) => c.key !== 'routeName')}
                    rows={group.rows}
                    emptyMessage={
                      group.status === 'loading'
                        ? 'Đang tải bưu gửi của tuyến này...'
                        : group.status === 'error'
                          ? 'Không thể tải bưu gửi của tuyến này. Đóng và mở lại để thử lại.'
                          : 'Không có dữ liệu'
                    }
                    className="rounded-none border-none shadow-none"
                  />
                  <RouteGroupPagination
                    pagination={group.pagination}
                    onPageChange={(nextPage) => onRouteGroupPageChange(groupKey, nextPage)}
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
