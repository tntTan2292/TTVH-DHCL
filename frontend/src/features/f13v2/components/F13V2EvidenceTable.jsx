import { useState, useMemo, useRef } from 'react';
import { Eye, Edit3, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme } from '../../indicator/indicatorConfig.js';
import { formatCauseLabel, formatPhatDetail, formatChoChuyenQuanReason, formatPostmanName } from '../f13WhyHelpers.js';
import { formatAnalystCause, sortEvidenceInPage, formatJourneyLegHours, getMilestoneAt } from '../f13EvidenceHelpers.js';

export default function F13V2EvidenceTable({
  items = [],
  meta = null,
  catalog = null,
  loading = false,
  page = 1,
  pageSize = 20,
  view = 'cause', // 'cause' | 'journey'
  onViewChange,
  onPageChange,
  onPageSizeChange,
  onOpenDetail,
  onOpenCard,
  onOpenAnalysis,
  inModal = false,
  title = '',
  subtitle = '',
}) {
  const cardRef = useRef(null);
  const indicator = useIndicator();
  indicatorTheme(indicator);

  // Client-side in-page sort state (explicitly scoped to the current page rows)
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
  const activePageSize = meta?.page_size || pageSize || 20;

  const handleOpenParcel = (item, tab) => {
    if (onOpenCard) {
      onOpenCard(item, tab);
    } else if (onOpenDetail) {
      onOpenDetail(item);
    }
  };

  const isJourney = view === 'journey';

  return (
    <div
      ref={cardRef}
      className={`rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-[box-shadow,border-color] duration-150 flex flex-col gap-3 ${
        inModal ? 'border-none p-0 shadow-none' : ''
      }`}
    >
      {/* Block Header */}
      {!inModal && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900">
                {title || 'Danh sách Minh chứng Bưu gửi F1.3'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                {total.toLocaleString('vi-VN')} bưu gửi
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {subtitle || `Minh chứng nguồn gốc 5 mốc hành trình và kết luận phân tích (phân trang ${activePageSize} dòng/trang)`}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap" data-no-capture="true">
            {/* View Switcher: C2 (Nguyên nhân / Hành trình) */}
            {onViewChange && (
              <div className="inline-flex p-1 rounded-xl bg-slate-100/90 border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => onViewChange('cause')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    !isJourney
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nguyên nhân
                </button>
                <button
                  type="button"
                  onClick={() => onViewChange('journey')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    isJourney
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hành trình
                </button>
              </div>
            )}

            <BlockCaptureButton
              targetRef={cardRef}
              blockTitle={isJourney ? 'Hanh_trinh_buu_gui_F13' : 'Danh_sach_minh_chung_F13'}
            />
          </div>
        </div>
      )}

      {/* In-page sort indicator notice */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
        <span>
          * <strong className="text-slate-700">Sắp xếp trong trang:</strong> Bấm tiêu đề cột để sắp xếp {activePageSize} dòng đang xem. Thứ tự toàn bộ dữ liệu do máy chủ quản lý ({meta?.order === 'SORT' ? 'Theo cột đã chọn' : meta?.order === 'DATE' ? 'Theo ngày đo mới nhất' : 'Ưu tiên Chờ CQ & Chưa phân tích trước'}).
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
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            {isJourney ? (
              // HÀNH TRÌNH VIEW HEADERS (C2: Số hiệu, Ngày, Bưu tá, Đánh giá, Mã lô, 5 mốc, 6 chặng, Số giờ TCT)
              <>
                <tr className="border-b border-slate-200 bg-slate-100/90 text-slate-700 text-[11px] font-bold select-none uppercase tracking-tight">
                  <th colSpan={6} className="border-r border-slate-200 px-2 py-1.5 text-center bg-slate-100">
                    Thông tin bưu gửi & Lô
                  </th>
                  <th colSpan={5} className="border-r border-slate-200 px-2 py-1.5 text-center bg-blue-100/60 text-blue-900">
                    5 Mốc hành trình
                  </th>
                  <th colSpan={6} className="border-r border-slate-200 px-2 py-1.5 text-center bg-slate-100 text-slate-800">
                    Thời gian 6 chặng
                  </th>
                  <th colSpan={2} className="px-2 py-1.5 text-center bg-slate-100">
                    Chỉ tiêu & Thao tác
                  </th>
                </tr>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-700 font-bold select-none whitespace-nowrap">
                  <th className="px-2.5 py-2 w-10 text-center border-r border-slate-200">STT</th>
                  <SortableTh
                    field="ma_bg"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2.5 py-2 font-bold border-r border-slate-200"
                  >
                    Số hiệu
                  </SortableTh>
                  <SortableTh
                    field="ngay_do_kiem"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 font-bold text-center border-r border-slate-200"
                  >
                    Ngày
                  </SortableTh>
                  <SortableTh
                    field="postman"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2.5 py-2 font-bold border-r border-slate-200"
                  >
                    Bưu tá
                  </SortableTh>
                  <SortableTh
                    field="danh_gia"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 font-bold text-center border-r border-slate-200"
                  >
                    Đánh giá
                  </SortableTh>
                  <SortableTh
                    field="ma_lo"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2.5 py-2 font-bold border-r border-slate-200"
                  >
                    Mã lô
                  </SortableTh>
                  {/* 5 milestones */}
                  <SortableTh
                    field="tms"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200 bg-blue-50/30"
                  >
                    Quét TMS
                  </SortableTh>
                  <SortableTh
                    field="depart"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200 bg-blue-50/30"
                  >
                    Rời KTC1
                  </SortableTh>
                  <SortableTh
                    field="arrive"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200 bg-blue-50/30"
                  >
                    Đến BCVH
                  </SortableTh>
                  <SortableTh
                    field="gbt"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200 bg-blue-50/30"
                  >
                    Giao BT
                  </SortableTh>
                  <SortableTh
                    field="ptc"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200 bg-blue-50/30"
                  >
                    Phát TC
                  </SortableTh>
                  {/* 6 leg hours */}
                  <SortableTh
                    field="tms_depart"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200"
                  >
                    TMS-Xuất
                  </SortableTh>
                  <SortableTh
                    field="depart_arrive"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200"
                  >
                    Xuất-Đến
                  </SortableTh>
                  <SortableTh
                    field="tms_arrive"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200"
                  >
                    TMS-Đến
                  </SortableTh>
                  <SortableTh
                    field="arrive_gbt"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200"
                  >
                    Đến-Giao
                  </SortableTh>
                  <SortableTh
                    field="gbt_ptc"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200"
                  >
                    Giao-Phát
                  </SortableTh>
                  <SortableTh
                    field="tms_ptc"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2 py-2 text-center font-bold border-r border-slate-200"
                  >
                    TMS-Phát
                  </SortableTh>
                  {/* TCT hours */}
                  <SortableTh
                    field="tct_ms"
                    sort={{ field: inPageSortField, direction: inPageSortDir }}
                    onSort={handleSortChange}
                    className="px-2.5 py-2 text-center font-bold border-r border-slate-200"
                  >
                    Số giờ TCT
                  </SortableTh>
                  <th className="px-2.5 py-2 text-center w-20 font-bold" data-no-capture="true">
                    Thao tác
                  </th>
                </tr>
              </>
            ) : (
              // NGUYÊN NHÂN VIEW HEADERS
              <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-700 font-bold select-none whitespace-nowrap">
                <th className="px-3 py-2.5 w-12 text-center">STT</th>
                <SortableTh
                  field="ma_bg"
                  sort={{ field: inPageSortField, direction: inPageSortDir }}
                  onSort={handleSortChange}
                  className="px-3 py-2.5 font-bold"
                >
                  Mã bưu gửi
                </SortableTh>
                <SortableTh
                  field="ngay_do_kiem"
                  sort={{ field: inPageSortField, direction: inPageSortDir }}
                  onSort={handleSortChange}
                  className="px-3 py-2.5 font-bold"
                >
                  Ngày đo
                </SortableTh>
                <SortableTh
                  field="ma_bcvh"
                  sort={{ field: inPageSortField, direction: inPageSortDir }}
                  onSort={handleSortChange}
                  className="px-3 py-2.5 font-bold"
                >
                  BCVH / Tuyến
                </SortableTh>
                <SortableTh
                  field="postman"
                  sort={{ field: inPageSortField, direction: inPageSortDir }}
                  onSort={handleSortChange}
                  className="px-3 py-2.5 font-bold"
                >
                  Bưu tá bàn giao đầu
                </SortableTh>
                <SortableTh
                  field="danh_gia"
                  sort={{ field: inPageSortField, direction: inPageSortDir }}
                  onSort={handleSortChange}
                  className="px-3 py-2.5 font-bold text-center"
                >
                  Đánh giá
                </SortableTh>
                <SortableTh
                  field="tct_hours"
                  sort={{ field: inPageSortField, direction: inPageSortDir }}
                  onSort={handleSortChange}
                  className="px-3 py-2.5 font-bold text-right"
                >
                  Giờ TCT / Hạn
                </SortableTh>
                <SortableTh
                  field="system_cause"
                  sort={{ field: inPageSortField, direction: inPageSortDir }}
                  onSort={handleSortChange}
                  className="px-3 py-2.5 font-bold"
                >
                  Nguyên nhân Hệ thống
                </SortableTh>
                <SortableTh
                  field="analyst_cause"
                  sort={{ field: inPageSortField, direction: inPageSortDir }}
                  onSort={handleSortChange}
                  className="px-3 py-2.5 font-bold"
                >
                  Kết luận Chuyên quản
                </SortableTh>
                <th className="px-3 py-2.5 text-center w-28 font-bold" data-no-capture="true">
                  Thao tác
                </th>
              </tr>
            )}
          </thead>

          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={isJourney ? 19 : 10} className="px-4 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Đang tải danh sách minh chứng...</span>
                  </div>
                </td>
              </tr>
            ) : displayedItems.length === 0 ? (
              <tr>
                <td colSpan={isJourney ? 19 : 10} className="px-4 py-12 text-center text-slate-500 italic">
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
                const journeyObj = item.journey || {};
                const ms = journeyObj.milestones || item.milestones || {};
                const legsObj = journeyObj.legs || item.legs || {};

                const canWrite = Boolean(catalog?.can?.write);
                const canAnalyse = Boolean(item.can_analyse);

                if (isJourney) {
                  // HÀNH TRÌNH VIEW ROW
                  return (
                    <tr
                      key={`${item.ngay_do_kiem}_${item.ma_bg}_${idx}`}
                      className="hover:bg-blue-50/20 transition-colors"
                    >
                      <td className="px-2.5 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-100">
                        {stt}
                      </td>
                      {/* Số hiệu (Clickable opens card) */}
                      <td className="px-2.5 py-2 font-mono font-bold border-r border-slate-100 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpenParcel(item, 'journey')}
                          className="text-blue-700 hover:text-blue-900 hover:underline cursor-pointer text-left font-mono font-bold"
                          title="Xem phiếu bưu gửi"
                        >
                          {item.ma_bg}
                        </button>
                      </td>
                      {/* Ngày */}
                      <td className="px-2 py-2 text-center text-slate-700 whitespace-nowrap border-r border-slate-100 font-mono text-[11px]">
                        {item.ngay_do_kiem}
                      </td>
                      {/* Bưu tá */}
                      <td className="px-2.5 py-2 text-slate-700 border-r border-slate-100 whitespace-nowrap max-w-[130px] truncate" title={item.ten_buu_ta_shown || item.ten_buu_ta || item.ten_buu_ta_first}>
                        {formatPostmanName(item.ten_buu_ta_shown || item.ten_buu_ta || item.ten_buu_ta_first, item.ma_buu_ta_shown || item.ma_buu_ta_first)}
                      </td>
                      {/* Đánh giá */}
                      <td className="px-2 py-2 text-center border-r border-slate-100 whitespace-nowrap">
                        {isPassed ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Đạt
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            K.đạt
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            —
                          </span>
                        )}
                        {(journeyObj.khong_tron_lo || item.khong_tron_lo) && (
                          <span className="block text-[9px] font-bold text-amber-800 mt-0.5">
                            K.trọn lô
                          </span>
                        )}
                      </td>
                      {/* Mã lô */}
                      <td className="px-2.5 py-2 font-mono text-slate-600 border-r border-slate-100 whitespace-nowrap text-[11px]">
                        {journeyObj.ma_lo || item.ma_lo || '—'}
                      </td>
                      {/* 5 milestones */}
                      <td className="px-2 py-2 text-center border-r border-slate-100 font-mono text-[11px] whitespace-nowrap text-slate-700">
                        {getMilestoneAt(ms.tms) || '—'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-100 font-mono text-[11px] whitespace-nowrap text-slate-700">
                        {getMilestoneAt(ms.depart) || '—'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-100 font-mono text-[11px] whitespace-nowrap text-slate-700">
                        {getMilestoneAt(ms.arrive) || '—'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-100 font-mono text-[11px] whitespace-nowrap text-slate-700">
                        {getMilestoneAt(ms.gbt) || getMilestoneAt(ms.handover_shown) || '—'}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-100 font-mono text-[11px] whitespace-nowrap text-slate-700">
                        {getMilestoneAt(ms.ptc) || '—'}
                      </td>
                      {/* 6 leg hours */}
                      <td className="px-2 py-2 text-center border-r border-slate-100 tabular-nums">
                        {formatJourneyLegHours(legsObj.tms_depart ?? item.leg_tms_depart_hours)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-100 tabular-nums">
                        {formatJourneyLegHours(legsObj.depart_arrive ?? item.leg_depart_arrive_hours)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-100 tabular-nums">
                        {formatJourneyLegHours(legsObj.tms_arrive ?? item.leg_tms_arrive_hours)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-100 tabular-nums">
                        {formatJourneyLegHours(legsObj.arrive_gbt ?? item.leg_arrive_gbt_hours)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-100 tabular-nums">
                        {formatJourneyLegHours(legsObj.gbt_ptc ?? item.leg_gbt_ptc_hours)}
                      </td>
                      <td className="px-2 py-2 text-center border-r border-slate-100 tabular-nums font-semibold text-slate-900">
                        {formatJourneyLegHours(legsObj.tms_ptc ?? item.leg_tms_ptc_hours)}
                      </td>
                      {/* Số giờ TCT */}
                      <td className="px-2 py-2 text-center border-r border-slate-100 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                        {journeyObj.tct_ms !== null && journeyObj.tct_ms !== undefined
                          ? `${(journeyObj.tct_ms / 3600000).toFixed(1).replace('.', ',')}h`
                          : item.tct?.hours !== null && item.tct?.hours !== undefined
                          ? `${item.tct.hours}h`
                          : item.tct?.tct_hours !== null && item.tct?.tct_hours !== undefined
                          ? `${item.tct.tct_hours}h`
                          : item.tct?.hours_text || '—'}
                      </td>
                      {/* Thao tác */}
                      <td className="px-2 py-2 text-center whitespace-nowrap" data-no-capture="true">
                        <button
                          type="button"
                          onClick={() => handleOpenParcel(item, 'journey')}
                          title="Xem phiếu bưu gửi"
                          className="p-1 rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                }

                // NGUYÊN NHÂN VIEW ROW
                return (
                  <tr
                    key={`${item.ngay_do_kiem}_${item.ma_bg}_${idx}`}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    {/* STT */}
                    <td className="px-3 py-2.5 text-center text-slate-400 font-medium">
                      {stt}
                    </td>

                    {/* Mã BG & Lô (Clickable opens card) */}
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                      <button
                        type="button"
                        onClick={() => handleOpenParcel(item, 'cause')}
                        className="text-blue-700 hover:text-blue-900 hover:underline cursor-pointer text-left font-mono font-bold"
                        title="Xem phiếu bưu gửi"
                      >
                        {item.ma_bg}
                      </button>
                      {(journeyObj.ma_lo || item.ma_lo) && (
                        <div className="text-[10px] text-slate-500 font-sans font-normal mt-0.5">
                          Lô: {journeyObj.ma_lo || item.ma_lo}
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
                        {item.tct?.hours !== null && item.tct?.hours !== undefined
                          ? `${item.tct.hours}h`
                          : item.tct?.tct_hours !== null && item.tct?.tct_hours !== undefined
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
                      ) : sys.label || sys.code ? (
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

                    {/* Thao tác (PO C1: Replaced open in Hành trình with Parcel Card) */}
                    <td className="px-3 py-2.5 text-center whitespace-nowrap" data-no-capture="true">
                      <div className="flex items-center justify-center gap-1">
                        {/* Chi tiết phiếu bưu gửi */}
                        <button
                          type="button"
                          onClick={() => handleOpenParcel(item, 'cause')}
                          title="Xem phiếu bưu gửi"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Ghi phân tích: visible when catalog.can.write && item.can_analyse */}
                        {canWrite && canAnalyse && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenAnalysis) onOpenAnalysis(item);
                              else handleOpenParcel(item, 'analysis');
                            }}
                            title="Ghi kết luận phân tích của Chuyên quản"
                            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-bold transition-colors cursor-pointer text-[11px]"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>{anl ? 'Sửa' : 'Ghi'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls (J10: 20 / 50 / 100 items/page) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-slate-500">
            Hiển thị trang <strong className="text-slate-800">{page}</strong> / <strong className="text-slate-800">{totalPages}</strong> (Tổng cộng <strong className="text-slate-800">{total.toLocaleString('vi-VN')}</strong> bưu gửi theo bộ lọc)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Hiển thị:</span>
            <select
              value={activePageSize}
              onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
            >
              <option value={20}>20 dòng/trang</option>
              <option value={50}>50 dòng/trang</option>
              <option value={100}>100 dòng/trang</option>
            </select>
          </div>
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
