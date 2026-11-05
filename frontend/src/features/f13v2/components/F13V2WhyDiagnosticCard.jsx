import { useRef } from 'react';
import { Target, Clock, Truck, Package, Sparkles } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme, indicatorTargetRate } from '../../indicator/indicatorConfig.js';
import { formatShortfall, formatSharePercent, generateBcvhDiagnosticStory, formatChoChuyenQuanReason } from '../f13WhyHelpers.js';

export default function F13V2WhyDiagnosticCard({
  bcvhRow,
  postmanRoutes = [],
  periodLabel = '',
}) {
  const cardRef = useRef(null);
  const indicator = useIndicator();
  const _theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);

  if (!bcvhRow) return null;

  const {
    ten_bcvh = 'Bưu cục',
    rate = 0,
    volume = 0,
    passed = 0,
    failed = 0,
    unrated = 0,
    own_shortfall = 0,
    cause_mix = {},
    arrival_remaining = {},
  } = bcvhRow;

  const lines = cause_mix?.lines || [];
  const getLine = (code) => lines.find((l) => l.code === code) || { count: 0, share: 0 };

  const khongTronLo = getLine('KHONG_TRON_LO');
  const khaiThac = getLine('KHAI_THAC');
  const vanChuyen = getLine('VAN_CHUYEN');
  const ktVcChuaPhanBiet = getLine('KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET');
  const upstreamCount = (khongTronLo.count || 0) + (khaiThac.count || 0) + (vanChuyen.count || 0) + (ktVcChuaPhanBiet.count || 0);
  const upstreamShare = failed > 0 ? upstreamCount / failed : 0;

  const phat = cause_mix?.phat || { count: 0, share: 0, by_detail: {} };
  const chamGiao = phat.by_detail?.CHAM_GIAO_BUU_TA || 0;
  const phatCham = phat.by_detail?.PHAT_CHAM_SAU_GIAO || 0;
  const phatChuaRo = phat.by_detail?.KHONG_CHI_TIET || 0;

  const choChuyenQuan = cause_mix?.cho_chuyen_quan || { count: 0, share: 0, by_reason: {} };

  // Executive narrative story
  const story = generateBcvhDiagnosticStory({
    bcvhRow,
    postmanRoutes,
    periodLabel,
  });

  const isBelowTarget = rate < targetRate;
  const periodText = periodLabel ? `Kỳ: ${periodLabel}` : '';
  const captureTitle = `Bức tranh nguyên nhân ${ten_bcvh}`;

  return (
    <section
      ref={cardRef}
      className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-[box-shadow,border-color] duration-150"
    >
      {/* Header with Camera Button */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 shadow-2xs">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Bức tranh nguyên nhân – {ten_bcvh}
              </h2>
              {periodText && (
                <span className="text-xs font-semibold text-slate-500">
                  ({periodText})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Chẩn đoán nguyên nhân không đạt chỉ tiêu F1.3 và phân tách khách quan trước bưu cục vs khâu phát
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <BlockCaptureButton
            targetRef={cardRef}
            blockTitle={captureTitle}
            dateOrPeriod={periodLabel}
          />
        </div>
      </div>

      {/* Connected Diagnostic Story Box (Manifest Section 2 Requirement) */}
      <div className="mb-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50/60 to-slate-50 p-3.5 text-xs text-slate-800 space-y-2">
        <div className="flex items-start gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-blue-600 mt-0.5" />
          <div className="space-y-1.5 leading-relaxed">
            <p className="font-bold text-slate-900 text-sm">
              {story.headline}
            </p>
            {story.hotspotSummary && (
              <p className="text-slate-700">
                <strong>Điểm nghẽn tuyến: </strong>
                {story.hotspotSummary}
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-blue-100/60 text-slate-600">
              {story.upstreamSummary && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                  <span>{story.upstreamSummary}</span>
                </div>
              )}
              {story.internalSummary && (
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                  <span>{story.internalSummary}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-center">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Tỷ lệ đạt</span>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <span className={`text-xl font-black ${isBelowTarget ? 'text-rose-600' : 'text-emerald-600'}`}>
              {new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(rate)}%
            </span>
            <span className="text-[11px] text-slate-400 font-bold">/ 90%</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-center">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sản lượng (N)</span>
          <span className="mt-1 text-xl font-bold text-slate-800 block">
            {new Intl.NumberFormat('vi-VN').format(volume)}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-center">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Đạt</span>
          <span className="mt-1 text-xl font-bold text-emerald-700 block">
            {new Intl.NumberFormat('vi-VN').format(passed)}
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-center">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Không đạt</span>
          <span className="mt-1 text-xl font-bold text-rose-700 block">
            {new Intl.NumberFormat('vi-VN').format(failed)}
          </span>
          {unrated > 0 && (
            <span className="text-[10px] text-slate-400 block mt-0.5">({unrated} chưa đánh giá)</span>
          )}
        </div>

        <div className="col-span-2 sm:col-span-1 rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-center">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Thiếu hụt vs 90%</span>
          <span className="mt-1 text-xl font-black text-amber-700 block">
            {formatShortfall(own_shortfall)}
          </span>
          <span className="text-[10px] text-amber-600 block mt-0.5">bưu gửi cần bù</span>
        </div>
      </div>

      {/* 3-Column Cause Decomposition Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Column 1: Khách quan trước bưu cục */}
        <div className="rounded-xl border border-amber-200/90 bg-amber-50/20 p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-200/60">
              <div className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-amber-700 shrink-0" />
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Khách quan trước bưu cục
                </h3>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
                {formatSharePercent(upstreamShare)} ({upstreamCount} BG)
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-amber-100/50">
                <span className="text-slate-700 font-medium">Không trọn lô:</span>
                <span className="font-bold text-slate-900">
                  {khongTronLo.count} BG ({formatSharePercent(khongTronLo.share)})
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-amber-100/50">
                <span className="text-slate-700 font-medium">Khai thác đến quá hạn:</span>
                <span className="font-bold text-slate-900">
                  {khaiThac.count} BG ({formatSharePercent(khaiThac.share)})
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-amber-100/50">
                <span className="text-slate-700 font-medium">Vận chuyển đến quá hạn:</span>
                <span className="font-bold text-slate-900">
                  {vanChuyen.count} BG ({formatSharePercent(vanChuyen.share)})
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-700 font-medium">KT - VC chưa phân biệt:</span>
                <span className="font-bold text-slate-900">
                  {ktVcChuaPhanBiet.count} BG ({formatSharePercent(ktVcChuaPhanBiet.share)})
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-amber-800/80 italic border-t border-amber-100/60 pt-1.5">
            Phát sinh do phân chia lô TMS hoặc chuyển giao quá thời hạn trước khi tới BCVH.
          </p>
        </div>

        {/* Column 2: Khâu phát tại bưu cục */}
        <div className="rounded-xl border border-blue-200/90 bg-blue-50/20 p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-200/60">
              <div className="flex items-center gap-1.5">
                <Package className="h-4 w-4 text-blue-700 shrink-0" />
                <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  Khâu phát tại bưu cục
                </h3>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-800">
                {formatSharePercent(phat.share)} ({phat.count} BG)
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-blue-100/50">
                <span className="text-slate-700 font-medium">Chậm giao bưu tá:</span>
                <span className="font-bold text-slate-900">
                  {chamGiao} BG ({formatSharePercent(failed > 0 ? chamGiao / failed : 0)})
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-blue-100/50">
                <span className="text-slate-700 font-medium">Phát chậm sau khi giao:</span>
                <span className="font-bold text-slate-900">
                  {phatCham} BG ({formatSharePercent(failed > 0 ? phatCham / failed : 0)})
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-700 font-medium">Phát chưa rõ chi tiết:</span>
                <span className="font-bold text-slate-900">
                  {phatChuaRo} BG ({formatSharePercent(failed > 0 ? phatChuaRo / failed : 0)})
                </span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-blue-800/80 italic border-t border-blue-100/60 pt-1.5">
            Bao gồm độ trễ bàn giao từ bưu cục cho bưu tá và thời gian bưu tá thực hiện phát.
          </p>
        </div>

        {/* Column 3: Chờ Chuyên quản & Phân bổ giờ đến */}
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-700 shrink-0" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Giờ đến & Chờ phân tích
                </h3>
              </div>
              {choChuyenQuan.count > 0 && (
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-black text-slate-800">
                  {choChuyenQuan.count} BG chờ CQ
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">
                Thời gian còn lại khi đến BCVH:
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="rounded border border-rose-200 bg-rose-50/60 px-2 py-1">
                  <span className="text-rose-700 block">Đến quá giờ:</span>
                  <span className="font-black text-rose-900">
                    {arrival_remaining.over_limit || 0} BG ({formatSharePercent(arrival_remaining.shares?.over_limit)})
                  </span>
                </div>
                <div className="rounded border border-amber-200 bg-amber-50/60 px-2 py-1">
                  <span className="text-amber-700 block">Còn &lt; 3h:</span>
                  <span className="font-black text-amber-900">
                    {arrival_remaining.lt_3h || 0} BG ({formatSharePercent(arrival_remaining.shares?.lt_3h)})
                  </span>
                </div>
                <div className="rounded border border-sky-200 bg-sky-50/60 px-2 py-1">
                  <span className="text-sky-700 block">Còn 3 - 6h:</span>
                  <span className="font-black text-sky-900">
                    {arrival_remaining.h3_6 || 0} BG ({formatSharePercent(arrival_remaining.shares?.h3_6)})
                  </span>
                </div>
                <div className="rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1">
                  <span className="text-emerald-700 block">Còn &ge; 6h:</span>
                  <span className="font-black text-emerald-900">
                    {arrival_remaining.ge_6h || 0} BG ({formatSharePercent(arrival_remaining.shares?.ge_6h)})
                  </span>
                </div>
              </div>

              {choChuyenQuan.count > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200/60">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    Chờ CQ phân tích: {choChuyenQuan.count} BG ({formatSharePercent(choChuyenQuan.share)})
                  </span>
                  {Object.entries(choChuyenQuan.by_reason || {}).map(([reason, cnt]) => (
                    <span key={reason} className="text-[10px] text-slate-500 block">
                      • {formatChoChuyenQuanReason(reason)}: {cnt} BG
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500 italic border-t border-slate-200/60 pt-1.5">
            Dữ liệu giờ đến là thông tin tham khảo, không làm thay đổi kết quả đánh giá nguyên nhân.
          </p>
        </div>
      </div>
    </section>
  );
}
