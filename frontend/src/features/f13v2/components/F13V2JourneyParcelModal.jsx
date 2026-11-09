import { useEffect, useState, useRef } from 'react';
import { X, Truck } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { fetchEvidenceList } from '../api/f13v2Api.js';
import { formatJourneyPostman } from '../journeyHelpers.js';
import F13V2EvidenceTable from './F13V2EvidenceTable.jsx';
import F13V2ParcelCard from './F13V2ParcelCard.jsx';

// F13-PARCEL-CARD-01 U1: Popup window displaying the shared evidence list in journey view
// for a clicked route + postman row for the active period. Reuses F13V2EvidenceTable.
export default function F13V2JourneyParcelModal({
  isOpen = false,
  onClose,
  row = null,
  periodQuery = {},
  periodLabel = '',
  catalog = null,
  layout = null,
  onAnalysisSuccess,
}) {
  const modalContentRef = useRef(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [{ page, pageSize }, setPagination] = useState({ page: 1, pageSize: 20 });
  const [sort] = useState({ field: 'tms_ptc', direction: 'desc' });
  const [selectedCardParcel, setSelectedCardParcel] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Reset page to 1 whenever a new row opens
  const rowKey = row ? (row.key || `${row.ma_tuyen}_${row.ma_buu_ta || 'none'}`) : null;
  const lastRowKeyRef = useRef(null);
  useEffect(() => {
    if (isOpen && rowKey && lastRowKeyRef.current !== rowKey) {
      lastRowKeyRef.current = rowKey;
      setPagination((prev) => (prev.page === 1 ? prev : { ...prev, page: 1 }));
    }
  }, [isOpen, rowKey]);

  // Main fetch effect calling GET /evidence/list?view=journey
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
    const bcvh = filter.ma_bcvh || row.ma_bcvh;

    fetchEvidenceList({
      ...periodQuery,
      view: 'journey',
      bcvh,
      route,
      postman,
      page,
      page_size: pageSize,
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
  }, [isOpen, row, periodQuery, page, pageSize, sort, reloadTick]);

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

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize) => {
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

        {/* Modal Body: reusing shared F13V2EvidenceTable in Hành trình view */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-center text-sm font-bold text-rose-800">
              {error}
            </div>
          ) : (
            <F13V2EvidenceTable
              inModal={true}
              view="journey"
              items={data?.items || []}
              meta={data?.meta || null}
              loading={loading}
              page={page}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onOpenCard={(item) => setSelectedCardParcel(item)}
              onOpenDetail={(item) => setSelectedCardParcel(item)}
            />
          )}
        </div>
      </div>

      {/* F13-PARCEL-CARD-01: Shared parcel card */}
      {selectedCardParcel && (
        <F13V2ParcelCard
          parcelKey={selectedCardParcel}
          catalog={catalog}
          layout={layout}
          initialTab="journey"
          onClose={() => setSelectedCardParcel(null)}
          onAnalysisSuccess={() => {
            setReloadTick((t) => t + 1);
            onAnalysisSuccess?.();
          }}
        />
      )}
    </div>
  );
}
