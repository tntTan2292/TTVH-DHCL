import { useRef } from 'react';
import { AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTargetRate, indicatorTheme } from '../../indicator/indicatorConfig.js';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import {
  classifyF13HeatmapRate,
  F13_HEATMAP_TONE_CLASS,
} from '../../../components/f13/f13HeatmapBandCatalog.js';
import { formatRate, formatVolume } from '../../dashboard/components/bcvhOperationTableData.js';
import { deriveAttentionPostmen } from './f42PostmanTableHelpers.js';

export default function F42PostmanAttentionBlock({
  units = [],
  periodLabel = '',
  maBcvh = 'all',
  onSelectPostman = null,
}) {
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);
  const cardRef = useRef(null);

  const attentionList = deriveAttentionPostmen(units, {
    targetRate,
    limit: 10,
    maBcvh,
  });

  const isMultiUnit = !maBcvh || maBcvh === 'all';
  const blockTitle = `Bưu tá cần chú ý – ${periodLabel}`;

  return (
    <div
      ref={cardRef}
      className="w-full rounded-2xl border border-rose-200/90 bg-white p-4 shadow-2xs transition-all duration-200"
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-rose-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
              <ShieldAlert size={12} className="text-rose-600" />
              Bưu tá cần chú ý
            </span>
            <span className={`text-xs font-semibold ${theme.text}`}>{periodLabel}</span>
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Top 10 bưu tá dưới {targetRate} % có số bưu gửi không đạt cao nhất
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Danh sách ưu tiên đôn đốc và hỗ trợ chất lượng phát giao theo kỳ báo cáo hiện hành.
          </p>
        </div>

        <div data-no-capture="true" className="self-end sm:self-center">
          <BlockCaptureButton
            targetRef={cardRef}
            blockTitle={blockTitle}
            dateOrPeriod={periodLabel}
            indicatorOverride={indicator.moduleLabel}
          />
        </div>
      </div>

      {/* Content */}
      {attentionList.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center text-slate-500">
          <CheckCircle size={32} className="text-emerald-500 mb-2" />
          <p className="text-sm font-semibold text-slate-700">
            Không có bưu tá nào dưới mục tiêu {targetRate} % trong kỳ này!
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Tất cả bưu tá đã phát giao đều đạt tỷ lệ từ {targetRate} % trở lên.
          </p>
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead>
              <tr className="border-b border-rose-100 bg-rose-50/50 text-[11px] font-bold text-rose-950">
                <th className="py-2 px-2 text-center w-10">#</th>
                <th className="py-2 px-2.5">Mã bưu tá</th>
                <th className="py-2 px-2.5">Tên bưu tá</th>
                {isMultiUnit && <th className="py-2 px-2.5">BCVH</th>}
                <th className="py-2 px-2.5 text-right">Sản lượng</th>
                <th className="py-2 px-2.5 text-right">Đạt</th>
                <th className="py-2 px-2.5 text-right text-rose-700">Không đạt</th>
                <th className="py-2 px-2.5 text-center">Tỷ lệ đạt</th>
                <th className="py-2 px-2 text-center">Hạng BCVH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {attentionList.map((postman, index) => {
                const band = classifyF13HeatmapRate(postman.rate, indicator.heatmapBands);
                const toneClass = F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable;

                return (
                  <tr key={`${postman.ma_bcvh}-${postman.ma_buu_ta}`} className="hover:bg-rose-50/30 transition-colors">
                    <td className="py-2 px-2 text-center font-bold text-rose-700">
                      {index + 1}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600">
                      {postman.ma_buu_ta}
                    </td>
                    <td className="py-2 px-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectPostman?.(postman, {
                            ma_bcvh: postman.ma_bcvh,
                            ten_bcvh: postman.ten_bcvh,
                          })
                        }
                        className="font-bold text-slate-900 hover:text-sky-700 hover:underline cursor-pointer text-left transition-colors"
                        title={`Xem xu hướng phát giao của bưu tá ${postman.ten_buu_ta}`}
                      >
                        {postman.ten_buu_ta}
                      </button>
                    </td>
                    {isMultiUnit && (
                      <td className="py-2 px-2.5 text-slate-600">
                        {postman.ten_bcvh?.replace('BCVH ', '') || postman.ma_bcvh}
                      </td>
                    )}
                    <td className="py-2 px-2.5 text-right tabular-nums text-slate-700">
                      {formatVolume(postman.volume)}
                    </td>
                    <td className="py-2 px-2.5 text-right tabular-nums text-emerald-700 font-semibold">
                      {formatVolume(postman.passed)}
                    </td>
                    <td className="py-2 px-2.5 text-right tabular-nums text-rose-700 font-bold">
                      {formatVolume(postman.failed)}
                      {postman.blank > 0 && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          (gồm {postman.blank} chưa ĐG)
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <span
                        className={`inline-flex items-center justify-center min-w-[54px] px-1.5 py-0.5 rounded border text-xs font-bold tabular-nums ${toneClass}`}
                        title={`${band.label}: ${formatRate(postman.rate)}`}
                      >
                        {formatRate(postman.rate)}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center tabular-nums text-slate-500 font-semibold">
                      #{postman.rank_in_bcvh || postman.rank || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Note of the standard */}
      <div className="mt-3 pt-2.5 border-t border-rose-100 flex items-center gap-1.5 text-[11px] text-slate-500">
        <AlertCircle size={13} className="text-amber-500 shrink-0" />
        <span>
          <strong>Ghi chú quy tắc:</strong> Bưu gửi chưa có thông tin đánh giá được tính vào số lượng không đạt theo quy định F4.2 (mẫu số bao gồm toàn bộ dòng GBT).
        </span>
      </div>
    </div>
  );
}
