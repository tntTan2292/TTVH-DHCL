import { useEffect, useState, useRef, useCallback } from 'react';
import { X, ExternalLink, Package, AlertCircle } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme } from '../../indicator/indicatorConfig.js';
import { fetchWhyParcels } from '../api/f13v2Api.js';
import { formatVolume } from '../f13v2Helpers.js';
import {
  formatCauseLabel,
  formatPhatDetail,
  formatChoChuyenQuanReason,
  formatRemainingAtArrival,
  formatPostmanName,
} from '../f13WhyHelpers.js';

export default function F13V2WhyParcelModal({
  isOpen = false,
  onClose,
  title = '',
  subtitle = '',
  filter = null,
  expectedCount = null,
}) {
  const modalContentRef = useRef(null);
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);

  const [parcels, setParcels] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ field: 'ngay_do_kiem', direction: 'desc' });
  // The sort in force when the list (re)opens: read through a ref so the open/filter effect depends only on what opens it.
  const sortRef = useRef(sort);
  sortRef.current = sort;

  const loadParcels = useCallback(async (targetPage, currentSort) => {
    if (!filter) return;
    setLoading(true);
    setError(null);

    const query = {
      ...filter,
      page: targetPage,
      page_size: 50,
      sort: currentSort.field,
      order: currentSort.direction,
    };

    try {
      const res = await fetchWhyParcels(query, indicator.apiBase);
      setParcels(res?.parcels || []);
      setMeta(res?.meta || null);
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể tải danh sách bưu gửi.');
    } finally {
      setLoading(false);
    }
  }, [filter, indicator.apiBase]);

  // Reset page when filter changes or modal opens
  useEffect(() => {
    if (isOpen && filter) {
      setPage(1);
      loadParcels(1, sortRef.current);
    } else {
      setParcels([]);
      setMeta(null);
      setError(null);
    }
  }, [isOpen, filter, loadParcels]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || (meta?.total_pages && newPage > meta.total_pages)) return;
    setPage(newPage);
    loadParcels(newPage, sort);
  };

  // Handle column sort
  const handleSort = (field) => {
    const nextDirection = sort.field === field && sort.direction === 'desc' ? 'asc' : 'desc';
    const nextSort = { field, direction: nextDirection };
    setSort(nextSort);
    loadParcels(page, nextSort);
  };

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

  if (!isOpen) return null;

  const totalCount = meta?.total ?? expectedCount ?? parcels.length;
  const totalPages = meta?.total_pages || 1;
  const startIdx = (page - 1) * (meta?.page_size || 50) + 1;
  const endIdx = Math.min(page * (meta?.page_size || 50), totalCount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalContentRef}
        className="relative flex flex-col w-full max-w-6xl max-h-[92vh] rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
      >
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/90 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 shadow-2xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  {title || 'Danh sách bưu gửi minh chứng'}
                </h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-black text-blue-800">
                  {formatVolume(totalCount)} bưu gửi
                </span>
              </div>
              {subtitle && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2" data-no-capture="true">
            <a
              href={`/f13/v2/evidence?${new globalThis.URLSearchParams(
                Object.fromEntries(
                  Object.entries(filter || {}).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'all')
                )
              ).toString()}`}
              title="Mở toàn bộ danh sách trong màn hình Dữ liệu minh chứng"
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors"
            >
              <span>Mở minh chứng</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <BlockCaptureButton
              targetRef={modalContentRef}
              blockTitle={title || 'Danh sách bưu gửi minh chứng'}
              dateOrPeriod={subtitle}
            />
            <button
              type="button"
              onClick={onClose}
              title="Đóng cửa sổ"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Error notice */}
        {error && (
          <div className="m-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Table Body */}
        <div className="flex-1 overflow-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span>Đang tải danh sách bưu gửi minh chứng...</span>
              </div>
            </div>
          ) : parcels.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center text-slate-400">
              <Package className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs font-medium">Không tìm thấy bưu gửi nào thỏa mãn điều kiện lọc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                    <th className="w-10 px-2 py-2 text-center border-r border-slate-200">STT</th>
                    <SortableTh
                      field="ma_bg"
                      sort={sort}
                      onSort={handleSort}
                      activeClassName={theme.sortActive}
                      className="w-32 px-2.5 py-2 text-left border-r border-slate-200"
                    >
                      Mã bưu gửi
                    </SortableTh>
                    <SortableTh
                      field="ngay_do_kiem"
                      sort={sort}
                      onSort={handleSort}
                      activeClassName={theme.sortActive}
                      className="w-24 px-2 py-2 text-center border-r border-slate-200"
                    >
                      Ngày đo
                    </SortableTh>
                    <SortableTh
                      field="ma_tuyen"
                      sort={sort}
                      onSort={handleSort}
                      activeClassName={theme.sortActive}
                      className="w-24 px-2 py-2 text-center border-r border-slate-200"
                    >
                      Tuyến
                    </SortableTh>
                    <SortableTh
                      field="ma_buu_ta_first"
                      sort={sort}
                      onSort={handleSort}
                      activeClassName={theme.sortActive}
                      className="min-w-[140px] px-2.5 py-2 text-left border-r border-slate-200"
                    >
                      Bưu tá bàn giao đầu
                    </SortableTh>
                    <SortableTh
                      field="danh_gia"
                      sort={sort}
                      onSort={handleSort}
                      activeClassName={theme.sortActive}
                      className="w-20 px-2 py-2 text-center border-r border-slate-200"
                    >
                      Đánh giá
                    </SortableTh>
                    <th className="min-w-[140px] px-2.5 py-2 text-left border-r border-slate-200">
                      Nguyên nhân chính
                    </th>
                    <th className="min-w-[160px] px-2.5 py-2 text-left border-r border-slate-200">
                      Chi tiết / Lý do
                    </th>
                    <th className="w-28 px-2 py-2 text-center border-r border-slate-200">
                      Đến BCVH
                    </th>
                    <th className="w-24 px-2 py-2 text-center" data-no-capture="true">
                      Hành trình
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parcels.map((p, idx) => {
                    const rowNum = (page - 1) * 50 + idx + 1;
                    const isPassed = p.danh_gia === 'Đạt';
                    const causeCode = p.cause?.code || p.cause_code;
                    const causeLabel = formatCauseLabel(causeCode);
                    const detail = p.cause?.detail || p.cause_detail;
                    const detailLabel = formatPhatDetail(detail);
                    const cqReason = p.cause_reason ? formatChoChuyenQuanReason(p.cause_reason) : '';
                    const postmanDisplay = formatPostmanName(p.ten_buu_ta_first, p.ma_buu_ta_first);
                    const journeyUrl = `/f13/v2/hanh-trinh?date=${p.ngay_do_kiem}&search=${p.ma_bg}&bcvh=${p.ma_bcvh || ''}`;

                    return (
                      <tr key={`${p.ma_bg}_${p.ngay_do_kiem}_${idx}`} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-2 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                          {rowNum}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-200">
                          <a
                            href={journeyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono font-bold text-blue-700 hover:text-blue-900 hover:underline flex items-center gap-1"
                            title="Mở hành trình bưu gửi cho ngày này"
                          >
                            <span>{p.ma_bg}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                          </a>
                        </td>
                        <td className="px-2 py-2 text-center font-medium text-slate-600 border-r border-slate-200 whitespace-nowrap">
                          {p.ngay_do_kiem}
                        </td>
                        <td className="px-2 py-2 text-center font-mono font-bold text-slate-700 border-r border-slate-200">
                          {p.ma_tuyen || p.route_scope || '—'}
                        </td>
                        <td className="px-2.5 py-2 text-slate-800 font-medium border-r border-slate-200">
                          <span className={p.ma_buu_ta_first ? 'font-semibold' : 'text-slate-400 italic'}>
                            {postmanDisplay}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-center border-r border-slate-200">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold border ${
                              isPassed
                                ? 'text-emerald-800 bg-emerald-50 border-emerald-200'
                                : 'text-rose-800 bg-rose-50 border-rose-200'
                            }`}
                          >
                            {p.danh_gia || '—'}
                          </span>
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-200">
                          {causeCode ? (
                            <span className="font-semibold text-slate-900">
                              {causeLabel}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2 text-slate-700 border-r border-slate-200">
                          {p.cause_status === 'CHO_CHUYEN_QUAN' && cqReason ? (
                            <span className="text-slate-800 font-medium">
                              Lý do: {cqReason}
                            </span>
                          ) : detail ? (
                            <span className="text-slate-800 font-medium">
                              {detailLabel}
                            </span>
                          ) : p.khong_tron_lo ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 border border-amber-200">
                              Không trọn lô {p.ma_lo ? `(${p.ma_lo})` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center border-r border-slate-200 text-slate-600 font-medium">
                          {formatRemainingAtArrival(p.remaining_at_arrival_ms)}
                        </td>
                        <td className="px-2 py-2 text-center" data-no-capture="true">
                          <a
                            href={journeyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50/80 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
                          >
                            <span>Hành trình</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer / Pagination */}
        <div
          data-no-capture="true"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-2.5 sm:px-5 text-xs text-slate-600"
        >
          <div>
            {totalCount > 0 && (
              <span>
                Hiển thị <strong>{startIdx}</strong> - <strong>{endIdx}</strong> trên tổng số{' '}
                <strong>{formatVolume(totalCount)}</strong> bưu gửi
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => handlePageChange(page - 1)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              &larr; Trang trước
            </button>
            <span className="px-2 font-bold text-slate-800">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => handlePageChange(page + 1)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Trang sau &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
