import { useRef, useMemo } from 'react';
import { Target, Clock, Truck, Package, Sparkles } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme, indicatorTargetRate } from '../../indicator/indicatorConfig.js';
import { formatRate, formatVolume } from '../f13v2Helpers.js';
import {
  formatShortfall,
  formatSharePercent,
  generateBcvhDiagnosticStory,
  formatChoChuyenQuanReason,
} from '../f13WhyHelpers.js';

export default function F13V2WhyDiagnosticCard({
  bcvhRow,
  allBcvhRows = [],
  isCityWide = false,
  postmanRoutes = [],
  periodLabel = '',
  onSelectBcvh,
  onOpenParcels,
}) {
  const cardRef = useRef(null);
  const indicator = useIndicator();
  const _theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);

  // Sort BCVHs by shortfall descending, then volume descending
  const sortedBcvhs = useMemo(() => {
    return [...allBcvhRows].sort((a, b) => {
      const diff = (b.own_shortfall_x10 || 0) - (a.own_shortfall_x10 || 0);
      return diff !== 0 ? diff : (b.volume || 0) - (a.volume || 0);
    });
  }, [allBcvhRows]);

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
    allBcvhRows,
    periodLabel,
    isCityWide,
  });

  const isBelowTarget = rate < targetRate;
  const periodText = periodLabel ? `Kỳ: ${periodLabel}` : '';
  const captureTitle = `Bức tranh nguyên nhân ${ten_bcvh}`;
  const baseFilter = bcvhRow.filter || {};

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
              {isCityWide
                ? 'Chẩn đoán nguyên nhân không đạt chỉ tiêu F1.3 toàn BĐTP và phân bổ mức kéo tụt theo từng bưu cục'
                : 'Chẩn đoán nguyên nhân không đạt chỉ tiêu F1.3 và phân tách khách quan trước bưu cục vs khâu phát'}
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

        <div
          onClick={() =>
            onOpenParcels?.({
              title: `${ten_bcvh} • Toàn bộ sản lượng`,
              subtitle: periodText,
              filter: baseFilter,
              expectedCount: volume,
            })
          }
          className={`rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-center ${
            onOpenParcels ? 'hover:bg-slate-100 hover:border-slate-300 transition-colors cursor-pointer' : ''
          }`}
          title={onOpenParcels ? 'Bấm để xem danh sách toàn bộ bưu gửi' : undefined}
        >
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Sản lượng (N)</span>
          <span className="mt-1 text-xl font-bold text-slate-800 block">
            {new Intl.NumberFormat('vi-VN').format(volume)}
          </span>
        </div>

        <div
          onClick={() =>
            onOpenParcels?.({
              title: `${ten_bcvh} • Bưu gửi Đạt`,
              subtitle: periodText,
              filter: { ...baseFilter, verdict: 'Đạt' },
              expectedCount: passed,
            })
          }
          className={`rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-center ${
            onOpenParcels ? 'hover:bg-emerald-50/60 hover:border-emerald-300 transition-colors cursor-pointer' : ''
          }`}
          title={onOpenParcels ? 'Bấm để xem danh sách bưu gửi đạt chỉ tiêu' : undefined}
        >
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">Đạt</span>
          <span className="mt-1 text-xl font-bold text-emerald-700 block">
            {new Intl.NumberFormat('vi-VN').format(passed)}
          </span>
        </div>

        <div
          onClick={() =>
            onOpenParcels?.({
              title: `${ten_bcvh} • Bưu gửi Không đạt`,
              subtitle: periodText,
              filter: { ...baseFilter, verdict: 'Không đạt' },
              expectedCount: failed,
            })
          }
          className={`rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 text-center ${
            onOpenParcels ? 'hover:bg-rose-50/60 hover:border-rose-300 transition-colors cursor-pointer' : ''
          }`}
          title={onOpenParcels ? 'Bấm để xem danh sách bưu gửi không đạt chỉ tiêu' : undefined}
        >
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider block">Không đạt</span>
          <span className="mt-1 text-xl font-bold text-rose-700 block">
            {new Intl.NumberFormat('vi-VN').format(failed)}
          </span>
          {unrated > 0 && (
            <span className="text-[10px] text-slate-400 block mt-0.5">({unrated} chưa đánh giá)</span>
          )}
        </div>

        <div
          onClick={() =>
            onOpenParcels?.({
              title: `${ten_bcvh} • Bưu gửi Không đạt (Thiếu hụt vs 90%)`,
              subtitle: periodText,
              filter: { ...baseFilter, verdict: 'Không đạt' },
              expectedCount: failed,
            })
          }
          className={`col-span-2 sm:col-span-1 rounded-xl border border-amber-200 bg-amber-50/40 p-3 text-center ${
            onOpenParcels ? 'hover:bg-amber-100/50 hover:border-amber-300 transition-colors cursor-pointer' : ''
          }`}
          title={onOpenParcels ? 'Bấm để xem danh sách bưu gửi không đạt cần bù' : undefined}
        >
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Thiếu hụt vs 90%</span>
          <span className="mt-1 text-xl font-black text-amber-700 block">
            {formatShortfall(own_shortfall)}
          </span>
          <span className="text-[10px] text-amber-600 block mt-0.5">bưu gửi cần bù</span>
        </div>
      </div>

      {/* City-Wide BCVH Ranking & Impact Breakdown (PO Rule: showing the whole BĐTP and which BCVH pulls it down) */}
      {isCityWide && sortedBcvhs.length > 0 && (
        <div className="mb-5 rounded-xl border border-slate-200/90 bg-slate-50/40 p-3 sm:p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Mức độ ảnh hưởng và kéo tụt chỉ tiêu BĐTP theo từng BCVH
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Xếp hạng các bưu cục theo số bưu gửi thiếu hụt so với chỉ tiêu 90% và tỷ trọng kéo tụt BĐTP
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {sortedBcvhs.length} bưu cục
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-bold">
                  <th className="w-10 px-2 py-2 text-center border-r border-slate-200">STT</th>
                  <th className="px-3 py-2 text-left border-r border-slate-200">Bưu cục</th>
                  <th className="w-24 px-2.5 py-2 text-right border-r border-slate-200">Sản lượng (N)</th>
                  <th className="w-20 px-2 py-2 text-right border-r border-slate-200">Đạt</th>
                  <th className="w-20 px-2 py-2 text-right border-r border-slate-200">Không đạt</th>
                  <th className="w-24 px-2.5 py-2 text-center border-r border-slate-200">Tỷ lệ đạt</th>
                  <th className="w-28 px-2.5 py-2 text-right border-r border-slate-200">Thiếu hụt vs 90%</th>
                  <th className="w-28 px-2.5 py-2 text-right border-r border-slate-200">% Kéo tụt BĐTP</th>
                  <th className="w-28 px-2 py-2 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedBcvhs.map((row, idx) => {
                  const isLagging = (row.own_shortfall || 0) > 0;
                  return (
                    <tr
                      key={row.ma_bcvh}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLagging ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      <td className="px-2 py-2 text-center text-slate-400 font-mono text-[11px] border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 text-slate-800 font-medium border-r border-slate-200">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{row.ten_bcvh}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({row.ma_bcvh})</span>
                        </div>
                      </td>
                      <td
                        onClick={() =>
                          onOpenParcels?.({
                            title: `${row.ten_bcvh} • Sản lượng`,
                            subtitle: periodText,
                            filter: row.filter,
                            expectedCount: row.volume,
                          })
                        }
                        className="px-2.5 py-2 text-right font-medium text-slate-700 border-r border-slate-200 hover:text-blue-600 hover:underline cursor-pointer"
                        title="Bấm để xem danh sách bưu gửi của bưu cục này"
                      >
                        {formatVolume(row.volume)}
                      </td>
                      <td
                        onClick={() =>
                          onOpenParcels?.({
                            title: `${row.ten_bcvh} • Bưu gửi Đạt`,
                            subtitle: periodText,
                            filter: { ...row.filter, verdict: 'Đạt' },
                            expectedCount: row.passed,
                          })
                        }
                        className="px-2 py-2 text-right font-medium text-emerald-700 border-r border-slate-200 hover:underline cursor-pointer"
                        title="Bấm để xem bưu gửi đạt của bưu cục này"
                      >
                        {formatVolume(row.passed)}
                      </td>
                      <td
                        onClick={() =>
                          onOpenParcels?.({
                            title: `${row.ten_bcvh} • Bưu gửi Không đạt`,
                            subtitle: periodText,
                            filter: { ...row.filter, verdict: 'Không đạt' },
                            expectedCount: row.failed,
                          })
                        }
                        className="px-2 py-2 text-right font-medium text-rose-700 border-r border-slate-200 hover:underline cursor-pointer"
                        title="Bấm để xem bưu gửi không đạt của bưu cục này"
                      >
                        {formatVolume(row.failed)}
                      </td>
                      <td className="px-2.5 py-2 text-center border-r border-slate-200">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold border ${
                            row.rate < targetRate
                              ? 'text-rose-800 bg-rose-100/80 border-rose-300'
                              : 'text-emerald-800 bg-emerald-100/80 border-emerald-300'
                          }`}
                        >
                          {formatRate(row.rate)}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-right font-black border-r border-slate-200">
                        {isLagging ? (
                          <span className="text-amber-700">{formatShortfall(row.own_shortfall)}</span>
                        ) : (
                          <span className="text-emerald-600 font-bold">Đạt</span>
                        )}
                      </td>
                      <td className="px-2.5 py-2 text-right font-bold text-slate-700 border-r border-slate-200">
                        {formatSharePercent(row.share_of_parent_shortfall)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {onSelectBcvh && (
                          <button
                            type="button"
                            onClick={() => onSelectBcvh(row.ma_bcvh)}
                            className="rounded border border-blue-200 bg-blue-50/80 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            Xem BCVH &rarr;
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
              <button
                type="button"
                onClick={() =>
                  onOpenParcels?.({
                    title: `${ten_bcvh} • Khách quan trước bưu cục`,
                    subtitle: periodText,
                    filter: { ...baseFilter, verdict: 'Không đạt' },
                    expectedCount: upstreamCount,
                  })
                }
                className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer"
                title="Bấm để xem danh sách bưu gửi khách quan"
              >
                {formatSharePercent(upstreamShare)} ({upstreamCount} BG)
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div
                onClick={() =>
                  onOpenParcels?.({
                    title: `${ten_bcvh} • Không trọn lô`,
                    subtitle: periodText,
                    filter: { ...baseFilter, cause: 'KHONG_TRON_LO', verdict: 'Không đạt' },
                    expectedCount: khongTronLo.count,
                  })
                }
                className="flex items-center justify-between py-1 border-b border-amber-100/50 hover:bg-amber-100/40 rounded px-1 -mx-1 transition-colors cursor-pointer"
                title="Bấm để xem danh sách bưu gửi Không trọn lô"
              >
                <span className="text-slate-700 font-medium">Không trọn lô:</span>
                <span className="font-bold text-slate-900 hover:underline">
                  {khongTronLo.count} BG ({formatSharePercent(khongTronLo.share)})
                </span>
              </div>
              <div
                onClick={() =>
                  onOpenParcels?.({
                    title: `${ten_bcvh} • Khai thác đến quá hạn`,
                    subtitle: periodText,
                    filter: { ...baseFilter, cause: 'KHAI_THAC', verdict: 'Không đạt' },
                    expectedCount: khaiThac.count,
                  })
                }
                className="flex items-center justify-between py-1 border-b border-amber-100/50 hover:bg-amber-100/40 rounded px-1 -mx-1 transition-colors cursor-pointer"
                title="Bấm để xem danh sách bưu gửi Khai thác quá hạn"
              >
                <span className="text-slate-700 font-medium">Khai thác đến quá hạn:</span>
                <span className="font-bold text-slate-900 hover:underline">
                  {khaiThac.count} BG ({formatSharePercent(khaiThac.share)})
                </span>
              </div>
              <div
                onClick={() =>
                  onOpenParcels?.({
                    title: `${ten_bcvh} • Vận chuyển đến quá hạn`,
                    subtitle: periodText,
                    filter: { ...baseFilter, cause: 'VAN_CHUYEN', verdict: 'Không đạt' },
                    expectedCount: vanChuyen.count,
                  })
                }
                className="flex items-center justify-between py-1 border-b border-amber-100/50 hover:bg-amber-100/40 rounded px-1 -mx-1 transition-colors cursor-pointer"
                title="Bấm để xem danh sách bưu gửi Vận chuyển quá hạn"
              >
                <span className="text-slate-700 font-medium">Vận chuyển đến quá hạn:</span>
                <span className="font-bold text-slate-900 hover:underline">
                  {vanChuyen.count} BG ({formatSharePercent(vanChuyen.share)})
                </span>
              </div>
              <div
                onClick={() =>
                  onOpenParcels?.({
                    title: `${ten_bcvh} • KT - VC chưa phân biệt`,
                    subtitle: periodText,
                    filter: { ...baseFilter, cause: 'KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET', verdict: 'Không đạt' },
                    expectedCount: ktVcChuaPhanBiet.count,
                  })
                }
                className="flex items-center justify-between py-1 hover:bg-amber-100/40 rounded px-1 -mx-1 transition-colors cursor-pointer"
                title="Bấm để xem danh sách bưu gửi KT - VC chưa phân biệt"
              >
                <span className="text-slate-700 font-medium">KT - VC chưa phân biệt:</span>
                <span className="font-bold text-slate-900 hover:underline">
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
              <button
                type="button"
                onClick={() =>
                  onOpenParcels?.({
                    title: `${ten_bcvh} • Khâu phát tại bưu cục`,
                    subtitle: periodText,
                    filter: { ...baseFilter, cause: 'PHAT', verdict: 'Không đạt' },
                    expectedCount: phat.count,
                  })
                }
                className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-800 hover:bg-blue-200 transition-colors cursor-pointer"
                title="Bấm để xem danh sách bưu gửi khâu phát"
              >
                {formatSharePercent(phat.share)} ({phat.count} BG)
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div
                onClick={() =>
                  onOpenParcels?.({
                    title: `${ten_bcvh} • Chậm giao bưu tá`,
                    subtitle: periodText,
                    filter: { ...baseFilter, cause: 'GIAO_BUU_TA_QUA_GIO', verdict: 'Không đạt' },
                    expectedCount: chamGiao,
                  })
                }
                className="flex items-center justify-between py-1 border-b border-blue-100/50 hover:bg-blue-100/40 rounded px-1 -mx-1 transition-colors cursor-pointer"
                title="Bấm để xem danh sách bưu gửi chậm giao bưu tá"
              >
                <span className="text-slate-700 font-medium">Chậm giao bưu tá:</span>
                <span className="font-bold text-slate-900 hover:underline">
                  {chamGiao} BG ({formatSharePercent(failed > 0 ? chamGiao / failed : 0)})
                </span>
              </div>
              <div
                onClick={() =>
                  onOpenParcels?.({
                    title: `${ten_bcvh} • Phát chậm sau khi giao`,
                    subtitle: periodText,
                    filter: { ...baseFilter, cause: 'PHAT_MUON', verdict: 'Không đạt' },
                    expectedCount: phatCham,
                  })
                }
                className="flex items-center justify-between py-1 border-b border-blue-100/50 hover:bg-blue-100/40 rounded px-1 -mx-1 transition-colors cursor-pointer"
                title="Bấm để xem danh sách bưu gửi phát chậm sau khi giao"
              >
                <span className="text-slate-700 font-medium">Phát chậm sau khi giao:</span>
                <span className="font-bold text-slate-900 hover:underline">
                  {phatCham} BG ({formatSharePercent(failed > 0 ? phatCham / failed : 0)})
                </span>
              </div>
              <div
                onClick={() =>
                  onOpenParcels?.({
                    title: `${ten_bcvh} • Phát chưa rõ chi tiết`,
                    subtitle: periodText,
                    filter: { ...baseFilter, cause: 'PHAT_KHONG_CHI_TIET', verdict: 'Không đạt' },
                    expectedCount: phatChuaRo,
                  })
                }
                className="flex items-center justify-between py-1 hover:bg-blue-100/40 rounded px-1 -mx-1 transition-colors cursor-pointer"
                title="Bấm để xem danh sách bưu gửi phát chưa rõ chi tiết"
              >
                <span className="text-slate-700 font-medium">Phát chưa rõ chi tiết:</span>
                <span className="font-bold text-slate-900 hover:underline">
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
                <button
                  type="button"
                  onClick={() =>
                    onOpenParcels?.({
                      title: `${ten_bcvh} • Chờ Chuyên quản phân tích`,
                      subtitle: periodText,
                      filter: { ...baseFilter, cause: 'CHO_CHUYEN_QUAN', verdict: 'Không đạt' },
                      expectedCount: choChuyenQuan.count,
                    })
                  }
                  className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-black text-slate-800 hover:bg-slate-300 transition-colors cursor-pointer"
                  title="Bấm để xem danh sách bưu gửi chờ CQ"
                >
                  {choChuyenQuan.count} BG chờ CQ
                </button>
              )}
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="text-[11px] font-bold text-slate-600 uppercase mb-1">
                Thời gian còn lại khi đến BCVH:
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div
                  onClick={() =>
                    onOpenParcels?.({
                      title: `${ten_bcvh} • Đến quá giờ`,
                      subtitle: periodText,
                      filter: { ...baseFilter, remaining: 'over_limit', verdict: 'Không đạt' },
                      expectedCount: arrival_remaining.over_limit || 0,
                    })
                  }
                  className="rounded border border-rose-200 bg-rose-50/60 px-2 py-1 hover:bg-rose-100/60 transition-colors cursor-pointer"
                  title="Bấm để xem bưu gửi đến quá giờ"
                >
                  <span className="text-rose-700 block">Đến quá giờ:</span>
                  <span className="font-black text-rose-900 hover:underline">
                    {arrival_remaining.over_limit || 0} BG ({formatSharePercent(arrival_remaining.shares?.over_limit)})
                  </span>
                </div>
                <div
                  onClick={() =>
                    onOpenParcels?.({
                      title: `${ten_bcvh} • Đến còn < 3h`,
                      subtitle: periodText,
                      filter: { ...baseFilter, remaining: 'lt_3h', verdict: 'Không đạt' },
                      expectedCount: arrival_remaining.lt_3h || 0,
                    })
                  }
                  className="rounded border border-amber-200 bg-amber-50/60 px-2 py-1 hover:bg-amber-100/60 transition-colors cursor-pointer"
                  title="Bấm để xem bưu gửi đến còn < 3h"
                >
                  <span className="text-amber-700 block">Còn &lt; 3h:</span>
                  <span className="font-black text-amber-900 hover:underline">
                    {arrival_remaining.lt_3h || 0} BG ({formatSharePercent(arrival_remaining.shares?.lt_3h)})
                  </span>
                </div>
                <div
                  onClick={() =>
                    onOpenParcels?.({
                      title: `${ten_bcvh} • Đến còn 3 - 6h`,
                      subtitle: periodText,
                      filter: { ...baseFilter, remaining: 'h3_6', verdict: 'Không đạt' },
                      expectedCount: arrival_remaining.h3_6 || 0,
                    })
                  }
                  className="rounded border border-sky-200 bg-sky-50/60 px-2 py-1 hover:bg-sky-100/60 transition-colors cursor-pointer"
                  title="Bấm để xem bưu gửi đến còn 3 - 6h"
                >
                  <span className="text-sky-700 block">Còn 3 - 6h:</span>
                  <span className="font-black text-sky-900 hover:underline">
                    {arrival_remaining.h3_6 || 0} BG ({formatSharePercent(arrival_remaining.shares?.h3_6)})
                  </span>
                </div>
                <div
                  onClick={() =>
                    onOpenParcels?.({
                      title: `${ten_bcvh} • Đến còn ≥ 6h`,
                      subtitle: periodText,
                      filter: { ...baseFilter, remaining: 'ge_6h', verdict: 'Không đạt' },
                      expectedCount: arrival_remaining.ge_6h || 0,
                    })
                  }
                  className="rounded border border-emerald-200 bg-emerald-50/60 px-2 py-1 hover:bg-emerald-100/60 transition-colors cursor-pointer"
                  title="Bấm để xem bưu gửi đến còn ≥ 6h"
                >
                  <span className="text-emerald-700 block">Còn &ge; 6h:</span>
                  <span className="font-black text-emerald-900 hover:underline">
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
                    <button
                      key={reason}
                      type="button"
                      onClick={() =>
                        onOpenParcels?.({
                          title: `${ten_bcvh} • ${formatChoChuyenQuanReason(reason)}`,
                          subtitle: periodText,
                          filter: { ...baseFilter, cause: 'CHO_CHUYEN_QUAN', reason, verdict: 'Không đạt' },
                          expectedCount: cnt,
                        })
                      }
                      className="text-[10px] text-slate-700 hover:text-blue-700 hover:underline text-left block w-full py-0.5 cursor-pointer"
                    >
                      • {formatChoChuyenQuanReason(reason)}: <strong>{cnt} BG</strong>
                    </button>
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
