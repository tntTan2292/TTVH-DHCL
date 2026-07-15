import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, ChevronRight, ShieldAlert, Target, TrendingUp, Users, Search, Sparkles } from 'lucide-react';
import {
  PageContainer,
  SectionHeader,
  CardContainer,
  KPICard,
  StatusBadge,
  EmptyState,
  LoadingState,
  ErrorState,
} from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';
import f13DashboardClient from '../../api/F13DashboardClient';

const BCVH_OPTIONS = [
  { value: 'all', label: 'Tất cả BCVH' },
  { value: 'BC_HUE01', label: 'BCVH TP Huế' },
  { value: 'BC_HUE02', label: 'BCVH Hương Thủy' },
  { value: 'BC_HUE03', label: 'BCVH Phú Lộc' },
  { value: 'BC_HUE04', label: 'BCVH Hương Trà' },
  { value: 'BC_HUE08', label: 'BCVH A Lưới' },
  { value: 'BC_HUE09', label: 'BCVH Nam Đông' },
];

const KPI_OPTIONS = [
  { value: 'all', label: 'Tất cả KPI' },
  { value: 'pass', label: 'Đạt' },
  { value: 'fail', label: 'Không đạt' },
];

function ShellCard({ title, description, icon, actionLabel, children }) {
  return (
    <CardContainer
      title={title}
      action={
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-100)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
          {actionLabel || 'Shell'}
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      }
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-primary-50)] text-[var(--color-primary-700)]">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[var(--color-text-main)]">{description}</p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Đây là vùng dựng khung theo Screen Architecture đã Freeze. Dữ liệu nghiệp vụ sẽ được bổ sung ở ticket sau.
          </p>
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </CardContainer>
  );
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function BcvhRankingPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [selectedBcvh, setSelectedBcvh] = useState('');

  const fromDate = searchParams.get('from_date') || '2026-06-23';
  const toDate = searchParams.get('to_date') || '2026-06-23';
  const kpi = searchParams.get('kpi') || 'all';
  const bcvh = searchParams.get('ma_bcvh') || 'all';
  const search = searchParams.get('search') || '';

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === undefined || value === null || value === '') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  useEffect(() => {
    let mounted = true;
    const fetchRanking = async () => {
      try {
        setStatus('loading');
        setError(null);
        const result = await f13DashboardClient.getBcvhRankingForUi(fromDate, toDate, 1000, 'rank', 'asc');
        if (!mounted) return;
        setRows(Array.isArray(result.data) ? result.data : []);
        setMeta(result.meta || {});
        const firstSelectable = (Array.isArray(result.data) ? result.data : []).find((item) => item?.ma_bcvh);
        setSelectedBcvh((prev) => prev || firstSelectable?.ma_bcvh || '');
        setStatus('success');
      } catch (e) {
        if (!mounted) return;
        setError({ message: e.message || 'Không thể tải dữ liệu BCVH' });
        setStatus('error');
      }
    };

    if (fromDate && toDate) fetchRanking();
    return () => {
      mounted = false;
    };
  }, [fromDate, toDate]);

  const isSingleDay = fromDate && toDate && fromDate === toDate;

  const filteredRows = useMemo(() => {
    let list = [...rows];
    if (bcvh !== 'all') {
      list = list.filter((item) => item.ma_bcvh === bcvh);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => (item.name || item.ten_bcvh || '').toLowerCase().includes(q));
    }
    return list;
  }, [rows, bcvh, search]);

  const visibleRows = useMemo(() => filteredRows.slice(0, 3), [filteredRows]);
  const totalRow = meta?.total_row || null;

  const summaryStats = useMemo(() => ([
    {
      label: 'BCVH theo dõi',
      value: toNumber(meta?.total_records || filteredRows.length || rows.length || 0).toLocaleString('vi-VN'),
      delta: 'Runtime value',
      tone: 'primary',
    },
    {
      label: 'Ưu tiên cao',
      value: toNumber(meta?.high_priority_count || visibleRows.length).toLocaleString('vi-VN'),
      delta: 'Runtime value',
      tone: 'warning',
    },
    {
      label: 'KPI đang xem',
      value: kpi === 'all' ? 'Tất cả' : KPI_OPTIONS.find((item) => item.value === kpi)?.label || 'Tất cả',
      delta: 'URL state',
      tone: 'success',
    },
    {
      label: 'BCVH bộ lọc',
      value: bcvh === 'all' ? 'Tất cả' : BCVH_OPTIONS.find((item) => item.value === bcvh)?.label || 'Tất cả',
      delta: 'URL state',
      tone: 'danger',
    },
  ]), [bcvh, filteredRows.length, kpi, meta?.high_priority_count, meta?.total_records, rows.length, visibleRows.length]);

  const selectedRow = useMemo(() => {
    if (bcvh !== 'all') {
      return filteredRows.find((item) => item.ma_bcvh === bcvh) || filteredRows[0] || null;
    }
    return filteredRows.find((item) => item.ma_bcvh === selectedBcvh) || filteredRows[0] || null;
  }, [bcvh, filteredRows, selectedBcvh]);

  const handleDrillDown = () => {
    const target = selectedRow || filteredRows[0];
    if (!target) return;
    const params = new URLSearchParams();
    params.set('from_date', fromDate);
    params.set('to_date', toDate);
    params.set('interval', isSingleDay ? 'daily' : 'range');
    params.set('bcvh_id', target.ma_bcvh || target.id || '');
    params.set('bcvh_name', target.name || target.ten_bcvh || '');
    navigate(`/f13/ranking/route?${params.toString()}`);
  };

  if (status === 'loading') {
    return (
      <PageContainer
        title="BCVH Performance Center"
        subtitle="Đang tải runtime-backed content cho BCVH."
      >
        <div className="space-y-5">
          <LoadingState label="Đang tải dữ liệu BCVH runtime..." />
        </div>
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer
        title="BCVH Performance Center"
        subtitle="Runtime-backed content chưa sẵn sàng."
      >
        <ErrorState
          description={error?.message}
          action={
            <button
              onClick={() => setSearchParams(searchParams)}
              className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white"
            >
              Thử lại
            </button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="BCVH Performance Center"
      subtitle="Runtime-backed BCVH view theo kiến trúc đã Freeze."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="BCVH Runtime" tone="info" />
          <StatusBadge label={isSingleDay ? 'Một ngày' : 'Lũy kế'} tone="success" />
          <StatusBadge label="Shared Layout Ready" tone="neutral" />
        </div>
      }
    >
      <div className="space-y-5">
        <GlobalFilterBar
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={(value) => updateParam('from_date', value)}
          onToDateChange={(value) => updateParam('to_date', value)}
          kpiValue={kpi}
          onKpiChange={(value) => updateParam('kpi', value)}
          bcvhValue={bcvh}
          onBcvhChange={(value) => updateParam('ma_bcvh', value)}
          searchValue={search}
          onSearchChange={(value) => updateParam('search', value)}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge label={BCVH_OPTIONS.find((item) => item.value === bcvh)?.label || 'Tất cả BCVH'} tone="info" />
              <StatusBadge label={selectedRow ? (selectedRow.name || selectedRow.ten_bcvh || 'Selected BCVH') : 'No selection'} tone="neutral" />
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((item) => (
            <KPICard
              key={item.label}
              label={item.label}
              value={item.value}
              delta={item.delta}
              tone={item.tone}
            />
          ))}
        </div>

        <SectionHeader
          title="Executive Brief Area"
          subtitle="Runtime-backed entry point cho lãnh đạo, giữ đúng thứ tự Screen Architecture."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <ShellCard
            title="Executive Brief Widget"
            description="Tóm tắt điều hành BCVH, mức độ ưu tiên và thông điệp chính."
            icon={<Target />}
            actionLabel="Evidence"
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Ngày lọc</p>
                <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{fromDate}</p>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Chế độ</p>
                <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">{isSingleDay ? 'Một ngày' : 'Lũy kế'}</p>
              </div>
              <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
                <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Context</p>
                <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">Runtime</p>
              </div>
            </div>
          </ShellCard>
          <ShellCard
            title="Health Overview Widget"
            description="Khối trạng thái sức khỏe vận hành cấp BCVH, dùng runtime data từ ranking API."
            icon={<BarChart3 />}
            actionLabel="Insight"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-main)]">Tổng BG</span>
                  <Sparkles className="h-4 w-4 text-[var(--color-primary-600)]" />
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {Number(totalRow?.sl_bg_ptc || totalRow?.total_bg || 0).toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-main)]">Đạt KPI</span>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {Number(totalRow?.kpi_2026 || totalRow?.passed_rate || 0).toFixed(1)}%
                  </span>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                  {Number(totalRow?.dat_kpi_2026 || totalRow?.passed || 0).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          </ShellCard>
        </div>

        <SectionHeader
          title="Priority Analysis Area"
          subtitle="Vùng định vị BCVH cần theo dõi trước, dùng runtime rows theo thứ tự xếp hạng."
        />
        <div className="grid gap-5 xl:grid-cols-3">
          <ShellCard
            title="Priority Analysis Widget"
            description="Sắp xếp mức ưu tiên theo dữ liệu runtime."
            icon={<TrendingUp />}
            actionLabel="Decision"
          >
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={`Visible: ${visibleRows.length}`} tone="warning" />
              <StatusBadge label={`Loaded: ${rows.length}`} tone="neutral" />
              <StatusBadge label="No KPI calc" tone="info" />
            </div>
          </ShellCard>
          <ShellCard
            title="Top Priority BCVH"
            description="Top BCVH runtime data lấy trực tiếp từ ranking API."
            icon={<Search />}
            actionLabel="Insight"
          >
            <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
              {visibleRows.length > 0 ? visibleRows.map((item, index) => (
                <p key={item.ma_bcvh || item.id}>{index + 1}. {item.name || item.ten_bcvh} - {Number(item.passed_rate || item.kpi_2026 || 0).toFixed(1)}%</p>
              )) : <p>Không có dữ liệu runtime.</p>}
            </div>
          </ShellCard>
          <ShellCard
            title="Severity Snapshot"
            description="Snapshot runtime về mức độ điều hành."
            icon={<ShieldAlert />}
            actionLabel="Decision"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-red-50 p-3 text-center text-sm font-semibold text-red-700">High</div>
              <div className="rounded-lg bg-amber-50 p-3 text-center text-sm font-semibold text-amber-700">Medium</div>
              <div className="rounded-lg bg-green-50 p-3 text-center text-sm font-semibold text-green-700">Low</div>
              <div className="rounded-lg bg-[var(--color-surface-50)] p-3 text-center text-sm font-semibold text-[var(--color-text-muted)]">N/A</div>
            </div>
          </ShellCard>
        </div>

        <SectionHeader
          title="Root Cause Area"
          subtitle="Khối truy vết nguyên nhân ở cấp BCVH, chỉ hiển thị runtime summary."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <ShellCard
            title="Root Cause Summary Widget"
            description="Tóm tắt nguyên nhân gốc theo runtime summary."
            icon={<ShieldAlert />}
            actionLabel="Evidence"
          >
            <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
              <p>• Runtime rows loaded: {rows.length}</p>
              <p>• Selected BCVH: {selectedRow ? (selectedRow.name || selectedRow.ten_bcvh) : 'N/A'}</p>
              <p>• Missing evidence: None from current contract</p>
            </div>
          </ShellCard>
          <ShellCard
            title="Trend & Pattern"
            description="Khối xu hướng và mẫu lặp theo BCVH, giữ đúng vị trí và dùng runtime data."
            icon={<TrendingUp />}
            actionLabel="Insight"
          >
            <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--color-text-main)]">Runtime trend window</span>
                <span className="text-[var(--color-text-muted)]">{fromDate} → {toDate}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[var(--color-surface-200)]">
                <div className="h-2 w-2/3 rounded-full bg-[var(--color-primary-500)]" />
              </div>
            </div>
          </ShellCard>
        </div>

        <SectionHeader
          title="Recommendation Area"
          subtitle="Vùng khuyến nghị điều hành, dùng runtime-backed summary từ ranking data."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <ShellCard
            title="Recommendation Widget"
            description="Khuyến nghị hành động dành cho lãnh đạo."
            icon={<Users />}
            actionLabel="Action"
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] p-4">
                <p className="text-sm font-semibold text-[var(--color-text-main)]">Ưu tiên xử lý</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {selectedRow ? (selectedRow.name || selectedRow.ten_bcvh) : 'Runtime recommendation placeholder'}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] p-4">
                <p className="text-sm font-semibold text-[var(--color-text-main)]">Lý do</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {selectedRow
                    ? `Dựa trên runtime score ${Number(selectedRow.passed_rate || selectedRow.kpi_2026 || 0).toFixed(1)}% và filter hiện tại.`
                    : 'Runtime rationale unavailable'}
                </p>
              </div>
            </div>
          </ShellCard>
          <ShellCard
            title="Drill-down Trigger Widget"
            description="Điểm chuyển xuống Route Performance Center và các lớp chi tiết tiếp theo."
            icon={<ArrowRight />}
            actionLabel="Navigation"
          >
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleDrillDown}
                className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white"
                disabled={!selectedRow}
              >
                Mở Route Performance Center
              </button>
              <span className="text-xs text-[var(--color-text-muted)]">
                Trigger contract: from_date, to_date, interval, bcvh_id, bcvh_name
              </span>
            </div>
          </ShellCard>
        </div>

        <SectionHeader
          title="Drill-down Area"
          subtitle="Khu điều hướng xuống lớp tiếp theo, giữ đúng flow nhưng không triển khai business logic."
        />
        <div className="grid gap-5 xl:grid-cols-3">
          <CardContainer title="Route Drill-down">
            <EmptyState
              title="Route drill-down placeholder"
              description="Đây là khu vực điều hướng sang Route Performance Center trong các ticket tiếp theo."
            />
          </CardContainer>
          <CardContainer title="Navigation Map">
            <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
              <p>Dashboard → BCVH Performance Center → Route Performance Center</p>
              <p>Context hiện tại dùng runtime data và URL state.</p>
            </div>
          </CardContainer>
          <CardContainer title="Shared Layout Integration">
            <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
              <p>Đang dùng Shared Layout, Breadcrumb và Global Filter Bar của hệ thống.</p>
              <p>Không hardcode logic, không đụng Dashboard Foundation.</p>
            </div>
          </CardContainer>
        </div>
      </div>
    </PageContainer>
  );
}
