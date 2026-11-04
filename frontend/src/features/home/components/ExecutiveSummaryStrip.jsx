import React from 'react';
import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { INDICATORS } from '../../indicator/indicatorConfig.js';
import { buildRankSummary } from '../homeSummary.js';

/**
 * One-line summary under the control bar (PO 2026-11-04): how many of the indicators rose, kept or lost places in
 * the national ranking against the previous period, and which one lost the most. It only counts what the cards
 * show; there is no total score and no comparison with the target.
 */
export default function ExecutiveSummaryStrip({ indicators, period, loading }) {
  const summary = buildRankSummary(indicators, period);
  if (!summary) return null;
  const worstName = summary.worst ? (INDICATORS[summary.worst.id]?.moduleLabel || summary.worst.label) : null;

  return (
    <section
      aria-label="Tóm tắt điều hành"
      aria-busy={Boolean(loading)}
      className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-sm shadow-xs transition-opacity ${loading ? 'opacity-60' : ''}`}
    >
      <span className="font-black tracking-tight text-slate-900">Tóm tắt</span>
      {summary.counted === 0 ? (
        <span className="font-medium text-slate-600">Chưa có kỳ trước để so hạng toàn quốc.</span>
      ) : (
        <>
          <span className="text-xs font-semibold text-slate-600">Hạng toàn quốc so với {summary.basis}:</span>
          <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
            <ArrowUp size={14} /> {summary.up} chỉ tiêu tăng hạng
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-slate-600">
            <Minus size={14} /> {summary.same} giữ hạng
          </span>
          <span className="inline-flex items-center gap-1 font-bold text-rose-700">
            <ArrowDown size={14} /> {summary.down} giảm hạng
          </span>
          {summary.worst && (
            <span className="font-semibold text-slate-700">
              Giảm nhiều nhất: <span className="font-black text-rose-700">{worstName}</span> (−{summary.worst.places} bậc)
            </span>
          )}
          {summary.counted < summary.total && (
            <span className="text-xs font-medium text-slate-500">
              ({summary.total - summary.counted} chỉ tiêu chưa có kỳ trước để so)
            </span>
          )}
        </>
      )}
    </section>
  );
}
