import { useMemo, useRef, useState } from 'react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { waitForNextPaint } from '../../../components/common/blockCaptureHelper.js';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { nextSortState, sortRowsBy } from '../../../components/common/tableSort.js';
import { classifyF13HeatmapRate, F13_HEATMAP_TONE_CLASS } from '../../../components/f13/f13HeatmapBandCatalog.js';
import { formatRate, formatVolume } from '../../dashboard/components/bcvhOperationTableData.js';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme } from '../../indicator/indicatorConfig.js';
import { HEADER_VOLUME, rateHeader } from '../f13v2Helpers.js';
import { JOURNEY_LEGS, formatJourneyDate, formatLegHours, formatPostmen, journeyRouteValue } from '../journeyHelpers.js';

const CAPTURE_TOPS = [15, 20, 25, 30];
const TEXT_FIELDS = ['ma_tuyen', 'ten_tuyen', 'ten_bcvh', 'postmen'];

// One row per delivery route of the day: the postmen of that day (F4.2), the volume and the median hours of each leg.
export default function F13V2JourneyRouteTable({ routes = [], date, selectedRoute, onSelectRoute }) {
  const cardRef = useRef(null);
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const [sort, setSort] = useState(null);
  const [captureTop, setCaptureTop] = useState(25);
  const [capturing, setCapturing] = useState(false);
  const headerSort = sort || { field: 'volume', direction: 'desc' };
  const handleSort = (field) => setSort((current) => nextSortState(current || headerSort, field, { textFields: TEXT_FIELDS }));

  const ordered = useMemo(
    () => sortRowsBy(routes, headerSort.field, headerSort.direction, journeyRouteValue),
    [routes, headerSort.field, headerSort.direction],
  );
  const truncated = capturing && captureTop !== 'all' && ordered.length > captureTop;
  const rows = truncated ? ordered.slice(0, captureTop) : ordered;
  const periodLabel = formatJourneyDate(date);

  const title = (field, label, extraClass = '') => (
    <SortableTh field={field} sort={headerSort} onSort={handleSort} activeClassName={theme.sortActive} className={`px-2 py-2 text-center align-middle text-xs font-bold leading-snug ${extraClass}`}>
      {label}
    </SortableTh>
  );

  return (
    <section ref={cardRef} className="w-full rounded-2xl border border-slate-300 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-base font-black uppercase tracking-tight text-slate-900">Hành trình theo tuyến phát</h2>
          <p className={`text-xs font-bold ${theme.text}`}>Ngày {periodLabel} · số giờ là trung vị của các bưu gửi có đủ hai mốc</p>
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

      <div className={`w-full ${capturing ? 'overflow-visible' : 'max-h-[min(70vh,680px)] overflow-auto'}`}>
        <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
          <thead className={capturing ? undefined : 'sticky top-0 z-10 bg-white'}>
            <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-800">
              {title('ten_bcvh', 'BCVH', 'whitespace-nowrap')}
              {title('ten_tuyen', 'Tuyến phát')}
              {title('postmen', 'Bưu tá trong ngày')}
              {title('volume', HEADER_VOLUME)}
              {title('rate', rateHeader(indicator))}
              {title('khong_tron_lo', 'BG không trọn lô', 'border-r border-slate-300')}
              {JOURNEY_LEGS.map((leg) => (
                <SortableTh key={leg.key} field={`legs.${leg.key}`} sort={headerSort} onSort={handleSort} activeClassName={theme.sortActive} className={`px-2 py-2 text-center align-middle text-xs font-bold leading-snug ${leg.key === 'tms_ptc' ? theme.headerBg : ''}`}>
                  {leg.label}
                </SortableTh>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {rows.map((row) => {
              const band = classifyF13HeatmapRate(Number(row.rate), indicator.heatmapBands);
              const selected = selectedRoute === row.ma_tuyen;
              return (
                <tr
                  key={`${row.ma_bcvh}-${row.ma_tuyen}`}
                  onClick={() => onSelectRoute(selected ? '' : row.ma_tuyen)}
                  className={`cursor-pointer transition-colors ${selected ? theme.soft : 'hover:bg-slate-50'}`}
                >
                  <td className="whitespace-nowrap px-2 py-1.5 text-slate-600">{(row.ten_bcvh || '').replace(/^BCVH\s+/i, '')}</td>
                  <td className="px-2 py-1.5 font-semibold text-slate-900">
                    {row.ten_tuyen || row.ma_tuyen || '—'}
                    <span className="block font-mono text-[11px] font-normal text-slate-500">{row.ma_tuyen}</span>
                  </td>
                  <td className="px-2 py-1.5 text-slate-700">{formatPostmen(row.postmen)}</td>
                  <td className="px-2 py-1.5 text-right font-bold tabular-nums">{formatVolume(row.volume)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`inline-flex min-w-[56px] justify-center rounded-md border px-1.5 py-0.5 font-bold tabular-nums ${F13_HEATMAP_TONE_CLASS[band.tone] || F13_HEATMAP_TONE_CLASS.unavailable}`}>
                      {formatRate(row.rate)}
                    </span>
                  </td>
                  <td className={`border-r border-slate-300 px-2 py-1.5 text-right tabular-nums ${row.khong_tron_lo ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                    {row.khong_tron_lo ? formatVolume(row.khong_tron_lo) : '—'}
                  </td>
                  {JOURNEY_LEGS.map((leg) => (
                    <td key={leg.key} className={`px-2 py-1.5 text-center tabular-nums ${leg.key === 'tms_ptc' ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {formatLegHours(row.legs?.[leg.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {truncated ? (
        <p className="mt-2 text-xs font-semibold text-slate-600">Ảnh chụp: top {captureTop} / {ordered.length} tuyến, theo thứ tự đang sắp.</p>
      ) : null}
      <p data-no-capture="true" className="mt-2 text-xs text-slate-500">Bấm một tuyến để xem từng bưu gửi của tuyến đó.</p>
    </section>
  );
}
