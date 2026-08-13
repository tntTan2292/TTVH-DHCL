import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock3, Donut } from 'lucide-react';
import { EmptyState, ErrorState, KPICard, PageContainer, StatusBadge } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import api from '../../api/client';
import UnifiedBcvhAnalysisTable from '../dashboard/components/UnifiedBcvhAnalysisTable';
import { buildBcvhOptions, validateBcvhUnits } from '../dashboard/components/dashboardFilterOptions';
import { buildDoughnutAriaLabel, formatNumber, formatRate, formatSignedDelta, mapBcvhRankingResponse } from '../dashboard/components/unifiedBcvhAnalysisTableData';

function toneFromKpi(rate) {
  if (rate === null || rate === undefined) return 'neutral';
  if (rate >= 70) return 'success';
  if (rate >= 60) return 'info';
  if (rate >= 50) return 'warning';
  return 'danger';
}

function toPct(value, total) {
  if (!total) return '0,0%';
  return `${((Number(value || 0) / Number(total || 0)) * 100).toLocaleString('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function SummaryRouteBands({ routeDistribution }) {
  const total = Number(routeDistribution?.participating_postman_route_count || 0);
  const counts = routeDistribution?.counts || {};

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      {[
        ['Tốt', counts.green],
        ['Khá', counts.pink],
        ['Trung bình', counts.yellow],
        ['Kém', counts.red],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl bg-[var(--color-surface-50)] px-3 py-2 text-[var(--color-text-main)]">
          <div className="font-semibold">{label}</div>
          <div>{formatNumber(value)} · {toPct(value, total)}</div>
        </div>
      ))}
    </div>
  );
}

function DoughnutSummary({ routeDistribution }) {
  const segments = routeDistribution?.segments || [];
  const total = Number(routeDistribution?.participating_postman_route_count || 0);
  if (!total || !segments.length) {
    return <div className="text-sm text-[var(--color-text-muted)]">Chưa có dữ liệu phân bổ tuyến.</div>;
  }

  const gradientStops = [];
  let offset = 0;
  segments.forEach((segment) => {
    const percent = segment.value / total;
    const nextOffset = offset + percent;
    gradientStops.push(`${segment.color} ${Math.round(offset * 100)}% ${Math.round(nextOffset * 100)}%`);
    offset = nextOffset;
  });

  return (
    <div className="flex items-center gap-4">
      <div
        aria-label={buildDoughnutAriaLabel(routeDistribution)}
        className="relative h-24 w-24 rounded-full"
        style={{ background: `conic-gradient(${gradientStops.join(', ')})` }}
      >
        <div className="absolute inset-[18px] flex items-center justify-center rounded-full bg-white text-center">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-[var(--color-text-muted)]">Tuyến</div>
            <div className="text-sm font-bold text-[var(--color-text-main)]">{formatNumber(total)}</div>
          </div>
        </div>
      </div>
      <SummaryRouteBands routeDistribution={routeDistribution} />
    </div>
  );
}

export default function BcvhRankingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [metaState, setMetaState] = useState({
    status: 'loading',
    options: [],
    error: null,
    maxDate: null,
  });
  const [rankingState, setRankingState] = useState({
    status: 'loading',
    data: null,
    error: null,
  });

  const fromDateParam = searchParams.get('from_date') || '';
  const toDateParam = searchParams.get('to_date') || '';
  const fromDate = fromDateParam || metaState.maxDate || '';
  const toDate = toDateParam || metaState.maxDate || '';
  const maBcvh = searchParams.get('bcvh_id') || searchParams.get('ma_bcvh') || 'all';
  const search = searchParams.get('search') || '';
  const interval = searchParams.get('interval') || (fromDate === toDate ? 'daily' : 'range');

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const updateBcvhParam = (value) => {
    const next = new URLSearchParams(searchParams);
    next.delete('ma_bcvh');
    if (value === undefined || value === null || value === '' || value === 'all') {
      next.delete('bcvh_id');
    } else {
      next.set('bcvh_id', value);
    }
    setSearchParams(next);
  };



  useEffect(() => {
    let active = true;
    setMetaState((prev) => ({ ...prev, status: 'loading', error: null }));
    api.get('/f13/dashboard/meta', { params: { _ts: Date.now() } })
      .then((res) => {
        if (!active) return;
        const units = res.data?.data?.bcvh_units || [];
        const validation = validateBcvhUnits(units);
        if (!validation.ok) {
          setMetaState({ status: 'error', options: [], error: validation.error, maxDate: null });
          return;
        }
        setMetaState({
          status: 'success',
          options: buildBcvhOptions(units),
          error: null,
          maxDate: res.data?.data?.max_date || null,
        });
      })
      .catch(() => {
        if (!active) return;
        setMetaState({ status: 'error', options: [], error: 'Không thể tải metadata BCVH. Vui lòng thử lại.', maxDate: null });
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!fromDate || !toDate) {
      // Waiting for /f13/dashboard/meta to resolve the latest valid date (no from_date/to_date
      // URL param present yet). Do not call the ranking API with empty dates.
      return () => {
        active = false;
      };
    }

    setRankingState({ status: 'loading', data: null, error: null });
    // BCVH Ranking keeps a single-evaluation-day contract: the request always sends
    // from_date === to_date (the anchor day), regardless of what the two date pickers
    // hold, now that the shared /f13/ranking/bcvh endpoint genuinely honours a range
    // for other callers (Operation Dashboard). This is unchanged runtime behaviour —
    // only to_date ever drove this screen's data before this fix.
    api.get('/f13/ranking/bcvh', {
      params: {
        from_date: toDate,
        to_date: toDate,
        page: 1,
        page_size: 1000,
        sort: 'rank',
        order: 'asc',
      },
    })
      .then((response) => {
        if (!active) return;
        if (!response?.data?.success) {
          throw new Error(response?.data?.error?.message || 'Không thể tải BCVH Ranking.');
        }
        setRankingState({
          status: 'success',
          data: mapBcvhRankingResponse(response.data, { fromDate, toDate, interval, maBcvh, search }),
          error: null,
        });
      })
      .catch((error) => {
        if (!active) return;
        setRankingState({
          status: 'error',
          data: null,
          error: error?.response?.data?.error?.message || error?.message || 'Không thể tải BCVH Ranking.',
        });
      });
    return () => {
      active = false;
    };
  }, [fromDate, toDate, interval, maBcvh, search]);

  const filteredRows = useMemo(() => {
    const rows = rankingState.data?.rows || [];
    return rows.filter((row) => {
      const matchesBcvh = maBcvh === 'all' || row.ma_bcvh === maBcvh;
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || row.ten_bcvh.toLowerCase().includes(q) || row.ma_bcvh.toLowerCase().includes(q);
      return matchesBcvh && matchesSearch;
    });
  }, [rankingState.data?.rows, maBcvh, search]);

  const totalRow = rankingState.data?.total_row || null;
  const totalBcvh = Math.max(0, metaState.options.length - 1);
  const bcvhWithData = filteredRows.length;
  const affectedLateCashCount = filteredRows.filter((row) => Number(row.late_cash.count || 0) > 0).length;
  const summaryRow = maBcvh !== 'all'
    ? (filteredRows[0] || totalRow)
    : totalRow;
  const routeDistribution = totalRow?.route_distribution || {
    participating_postman_route_count: 0,
    counts: { green: 0, pink: 0, yellow: 0, red: 0 },
    segments: [],
  };

  const summaryCards = [
    {
      label: 'Sản lượng ngày đánh giá',
      value: formatNumber(summaryRow?.current_day.volume),
      delta: `${formatNumber(summaryRow?.current_day.pass_count)} đạt · ${formatNumber(summaryRow?.current_day.fail_count)} không đạt`,
      trend: totalBcvh ? `${formatNumber(bcvhWithData)}/${formatNumber(totalBcvh)} BCVH có dữ liệu` : undefined,
      tone: 'primary',
    },
    {
      label: 'Chất lượng F1.3',
      value: formatRate(summaryRow?.current_day.rate),
      delta: `D-1 ${formatSignedDelta(summaryRow?.comparisons?.d1?.rate_delta, 'điểm %')} · D-7 ${formatSignedDelta(summaryRow?.comparisons?.d7?.rate_delta, 'điểm %')}`,
      trend: summaryRow?.current_day?.signal?.label || undefined,
      tone: toneFromKpi(summaryRow?.current_day.rate),
    },
    {
      label: 'Chậm nộp tiền',
      value: formatNumber(summaryRow?.late_cash.count),
      delta: `Tỷ lệ ${formatRate(summaryRow?.late_cash.rate)}`,
      trend: bcvhWithData ? `${formatNumber(affectedLateCashCount)}/${formatNumber(bcvhWithData)} BCVH bị ảnh hưởng` : undefined,
      tone: 'neutral',
    },
    {
      label: 'Phân bổ chất lượng tuyến',
      value: formatNumber(routeDistribution.participating_postman_route_count),
      delta: `Tốt ${formatNumber(routeDistribution.counts.green)} · Khá ${formatNumber(routeDistribution.counts.pink)} · Trung bình ${formatNumber(routeDistribution.counts.yellow)} · Kém ${formatNumber(routeDistribution.counts.red)}`,
      trend: buildDoughnutAriaLabel(routeDistribution),
      tone: 'danger',
    },
  ];

  const showNoData = rankingState.status === 'success' && filteredRows.length === 0;
  const nearestAvailableDate = metaState.maxDate && metaState.maxDate !== toDate ? metaState.maxDate : null;

  return (
    <PageContainer
      title="Bảng xếp hạng chất lượng BCVH"
      subtitle="Theo ngày đánh giá."
      action={(
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={interval === 'daily' ? 'Theo ngày' : 'Khoảng ngày'} tone="neutral" />
        </div>
      )}
    >
      <div className="space-y-5">
        <GlobalFilterBar
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={(value) => updateParam('from_date', value)}
          onToDateChange={(value) => updateParam('to_date', value)}
          showKpiFilter={false}
          bcvhValue={maBcvh}
          onBcvhChange={(value) => updateBcvhParam(value)}
          bcvhOptions={metaState.options}
          bcvhDisabled={metaState.status !== 'success'}
          searchValue={search}
          onSearchChange={(value) => updateParam('search', value)}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="So sánh kỳ trước" tone="warning" />
              <StatusBadge label="Xem chi tiết tuyến" tone="info" />
            </div>
          )}
        />

        {metaState.status === 'error' ? (
          <ErrorState title="Không thể tải danh sách BCVH" description={metaState.error} />
        ) : null}

        {rankingState.status === 'error' ? (
          <ErrorState title="Không thể tải BCVH Ranking" description={rankingState.error} />
        ) : null}

        {!showNoData ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard {...summaryCards[0]} />
            <KPICard {...summaryCards[1]} />
            <KPICard {...summaryCards[2]} />
            <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">{summaryCards[3].label}</p>
                  <p className="mt-2 text-3xl font-black text-[var(--color-text-main)]">{summaryCards[3].value}</p>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-text-main)] shadow-sm">
                  <Donut className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-[var(--color-text-muted)]">{summaryCards[3].delta}</p>
              <div className="mt-4">
                <DoughnutSummary routeDistribution={routeDistribution} />
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title={`Không có dữ liệu BCVH cho ngày ${toDate}`}
            description={
              nearestAvailableDate
                ? `Ngày gần nhất đang được metadata hỗ trợ là ${nearestAvailableDate}. Không có phép tính fallback nào được tạo thêm cho ngày đã chọn.`
                : 'Không có dữ liệu BCVH cho ngày đã chọn và không xác định được ngày gần nhất từ metadata hiện có.'
            }
            action={nearestAvailableDate ? (
              <button
                type="button"
                onClick={() => {
                  updateParam('from_date', nearestAvailableDate);
                  updateParam('to_date', nearestAvailableDate);
                }}
                className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-700)]"
              >
                Xem ngày gần nhất
              </button>
            ) : null}
          />
        )}

        {!showNoData ? (
          <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-surface-200)] px-5 py-4">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">So sánh kỳ trước theo D-1 và D-7.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge label={`BCVH: ${metaState.options.find((option) => option.value === maBcvh)?.label || 'Tất cả BCVH'}`} tone="neutral" />
                <StatusBadge label={`Tìm kiếm: ${search || 'Không'}`} tone="info" />
                {nearestAvailableDate ? <StatusBadge label={`Ngày gần nhất: ${nearestAvailableDate}`} tone="warning" /> : null}
              </div>
            </div>
            <div className="p-5">
              <UnifiedBcvhAnalysisTable
                fromDate={fromDate}
                toDate={toDate}
                interval={interval}
                maBcvh={maBcvh}
                search={search}
                prefetchedData={rankingState.data}
              />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Clock3 size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--color-text-main)]">Không có dữ liệu trong ngày đã chọn</h2>
                <p className="text-xs text-[var(--color-text-muted)]">Không hiển thị bảng khi không có dữ liệu runtime cho ngày {toDate}.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
