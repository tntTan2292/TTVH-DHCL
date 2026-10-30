import React from 'react';
import { TrendingDown, TrendingUp, AlertCircle, Package } from 'lucide-react';
import { formatDeltaRate } from '../opsJournalHelpers.js';

export default function SpotMetricsSummary({ indicator, metrics = {} }) {
  if (!metrics) return null;

  const isHangTon = indicator === 'HANGTON';

  if (isHangTon) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <div className="flex items-center gap-1 font-semibold text-rose-700">
          <AlertCircle size={14} className="text-rose-500" />
          <span>Tồn ≥5N:</span>
          <span className="font-bold">{metrics.stockGe5 ?? 0}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-700">
          <span>≥7N:</span>
          <span className="font-bold text-rose-600">{metrics.stockGe7 ?? 0}</span>
        </div>
        <div className="flex items-center gap-1 text-slate-700">
          <span>≥14N:</span>
          <span className="font-bold text-rose-800">{metrics.stockGe14 ?? 0}</span>
        </div>
        {metrics.cod != null && (
          <div className="flex items-center gap-1 text-slate-700">
            <Package size={13} className="text-amber-500" />
            <span>COD:</span>
            <span className="font-semibold text-amber-700">{metrics.cod}</span>
          </div>
        )}
      </div>
    );
  }

  const delta = metrics.delta;
  const isDrop = delta != null && Number(delta) < 0;
  const isRise = delta != null && Number(delta) > 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs">
      {metrics.rate != null && (
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Tỷ lệ:</span>
          <span className="font-extrabold text-slate-900">{Number(metrics.rate).toFixed(1)}%</span>
        </div>
      )}

      {metrics.total != null && (
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Sản lượng:</span>
          <span className="font-semibold text-slate-800">{metrics.total.toLocaleString('vi-VN')} BG</span>
        </div>
      )}

      {metrics.fail != null && (
        <div className="flex items-center gap-1">
          <span className="text-slate-500">K.Đạt:</span>
          <span className="font-bold text-rose-600">{metrics.fail.toLocaleString('vi-VN')} BG</span>
        </div>
      )}

      {delta != null && (
        <div className={`flex items-center gap-0.5 font-semibold ${isDrop ? 'text-rose-600' : isRise ? 'text-emerald-600' : 'text-slate-600'}`}>
          {isDrop && <TrendingDown size={13} />}
          {isRise && <TrendingUp size={13} />}
          <span>{formatDeltaRate(delta)}</span>
        </div>
      )}

      {metrics.compareRate != null && (
        <div className="flex items-center gap-1 text-slate-500">
          <span>(Tuần trc: {Number(metrics.compareRate).toFixed(1)}%)</span>
        </div>
      )}

      {metrics.mtdRate != null && (
        <div className="flex items-center gap-1 text-slate-600">
          <span>LK tháng:</span>
          <span className="font-semibold text-slate-800">{Number(metrics.mtdRate).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

