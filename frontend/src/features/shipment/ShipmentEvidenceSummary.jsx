import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { StandardTable, StatusBadge, EmptyState } from '../../components/shared/SharedComponents';

// Primary violation table — Phase 2 rebuild (F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md
// Section 5): KEEP + REDESIGN of the widget that used to hold the shipment candidate list.
// Two render modes:
//   - 'flat'    — no active search keyword: a single table of every row in the selected
//                 violation group, in the order supplied by the caller.
//   - 'grouped' — a keyword is active (AC-17/AC-18): every route the search matched
//                 appears as its own expandable group, keyed by real ma_tuyen (AC-22).
//                 ITR-EV-BLOCK-01 remediation (2026-09-07): `groups` is built by the caller
//                 from the server's whole-scope `matched_route_list`
//                 (`shipmentPerformanceData.js`'s `buildSearchRouteGroups`), NOT from only the
//                 rows on the current page — a group can therefore exist with `rows: []` and
//                 `group.status` of 'idle'/'loading'/'error' before its own rows have been
//                 fetched (one request per expanded route, §7.6/D-OPEN-03). This component
//                 does not know or care where `rows` came from; it only renders whatever the
//                 caller has loaded for that group so far.
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

// ITR2-BLOCK-01 remediation (Independent Re-Review, 2026-09-08): each expanded route group
// gets its own page control, driven by that route's own `pagination` meta (already scoped
// server-side to exactly this route — see evidenceQueryService.js). `page_size` stays 50
// (never widened); "Trang trước/sau" walks the route's own pages until every one of its rows
// has been reachable, and "Hiển thị 50/N" makes the partial render explicit instead of a
// silent truncation (Design §5.6 / P-03).
function RouteGroupPagination({ pagination, onPageChange }) {
  if (!pagination || !pagination.total_items) return null;
  const { page, page_size: pageSize, total_items: totalItems, total_pages: totalPages } = pagination;
  if (totalItems <= pageSize && totalPages <= 1) return null;

  const rangeStart = totalItems > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-surface-200)] bg-[var(--color-surface-50)] px-4 py-2">
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
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <ChevronLeft size={13} />
          <span>Trước</span>
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Trang sau của tuyến"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
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
