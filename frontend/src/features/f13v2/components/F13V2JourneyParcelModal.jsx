import { useEffect, useState, useRef } from 'react';
import { X, Truck } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { nextSortState } from '../../../components/common/tableSort.js';
import { fetchJourneyParcels } from '../api/f13v2Api.js';
import { formatJourneyPostman } from '../journeyHelpers.js';
import F13V2JourneyParcelTable from './F13V2JourneyParcelTable.jsx';

const TEXT_SORT_FIELDS = ['ma_bg', 'ten_buu_ta', 'danh_gia', 'ma_lo'];

// J8: Popup window displaying parcels of a clicked route + postman row for the active period.
export default function F13V2JourneyParcelModal({
  isOpen = false,
  onClose,
  row = null,
  periodQuery = {},
  periodLabel = '',
}) {
  const modalContentRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [{ page, pageSize }, setPagination] = useState({ page: 1, pageSize: 20 });
  const [sort, setSort] = useState({ field: 'tms_ptc', direction: 'desc' });

  // Reset page to 1 whenever a new row opens
  const rowKey = row ? (row.key || `${row.ma_tuyen}_${row.ma_buu_ta || 'none'}`) : null;
  const lastRowKeyRef = useRef(null);
  useEffect(() => {
    if (isOpen && rowKey && lastRowKeyRef.current !== rowKey) {
      lastRowKeyRef.current = rowKey;
      setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
    }
  }, [isOpen, rowKey]);

  // Main fetch effect (U2-R3: exactly one parcel request per page, pageSize, sort, or row change)
  useEffect(() => {
    if (!isOpen || !row) {
      setData(null);
      setError(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError(null);

    const filter = row.filter || {};
    const route = filter.route || row.ma_tuyen;
    const postman = filter.postman ?? (row.ma_buu_ta || (row.ma_buu_ta === null ? '@NONE' : undefined));
    const maBcvh = filter.ma_bcvh || row.ma_bcvh;

    fetchJourneyParcels({
      ...periodQuery,
      route,
      postman,
      maBcvh,
      page,
      pageSize,
      sort: sort.field,
      order: sort.direction,
    })
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) {
          setError(err?.response?.data?.error?.message || err?.message || 'Không thể tải danh sách bưu gửi của tuyến.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [isOpen, row, periodQuery, page, pageSize, sort]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    globalThis.addEventListener?.('keydown', handleKeyDown);
    return () => globalThis.removeEventListener?.('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !row) return null;

  const routeTitle = row.ten_tuyen || row.ma_tuyen || (
    row.route_scope === 'NON_POSTMAN' ? 'Phát tại quầy (khách đến nhận)' : 'Tuyến chưa xác định'
  );
  const postmanLabel = formatJourneyPostman(row);
  const totalCount = data?.meta?.total ?? row.volume ?? 0;

  const handleSort = (field) => {
    setSort((current) => nextSortState(current, field, { textFields: TEXT_SORT_FIELDS }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize) => {
    // U2-R3: set page and size in one state update, triggering exactly one request
    setPagination({ page: 1, pageSize: newSize });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalContentRef}
        className="relative flex flex-col w-full max-w-7xl max-h-[92vh] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-2xs">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Hành trình bưu gửi: {routeTitle}
                </h3>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-black text-blue-800">
                  {totalCount.toLocaleString('vi-VN')} bưu gửi
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Bưu tá: <strong className="text-slate-700">{postmanLabel}</strong> · {row.ten_bcvh || row.ma_bcvh} · {periodLabel}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2" data-no-capture="true">
            <BlockCaptureButton
              targetRef={modalContentRef}
              blockTitle={`Hanh_trinh_${row.ma_tuyen || row.route_scope || 'tuyen'}_${row.ma_buu_ta || 'ALL'}`}
              dateOrPeriod={periodLabel}
            />
            <button
              type="button"
              onClick={onClose}
              title="Đóng (Esc)"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: reusing F13V2JourneyParcelTable with inModal */}
        <div className="flex-1 overflow-y-auto p-4">
          <F13V2JourneyParcelTable
            inModal={true}
            data={data}
            loading={loading}
            error={error}
            periodLabel={periodLabel}
            routeName={routeTitle}
            sort={sort}
            onSort={handleSort}
            onPage={handlePageChange}
            pageSize={pageSize}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>
    </div>
  );
}
