import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, ChevronRight, ShieldAlert, Target, TrendingUp, Users, Search, Sparkles } from 'lucide-react';
import {
  PageContainer,
  SectionHeader,
  CardContainer,
  KPICard,
  StatusBadge,
  EmptyState,
} from '../../components/shared/SharedComponents';
import { GlobalFilterBar } from '../../components/shared/SharedLayout';

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

export default function BcvhRankingPage() {
  const [searchParams, setSearchParams] = useSearchParams();

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

  const isSingleDay = fromDate && toDate && fromDate === toDate;

  const summaryStats = useMemo(() => ([
    { label: 'BCVH theo dõi', value: '06', delta: 'Shell value', tone: 'primary' },
    { label: 'Ưu tiên cao', value: '03', delta: 'Shell value', tone: 'warning' },
    { label: 'KPI đang xem', value: kpi === 'all' ? 'Tất cả' : KPI_OPTIONS.find((item) => item.value === kpi)?.label || 'Tất cả', tone: 'success' },
    { label: 'BCVH bộ lọc', value: bcvh === 'all' ? 'Tất cả' : BCVH_OPTIONS.find((item) => item.value === bcvh)?.label || 'Tất cả', tone: 'danger' },
  ]), [bcvh, kpi]);

  return (
    <PageContainer
      title="BCVH Performance Center"
      subtitle="Shell của BCVH Performance Center. Đây là khung triển khai theo kiến trúc đã Freeze, chưa gắn business logic."
      action={
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="BCVH Shell" tone="info" />
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
              <StatusBadge label={search ? `Search: ${search}` : 'Search idle'} tone="neutral" />
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
          subtitle="Khối dẫn nhập điều hành, giữ bố cục chuẩn cho lãnh đạo trước khi xuống các phân tích chi tiết."
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
                <p className="mt-1 text-lg font-bold text-[var(--color-text-main)]">BCVH Shell</p>
              </div>
            </div>
          </ShellCard>
          <ShellCard
            title="Health Overview Widget"
            description="Khối trạng thái sức khỏe vận hành cấp BCVH, chỉ giữ cấu trúc hiển thị."
            icon={<BarChart3 />}
            actionLabel="Insight"
          >
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-main)]">Ổn định vận hành</span>
                  <Sparkles className="h-4 w-4 text-[var(--color-primary-600)]" />
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">Shell-safe value</p>
              </div>
              <div className="rounded-xl border border-[var(--color-surface-200)] bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-main)]">Mức chú ý</span>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Medium</span>
                </div>
                <p className="mt-2 text-sm text-[var(--color-text-muted)]">Demo runtime value</p>
              </div>
            </div>
          </ShellCard>
        </div>

        <SectionHeader
          title="Priority Analysis Area"
          subtitle="Vùng định vị BCVH cần theo dõi trước, hiện là khung shell để giữ đúng kiến trúc."
        />
        <div className="grid gap-5 xl:grid-cols-3">
          <ShellCard
            title="Priority Analysis Widget"
            description="Sắp xếp mức ưu tiên theo tình trạng điều hành."
            icon={<TrendingUp />}
            actionLabel="Decision"
          >
            <div className="flex flex-wrap gap-2">
              <StatusBadge label="High Priority" tone="warning" />
              <StatusBadge label="Shell-safe" tone="neutral" />
              <StatusBadge label="No KPI calc" tone="info" />
            </div>
          </ShellCard>
          <ShellCard
            title="Top Priority BCVH"
            description="Danh sách BCVH cần chú ý trước, chưa có dữ liệu nghiệp vụ."
            icon={<Search />}
            actionLabel="Insight"
          >
            <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
              <p>1. BCVH TP Huế</p>
              <p>2. BCVH Hương Thủy</p>
              <p>3. BCVH Phú Lộc</p>
            </div>
          </ShellCard>
          <ShellCard
            title="Severity Snapshot"
            description="Snapshot mức độ nghiêm trọng để điều hành nhanh."
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
          subtitle="Khối truy vết nguyên nhân ở cấp BCVH, chỉ hiển thị khung tương tác theo IA đã Freeze."
        />
        <div className="grid gap-5 xl:grid-cols-2">
          <ShellCard
            title="Root Cause Summary Widget"
            description="Placeholder cho phân tích nguyên nhân gốc, không thực hiện audit lan hay logic suy diễn."
            icon={<ShieldAlert />}
            actionLabel="Evidence"
          >
            <div className="space-y-2 text-sm text-[var(--color-text-muted)]">
              <p>• Root cause group placeholder</p>
              <p>• Evidence-linked card</p>
              <p>• No backend dependency</p>
            </div>
          </ShellCard>
          <ShellCard
            title="Trend & Pattern"
            description="Khối xu hướng và mẫu lặp theo BCVH, giữ đúng vị trí nhưng chưa gắn dữ liệu."
            icon={<TrendingUp />}
            actionLabel="Insight"
          >
            <div className="rounded-xl bg-[var(--color-surface-50)] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--color-text-main)]">7-day pattern</span>
                <span className="text-[var(--color-text-muted)]">Shell</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[var(--color-surface-200)]">
                <div className="h-2 w-2/3 rounded-full bg-[var(--color-primary-500)]" />
              </div>
            </div>
          </ShellCard>
        </div>

        <SectionHeader
          title="Recommendation Area"
          subtitle="Vùng khuyến nghị điều hành, chỉ dựng khung để ticket sau cắm runtime-backed content."
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
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Shell-safe recommendation text</p>
              </div>
              <div className="rounded-xl border border-[var(--color-surface-200)] bg-[var(--color-surface-50)] p-4">
                <p className="text-sm font-semibold text-[var(--color-text-main)]">Lý do</p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">Demo rationale only</p>
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
              <button className="rounded-lg bg-[var(--color-primary-600)] px-4 py-2 text-sm font-semibold text-white">
                Mở Route Performance Center
              </button>
              <span className="text-xs text-[var(--color-text-muted)]">Trigger shell only</span>
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
              <p>Context hiện tại chỉ là shell, chưa truyền dữ liệu nghiệp vụ.</p>
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
