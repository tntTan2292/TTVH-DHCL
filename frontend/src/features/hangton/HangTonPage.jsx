import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Layers,
  Building2,
  GitCompare,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getAllowedHangtonScreens } from '../../auth/accessModel.js';
import { PageContainer } from '../../components/shared/SharedComponents.jsx';
import { LoadingLayout, ErrorLayout, EmptyLayout } from '../../components/common/StateLayouts.jsx';
import { resolveHangtonTab, isHangtonTab } from './hangtonTabs.js';
import { levelsFromRank } from './hangtonLevels.js';
import { useFitZoom } from './hangtonFit.js';
import SnapshotPicker from './components/SnapshotPicker.jsx';
import CustomerFilterBar from './components/CustomerFilterBar.jsx';
import { sanitizeSelectedCustomers, customersParam } from './hangtonCustomers.js';
import HangTonOverviewTab from './components/HangTonOverviewTab.jsx';
import HangTonByOfficeTab from './components/HangTonByOfficeTab.jsx';
import HangTonCompareTab from './components/HangTonCompareTab.jsx';
import HangTonItemsTab from './components/HangTonItemsTab.jsx';
import HangTonItemsModal from './components/HangTonItemsModal.jsx';
import { fetchSnapshots, fetchOverview, fetchCompare } from './api/hangtonClient.js';

const TABS = [
  { id: 'overview', label: 'Tổng quan', icon: Layers },
  { id: 'office', label: 'Theo bưu cục', icon: Building2 },
  { id: 'compare', label: 'So sánh hai mốc', icon: GitCompare },
  { id: 'items', label: 'Chi tiết', icon: FileText },
];

export default function HangTonPage() {
  const { user } = useAuth();
  const allowedScreens = useMemo(() => {
    return getAllowedHangtonScreens(user?.access);
  }, [user?.access]);

  const visibleTabs = useMemo(() => {
    return TABS.filter((t) => allowedScreens.includes(t.id));
  }, [allowedScreens]);

  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState(null);
  const [baseSnapshotId, setBaseSnapshotId] = useState(null); // manual choice only; default base = compare.from

  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = resolveHangtonTab(tab);

  useEffect(() => {
    // /hangton/<unknown> -> the real overview URL, so the address and the menu agree
    if (!isHangtonTab(tab)) {
      navigate('/hangton/overview', { replace: true });
      return;
    }
    if (!allowedScreens.includes(tab)) {
      if (tab === 'overview' && allowedScreens.length > 0) {
        navigate(`/hangton/${allowedScreens[0]}`, { replace: true });
      } else {
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [tab, allowedScreens, navigate]);

  const setActiveTab = (id) => navigate(`/hangton/${id}`);
  const [selectedOfficeDrilldown, setSelectedOfficeDrilldown] = useState('');
  const [selectedMinRank, setSelectedMinRank] = useState(''); // from the hot-spot block: 5 = stock of 5 days and more
  const [modalOffice, setModalOffice] = useState(null);
  const [modalLevels, setModalLevels] = useState([]);

  const [overview, setOverview] = useState(null);
  const [compare, setCompare] = useState(null);

  const requestToken = useRef(0);
  // The screens follow the width they are given (menu open or closed, window size): see hangtonFit.js
  const { fitRef, zoom: fitZoom } = useFitZoom();
  // Customer groups the whole module is limited to ([] = every group); remembered per viewer.
  const [selectedCustomers, setSelectedCustomers] = useState(() => {
    try {
      return sanitizeSelectedCustomers(JSON.parse(window.localStorage.getItem('qis.hangton.customers') || '[]'));
    } catch {
      return [];
    }
  });
  const [customerGroups, setCustomerGroups] = useState([]); // every group of the snapshot (not limited by the selection)
  const customersKey = selectedCustomers.join('|');
  const handleCustomersChange = (next) => {
    setSelectedCustomers(next);
    try {
      window.localStorage.setItem('qis.hangton.customers', JSON.stringify(next));
    } catch {
      // storage unavailable: the choice only lasts for this visit
    }
  };
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);

  // 1. Initial load: fetch snapshots list
  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchSnapshots(90);
      setSnapshots(list || []);
      if (list && list.length > 0) {
        setSelectedSnapshotId(list[0].id);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message || 'Không thể tải danh sách snapshot.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  // 2. Fetch overview & compare for the active snapshot
  const loadSnapshotData = useCallback(async (id, baseId, customers = []) => {
    if (!id) return;
    const token = ++requestToken.current;
    setDataLoading(true);
    try {
      const [ovData, cmpData] = await Promise.all([
        fetchOverview({ id, customers: customersParam(customers) }),
        fetchCompare({ id, ...(baseId ? { from_id: baseId } : {}), detail: 1, customers: customersParam(customers) }).catch(() => null),
      ]);

      if (token !== requestToken.current) return; // a newer snapshot was selected meanwhile
      setOverview(ovData);
      setCompare(cmpData);
      if (ovData?.by_customer) setCustomerGroups(ovData.by_customer);
    } catch (err) {
      if (token === requestToken.current) setError(err?.response?.data?.error?.message || err.message || 'Lỗi khi tải dữ liệu hàng tồn.');
    } finally {
      if (token === requestToken.current) setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSnapshotId) {
      loadSnapshotData(selectedSnapshotId, baseSnapshotId, selectedCustomers);
    }
    // selectedCustomers is represented by customersKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSnapshotId, baseSnapshotId, customersKey, loadSnapshotData]);

  // Active snapshot objects
  const currentSnapshot = useMemo(() => {
    return snapshots.find((s) => String(s.id) === String(selectedSnapshotId)) || snapshots[0];
  }, [snapshots, selectedSnapshotId]);

  const baseSnapshot = useMemo(() => {
    if (baseSnapshotId) {
      return snapshots.find((s) => String(s.id) === String(baseSnapshotId));
    }
    return compare?.from || null;
  }, [snapshots, baseSnapshotId, compare]);

  // List of unique office names for filters
  const officeOptions = useMemo(() => {
    if (!overview?.by_office) return [];
    return overview.by_office
      .map((o) => o.office)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'vi'));
  }, [overview]);

  // Switch to Chi tiết tab or open modal if items screen is not allowed
  const handleDrilldownToOffice = (officeName, minRank = '') => {
    if (allowedScreens.includes('items')) {
      setSelectedOfficeDrilldown(officeName);
      setSelectedMinRank(minRank === '' ? '' : String(minRank));
      setActiveTab('items');
    } else {
      setModalOffice(officeName);
      setModalLevels(minRank === '' ? [] : levelsFromRank(minRank));
    }
  };

  const handleSelectSnapshot = (id) => {
    setSelectedSnapshotId(Number(id));
    setBaseSnapshotId(null); // allow backend to resolve closest earlier slot by default
  };

  if (loading) {
    return (
      <PageContainer
        title="Chỉ số rà soát Hàng tồn"
        subtitle="Đang kết nối dữ liệu snapshot..."
        accentClassName="bg-rose-600"
        badge={<span className="rounded-md border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-sm font-bold text-rose-900">Rà soát hàng tồn</span>}
      >
        <LoadingLayout message="Đang nạp danh sách mốc dữ liệu snapshot..." />
      </PageContainer>
    );
  }

  if (error && !overview && snapshots.length === 0) {
    return (
      <PageContainer
        title="Chỉ số rà soát Hàng tồn"
        subtitle="Lỗi kết nối dữ liệu"
        accentClassName="bg-rose-600"
        badge={<span className="rounded-md border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-sm font-bold text-rose-900">Rà soát hàng tồn</span>}
      >
        <ErrorLayout
          error={{ message: error }}
          onRetry={loadSnapshots}
        />
      </PageContainer>
    );
  }

  if (snapshots.length === 0) {
    return (
      <PageContainer
        title="Chỉ số rà soát Hàng tồn"
        subtitle="Hệ thống chưa ghi nhận snapshot dữ liệu"
        accentClassName="bg-rose-600"
        badge={<span className="rounded-md border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-sm font-bold text-rose-900">Rà soát hàng tồn</span>}
      >
        <EmptyLayout
          title="Chưa có snapshot hàng tồn"
          message="Hệ thống thu thập dữ liệu hàng tồn tự động theo 3 khung giờ: 07:30, 11:30 và 21:00 hàng ngày. Hiện tại cơ sở dữ liệu chưa có mốc dữ liệu nào."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Chỉ số rà soát Hàng tồn"
      subtitle="Theo dõi, rà soát và so sánh biến động bưu gửi tồn theo từng khung giờ và bưu cục (BĐT TP Huế)"
      accentClassName="bg-rose-600"
      badge={
        <span className="rounded-md border border-rose-300 bg-rose-100 px-2.5 py-0.5 text-sm font-bold text-rose-900">
          Rà soát hàng tồn
        </span>
      }
      action={
        <div className="flex flex-wrap items-center gap-3">
          <SnapshotPicker
            snapshots={snapshots}
            selectedId={selectedSnapshotId}
            onSelectSnapshot={handleSelectSnapshot}
            disabled={dataLoading}
          />
          <button
            type="button"
            onClick={() => loadSnapshotData(selectedSnapshotId, baseSnapshotId, selectedCustomers)}
            disabled={dataLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Tải lại dữ liệu snapshot hiện tại"
          >
            <RefreshCw size={13} className={dataLoading ? 'animate-spin text-rose-600' : ''} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      }
    >
      <div ref={fitRef}>
      <div style={{ zoom: fitZoom }} className="space-y-6">
        {/* Customer-group filter: applies to every screen */}
        <CustomerFilterBar
          groups={customerGroups}
          selected={selectedCustomers}
          onChange={handleCustomersChange}
          disabled={dataLoading}
        />

        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/90 pb-2">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all cursor-pointer select-none ${
                  active
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Icon size={15} className={active ? 'text-white' : 'text-slate-500'} />
                <span>{tab.label}</span>
                {tab.id === 'office' && overview?.by_office?.length ? (
                  <span className={`px-1.5 py-0.2 rounded-full text-xs ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'}`}>
                    {overview.by_office.length}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Tab Content Display */}
        {dataLoading && !overview ? (
          <LoadingLayout message="Đang tải thông tin snapshot..." />
        ) : (
          <div>
            {activeTab === 'overview' && (
              <HangTonOverviewTab
                overview={overview}
                compare={compare}
                currentSnapshot={currentSnapshot}
                baseSnapshot={baseSnapshot}
                selectedCustomers={selectedCustomers}
                onDrilldownToOffice={handleDrilldownToOffice}
              />
            )}

            {activeTab === 'office' && (
              <HangTonByOfficeTab
                overview={overview}
                compare={compare}
                currentSnapshot={currentSnapshot}
                selectedCustomers={selectedCustomers}
                onDrillDownToOffice={handleDrilldownToOffice}
              />
            )}

            {activeTab === 'compare' && (
              <HangTonCompareTab
                snapshots={snapshots}
                compare={compare}
                toSnapshotId={selectedSnapshotId}
                baseSnapshotId={baseSnapshotId || baseSnapshot?.id}
                onChangeToSnapshot={(id) => setSelectedSnapshotId(Number(id))}
                onChangeBaseSnapshot={(id) => setBaseSnapshotId(Number(id))}
              />
            )}

            {activeTab === 'items' && (
              <HangTonItemsTab
                currentSnapshot={currentSnapshot}
                officeOptions={officeOptions}
                initialOffice={selectedOfficeDrilldown}
                initialMinRank={selectedMinRank}
                selectedCustomers={selectedCustomers}
              />
            )}
          </div>
        )}

        {/* Drilldown modal when items tab is not allowed */}
        {modalOffice ? (
          <HangTonItemsModal
            isOpen={Boolean(modalOffice)}
            onClose={() => { setModalOffice(null); setModalLevels([]); }}
            snapshot={currentSnapshot}
            office={modalOffice}
            levels={modalLevels}
            customers={selectedCustomers}
            title={`Danh sách bưu gửi tồn${modalLevels.length > 0 ? ' ≥5 ngày' : ''} — ${modalOffice}`}
          />
        ) : null}
      </div>
      </div>
    </PageContainer>
  );
}
