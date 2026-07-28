import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, Route, ShieldCheck, Sparkles } from 'lucide-react';
import { PageContainer, KPICard, StatusBadge, ErrorState } from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import UnifiedBcvhAnalysisTable from '../dashboard/components/UnifiedBcvhAnalysisTable';
import api from '../../api/client';
import { buildBcvhOptions, validateBcvhUnits } from '../dashboard/components/dashboardFilterOptions';

export default function BcvhRankingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [metaState, setMetaState] = useState({ status: 'loading', options: [], error: null });

  const fromDate = searchParams.get('from_date') || '2026-07-28';
  const toDate = searchParams.get('to_date') || '2026-07-28';
  const maBcvh = searchParams.get('ma_bcvh') || 'all';
  const search = searchParams.get('search') || '';
  const interval = searchParams.get('interval') || (fromDate === toDate ? 'daily' : 'range');

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  useEffect(() => {
    let active = true;
    setMetaState({ status: 'loading', options: [], error: null });
    api.get('/f13/dashboard/meta', { params: { _ts: Date.now() } })
      .then((res) => {
        if (!active) return;
        const units = res.data?.data?.bcvh_units || [];
        const validation = validateBcvhUnits(units);
        if (!validation.ok) {
          setMetaState({ status: 'error', options: [], error: validation.error });
          return;
        }
        setMetaState({ status: 'success', options: buildBcvhOptions(units), error: null });
      })
      .catch(() => {
        if (!active) return;
        setMetaState({ status: 'error', options: [], error: 'Không thể tải metadata BCVH. Vui lòng thử lại.' });
      });

    return () => {
      active = false;
    };
  }, []);

  const summaryCards = useMemo(() => ([
    {
      label: 'Kỳ đang xem',
      value: fromDate === toDate ? toDate : `${fromDate} → ${toDate}`,
      delta: 'Dữ liệu theo URL hiện hành',
      tone: 'primary',
    },
    {
      label: 'Phạm vi BCVH',
      value: metaState.options.find((option) => option.value === maBcvh)?.label || 'Tất cả BCVH',
      delta: 'Bộ lọc điều hành',
      tone: 'success',
    },
    {
      label: 'So sánh',
      value: 'D-1 / D-7 tách riêng',
      delta: 'Theo quyết định PO ngày 28/07/2026',
      tone: 'warning',
    },
    {
      label: 'Phân bổ tuyến',
      value: '4 dải màu',
      delta: 'Xanh · Hồng · Vàng · Đỏ',
      tone: 'danger',
    },
  ]), [fromDate, maBcvh, metaState.options, toDate]);

  return (
    <PageContainer
      title="BCVH Ranking"
      subtitle="Bảng điều hành BCVH theo hợp đồng Wave 1 và quyết định PO ngày 28/07/2026."
      action={(
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Wave 2 Frontend" tone="info" />
          <StatusBadge label={interval === 'daily' ? 'Theo ngày' : 'Khoảng ngày'} tone="neutral" />
          <StatusBadge label="4 dải tuyến giữ nguyên SSOT" tone="success" />
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
          onBcvhChange={(value) => updateParam('ma_bcvh', value)}
          bcvhOptions={metaState.options}
          bcvhDisabled={metaState.status !== 'success'}
          searchValue={search}
          onSearchChange={(value) => updateParam('search', value)}
          actions={(
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label="KPI / chậm nộp / hạng độc lập" tone="warning" />
              <StatusBadge label="Drill-down giữ nguyên context Route Ranking" tone="info" />
            </div>
          )}
        />

        {metaState.status === 'error' ? (
          <ErrorState title="Không thể tải danh sách BCVH" description={metaState.error} />
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((item) => (
            <KPICard key={item.label} label={item.label} value={item.value} delta={item.delta} tone={item.tone} />
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary-700)]">
                <LayoutGrid size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--color-text-main)]">Bố cục đã khóa</h2>
                <p className="text-xs text-[var(--color-text-muted)]">Nhóm cột ngày đánh giá, D-1, D-7, chậm nộp tiền, phân bổ tuyến, phân tích và hành động.</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-700">
                <Route size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--color-text-main)]">4 dải tuyến giữ nguyên</h2>
                <p className="text-xs text-[var(--color-text-muted)]">Không gộp, không bỏ, không diễn giải lại dải hồng.</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--color-text-main)]">Không tính fallback</h2>
                <p className="text-xs text-[var(--color-text-muted)]">Thiếu dữ liệu sẽ hiển thị trạng thái unavailable theo đúng hợp đồng runtime.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--color-surface-200)] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-surface-200)] px-5 py-4">
            <div>
              <h2 className="text-base font-bold text-[var(--color-text-main)]">Bảng BCVH theo hợp đồng Wave 1</h2>
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                <Sparkles size={12} className="mr-1 inline-block" />
                D-1 và D-7 tách riêng; chỉ raw volume và raw F1.3 được phép ẩn.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={`BCVH: ${metaState.options.find((option) => option.value === maBcvh)?.label || 'Tất cả BCVH'}`} tone="neutral" />
              <StatusBadge label={`Search: ${search || 'Không'}`} tone="info" />
            </div>
          </div>
          <div className="p-5">
            <UnifiedBcvhAnalysisTable
              fromDate={fromDate}
              toDate={toDate}
              interval={interval}
              maBcvh={maBcvh}
              search={search}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
