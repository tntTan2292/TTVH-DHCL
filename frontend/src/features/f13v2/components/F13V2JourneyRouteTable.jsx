import { useMemo, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { waitForNextPaint } from '../../../components/common/blockCaptureHelper.js';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { nextSortState, sortRowsBy } from '../../../components/common/tableSort.js';
import { formatRate, formatVolume } from '../../dashboard/components/bcvhOperationTableData.js';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme, indicatorTargetRate } from '../../indicator/indicatorConfig.js';
import { classifyRateTone } from '../f13v2Helpers.js';
import {
  JOURNEY_ROUTE_STAGES,
  formatLegHours,
  formatPostmenWithVolume,
  groupJourneyRoutesByBcvh,
  journeyRouteValue,
} from '../journeyHelpers.js';

const CAPTURE_TOPS = [15, 20, 25, 30];
const TEXT_FIELDS = ['ma_tuyen', 'ten_tuyen', 'ten_bcvh', 'postmen', 'main_cause'];

function RateBadge({ rate, target = 90 }) {
  const tone = classifyRateTone(rate, target);
  const toneClasses = {
    success: 'text-emerald-800 bg-emerald-100/80 border-emerald-300 font-bold',
    warning: 'text-amber-800 bg-amber-100/80 border-amber-300 font-bold',
    danger: 'text-rose-800 bg-rose-100/80 border-rose-300 font-black',
    neutral: 'text-slate-700 bg-slate-100 border-slate-200 font-medium',
  }[tone];

  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs border tabular-nums ${toneClasses}`}>
      {formatRate(rate)}
    </span>
  );
}

function StageHoursCell({ row, stageKey }) {
  const isSlowest = row.slowest_leg === stageKey;
  const failedHours = row.legs_failed?.[stageKey];
  const passedHours = row.legs_passed?.[stageKey];
  const diffHours = (failedHours !== null && failedHours !== undefined && passedHours !== null && passedHours !== undefined)
    ? (failedHours - passedHours).toFixed(1)
    : null;

  return (
    <>
      <td className={`px-2 py-1.5 text-center tabular-nums text-xs border-r border-slate-100 ${isSlowest ? 'bg-rose-50/70' : ''}`}>
        {isSlowest && failedHours !== null && failedHours !== undefined ? (
          <span
            className="inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 font-black text-rose-800 border border-rose-300"
            title={`Chặng trễ nhất của bưu gửi không đạt: chậm hơn bưu gửi đạt ${diffHours}h`}
          >
            <span>{formatLegHours(failedHours)}</span>
            <span className="text-[10px] text-rose-600">⚠</span>
          </span>
        ) : (
          <span className="text-rose-700 font-semibold">
            {formatLegHours(failedHours)}
          </span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center tabular-nums text-xs text-emerald-700 font-medium border-r border-slate-200">
        {formatLegHours(passedHours)}
      </td>
    </>
  );
}

// Rebuilt F1.3 Journey Route Table (F13-JOURNEY-ROUTE-02 U1)
// J1-J6: Grouped by BCVH, Postman table + Bottom 2 groups, Không đạt beside Đạt with slowest_leg marked,
// strictly preserves column title "Bưu tá" everywhere, clicking a route opens its parcels.
export default function F13V2JourneyRouteTable({ routes = [], periodLabel = '', selectedRoute, onSelectRoute }) {
  const cardRef = useRef(null);
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const targetRate = indicatorTargetRate(indicator);

  const [sort, setSort] = useState(null);
  const [captureTop, setCaptureTop] = useState(25);
  const [capturing, setCapturing] = useState(false);

  const headerSort = sort || { field: 'own_shortfall', direction: 'desc' };
  const handleSort = (field) => setSort((current) => nextSortState(current || headerSort, field, { textFields: TEXT_FIELDS }));

  // Groups routes by BCVH in API order (J2)
  const bcvhGroups = useMemo(() => groupJourneyRoutesByBcvh(routes), [routes]);

  const titleTh = (field, label, extraClass = '', rowSpan = 2, colSpan = 1) => (
    <SortableTh
      field={field}
      sort={headerSort}
      onSort={handleSort}
      activeClassName={theme.sortActive}
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={`px-2 py-2 text-center align-middle text-xs font-bold leading-snug border-r border-slate-200 ${extraClass}`}
    >
      {label}
    </SortableTh>
  );

  return (
    <section ref={cardRef} className="w-full rounded-2xl border border-slate-300 bg-white p-3 shadow-sm sm:p-4">
      {/* Header with Camera button */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-base font-black uppercase tracking-tight text-slate-900">
            Hành trình theo tuyến phát
          </h2>
          <p className={`text-xs font-bold ${theme.text}`}>
            {periodLabel} · Số giờ là trung vị của từng chặng · Bưu gửi Không đạt đặt cạnh Đạt
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <label data-no-capture="true" className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
            <span>Ảnh chụp lấy</span>
            <select
              value={captureTop}
              onChange={(event) => setCaptureTop(event.target.value === 'all' ? 'all' : Number(event.target.value))}
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-[11px] font-semibold text-slate-700"
            >
              {CAPTURE_TOPS.map((count) => <option key={count} value={count}>Top {count}</option>)}
              <option value="all">Tất cả</option>
            </select>
          </label>
          <BlockCaptureButton
            targetRef={cardRef}
            blockTitle="Hành trình theo tuyến phát"
            dateOrPeriod={periodLabel}
            beforeCapture={async () => { setCapturing(true); await waitForNextPaint(); }}
            afterCapture={() => setCapturing(false)}
          />
        </div>
      </div>

      {/* BCVH Groups */}
      {bcvhGroups.map((bcvhGroup) => {
        const sortedPostman = sortRowsBy(bcvhGroup.postmanRoutes, headerSort.field, headerSort.direction, journeyRouteValue);
        const postmanRows = capturing && captureTop !== 'all' ? sortedPostman.slice(0, captureTop) : sortedPostman;

        return (
          <div key={bcvhGroup.ma_bcvh} className="mb-6 last:mb-0 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            {/* BCVH Sub-header */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-slate-900">{bcvhGroup.ten_bcvh}</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono font-medium text-slate-600">
                  {bcvhGroup.ma_bcvh}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  • {bcvhGroup.postmanRoutes.length} tuyến bưu tá
                </span>
              </div>
            </div>

            {/* Main Postman Routes Table */}
            <div className={`w-full ${capturing ? 'overflow-visible' : 'overflow-x-auto'}`}>
              <table className="w-full min-w-[1300px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-800 text-xs font-bold">
                    <th rowSpan={2} className="w-10 px-2 py-2 text-center border-r border-slate-200">STT</th>
                    {titleTh('ma_tuyen', 'Mã tuyến', 'w-20 text-center')}
                    {titleTh('ten_tuyen', 'Tên tuyến phát', 'min-w-[140px] text-left')}
                    {/* J5: Keep column title "Bưu tá" everywhere */}
                    {titleTh('postmen', 'Bưu tá', 'min-w-[180px] text-left')}
                    {titleTh('volume', 'Sản lượng', 'w-18 text-right bg-blue-50/20')}
                    {titleTh('rate', 'Tỷ lệ (%)', 'w-18 text-center bg-blue-50/20')}
                    {titleTh('failed', 'Không đạt', 'w-18 text-right text-rose-700 bg-rose-50/20')}

                    {/* J3: 4 stages with Không đạt beside Đạt */}
                    {JOURNEY_ROUTE_STAGES.map((stage) => (
                      <th
                        key={stage.key}
                        colSpan={2}
                        className="px-2 py-1.5 text-center text-xs font-black border-r border-slate-200 bg-slate-100/80 text-slate-700"
                      >
                        {stage.label}
                      </th>
                    ))}

                    {titleTh('main_cause', 'Nguyên nhân chính', 'min-w-[180px] text-left')}
                  </tr>

                  {/* Sub-header row for stages: K.đạt | Đạt */}
                  <tr className="border-b-2 border-slate-300 bg-slate-50/90 text-slate-700 text-[11px] font-bold">
                    {JOURNEY_ROUTE_STAGES.map((stage) => (
                      <th key={`${stage.key}_sub`} colSpan={2} className="p-0 border-r border-slate-200">
                        <div className="grid grid-cols-2 text-center divide-x divide-slate-200">
                          <SortableTh
                            field={`legs_failed.${stage.key}`}
                            sort={headerSort}
                            onSort={handleSort}
                            activeClassName={theme.sortActive}
                            className="px-1 py-1 text-center font-bold text-rose-700 bg-rose-50/30"
                          >
                            K.đạt
                          </SortableTh>
                          <SortableTh
                            field={`legs_passed.${stage.key}`}
                            sort={headerSort}
                            onSort={handleSort}
                            activeClassName={theme.sortActive}
                            className="px-1 py-1 text-center font-bold text-emerald-700 bg-emerald-50/30"
                          >
                            Đạt
                          </SortableTh>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-xs">
                  {postmanRows.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="py-5 text-center text-slate-400">
                        Không có dữ liệu tuyến bưu tá cho kỳ đã chọn.
                      </td>
                    </tr>
                  ) : (
                    postmanRows.map((row, idx) => {
                      const isSelected = selectedRoute === (row.filter?.route || row.ma_tuyen);

                      return (
                        <tr
                          key={row.key || row.ma_tuyen}
                          onClick={() => onSelectRoute?.(row)}
                          className={`cursor-pointer transition-colors duration-100 ${
                            isSelected
                              ? 'bg-blue-100/60 ring-1 ring-blue-400'
                              : 'hover:bg-blue-50/40'
                          }`}
                        >
                          <td className="px-2 py-2 text-center font-semibold text-slate-500 border-r border-slate-100">
                            {idx + 1}
                          </td>
                          <td className="px-2 py-2 text-center font-mono font-bold text-slate-700 border-r border-slate-100">
                            {row.ma_tuyen}
                          </td>
                          <td className="px-2.5 py-2 font-bold text-slate-900 border-r border-slate-100 whitespace-normal break-words">
                            {row.ten_tuyen || row.ma_tuyen || '—'}
                          </td>
                          <td className="px-2.5 py-2 text-slate-700 border-r border-slate-100 whitespace-normal break-words leading-relaxed" title="Bưu tá và sản lượng phát trong kỳ">
                            {formatPostmenWithVolume(row.postmen)}
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-slate-800 border-r border-slate-100 tabular-nums">
                            {formatVolume(row.volume)}
                          </td>
                          <td className="px-2 py-2 text-center border-r border-slate-100">
                            <RateBadge rate={row.rate} target={targetRate} />
                          </td>
                          <td className="px-2 py-2 text-right font-bold text-rose-700 border-r border-slate-200 tabular-nums bg-rose-50/10">
                            {formatVolume(row.failed)}
                          </td>

                          {/* 4 stage hours: Không đạt beside Đạt */}
                          {JOURNEY_ROUTE_STAGES.map((stage) => (
                            <StageHoursCell key={stage.key} row={row} stageKey={stage.key} />
                          ))}

                          <td className="px-2.5 py-2 text-slate-800 font-medium whitespace-normal break-words leading-relaxed">
                            {row.main_cause || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Groups for this BCVH: NON_POSTMAN and OTHER (J4) */}
            {[
              {
                key: 'NON_POSTMAN',
                title: 'Phát tại quầy (khách đến nhận)',
                list: sortRowsBy(bcvhGroup.nonPostmanRoutes, headerSort.field, headerSort.direction, journeyRouteValue),
              },
              {
                key: 'OTHER',
                title: 'Tuyến chưa xác định',
                list: sortRowsBy(bcvhGroup.otherRoutes, headerSort.field, headerSort.direction, journeyRouteValue),
              },
            ].filter((group) => group.list.length > 0).map((group) => (
              <div key={group.key} className="mt-3.5 pt-3 border-t border-slate-200">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-slate-600" />
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                      {group.title}
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    * Tách riêng theo quy định PO, không xếp hạng chung với tuyến phát bưu tá
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-50/40">
                  <table className="w-full min-w-[1200px] border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-700 font-bold">
                        <th rowSpan={2} className="px-3 py-1.5 border-r border-slate-200">Phân loại tuyến</th>
                        {/* J5: Keep title "Bưu tá" everywhere */}
                        <th rowSpan={2} className="px-2.5 py-1.5 border-r border-slate-200">Bưu tá</th>
                        <th rowSpan={2} className="px-2 py-1.5 text-right border-r border-slate-200">Sản lượng</th>
                        <th rowSpan={2} className="px-2 py-1.5 text-center border-r border-slate-200">Tỷ lệ</th>
                        <th rowSpan={2} className="px-2 py-1.5 text-right text-rose-700 border-r border-slate-200">Không đạt</th>
                        {JOURNEY_ROUTE_STAGES.map((stage) => (
                          <th key={stage.key} colSpan={2} className="px-2 py-1 text-center border-r border-slate-200 bg-slate-200/50">
                            {stage.label}
                          </th>
                        ))}
                        <th rowSpan={2} className="px-2.5 py-1.5">Nguyên nhân chính</th>
                      </tr>
                      <tr className="border-b border-slate-200 bg-slate-100/90 text-[10px] text-slate-600 font-bold">
                        {JOURNEY_ROUTE_STAGES.map((stage) => (
                          <th key={`${stage.key}_sub_other`} colSpan={2} className="p-0 border-r border-slate-200">
                            <div className="grid grid-cols-2 text-center divide-x divide-slate-200">
                              <span className="px-1 py-0.5 text-rose-700">K.đạt</span>
                              <span className="px-1 py-0.5 text-emerald-700">Đạt</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60">
                      {group.list.map((row) => {
                        const isSelected = selectedRoute === (row.filter?.route || row.ma_tuyen);
                        const otherName = group.title;

                        return (
                          <tr
                            key={row.key || row.route_scope}
                            onClick={() => onSelectRoute?.(row)}
                            className={`cursor-pointer hover:bg-slate-100/60 ${
                              isSelected ? 'bg-blue-100/60 ring-1 ring-blue-400' : ''
                            }`}
                          >
                            <td className="px-3 py-2 font-bold text-slate-800 border-r border-slate-200">
                              {otherName}
                            </td>
                            <td className="px-2.5 py-2 text-slate-700 border-r border-slate-200">
                              {formatPostmenWithVolume(row.postmen)}
                            </td>
                            <td className="px-2 py-2 text-right font-medium text-slate-800 border-r border-slate-200 tabular-nums">
                              {formatVolume(row.volume)}
                            </td>
                            <td className="px-2 py-2 text-center border-r border-slate-200">
                              <RateBadge rate={row.rate} target={targetRate} />
                            </td>
                            <td className="px-2 py-2 text-right font-bold text-rose-700 border-r border-slate-200 tabular-nums">
                              {formatVolume(row.failed)}
                            </td>

                            {JOURNEY_ROUTE_STAGES.map((stage) => (
                              <StageHoursCell key={stage.key} row={row} stageKey={stage.key} />
                            ))}

                            <td className="px-2.5 py-2 text-slate-800 font-medium">
                              {row.main_cause || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      <p data-no-capture="true" className="mt-3 text-xs text-slate-500">
        * Bấm vào một tuyến bất kỳ để xem danh sách bưu gửi của tuyến đó trong kỳ đã chọn.
      </p>
    </section>
  );
}
