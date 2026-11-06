import { useState, useMemo, useRef } from 'react';
import { Eye, Edit3, ExternalLink, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme } from '../../indicator/indicatorConfig.js';
import { formatCauseLabel, formatPhatDetail, formatChoChuyenQuanReason, formatPostmanName } from '../f13WhyHelpers.js';
import { formatAnalystCause, sortEvidenceInPage } from '../f13EvidenceHelpers.js';

export default function F13V2EvidenceTable({
  items = [],
  meta = null,
  catalog = null,
  loading = false,
  page = 1,
  onPageChange,
  onOpenDetail,
  onOpenAnalysis,
}) {
  const cardRef = useRef(null);
  const indicator = useIndicator();
  indicatorTheme(indicator);

  // Client-side in-page sort state (explicitly scoped to the current 50 rows)
  const [inPageSortField, setInPageSortField] = useState(null);
  const [inPageSortDir, setInPageSortDir] = useState('asc');

  const handleSortChange = (field) => {
    if (inPageSortField === field) {
      setInPageSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setInPageSortField(field);
      setInPageSortDir('asc');
    }
  };

  const displayedItems = useMemo(() => {
    if (!inPageSortField) return items;
    return sortEvidenceInPage(items, inPageSortField, inPageSortDir);
  }, [items, inPageSortField, inPageSortDir]);

  const total = meta?.total || 0;
  const totalPages = meta?.total_pages || 1;
  const pageSize = meta?.page_size || 50;

  return (
    <div
      ref={cardRef}
      className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-[box-shadow,border-color] duration-150 flex flex-col gap-3"
    >
      {/* Block Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">
              Danh sách Minh chứng Bưu gửi F1.3
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {total.toLocaleString('vi-VN')} bưu gửi
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Minh chứng nguồn gốc 5 mốc hành trình và kết luận phân tích (phân trang 50 dòng/trang)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <BlockCaptureButton
            targetRef={cardRef}
            title="Danh_sach_minh_chung_F13"
            ariaLabel="Chụp ảnh danh sách minh chứng"
          />
        </div>
      </div>

      {/* In-page sort indicator notice */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
        <span>
          * <strong className="text-slate-700">Sắp xếp trong trang:</strong> Bấm tiêu đề cột để sắp xếp 50 dòng đang xem. Thứ tự toàn bộ dữ liệu do máy chủ quản lý ({meta?.order === 'DATE' ? 'Theo ngày đo mới nhất' : 'Ưu tiên Chờ CQ & Chưa phân tích trước'}).
        </span>
        {inPageSortField && (
          <button
            type="button"
            onClick={() => {
              setInPageSortField(null);
              setInPageSortDir('asc');
            }}
            className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer shrink-0 ml-2"
          >
            Hủy sắp xếp trong trang
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-700 font-bold select-none">
              <th className="px-3 py-2.5 w-12 text-center">STT</th>
              <SortableTh
                columnKey="ma_bg"
                currentSort={inPageSortField}
                currentDirection={inPageSortDir}
                onSort={handleSortChange}
                className="px-3 py-2.5 font-bold"
              >
                Mã bưu gửi
              </SortableTh>
              <SortableTh
                columnKey="ngay_do_kiem"
                currentSort={inPageSortField}
                currentDirection={inPageSortDir}
                onSort={handleSortChange}
                className="px-3 py-2.5 font-bold"
              >
                Ngày đo
              </SortableTh>
              <SortableTh
                columnKey="ma_bcvh"
                currentSort={inPageSortField}
                currentDirection={inPageSortDir}
                onSort={handleSortChange}
                className="px-3 py-2.5 font-bold"
              >
                BCVH / Tuyến
              </SortableTh>
              <SortableTh
                columnKey="postman"
                currentSort={inPageSortField}
                currentDirection={inPageSortDir}
                onSort={handleSortChange}
                className="px-3 py-2.5 font-bold"
              >
                Bưu tá bàn giao đầu
              </SortableTh>
              <SortableTh
                columnKey="danh_gia"
                currentSort={inPageSortField}
                currentDirection={inPageSortDir}
                onSort={handleSortChange}
                className="px-3 py-2.5 font-bold text-center"
              >
                Đánh giá
              </SortableTh>
              <SortableTh
                columnKey="tct_hours"
                currentSort={inPageSortField}
                currentDirection={inPageSortDir}
                onSort={handleSortChange}
                className="px-3 py-2.5 font-bold text-right"
              >
                Giờ TCT / Hạn
              </SortableTh>
              <SortableTh
                columnKey="system_cause"
                currentSort={inPageSortField}
                currentDirection={inPageSortDir}
                onSort={handleSortChange}
                className="px-3 py-2.5 font-bold"
              >
                Nguyên nhân Hệ thống
              </SortableTh>
              <SortableTh
                columnKey="analyst_cause"
                currentSort={inPageSortField}
                currentDirection={inPageSortDir}
                onSort={handleSortChange}
                className="px-3 py-2.5 font-bold"
              >
                Kết luận Chuyên quản
              </SortableTh>
              <th className="px-3 py-2.5 text-center w-36 font-bold" data-no-capture="true">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Đang tải danh sách minh chứng...</span>
                  </div>
                </td>
              </tr>
            ) : displayedItems.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-500 italic">
                  Không tìm thấy bưu gửi nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              displayedItems.map((item, idx) => {
                const stt = (page - 1) * pageSize + idx + 1;
                const isFailed = item.danh_gia === 'Không đạt';
                const isPassed = item.danh_gia === 'Đạt';
                const sys = item.system || {};
                const anl = item.analysis;

                const canWrite = Boolean(catalog?.can?.write);
                const canAnalyse = Boolean(item.can_analyse);

                return (
                  <tr
                    key={`${item.ngay_do_kiem}_${item.ma_bg}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* STT */}
                    <td className="px-3 py-2.5 text-center text-slate-400 font-medium">
                      {stt}
                    </td>

                    {/* Mã BG & Lô */}
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                      <div>{item.ma_bg}</div>
                      {item.ma_lo && (
                        <div className="text-[10px] text-slate-500 font-sans font-normal mt-0.5">
                          Lô: {item.ma_lo}
                        </div>
                      )}
                    </td>

                    {/* Ngày đo */}
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                      {item.ngay_do_kiem}
                    </td>

                    {/* BCVH & Tuyến */}
                    <td className="px-3 py-2.5">
                      <div className="font-semibold text-slate-800">{item.ma_bcvh}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[120px]">
                        {item.ten_tuyen || item.ma_tuyen || '—'}
                      </div>
                    </td>

                    {/* Bưu tá bàn giao đầu */}
                    <td className="px-3 py-2.5 text-slate-700">
                      {formatPostmanName(item.ten_buu_ta_first, item.ma_buu_ta_first)}
                    </td>

                    {/* Đánh giá TCT */}
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      {isPassed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Đạt
                        </span>
                      ) : isFailed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          <AlertTriangle className="h-3 w-3" />
                          Không đạt
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          Chưa đánh giá
                        </span>
                      )}
                    </td>

                    {/* Giờ TCT / Hạn định */}
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        {item.tct?.tct_hours !== null && item.tct?.tct_hours !== undefined
                          ? `${item.tct.tct_hours}h`
                          : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Hạn: {item.tct?.limit_hours !== null && item.tct?.limit_hours !== undefined
                          ? `${item.tct.limit_hours}h`
                          : '—'}
                      </div>
                    </td>

                    {/* Nguyên nhân Hệ thống */}
                    <td className="px-3 py-2.5">
                      {sys.status === 'CHO_CHUYEN_QUAN' ? (
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-900">
                            Chờ Chuyên quản
                          </span>
                          {sys.reason && (
                            <div className="text-[10px] text-amber-800 mt-0.5">
                              {formatChoChuyenQuanReason(sys.reason)}
                            </div>
                          )}
                        </div>
                      ) : sys.label ? (
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800">
                            {formatCauseLabel(sys.code) || sys.label}
                          </span>
                          {sys.detail && (
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {formatPhatDetail(sys.detail)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    {/* Kết luận Chuyên quản */}
                    <td className="px-3 py-2.5">
                      {anl ? (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900">
                              {anl.label || formatAnalystCause(anl.cause)}
                            </span>
                            {anl.versus_system === 'SAME' && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                Trùng khớp HT
                              </span>
                            )}
                            {anl.versus_system === 'DIFFERENT' && (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                Khác kết luận HT
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Bởi: <strong className="text-slate-700">{anl.by}</strong>
                            {anl.position && ` (${anl.position})`}
                          </div>
                          {anl.note && (
                            <div className="text-[10px] text-slate-600 italic truncate max-w-[200px]" title={anl.note}>
                              &quot;{anl.note}&quot;
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Chưa phân tích</span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="px-3 py-2.5 text-center whitespace-nowrap" data-no-capture="true">
                      <div className="flex items-center justify-center gap-1">
                        {/* Chi tiết 5 mốc */}
                        <button
                          type="button"
                          onClick={() => onOpenDetail?.(item)}
                          title="Xem chi tiết 5 mốc hành trình và nguồn gốc"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Ghi phân tích: visible when catalog.can.write && item.can_analyse */}
                        {canWrite && canAnalyse && (
                          <button
                            type="button"
                            onClick={() => onOpenAnalysis?.(item)}
                            title="Ghi kết luận phân tích của Chuyên quản"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold transition-colors cursor-pointer text-[11px]"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>{anl ? 'Sửa' : 'Ghi'}</span>
                          </button>
                        )}

                        {/* Link to Hành trình */}
                        <a
                          href={`/f13/v2/hanh-trinh?date=${item.ngay_do_kiem}&search=${item.ma_bg}&bcvh=${item.ma_bcvh}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Mở chuyên đề Hành trình bưu gửi"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="text-slate-500">
          Hiển thị trang <strong className="text-slate-800">{page}</strong> / <strong className="text-slate-800">{totalPages}</strong> (Tổng cộng <strong className="text-slate-800">{total.toLocaleString('vi-VN')}</strong> bưu gửi theo bộ lọc)
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange?.(page - 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Trang trước</span>
          </button>

          <span className="px-3 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold">
            {page} / {totalPages}
          </span>

          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange?.(page + 1)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <span>Trang sau</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
