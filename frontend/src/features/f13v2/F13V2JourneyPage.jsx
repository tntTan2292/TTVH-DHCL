import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/client.js';
import { PageContainer } from '../../components/common/Containers.jsx';
import { nextSortState } from '../../components/common/tableSort.js';
import { useIndicator } from '../indicator/IndicatorContext.js';
import { indicatorTheme, F13_INDICATOR } from '../indicator/indicatorConfig.js';
import { fetchJourneyParcels, fetchJourneyRoutes, fetchLayout, resolvePeriod } from './api/f13v2Api.js';
import { buildScopedUnitOptions } from './f13v2Helpers.js';
import { JOURNEY_MILESTONES, coveragePercent } from './journeyHelpers.js';
import F13V2JourneyRouteTable from './components/F13V2JourneyRouteTable.jsx';
import F13V2JourneyParcelTable from './components/F13V2JourneyParcelTable.jsx';

const TEXT_SORT_FIELDS = ['ma_bg', 'ten_buu_ta', 'danh_gia'];

// Chuyên đề "Hành trình bưu gửi" (F13-V2-JOURNEY-01): the legs of F1.3 from the TMS scan to delivery. No fault is judged here.
export default function F13V2JourneyPage() {
  const indicator = useIndicator() || F13_INDICATOR;
  const theme = indicatorTheme(indicator);
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get('date') || '';
  const bcvh = searchParams.get('bcvh') || 'all';
  const route = searchParams.get('route') || '';
  const search = searchParams.get('search') || '';

  const [layout, setLayout] = useState(null);
  const [metaUnits, setMetaUnits] = useState([]);
  const [routeState, setRouteState] = useState({ loading: true, data: null, error: null });
  const [parcelState, setParcelState] = useState({ loading: true, data: null, error: null });
  const [parcelSort, setParcelSort] = useState({ field: 'tms_ptc', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState(search);

  const updateParams = (patch) => {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      Object.entries(patch).forEach(([key, value]) => {
        if (value && value !== 'all') next.set(key, value);
        else next.delete(key);
      });
      return next;
    }, { replace: true });
    setPage(1);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchLayout().catch(() => null),
      api.get('/f13/dashboard/meta').catch(() => null),
    ]).then(([layoutData, metaResponse]) => {
      if (!active) return;
      setLayout(layoutData);
      setMetaUnits(metaResponse?.data?.data?.bcvh_units || []);
    });
    return () => { active = false; };
  }, []);

  // No date in the URL: open the latest day with data, as the other pages of the module do.
  useEffect(() => {
    if (date) return undefined;
    let active = true;
    resolvePeriod({ kind: 'latest' })
      .then((result) => {
        if (active && result?.day) {
          setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.set('date', result.day);
            return next;
          }, { replace: true });
        }
      })
      .catch((error) => {
        if (active) setRouteState({ loading: false, data: null, error: error?.message || 'Không xác định được ngày dữ liệu mới nhất.' });
      });
    return () => { active = false; };
  }, [date, setSearchParams]);

  useEffect(() => {
    if (!date) return undefined;
    let active = true;
    setRouteState((previous) => ({ ...previous, loading: true, error: null }));
    fetchJourneyRoutes({ date, maBcvh: bcvh })
      .then((data) => { if (active) setRouteState({ loading: false, data, error: null }); })
      .catch((error) => {
        if (active) setRouteState({ loading: false, data: null, error: error?.response?.data?.error?.message || error?.message || 'Không tải được hành trình.' });
      });
    return () => { active = false; };
  }, [date, bcvh]);

  useEffect(() => {
    if (!date) return undefined;
    let active = true;
    setParcelState((previous) => ({ ...previous, loading: true, error: null }));
    fetchJourneyParcels({ date, maBcvh: bcvh, route, search, sort: parcelSort.field, order: parcelSort.direction, page })
      .then((data) => { if (active) setParcelState({ loading: false, data, error: null }); })
      .catch((error) => {
        if (active) setParcelState({ loading: false, data: null, error: error?.response?.data?.error?.message || error?.message || 'Không tải được bưu gửi.' });
      });
    return () => { active = false; };
  }, [date, bcvh, route, search, parcelSort, page]);

  const unitOptions = useMemo(() => buildScopedUnitOptions({ layout, metaUnits }), [layout, metaUnits]);
  const allowAll = layout?.units?.allow_all === true;
  const routes = routeState.data?.routes;
  const coverage = routeState.data?.meta?.coverage;
  const routeName = route ? routes?.find((item) => item.ma_tuyen === route)?.ten_tuyen || route : '';

  return (
    <PageContainer
      accentClassName={theme.accentBar}
      badge={<span className={`rounded-full border px-3 py-0.5 text-sm font-black ${theme.chip}`}>F1.3</span>}
      title="F1.3 – Hành trình bưu gửi"
      subtitle="Từ lúc quét TMS xuống sàn Khai thác cấp 1 đến khi phát thành công. Chỉ hiện thời gian từng chặng, chưa kết luận lỗi."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="text-xs font-bold text-slate-600">
            Ngày đo kiểm
            <input
              type="date"
              value={date}
              onChange={(event) => updateParams({ date: event.target.value, route: '' })}
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold text-slate-800"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Bưu cục vận hành
            <select
              value={bcvh}
              onChange={(event) => updateParams({ bcvh: event.target.value, route: '' })}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold text-slate-800"
            >
              {allowAll ? <option value="all">Tất cả BCVH</option> : null}
              {unitOptions.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
            </select>
          </label>
          <form
            onSubmit={(event) => { event.preventDefault(); updateParams({ search: searchText.trim() }); }}
            className="text-xs font-bold text-slate-600"
          >
            Tìm số hiệu trong ngày
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onBlur={() => updateParams({ search: searchText.trim() })}
              placeholder="VD: EA464803978VN"
              className="mt-1 block w-56 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-semibold text-slate-800"
            />
          </form>
          {route ? (
            <button
              type="button"
              onClick={() => updateParams({ route: '' })}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${theme.button}`}
            >
              Bỏ chọn tuyến: {routeName}
            </button>
          ) : null}
        </div>

        {coverage?.parcels ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {JOURNEY_MILESTONES.map((item, index) => (
              <div key={item.key} className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="text-xs font-bold text-slate-500">Mốc {index + 1}: {item.label}</div>
                <div className="mt-0.5 text-lg font-black tabular-nums text-slate-900">{coveragePercent(coverage[item.key], coverage.parcels)}</div>
                <div className="text-[11px] text-slate-500">{coverage[item.key].toLocaleString('vi-VN')} / {coverage.parcels.toLocaleString('vi-VN')} bưu gửi có mốc này</div>
              </div>
            ))}
          </div>
        ) : null}

        <p className="text-xs text-slate-500">
          Mốc nào dữ liệu chưa có thì để trống. Số giờ tính theo đồng hồ nên có thể khác số giờ TCT. Trung vị của từng cột lấy trên các bưu gửi có đủ hai mốc của cột đó, nên các cột không cộng lại thành tổng.
        </p>

        {routeState.loading && !routes ? (
          <div className="flex h-40 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-500">Đang tải hành trình theo tuyến...</div>
        ) : routeState.error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-center text-sm font-bold text-rose-800">{routeState.error}</div>
        ) : routes?.length ? (
          <F13V2JourneyRouteTable routes={routes} date={date} selectedRoute={route} onSelectRoute={(value) => updateParams({ route: value })} />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-500">Không có dữ liệu F1.3 cho ngày đã chọn.</div>
        )}

        <F13V2JourneyParcelTable
          data={parcelState.data}
          loading={parcelState.loading}
          error={parcelState.error}
          date={date}
          routeName={routeName}
          sort={parcelSort}
          onSort={(field) => { setParcelSort((current) => nextSortState(current, field, { textFields: TEXT_SORT_FIELDS })); setPage(1); }}
          onPage={setPage}
        />
      </div>
    </PageContainer>
  );
}
