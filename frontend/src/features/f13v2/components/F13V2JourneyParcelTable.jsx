import { useRef } from 'react';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { useIndicator } from '../../indicator/IndicatorContext.js';
import { indicatorTheme } from '../../indicator/indicatorConfig.js';
import { JOURNEY_LEGS, JOURNEY_MILESTONES, formatJourneyDate, formatLegHours, formatMilestone } from '../journeyHelpers.js';

// One row per parcel: the five milestones and the hours between them. The server orders and pages the rows.
export default function F13V2JourneyParcelTable({ data, loading, error, date, routeName, sort, onSort, onPage }) {
  const cardRef = useRef(null);
  const indicator = useIndicator();
  const theme = indicatorTheme(indicator);
  const parcels = data?.parcels || [];
  const meta = data?.meta || {};
  const period = formatJourneyDate(date);

  const title = (field, label, extraClass = '') => (
    <SortableTh field={field} sort={sort} onSort={onSort} activeClassName={theme.sortActive} className={`px-2 py-2 text-center align-middle text-xs font-bold leading-snug ${extraClass}`}>
      {label}
    </SortableTh>
  );

  return (
    <section ref={cardRef} className="w-full rounded-2xl border border-slate-300 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div>
          <h2 className="text-base font-black uppercase tracking-tight text-slate-900">Hành trình từng bưu gửi</h2>
          <p className={`text-xs font-bold ${theme.text}`}>
            Ngày {period}{routeName ? ` · ${routeName}` : ''} · {(meta.total ?? 0).toLocaleString('vi-VN')} bưu gửi
          </p>
        </div>
        <BlockCaptureButton targetRef={cardRef} blockTitle="Hành trình từng bưu gửi" dateOrPeriod={period} />
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-sm font-bold text-slate-500">Đang tải bưu gửi...</div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-center text-sm font-bold text-rose-800">{error}</div>
      ) : parcels.length === 0 ? (
        <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 text-sm text-slate-500">Không có bưu gửi phù hợp.</div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1600px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 bg-slate-100 text-xs font-black uppercase text-slate-700">
                <th colSpan={3} className="border-r border-slate-300 px-2 py-1.5 text-center">Bưu gửi</th>
                <th colSpan={3} className="border-r border-slate-300 px-2 py-1.5 text-center">Lô (BF Phát)</th>
                <th colSpan={JOURNEY_MILESTONES.length} className={`border-r px-2 py-1.5 text-center ${theme.headerBg} ${theme.headerText} ${theme.headerBorder}`}>Các mốc</th>
                <th colSpan={JOURNEY_LEGS.length + 1} className={`px-2 py-1.5 text-center ${theme.header2Bg} ${theme.header2Text}`}>Số giờ giữa các mốc</th>
              </tr>
              <tr className="border-b-2 border-slate-300 bg-slate-50 text-slate-800">
                {title('ma_bg', 'Số hiệu', 'whitespace-nowrap')}
                {title('ten_buu_ta', 'Bưu tá')}
                {title('danh_gia', 'Đánh giá', 'border-r border-slate-300')}
                {title('ma_lo', 'Mã lô', 'whitespace-nowrap')}
                <th className="px-2 py-2 text-center align-middle text-xs font-bold leading-snug" title="Số đợt quét TMS của các bưu gửi Không đạt / của cả lô">Số đợt TMS</th>
                <th className="border-r border-slate-300 px-2 py-2 text-center align-middle text-xs font-bold leading-snug" title="Giờ quét TMS đợt cuối của lô: từ giờ này lô mới trọn">TMS đợt cuối</th>
                {JOURNEY_MILESTONES.map((item, index) => title(item.key, item.label, index === JOURNEY_MILESTONES.length - 1 ? 'border-r border-slate-300' : ''))}
                {JOURNEY_LEGS.map((leg) => title(leg.key, leg.label))}
                <th className="px-2 py-2 text-center align-middle text-xs font-bold leading-snug" title="Số giờ do TCT tính, khác với tổng theo đồng hồ">Số giờ TCT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {parcels.map((parcel) => (
                <tr key={parcel.ma_bg} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-xs font-semibold text-slate-800">{parcel.ma_bg}</td>
                  <td className="px-2 py-1.5 text-slate-700">{parcel.ten_buu_ta || '—'}</td>
                  <td className="whitespace-nowrap border-r border-slate-300 px-2 py-1.5 text-center text-slate-700">
                    {parcel.danh_gia || 'Chưa có'}
                    {parcel.khong_tron_lo ? (
                      <span className={`mt-0.5 block rounded border px-1 text-[11px] font-bold ${theme.chip}`} title="Nguyên nhân khách quan: lô không về trọn một đợt">Không trọn lô</span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-mono text-xs text-slate-700">{parcel.ma_lo || '—'}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 text-center tabular-nums text-slate-700">
                    {parcel.lot ? `${parcel.lot.failed_tms_batches} / ${parcel.lot.tms_batches}` : '—'}
                  </td>
                  <td className="whitespace-nowrap border-r border-slate-300 px-2 py-1.5 text-center tabular-nums text-slate-700">{formatMilestone(parcel.lot?.last_tms)}</td>
                  {JOURNEY_MILESTONES.map((item, index) => (
                    <td key={item.key} className={`whitespace-nowrap px-2 py-1.5 text-center tabular-nums text-slate-700 ${index === JOURNEY_MILESTONES.length - 1 ? 'border-r border-slate-300' : ''}`}>
                      {formatMilestone(parcel.milestones?.[item.key])}
                    </td>
                  ))}
                  {JOURNEY_LEGS.map((leg) => (
                    <td key={leg.key} className={`px-2 py-1.5 text-center tabular-nums ${leg.key === 'tms_ptc' ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {formatLegHours(parcel.legs?.[leg.key])}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center tabular-nums text-slate-700">{parcel.so_gio_tct || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta.total_pages > 1 ? (
        <div data-no-capture="true" className="mt-3 flex items-center justify-end gap-2 text-sm">
          <button type="button" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-700 disabled:opacity-40">Trước</button>
          <span className="font-semibold text-slate-600">Trang {meta.page} / {meta.total_pages}</span>
          <button type="button" disabled={meta.page >= meta.total_pages} onClick={() => onPage(meta.page + 1)} className="rounded-lg border border-slate-300 px-3 py-1 font-semibold text-slate-700 disabled:opacity-40">Sau</button>
        </div>
      ) : null}
    </section>
  );
}
