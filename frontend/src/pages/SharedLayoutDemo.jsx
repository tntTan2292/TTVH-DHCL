import { useState } from 'react';
import {
  SharedLayout,
  GlobalFilterBar,
  PageToolbar,
  GlobalLoadingOverlay,
  GlobalErrorOverlay,
} from '../components/shared/SharedLayout';
import { CardContainer, KPICard, StatusBadge } from '../components/shared/SharedComponents';

export default function SharedLayoutDemo() {
  const [fromDate, setFromDate] = useState('2026-06-23');
  const [toDate, setToDate] = useState('2026-06-23');
  const [kpiValue, setKpiValue] = useState('all');
  const [bcvhValue, setBcvhValue] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [showLoading, setShowLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  return (
    <SharedLayout
      title="Shared Layout Demo"
      globalFilters={
        <GlobalFilterBar
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          kpiValue={kpiValue}
          onKpiChange={setKpiValue}
          bcvhValue={bcvhValue}
          onBcvhChange={setBcvhValue}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          actions={
            <PageToolbar>
              <StatusBadge label="Global Action" tone="info" />
            </PageToolbar>
          }
        />
      }
      toolbar={<StatusBadge label="Reusable Layout" tone="success" />}
      loadingOverlay={showLoading ? <GlobalLoadingOverlay label="Loading overlay demo" /> : null}
      errorOverlay={showError ? <GlobalErrorOverlay title="Error overlay demo" description="Mẫu hiển thị lỗi toàn cục." /> : null}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <KPICard label="From Date" value={fromDate} />
        <KPICard label="To Date" value={toDate} tone="success" />
        <CardContainer title="Layout Notes">
          <p className="text-sm text-[var(--color-text-muted)]">
            Demo page này kiểm tra App Layout, Sidebar Navigation, Breadcrumb, Global Filter Bar, Page Toolbar và state overlays.
          </p>
        </CardContainer>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <CardContainer title="Overlay Controls">
          <div className="flex gap-2">
            <button className="rounded-xl bg-blue-600 px-4 py-2 text-white" onClick={() => setShowLoading((value) => !value)}>
              Toggle Loading
            </button>
            <button className="rounded-xl bg-red-600 px-4 py-2 text-white" onClick={() => setShowError((value) => !value)}>
              Toggle Error
            </button>
          </div>
        </CardContainer>
      </div>
    </SharedLayout>
  );
}
