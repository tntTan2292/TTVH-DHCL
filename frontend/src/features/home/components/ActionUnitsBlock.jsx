import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { shortBcvhName } from '../homeNames.js';
import { periodTitle } from '../homePeriod.js';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { IndicatorProvider } from '../../indicator/IndicatorContext.js';
import {
  LOWEST_UNITS_TEXT_FIELDS,
  nextSortState,
  sortLowestUnits,
} from '../homeTableSort.js';

// PO 2026-10-13: what the block lists depends on the indicator (the backend sends it as `focus_units`).
//   bcvh    (F1.3, F4.1) - quality of all six BCVH, lowest rate first
//   pairs   (F1.1)       - the 5 accepting-office x delivering-BCVH pairs with the largest volume below the threshold
//   offices (F1.2)       - the 5 accepting offices with the largest volume below the threshold
const KINDS = Object.freeze({
  bcvh: {
    title: 'CHẤT LƯỢNG CÁC BCVH',
    badge: 'Cả 6 BCVH',
    nameHeader: 'BCVH',
    defaultSort: { field: 'rate', direction: 'asc' },
  },
  pairs: {
    title: 'CẶP BƯU CỤC CHẤP NHẬN – PHÁT',
    badge: (threshold) => `5 cặp sản lượng lớn, dưới ${threshold}%`,
    nameHeader: 'Chấp nhận',
    defaultSort: { field: 'volume', direction: 'desc' },
  },
  offices: {
    title: 'BƯU CỤC CHẤP NHẬN',
    badge: (threshold) => `5 bưu cục sản lượng lớn, dưới ${threshold}%`,
    nameHeader: 'Bưu cục chấp nhận',
    defaultSort: { field: 'volume', direction: 'desc' },
  },
});

export default function ActionUnitsBlock({
  indicatorData,
  selectedIndicator = 'f11',
}) {
  const navigate = useNavigate();
  const blockRef = useRef(null);
  const indConfig = INDICATORS[selectedIndicator] || INDICATORS.f11;
  const theme = indicatorTheme(indConfig);

  const focus = indicatorData?.focus_units;
  const kind = KINDS[focus?.kind] ? focus.kind : 'bcvh';
  const spec = KINDS[kind];
  const threshold = focus?.threshold;
  const target = Number(indicatorData?.target_rate ?? indConfig.targetRate);

  // The chosen order is kept per indicator, so switching tabs shows each block in its own default order.
  const [sorts, setSorts] = useState({});
  const sort = sorts[selectedIndicator] || spec.defaultSort;
  const handleSort = (field) => {
    setSorts((current) => ({
      ...current,
      [selectedIndicator]: nextSortState(current[selectedIndicator] || spec.defaultSort, field, { textFields: LOWEST_UNITS_TEXT_FIELDS }),
    }));
  };

  const rawUnits = focus?.items;
  const sortedUnits = useMemo(() => sortLowestUnits(rawUnits || [], sort), [rawUnits, sort]);

  const rankingUrl = indConfig.routes?.ranking || `/${selectedIndicator}/ranking/bcvh`;
  const badge = typeof spec.badge === 'function' ? spec.badge(threshold) : spec.badge;
  const emptyText = kind === 'bcvh'
    ? 'Chưa có dữ liệu phân rã đơn vị cho kỳ này.'
    : `Không có ${kind === 'pairs' ? 'cặp bưu cục' : 'bưu cục'} nào dưới ${threshold}% trong kỳ này.`;

  return (
    <IndicatorProvider indicator={indConfig}>
      <section
        ref={blockRef}
        className="flex flex-1 flex-col rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs"
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-4 w-1.5 shrink-0 rounded-full ${theme.accentBar}`} />
            <h3 className="whitespace-nowrap text-sm font-black tracking-tight text-slate-900">
              {spec.title}
            </h3>
            <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${theme.chip}`}>
              {indConfig.moduleLabel}
            </span>
          </div>
          <div data-no-capture="true" className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(rankingUrl)}
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline"
              title={`Xem đầy đủ bảng xếp hạng ${indConfig.moduleLabel}`}
            >
              <span>Xem đầy đủ</span>
              <ExternalLink size={12} />
            </button>
            <BlockCaptureButton
              targetRef={blockRef}
              blockTitle={`${spec.title} - ${indConfig.moduleLabel}`}
              dateOrPeriod={periodTitle(indicatorData)}
            />
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          <span className="inline-flex items-center rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700">
            {badge}
          </span>
        </div>

        <div className="mt-2 flex-1 overflow-x-auto min-w-full">
          {!sortedUnits.length ? (
            <div className="py-5 text-center text-xs font-medium text-slate-400">
              {emptyText}
            </div>
          ) : (
            <table className="w-full whitespace-nowrap border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold uppercase tracking-normal text-slate-600">
                <tr>
                  <SortableTh field="ten_bcvh" sort={sort} onSort={handleSort} className="px-2.5 py-2 text-left">
                    {spec.nameHeader}
                  </SortableTh>
                  {kind === 'pairs' && (
                    <SortableTh field="ten_phat" sort={sort} onSort={handleSort} className="px-2.5 py-2 text-left">
                      Phát
                    </SortableTh>
                  )}
                  <SortableTh field="rate" sort={sort} onSort={handleSort} className="px-2.5 py-2 text-right">
                    Tỷ lệ
                  </SortableTh>
                  <SortableTh field="failed" sort={sort} onSort={handleSort} className="px-2.5 py-2 text-right">
                    Không đạt
                  </SortableTh>
                  <SortableTh field="volume" sort={sort} onSort={handleSort} className="px-2.5 py-2 text-right">
                    Sản lượng
                  </SortableTh>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedUnits.map((u) => {
                  const below = Number.isFinite(target) ? Number(u.rate) < target : true;
                  return (
                    <tr
                      key={u.key || u.ma_bcvh}
                      onClick={() => navigate(rankingUrl)}
                      className="cursor-pointer transition-colors hover:bg-slate-50/80"
                      title="Đi tới bảng xếp hạng chi tiết"
                    >
                      <td className="px-2.5 py-2 font-bold text-slate-900">{u.ten_bcvh}</td>
                      {kind === 'pairs' && (
                        <td className="px-2.5 py-2 font-bold text-slate-900">{shortBcvhName(u.ten_phat)}</td>
                      )}
                      <td className="px-2.5 py-2 text-right tabular-nums">
                        <span
                          className={`rounded-md border px-2 py-0.5 text-sm font-black ${below
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                        >
                          {Number(u.rate).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-right font-black tabular-nums text-rose-600">
                        {Number(u.failed || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-2.5 py-2 text-right font-semibold tabular-nums text-slate-700">
                        {Number(u.volume || 0).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </IndicatorProvider>
  );
}
