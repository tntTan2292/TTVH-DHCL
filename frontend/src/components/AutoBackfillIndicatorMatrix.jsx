import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Layers,
  Zap,
  ArrowRight
} from 'lucide-react';
import { resolveCrossIndicatorSummary } from './autoBackfillUiHelpers';

/**
 * AutoBackfillIndicatorMatrix
 * Bảng Điều hành Nguồn Dữ liệu Chỉ tiêu (Cross-Indicator Command Matrix)
 * Cho phép xem trạng thái cả 3 chỉ tiêu (F1.1, F1.3, F4.1) và 2 nguồn (HUE, TCT)
 * tại một điểm nhìn duy nhất mà không cần cuộn trang.
 */
export default function AutoBackfillIndicatorMatrix({
  indicatorsList = [],
  activeIndicator = 'ALL',
  onSelectIndicator,
  onSelectAllUnfinished,
  onOpenLaneModal,
  isAdmin = false
}) {
  const summaryList = resolveCrossIndicatorSummary(indicatorsList);
  const totalMissingAll = summaryList.reduce((acc, curr) => acc + curr.totalMissing, 0);

  const handleOpenLaneModal = (indCode, lane) => {
    if (!onOpenLaneModal) return;
    const rawInd = indicatorsList.find((i) => i.code === indCode);
    const laneData = rawInd?.lanesBreakdown?.[lane];
    if (laneData && ((laneData.unresolvedCount || 0) > 0 || (laneData.missingCount || 0) > 0)) {
      const itemsToShow = (laneData.actionableItems && laneData.actionableItems.length > 0)
        ? laneData.actionableItems
        : laneData.missingItems || [];
      if (itemsToShow.length > 0) {
        onOpenLaneModal({
          indicator: indCode,
          displayName: rawInd?.displayName || indCode,
          lane,
          missingCount: itemsToShow.length,
          missingItems: itemsToShow
        });
      }
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2 text-[var(--color-vnpost-blue)] border border-blue-100">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                Bảng Điều hành Nguồn Dữ liệu Chỉ tiêu
              </h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {summaryList.length} chỉ tiêu
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng quan trạng thái đồng bộ 2 nguồn Huế & TCT — Thao tác nhanh không cần cuộn trang
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          {totalMissingAll > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Toàn hệ thống còn thiếu {totalMissingAll} ngày
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Tất cả chỉ tiêu đã hoàn tất
            </span>
          )}
        </div>
      </div>

      {/* Cross-Indicator Comparison Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-bold uppercase text-slate-500">
              <th className="py-2.5 px-3 min-w-[200px]">Chỉ tiêu</th>
              <th className="py-2.5 px-3 min-w-[220px]">Nguồn Huế (HUE)</th>
              <th className="py-2.5 px-3 min-w-[220px]">Nguồn Tổng công ty (TCT)</th>
              <th className="py-2.5 px-3 w-36 text-center">Tổng ngày thiếu</th>
              <th className="py-2.5 px-3 w-56 text-right">Thao tác nhanh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {summaryList.map((ind) => {
              const isSelected = activeIndicator === ind.code;
              const supportsHue = ind.supportedLanes.includes('HUE');
              const supportsTct = ind.supportedLanes.includes('TCT');

              return (
                <tr
                  key={ind.code}
                  className={`transition hover:bg-slate-50/80 ${
                    isSelected ? 'bg-blue-50/40 font-medium' : ''
                  }`}
                >
                  {/* Column 1: Indicator Code & Name */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-extrabold border ${ind.badgeClass}`}>
                        {ind.code}
                      </span>
                      <div>
                        <span className="font-bold text-slate-900 block leading-tight">
                          {ind.displayName}
                        </span>
                        {isSelected && (
                          <span className="text-[11px] font-semibold text-[var(--color-vnpost-blue)]">
                            ● Đang xem chỉ tiêu này
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Column 2: HUE Lane Health */}
                  <td className="py-3 px-3">
                    {supportsHue ? (
                      <div className="flex items-center gap-2">
                        {ind.hue.unresolvedCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenLaneModal(ind.code, 'HUE')}
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200 hover:bg-amber-100 transition cursor-pointer text-left"
                            title="Bấm để xem danh sách chi tiết ngày"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span>
                              {ind.hue.missingCount > 0 && ind.hue.reviewReqCount > 0
                                ? `Thiếu ${ind.hue.missingCount} · Lỗi ${ind.hue.reviewReqCount}`
                                : ind.hue.missingCount > 0
                                ? `Thiếu ${ind.hue.missingCount} ngày`
                                : `Cần rà soát ${ind.hue.reviewReqCount}`}
                            </span>
                            <span className="text-[10px] text-blue-700 font-bold ml-1 hover:underline">
                              [Xem ngày]
                            </span>
                          </button>
                        ) : ind.hue.isFullyComplete ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            100% Hoạt động
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                            Đã giải quyết
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Không hỗ trợ</span>
                    )}
                  </td>

                  {/* Column 3: TCT Lane Health */}
                  <td className="py-3 px-3">
                    {supportsTct ? (
                      <div className="flex items-center gap-2">
                        {ind.tct.unresolvedCount > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleOpenLaneModal(ind.code, 'TCT')}
                            className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-900 border border-amber-200 hover:bg-amber-100 transition cursor-pointer text-left"
                            title="Bấm để xem danh sách chi tiết ngày"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span>
                              {ind.tct.missingCount > 0 && ind.tct.reviewReqCount > 0
                                ? `Thiếu ${ind.tct.missingCount} · Lỗi ${ind.tct.reviewReqCount}`
                                : ind.tct.missingCount > 0
                                ? `Thiếu ${ind.tct.missingCount} ngày`
                                : `Cần rà soát ${ind.tct.reviewReqCount}`}
                            </span>
                            <span className="text-[10px] text-blue-700 font-bold ml-1 hover:underline">
                              [Xem ngày]
                            </span>
                          </button>
                        ) : ind.tct.isFullyComplete ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            100% Hoàn tất
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                            Đã giải quyết
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Không hỗ trợ</span>
                    )}
                  </td>

                  {/* Column 4: Total Missing Days */}
                  <td className="py-3 px-3 text-center">
                    {ind.totalMissing > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-900 border border-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        {ind.totalMissing} ngày
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        Đủ dữ liệu
                      </span>
                    )}
                  </td>

                  {/* Column 5: Quick Actions */}
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {/* Quick 1-click select all missing */}
                      {isAdmin && ind.totalMissing > 0 && onSelectAllUnfinished && (
                        <button
                          type="button"
                          onClick={() => onSelectAllUnfinished(ind.code)}
                          className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-slate-950 hover:bg-amber-400 transition shadow-xs"
                          title={`Chọn tất cả ngày còn thiếu của ${ind.code} (theo tháng và nguồn đang lọc); bấm lần nữa để bỏ chọn`}
                        >
                          <Zap className="h-3.5 w-3.5 text-slate-950" />
                          <span>Chọn ngày thiếu</span>
                        </button>
                      )}

                      {/* Jump / Filter to Indicator */}
                      <button
                        type="button"
                        onClick={() => onSelectIndicator(isSelected ? 'ALL' : ind.code)}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                          isSelected
                            ? 'border-blue-300 bg-blue-100 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span>{isSelected ? 'Bỏ lọc' : 'Xem ngày'}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
