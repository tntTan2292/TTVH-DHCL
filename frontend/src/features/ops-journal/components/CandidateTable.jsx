import React from 'react';
import { Check, Trash2, MapPin, Layers, Lock } from 'lucide-react';
import { getIndicatorChipStyle, getSpotReasons } from '../opsJournalHelpers.js';

const TONE_CLASS = {
  bad: 'bg-rose-50 text-rose-700 border-rose-200',
  warn: 'bg-amber-50 text-amber-800 border-amber-200',
  good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};
import SpotMetricsSummary from './SpotMetricsSummary.jsx';

export default function CandidateTable({
  candidates = [],
  selectedIds = new Set(),
  lockedCandidateIds = new Set(),
  onToggleCandidate,
  onSelectAllVisible,
  manualSpots = [],
  onRemoveManualSpot,
}) {
  const visibleCandidateIds = candidates.map((c) => c.candidateId);
  const allVisibleSelected =
    visibleCandidateIds.length > 0 &&
    visibleCandidateIds.every((id) => selectedIds.has(id));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <th className="py-3 px-3.5 w-12 text-center">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(e) => onSelectAllVisible(e.target.checked)}
                  aria-label="Chọn tất cả ứng viên đang hiển thị"
                  className="h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
              </th>
              <th className="py-3 px-3 w-28">Chỉ tiêu</th>
              <th className="py-3 px-4 w-60">Đơn vị / Tuyến / Cặp</th>
              <th className="py-3 px-4">Nhận định chất lượng (Headline) & Số liệu chính</th>
              <th className="py-3 px-3 w-28 text-right">Điểm rủi ro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {/* 1. Manual Spots Rows (if any) */}
            {manualSpots.map((spot, idx) => {
              const chip = getIndicatorChipStyle(spot.indicator);
              return (
                <tr
                  key={`manual_${idx}`}
                  className="bg-amber-50/40 hover:bg-amber-50/70 transition-colors"
                >
                  <td className="py-3 px-3.5 text-center">
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-emerald-600 text-white font-bold text-[10px]" title="Điểm thủ công luôn được chọn">
                      <Check size={11} />
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex flex-col gap-1 items-start">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border ${chip.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${chip.dotClass}`} />
                        {chip.shortLabel}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
                        Thủ công
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{spot.title}</div>
                    <div className="text-[11px] text-slate-500">Mã: {spot.officeCode}</div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-800 italic leading-relaxed">
                      "{spot.headline}"
                    </p>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {spot.isLocked ? (
                      <span
                        className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full"
                        title="Điểm thủ công đã chốt, bị khóa và luôn được đếm"
                      >
                        <Lock size={9} />
                        Đã chốt
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onRemoveManualSpot(idx)}
                        className="inline-flex items-center gap-1 rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                        title="Xóa điểm thủ công này"
                      >
                        <Trash2 size={14} />
                        <span className="text-[11px] font-semibold">Xóa</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* 2. System Candidate Rows */}
            {candidates.length === 0 && manualSpots.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  Không tìm thấy ứng viên điểm đen nào phù hợp với bộ lọc.
                </td>
              </tr>
            ) : (
              candidates.map((cand, candIdx) => {
                const isSelected = selectedIds.has(cand.candidateId);
                const isLocked = lockedCandidateIds.has(cand.candidateId);
                const chip = getIndicatorChipStyle(cand.indicator);
                const isPair = cand.scopeType === 'PAIR';

                return (
                  <tr
                    key={cand.candidateId}
                    onClick={() => !isLocked && onToggleCandidate(cand.candidateId)}
                    className={`transition-colors ${
                      isLocked
                        ? 'bg-amber-50/30 cursor-not-allowed opacity-90'
                        : isSelected
                        ? 'cursor-pointer bg-blue-50/50 hover:bg-blue-50/80'
                        : 'cursor-pointer hover:bg-slate-50/70'
                    }`}
                  >
                    <td
                      className="py-3.5 px-3.5 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isLocked}
                        onChange={() => !isLocked && onToggleCandidate(cand.candidateId)}
                        aria-label={`Chọn điểm đen ${cand.title}`}
                        className={`h-4 w-4 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500 ${
                          isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        }`}
                      />
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold border ${chip.badgeClass}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${chip.dotClass}`} />
                          {chip.shortLabel}
                        </span>
                        {isLocked ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded-full" title="Điểm đen đã chốt, bị khóa và vẫn được đếm">
                            <Lock size={9} />
                            Đã chốt
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {isPair ? (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-cyan-50 px-1.5 py-0.5 text-[10px] font-extrabold text-cyan-800 border border-cyan-200" title="Cặp chấp nhận × phát">
                            <Layers size={10} />
                            PAIR
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                            <MapPin size={10} />
                            BCVH
                          </span>
                        )}
                        <span className="font-bold text-slate-900 leading-snug">{cand.title}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {cand.officeName} ({cand.officeCode})
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-1.5" data-testid="spot-reasons">
                          {getSpotReasons(cand.indicator, cand.metrics).map((reason) => (
                            <span
                              key={reason.text}
                              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${TONE_CLASS[reason.tone] || TONE_CLASS.neutral}`}
                            >
                              {reason.text}
                            </span>
                          ))}
                        </div>
                        <details className="text-[11px] text-slate-500" onClick={(e) => e.stopPropagation()}>
                          <summary className="cursor-pointer select-none font-medium text-blue-700 hover:underline">Xem nhận định đầy đủ</summary>
                          <div className="mt-1.5 space-y-1.5">
                            <p className="italic leading-relaxed text-slate-700">"{cand.headline}"</p>
                            <SpotMetricsSummary indicator={cand.indicator} metrics={cand.metrics} />
                          </div>
                        </details>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-black text-slate-900 text-sm">
                          #{candIdx + 1}
                        </span>
                        {cand.rankScore != null && (
                          <span className="text-[10px] font-semibold text-slate-500">
                            Rủi ro: {(cand.rankScore * 100).toFixed(0)}%
                          </span>
                        )}
                        {cand.score != null && (
                          <span className="text-[10px] font-semibold text-slate-400">
                            Điểm: {Number(cand.score).toFixed(1)}
                          </span>
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
    </div>
  );
}

