import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ExternalLink } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { INDICATORS, indicatorTheme } from '../../indicator/indicatorConfig.js';
import { IndicatorProvider } from '../../indicator/IndicatorContext.js';
import {
  formatGap,
  LOWEST_UNITS_TEXT_FIELDS,
  nextSortState,
  sortLowestUnits,
} from '../homeTableSort.js';

export default function LowestUnitsBlock({
  indicatorData,
  selectedIndicator = 'f11',
}) {
  const navigate = useNavigate();
  const blockRef = useRef(null);
  const indConfig = INDICATORS[selectedIndicator] || INDICATORS.f11;
  const theme = indicatorTheme(indConfig);

  const [sort, setSort] = useState({ field: 'rate', direction: 'asc' });

  const handleSort = (field) => {
    setSort((current) => nextSortState(current, field, { textFields: LOWEST_UNITS_TEXT_FIELDS }));
  };

  const rawUnits = indicatorData?.lowest_units || [];

  const sortedUnits = useMemo(() => {
    return sortLowestUnits(rawUnits, sort);
  }, [rawUnits, sort]);

  const unitCategoryLabel = selectedIndicator === 'f12' ? 'Đơn vị / Bưu cục chấp nhận' : 'BCVH phát';
  const rankingUrl = indConfig.routes?.ranking || `/${selectedIndicator}/ranking/bcvh`;

  return (
    <IndicatorProvider indicator={indConfig}>
      <section
        ref={blockRef}
        className="rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-[box-shadow,border-color] duration-150 p-5 space-y-4"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-1.5 rounded-full ${theme.accentBar}`} />
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                ĐƠN VỊ CẦN HÀNH ĐỘNG — {indConfig.moduleLabel}
              </h3>
              <span className="rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-xs font-bold text-rose-700">
                Top 5 tỷ lệ thấp nhất
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Các {unitCategoryLabel.toLowerCase()} cần ưu tiên tháo gỡ khó khăn, đôn đốc để cải thiện chất lượng ngay.
            </p>
          </div>

          <div data-no-capture="true" className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(rankingUrl)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
            >
              <span>Xem đầy đủ bảng xếp hạng {indConfig.moduleLabel}</span>
              <ExternalLink size={13} />
            </button>

            <BlockCaptureButton
              targetRef={blockRef}
              blockTitle={`Đơn vị cần hành động - ${indConfig.moduleLabel}`}
              dateOrPeriod={`Ngày ${indicatorData?.data_date || ''}`}
            />
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          {!sortedUnits.length ? (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              Chưa có dữ liệu phân rã đơn vị cho ngày này.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <SortableTh field="ma_bcvh" sort={sort} onSort={handleSort} className="px-4 py-2.5 text-left w-28">
                    Mã đơn vị
                  </SortableTh>
                  <SortableTh field="ten_bcvh" sort={sort} onSort={handleSort} className="px-4 py-2.5 text-left">
                    Tên đơn vị
                  </SortableTh>
                  <SortableTh field="rate" sort={sort} onSort={handleSort} className="px-4 py-2.5 text-right w-28">
                    Tỷ lệ (%)
                  </SortableTh>
                  <SortableTh field="gap_to_target" sort={sort} onSort={handleSort} className="px-4 py-2.5 text-right w-28">
                    Chênh mục tiêu
                  </SortableTh>
                  <SortableTh field="failed" sort={sort} onSort={handleSort} className="px-4 py-2.5 text-right w-28">
                    Không đạt (BG)
                  </SortableTh>
                  <SortableTh field="volume" sort={sort} onSort={handleSort} className="px-4 py-2.5 text-right w-28">
                    Sản lượng
                  </SortableTh>
                  <th className="px-4 py-2.5 text-center w-24">
                    Chi tiết
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {sortedUnits.map((u) => {
                  const unitRate = Number(u.rate);

                  return (
                    <tr key={u.ma_bcvh} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-700">
                        {u.ma_bcvh}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        {u.ten_bcvh}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        <span className="px-2 py-0.5 rounded-md border font-black text-rose-700 bg-rose-50 border-rose-200">
                          {unitRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-bold text-rose-600">
                        {formatGap(u.gap_to_target)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-black text-rose-600">
                        {Number(u.failed || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-600">
                        {Number(u.volume || 0).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => navigate(rankingUrl)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                          title="Đi tới bảng xếp hạng chi tiết"
                        >
                          <span>Xem</span>
                          <ArrowRight size={11} />
                        </button>
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
