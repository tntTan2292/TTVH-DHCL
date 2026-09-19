import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { ROLE_ADMIN } from '../../../auth/roles';
import networkMapClient from '../../../api/NetworkMapClient';
import f13DashboardClient from '../../../api/F13DashboardClient';
import {
  PageContainer,
} from '../../../components/shared/SharedComponents';
import {
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  FileSpreadsheet,
  History,
  RotateCcw,
  Search,
  Save,
  Edit2,
  X,
  Check,
  CheckCircle2,
  RefreshCw,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';

const ITEMS_PER_PAGE = 15;

export default function PostmanCatalogPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === ROLE_ADMIN;

  // Active Tab: 'directory' | 'unnamed' | 'conflicts'
  const [activeTab, setActiveTab] = useState('directory');

  // Common metadata
  const [bcvhUnits, setBcvhUnits] = useState([]);

  // Tab 1: Directory State
  const [directoryData, setDirectoryData] = useState([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [dirSearch, setDirSearch] = useState('');
  const [dirBcvh, setDirBcvh] = useState('');
  const [dirSource, setDirSource] = useState('all'); // 'all' | 'IMPORT' | 'MANUAL'
  const [dirPage, setDirPage] = useState(1);

  // Tab 2: Unnamed Codes State
  const [unnamedData, setUnnamedData] = useState([]);
  const [loadingUnnamed, setLoadingUnnamed] = useState(false);
  const [unnamedBcvh, setUnnamedBcvh] = useState('');
  const [unnamedSearch, setUnnamedSearch] = useState('');
  const [unnamedPage, setUnnamedPage] = useState(1);
  const [editingNames, setEditingNames] = useState({}); // { [ma_buu_ta]: string }

  // Tab 3: Conflicts State
  const [conflictsData, setConflictsData] = useState([]);
  const [loadingConflicts, setLoadingConflicts] = useState(false);

  // Modals & Drawers
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editModalData, setEditModalData] = useState(null); // { ma_buu_ta, ten_buu_ta, ma_bcvh, ten_bcvh, trang_thai_hoat_dong }
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm, isDanger }

  // Notification Banner
  const [banner, setBanner] = useState(null); // { type: 'success' | 'error', text }

  const showBanner = (type, text) => {
    setBanner({ type, text });
    setTimeout(() => {
      setBanner((prev) => (prev?.text === text ? null : prev));
    }, 5000);
  };

  // ── Load Initial Metadata (BCVH List) ──
  useEffect(() => {
    let mounted = true;
    const loadMeta = async () => {
      try {
        setLoadingMeta(true);
        const metaRes = await f13DashboardClient.getDashboardMeta();
        if (mounted && metaRes?.data?.bcvh_units) {
          setBcvhUnits(metaRes.data.bcvh_units);
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (mounted) setLoadingMeta(false);
      }
    };
    loadMeta();
    return () => { mounted = false; };
  }, []);

  // ── Fetch Directory Data ──
  const fetchDirectory = useCallback(async () => {
    try {
      setLoadingDirectory(true);
      const res = await networkMapClient.getPostmanDirectory({
        search: dirSearch,
        ma_bcvh: dirBcvh,
      });
      setDirectoryData(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      showBanner('error', e.message || 'Không thể tải danh bạ bưu tá');
    } finally {
      setLoadingDirectory(false);
    }
  }, [dirSearch, dirBcvh]);

  // ── Fetch Unnamed Postmen Data ──
  const fetchUnnamed = useCallback(async () => {
    try {
      setLoadingUnnamed(true);
      const res = await networkMapClient.getPostmanUnnamed({
        ma_bcvh: unnamedBcvh,
      });
      setUnnamedData(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      showBanner('error', e.message || 'Không thể tải danh sách mã chưa có tên');
    } finally {
      setLoadingUnnamed(false);
    }
  }, [unnamedBcvh]);

  // ── Fetch Conflicts Data ──
  const fetchConflicts = useCallback(async () => {
    try {
      setLoadingConflicts(true);
      const res = await networkMapClient.getPostmanConflicts();
      setConflictsData(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      showBanner('error', e.message || 'Không thể tải danh sách xung đột');
    } finally {
      setLoadingConflicts(false);
    }
  }, []);

  // Refresh current tab on mount & tab change
  useEffect(() => {
    if (activeTab === 'directory') fetchDirectory();
    if (activeTab === 'unnamed') fetchUnnamed();
    if (activeTab === 'conflicts') fetchConflicts();
  }, [activeTab, fetchDirectory, fetchUnnamed, fetchConflicts]);

  // Also refresh conflicts count periodically or when needed for badge
  useEffect(() => {
    let mounted = true;
    networkMapClient.getPostmanConflicts().then((res) => {
      if (mounted && Array.isArray(res?.data)) setConflictsData(res.data);
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // ── Tab 1 Filtering & Pagination ──
  const filteredDirectory = useMemo(() => {
    return directoryData.filter((row) => {
      if (dirSource !== 'all' && row.nguon !== dirSource) return false;
      return true;
    });
  }, [directoryData, dirSource]);

  const dirTotalPages = Math.max(1, Math.ceil(filteredDirectory.length / ITEMS_PER_PAGE));
  const pagedDirectory = useMemo(() => {
    const start = (dirPage - 1) * ITEMS_PER_PAGE;
    return filteredDirectory.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDirectory, dirPage]);

  // ── Tab 2 Filtering & Pagination ──
  const filteredUnnamed = useMemo(() => {
    return unnamedData.filter((row) => {
      if (unnamedSearch) {
        const q = unnamedSearch.toLowerCase().trim();
        const codeMatch = String(row.ma_buu_ta || '').toLowerCase().includes(q);
        const bcvhMatch = String(row.ten_bcvh || '').toLowerCase().includes(q) || String(row.ma_bcvh || '').includes(q);
        if (!codeMatch && !bcvhMatch) return false;
      }
      return true;
    });
  }, [unnamedData, unnamedSearch]);

  const unnamedTotalPages = Math.max(1, Math.ceil(filteredUnnamed.length / ITEMS_PER_PAGE));
  const pagedUnnamed = useMemo(() => {
    const start = (unnamedPage - 1) * ITEMS_PER_PAGE;
    return filteredUnnamed.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUnnamed, unnamedPage]);

  // ── Actions (Admin Only) ──

  // Save Name for Unnamed Code
  const handleSaveUnnamed = (row) => {
    const enteredName = (editingNames[row.ma_buu_ta] || '').trim().toUpperCase();
    if (!enteredName) {
      showBanner('error', `Vui lòng nhập họ tên cho mã bưu tá ${row.ma_buu_ta}.`);
      return;
    }

    setConfirmDialog({
      title: 'Xác nhận lưu tên bưu tá',
      message: `Bạn có chắc chắn muốn lưu tên "${enteredName}" cho mã "${row.ma_buu_ta}"? Tên này sẽ có hiệu lực ngay lập tức cho toàn bộ dữ liệu xếp hạng lịch sử.`,
      onConfirm: async () => {
        try {
          await networkMapClient.updatePostmanManual(row.ma_buu_ta, {
            ten_buu_ta: enteredName,
            ma_bcvh: row.ma_bcvh,
            ten_bcvh: row.ten_bcvh,
            trang_thai_hoat_dong: 'Hoạt động',
          });
          showBanner('success', `Đã cập nhật tên thành công cho mã ${row.ma_buu_ta}.`);
          setEditingNames((prev) => {
            const next = { ...prev };
            delete next[row.ma_buu_ta];
            return next;
          });
          fetchUnnamed();
          fetchDirectory();
        } catch (err) {
          showBanner('error', err.message || 'Lưu thông tin thất bại.');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // Edit Directory Record
  const handleSaveEditModal = () => {
    if (!editModalData?.ten_buu_ta?.trim()) {
      showBanner('error', 'Họ tên bưu tá không được để trống.');
      return;
    }

    setConfirmDialog({
      title: 'Xác nhận cập nhật thông tin',
      message: `Cập nhật bưu tá "${editModalData.ma_buu_ta}" với tên "${editModalData.ten_buu_ta.trim().toUpperCase()}"?`,
      onConfirm: async () => {
        try {
          await networkMapClient.updatePostmanManual(editModalData.ma_buu_ta, {
            ten_buu_ta: editModalData.ten_buu_ta.trim().toUpperCase(),
            ma_bcvh: editModalData.ma_bcvh,
            ten_bcvh: editModalData.ten_bcvh,
            trang_thai_hoat_dong: editModalData.trang_thai_hoat_dong,
          });
          showBanner('success', `Đã cập nhật bưu tá ${editModalData.ma_buu_ta}.`);
          setEditModalData(null);
          fetchDirectory();
        } catch (err) {
          showBanner('error', err.message || 'Cập nhật thất bại.');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  // Resolve Conflict (D1)
  const handleResolveConflict = (conflict, decision) => {
    const isManual = decision === 'KEPT_MANUAL';
    const actionLabel = isManual
      ? `Giữ nguyên tên nhập tay: "${conflict.ten_hien_tai}"`
      : `Cập nhật theo tên file: "${conflict.ten_tu_file}"`;

    setConfirmDialog({
      title: 'Xác nhận giải quyết xung đột',
      message: `Mã bưu tá: ${conflict.ma_buu_ta}\nThao tác: ${actionLabel}\nQuyết định này được ghi nhật ký và có thể khôi phục.`,
      onConfirm: async () => {
        try {
          await networkMapClient.resolvePostmanConflict(conflict.id, decision);
          showBanner('success', `Đã xử lý xung đột cho mã ${conflict.ma_buu_ta}.`);
          fetchConflicts();
          fetchDirectory();
        } catch (err) {
          showBanner('error', err.message || 'Xử lý xung đột thất bại.');
        } finally {
          setConfirmDialog(null);
        }
      },
    });
  };

  return (
    <PageContainer>
      <div className="space-y-6 pb-12">
        {/* Banner Alert */}
        {banner && (
          <div
            className={`flex items-center justify-between p-4 rounded-xl border shadow-sm transition-all duration-300 ${
              banner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {banner.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span className="text-sm font-medium">{banner.text}</span>
            </div>
            <button onClick={() => setBanner(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vnpost-blue text-white shadow-xs">
                <Users size={20} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Rà soát danh mục bưu tá</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý định danh bưu tá, đồng bộ điểm phát và đối soát dữ liệu xếp hạng F1.3
                </p>
              </div>
            </div>
          </div>

          {/* Header Action Buttons (Admin Only) */}
          <div className="flex items-center gap-2.5">
            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
                >
                  <History size={14} className="text-slate-500" />
                  <span>Lịch sử & Khôi phục</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-vnpost-orange text-white text-xs font-bold hover:bg-orange-600 transition-colors shadow-xs"
                >
                  <UploadCloud size={15} />
                  <span>Nạp danh bạ Excel</span>
                </button>
              </>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                <Shield size={13} className="text-slate-400" />
                <span>Quyền: Xem danh mục (Viewer)</span>
              </div>
            )}
          </div>
        </div>

        {/* Executive Stats Bar (100% Dynamic from API) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Tổng số bưu tá hiện có
              </span>
              <p className="text-2xl font-bold font-mono text-slate-800 mt-1">
                {directoryData.length.toLocaleString('vi-VN')}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Dữ liệu từ danh mục chính thức</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <UserCheck size={22} />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('unnamed')}
            className={`rounded-xl border p-4 shadow-xs flex items-center justify-between cursor-pointer transition-all ${
              unnamedData.length > 0
                ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50/70'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                Mã phát sinh chưa có tên
              </span>
              <p className="text-2xl font-bold font-mono text-amber-900 mt-1">
                {unnamedData.length.toLocaleString('vi-VN')}
              </p>
              <p className="text-[11px] text-amber-700/80 mt-0.5">Cần bổ sung tên để hiển thị F1.3</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <UserX size={22} />
            </div>
          </div>

          <div
            onClick={() => setActiveTab('conflicts')}
            className={`rounded-xl border p-4 shadow-xs flex items-center justify-between cursor-pointer transition-all ${
              conflictsData.length > 0
                ? 'border-rose-200 bg-rose-50/40 hover:bg-rose-50/70'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
                Xung đột cần rà soát
              </span>
              <p className="text-2xl font-bold font-mono text-rose-900 mt-1">
                {conflictsData.length.toLocaleString('vi-VN')}
              </p>
              <p className="text-[11px] text-rose-700/80 mt-0.5">Tên file khác tên nhập tay (D1)</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200">
          <nav className="flex space-x-6">
            <button
              type="button"
              onClick={() => setActiveTab('directory')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors relative ${
                activeTab === 'directory'
                  ? 'border-vnpost-blue text-vnpost-blue'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>1. Danh mục bưu tá</span>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 font-mono">
                {directoryData.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('unnamed')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors relative ${
                activeTab === 'unnamed'
                  ? 'border-vnpost-blue text-vnpost-blue'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>2. Mã mới chưa có tên</span>
              {unnamedData.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-mono font-bold">
                  {unnamedData.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('conflicts')}
              className={`pb-3 text-sm font-semibold border-b-2 transition-colors relative ${
                activeTab === 'conflicts'
                  ? 'border-vnpost-blue text-vnpost-blue'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <span>3. Xung đột cần rà soát</span>
              {conflictsData.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-800 font-mono font-bold animate-pulse">
                  {conflictsData.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* ── TAB 1: DANH MỤC BƯU TÁ ── */}
        {activeTab === 'directory' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                {/* Search Input */}
                <div className="relative min-w-[240px] max-w-sm flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={dirSearch}
                    onChange={(e) => {
                      setDirSearch(e.target.value);
                      setDirPage(1);
                    }}
                    placeholder="Tìm theo mã hoặc tên bưu tá..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  {dirSearch && (
                    <button
                      onClick={() => setDirSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* BCVH Filter */}
                <div className="min-w-[180px]">
                  <select
                    value={dirBcvh}
                    onChange={(e) => {
                      setDirBcvh(e.target.value);
                      setDirPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Tất cả Bưu cục</option>
                    {bcvhUnits.map((u) => (
                      <option key={u.ma_bcvh} value={u.ma_bcvh}>
                        {u.ma_bcvh} - {u.ten_bcvh}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Source Filter */}
                <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">Nguồn:</span>
                  {[
                    { id: 'all', label: 'Tất cả' },
                    { id: 'IMPORT', label: 'File Excel' },
                    { id: 'MANUAL', label: 'Nhập tay' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setDirSource(s.id);
                        setDirPage(1);
                      }}
                      className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                        dirSource === s.id
                          ? 'bg-blue-50 text-blue-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={fetchDirectory}
                disabled={loadingDirectory}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw size={13} className={loadingDirectory ? 'animate-spin' : ''} />
                <span>Làm mới</span>
              </button>
            </div>

            {/* Directory Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                      <th className="px-3.5 py-3 text-center w-12">STT</th>
                      <th className="px-3.5 py-3">Mã bưu tá</th>
                      <th className="px-4 py-3">Họ tên bưu tá</th>
                      <th className="px-3.5 py-3">Mã BCVH</th>
                      <th className="px-4 py-3">Tên bưu cục</th>
                      <th className="px-3 py-3 text-center">Trạng thái</th>
                      <th className="px-3 py-3 text-center">Nguồn dữ liệu</th>
                      <th className="px-3.5 py-3 text-center">Danh bạ mới nhất</th>
                      {isAdmin && <th className="px-3.5 py-3 text-right">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {loadingDirectory ? (
                      <tr>
                        <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-400">
                          <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
                          <span>Đang tải danh bạ bưu tá...</span>
                        </td>
                      </tr>
                    ) : pagedDirectory.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 9 : 8} className="py-12 text-center text-slate-400">
                          Không tìm thấy bưu tá nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      pagedDirectory.map((row, index) => {
                        const rowIdx = (dirPage - 1) * ITEMS_PER_PAGE + index + 1;
                        const isAbsent = row.in_latest_import === 0;

                        return (
                          <tr key={row.ma_buu_ta} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3.5 py-3 text-center font-mono text-xs text-slate-400">
                              {rowIdx}
                            </td>
                            <td className="px-3.5 py-3 font-mono text-xs font-bold text-slate-700">
                              {row.ma_buu_ta}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-800">
                              {row.ten_buu_ta}
                            </td>
                            <td className="px-3.5 py-3 font-mono text-xs text-slate-600">
                              {row.ma_bcvh || '—'}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {row.ten_bcvh || '—'}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  row.trang_thai_hoat_dong === 'Hoạt động'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                                }`}
                              >
                                {row.trang_thai_hoat_dong || 'Hoạt động'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                                  row.nguon === 'MANUAL'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                {row.nguon === 'MANUAL' ? 'Nhập tay' : 'File Excel'}
                              </span>
                            </td>
                            <td className="px-3.5 py-3 text-center">
                              {isAbsent ? (
                                <span
                                  className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                                  title="Mã được lưu giữ cho lịch sử (D3) nhưng không xuất hiện trong file danh bạ mới nhất"
                                >
                                  Không có trong file mới
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                                  <Check size={13} />
                                  <span>Hiện hữu</span>
                                </span>
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-3.5 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setEditModalData({ ...row })}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded text-blue-700 hover:bg-blue-50 transition-colors"
                                >
                                  <Edit2 size={12} />
                                  <span>Sửa</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs">
                <div className="text-slate-600 font-medium">
                  Hiển thị <strong>{(dirPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(dirPage * ITEMS_PER_PAGE, filteredDirectory.length)}</strong> trong tổng số <strong>{filteredDirectory.length}</strong> bưu tá
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 mr-2 font-medium">
                    Trang <strong>{dirPage}</strong> / <strong>{dirTotalPages}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setDirPage((p) => Math.max(1, p - 1))}
                    disabled={dirPage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                    <span>Trước</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirPage((p) => Math.min(dirTotalPages, p + 1))}
                    disabled={dirPage >= dirTotalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Sau</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: MÃ MỚI CHƯA CÓ TÊN (TỪ BATCHFILE) ── */}
        {activeTab === 'unnamed' && (
          <div className="space-y-4">
            {/* Guide Banner */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed">
                  <p className="font-bold text-sm text-amber-950">
                    Đối soát mã phát sinh từ điểm phát nhưng vắng mặt trong Danh bạ
                  </p>
                  <p className="mt-1">
                    Các mã bưu tá dưới đây đã phát sinh lượt phát thực tế trong hệ thống nhưng chưa được gán họ tên.
                    {isAdmin
                      ? ' Quản trị viên có thể nhập trực tiếp Họ tên bưu tá và bấm "Lưu". Tên mới sẽ có hiệu lực tức thì cho toàn bộ các kỳ xếp hạng lịch sử.'
                      : ' Người xem (Viewer) chỉ có quyền theo dõi danh sách đối soát này.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative min-w-[240px] max-w-sm flex-1">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={unnamedSearch}
                    onChange={(e) => {
                      setUnnamedSearch(e.target.value);
                      setUnnamedPage(1);
                    }}
                    placeholder="Tìm theo mã hoặc bưu cục..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="min-w-[180px]">
                  <select
                    value={unnamedBcvh}
                    onChange={(e) => {
                      setUnnamedBcvh(e.target.value);
                      setUnnamedPage(1);
                    }}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none"
                  >
                    <option value="">Tất cả Bưu cục</option>
                    {bcvhUnits.map((u) => (
                      <option key={u.ma_bcvh} value={u.ma_bcvh}>
                        {u.ma_bcvh} - {u.ten_bcvh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchUnnamed}
                disabled={loadingUnnamed}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw size={13} className={loadingUnnamed ? 'animate-spin' : ''} />
                <span>Làm mới</span>
              </button>
            </div>

            {/* Unnamed Table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                      <th className="px-3.5 py-3 text-center w-12">STT</th>
                      <th className="px-3.5 py-3">Mã bưu tá</th>
                      <th className="px-4 py-3">Bưu cục phát sinh</th>
                      <th className="px-4 py-3">Tuyến thường phát</th>
                      <th className="px-3.5 py-3 text-center">Kỳ xuất hiện</th>
                      <th className="px-3.5 py-3 text-right">Sản lượng BG</th>
                      <th className="px-4 py-3">Họ tên bưu tá (Cần bổ sung)</th>
                      {isAdmin && <th className="px-3.5 py-3 text-center w-28">Thao tác</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {loadingUnnamed ? (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-slate-400">
                          <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
                          <span>Đang rà soát dữ liệu điểm phát...</span>
                        </td>
                      </tr>
                    ) : pagedUnnamed.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center">
                            <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                            <p className="font-semibold text-slate-700">Tất cả mã bưu tá đã có tên đầy đủ</p>
                            <p className="text-xs text-slate-400 mt-0.5">Không phát hiện mã nào vắng mặt trong danh bạ.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pagedUnnamed.map((row, index) => {
                        const rowIdx = (unnamedPage - 1) * ITEMS_PER_PAGE + index + 1;
                        const enteredName = editingNames[row.ma_buu_ta] ?? '';

                        return (
                          <tr key={row.ma_buu_ta} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3.5 py-3 text-center font-mono text-xs text-slate-400">
                              {rowIdx}
                            </td>
                            <td className="px-3.5 py-3 font-mono text-xs font-bold text-amber-900 bg-amber-50/50">
                              {row.ma_buu_ta}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <span className="font-semibold text-slate-700">{row.ma_bcvh || '—'}</span>
                              <span className="text-slate-500 ml-1.5">{row.ten_bcvh || ''}</span>
                              {row.has_multiple_bcvh && (
                                <span className="ml-1.5 inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                  Nhiều BC
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-600">
                              {row.cac_tuyen_thuong_phat || '—'}
                            </td>
                            <td className="px-3.5 py-3 text-center font-mono text-xs text-slate-600">
                              {row.ky_xuat_hien || '—'}
                            </td>
                            <td className="px-3.5 py-3 text-right font-mono text-xs font-bold text-slate-700">
                              {row.san_luong ? Number(row.san_luong).toLocaleString('vi-VN') : '0'}
                            </td>
                            <td className="px-4 py-3">
                              {isAdmin ? (
                                <input
                                  type="text"
                                  value={enteredName}
                                  onChange={(e) =>
                                    setEditingNames((prev) => ({
                                      ...prev,
                                      [row.ma_buu_ta]: e.target.value,
                                    }))
                                  }
                                  placeholder="Nhập họ tên bưu tá..."
                                  className="w-full px-3 py-1 text-xs uppercase font-medium rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                />
                              ) : (
                                <span className="text-xs italic text-slate-400">Chưa cập nhật tên</span>
                              )}
                            </td>
                            {isAdmin && (
                              <td className="px-3.5 py-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleSaveUnnamed(row)}
                                  disabled={!enteredName.trim()}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
                                >
                                  <Save size={12} />
                                  <span>Lưu</span>
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs">
                <div className="text-slate-600 font-medium">
                  Hiển thị <strong>{(unnamedPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(unnamedPage * ITEMS_PER_PAGE, filteredUnnamed.length)}</strong> trong tổng số <strong>{filteredUnnamed.length}</strong> mã chưa có tên
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 mr-2 font-medium">
                    Trang <strong>{unnamedPage}</strong> / <strong>{unnamedTotalPages}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setUnnamedPage((p) => Math.max(1, p - 1))}
                    disabled={unnamedPage <= 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                    <span>Trước</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnnamedPage((p) => Math.min(unnamedTotalPages, p + 1))}
                    disabled={unnamedPage >= unnamedTotalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>Sau</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: XUNG ĐỘT CẦN RÀ SOÁT (D1) ── */}
        {activeTab === 'conflicts' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-rose-700 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900 leading-relaxed">
                  <p className="font-bold text-sm text-rose-950">
                    Quy tắc bảo vệ tên bưu tá nhập tay (Product Owner Decision D1)
                  </p>
                  <p className="mt-1">
                    Khi nạp file danh bạ mới, nếu một mã bưu tá đã được nhập tay nhưng trong file có tên khác,
                    hệ thống <strong>không tự ý ghi đè</strong> mà đưa vào hàng đợi xung đột dưới đây để người quản trị quyết định.
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100/90 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                      <th className="px-3.5 py-3 text-center w-12">STT</th>
                      <th className="px-3.5 py-3">Mã bưu tá</th>
                      <th className="px-4 py-3 bg-purple-50/50 text-purple-900">Tên hiện tại (Nhập tay)</th>
                      <th className="px-4 py-3 bg-blue-50/50 text-blue-900">Tên từ file mới</th>
                      <th className="px-4 py-3">BCVH từ file</th>
                      <th className="px-3.5 py-3">Nguồn nạp / Đợt</th>
                      <th className="px-3.5 py-3 text-center">Thời gian phát sinh</th>
                      {isAdmin && <th className="px-4 py-3 text-center w-52">Quyết định của Admin</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {loadingConflicts ? (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-slate-400">
                          <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
                          <span>Đang kiểm tra hàng đợi xung đột...</span>
                        </td>
                      </tr>
                    ) : conflictsData.length === 0 ? (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center">
                            <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                            <p className="font-semibold text-slate-700">Không có xung đột nào đang mở</p>
                            <p className="text-xs text-slate-400 mt-0.5">Tất cả dữ liệu danh bạ đã nhất quán.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      conflictsData.map((row, index) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3.5 py-3 text-center font-mono text-xs text-slate-400">
                            {index + 1}
                          </td>
                          <td className="px-3.5 py-3 font-mono text-xs font-bold text-slate-700">
                            {row.ma_buu_ta}
                          </td>
                          <td className="px-4 py-3 font-semibold text-purple-900 bg-purple-50/30">
                            {row.ten_hien_tai}
                          </td>
                          <td className="px-4 py-3 font-semibold text-blue-900 bg-blue-50/30">
                            {row.ten_tu_file}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600">
                            {row.ma_bcvh_file ? `${row.ma_bcvh_file} - ${row.ten_bcvh_file || ''}` : '—'}
                          </td>
                          <td className="px-3.5 py-3 text-xs text-slate-500 font-mono">
                            {row.file_name || row.batch_id}
                          </td>
                          <td className="px-3.5 py-3 text-center font-mono text-xs text-slate-500">
                            {row.created_at || '—'}
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleResolveConflict(row, 'KEPT_MANUAL')}
                                  className="px-2.5 py-1 rounded border border-purple-300 bg-purple-50 text-purple-800 text-xs font-semibold hover:bg-purple-100 transition-colors shadow-xs"
                                >
                                  Giữ tên nhập tay
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResolveConflict(row, 'APPLIED_FILE')}
                                  className="px-2.5 py-1 rounded border border-blue-300 bg-blue-50 text-blue-800 text-xs font-semibold hover:bg-blue-100 transition-colors shadow-xs"
                                >
                                  Lấy theo file
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: CHỈNH SỬA BƯU TÁ (ADMIN ONLY) ── */}
        {editModalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
                <h3 className="text-base font-bold text-slate-800">
                  Chỉnh sửa thông tin bưu tá: {editModalData.ma_buu_ta}
                </h3>
                <button
                  onClick={() => setEditModalData(null)}
                  className="text-slate-400 hover:text-slate-600 rounded-lg p-1"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã bưu tá (Cố định)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editModalData.ma_buu_ta}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên bưu tá <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={editModalData.ten_buu_ta || ''}
                    onChange={(e) =>
                      setEditModalData((prev) => ({
                        ...prev,
                        ten_buu_ta: e.target.value,
                      }))
                    }
                    placeholder="Nhập họ tên bưu tá..."
                    className="w-full px-3 py-2 text-xs font-medium uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bưu cục phục vụ (BCVH)
                  </label>
                  <select
                    value={editModalData.ma_bcvh || ''}
                    onChange={(e) => {
                      const selectedBcvh = bcvhUnits.find((u) => u.ma_bcvh === e.target.value);
                      setEditModalData((prev) => ({
                        ...prev,
                        ma_bcvh: e.target.value,
                        ten_bcvh: selectedBcvh?.ten_bcvh || '',
                      }));
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">Chưa chọn bưu cục</option>
                    {bcvhUnits.map((u) => (
                      <option key={u.ma_bcvh} value={u.ma_bcvh}>
                        {u.ma_bcvh} - {u.ten_bcvh}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Trạng thái hoạt động
                  </label>
                  <select
                    value={editModalData.trang_thai_hoat_dong || 'Hoạt động'}
                    onChange={(e) =>
                      setEditModalData((prev) => ({
                        ...prev,
                        trang_thai_hoat_dong: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Hoạt động">Hoạt động</option>
                    <option value="Nghỉ việc">Nghỉ việc</option>
                    <option value="Tạm nghỉ">Tạm nghỉ</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-700">Lưu ý:</span> Khi sửa thủ công, nguồn dữ liệu sẽ chuyển thành <strong>MANUAL</strong> và được bảo vệ theo quyết định D1 (không bị file mới tự động ghi đè).
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-6 pt-3.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalData(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditModal}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs"
                >
                  Xác nhận lưu
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL: NẠP DANH BẠ EXCEL (ADMIN ONLY) ── */}
        {isImportOpen && (
          <ImportCatalogModal
            onClose={() => setIsImportOpen(false)}
            onSuccess={() => {
              setIsImportOpen(false);
              showBanner('success', 'Nạp file danh bạ bưu tá thành công!');
              fetchDirectory();
              fetchUnnamed();
              fetchConflicts();
            }}
          />
        )}

        {/* ── DRAWER: LỊCH SỬ & KHÔI PHỤC (ADMIN ONLY) ── */}
        {isHistoryOpen && (
          <HistoryDrawer
            onClose={() => setIsHistoryOpen(false)}
            onRollbackSuccess={() => {
              showBanner('success', 'Khôi phục đợt nạp thành công!');
              fetchDirectory();
              fetchUnnamed();
              fetchConflicts();
            }}
          />
        )}

        {/* ── CONFIRMATION MODAL ── */}
        {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    confirmDialog.isDanger
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">{confirmDialog.title}</h4>
                  <p className="text-xs text-slate-600 mt-1 whitespace-pre-line leading-relaxed">
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs ${
                    confirmDialog.isDanger
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Xác nhận thực hiện
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

// ── Sub-component: Import Modal (2-Step Preview -> Confirm) ──
function ImportCatalogModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('upload'); // 'upload' | 'preview'
  const [previewResult, setPreviewResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePreview = async () => {
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      const res = await networkMapClient.previewPostmanImport(file);
      setPreviewResult(res.data);
      setStep('preview');
    } catch (e) {
      setError(e.message || 'Không thể phân tích file Excel.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!previewResult?.session_token) return;
    try {
      setLoading(true);
      setError(null);
      await networkMapClient.confirmPostmanImport(previewResult.session_token);
      onSuccess();
    } catch (e) {
      setError(e.message || 'Nạp danh bạ thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
              <UploadCloud size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Nạp danh bạ bưu tá</h3>
              <p className="text-xs text-slate-500">Quy trình 2 bước: Kiểm tra phân loại → Xác nhận ghi đè</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-1">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {step === 'upload' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-slate-300 hover:border-orange-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50"
                onClick={() => document.getElementById('postman-file-input')?.click()}
              >
                <FileSpreadsheet size={36} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm font-semibold text-slate-700">
                  {file ? file.name : 'Chọn file Excel danh bạ bưu tá'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Định dạng hỗ trợ: .xls, .xlsx (DB Buu ta)</p>
                <input
                  id="postman-file-input"
                  type="file"
                  accept=".xls,.xlsx"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-lg text-xs text-blue-900 leading-relaxed">
                <span className="font-bold">Quy tắc bảo mật dữ liệu:</span> Hệ thống áp dụng nguyên tắc Data Minimization, chỉ tiếp nhận và lưu trữ các trường nghiệp vụ được phê duyệt (Mã bưu tá, Họ tên, BCVH, Trạng thái). Các trường thông tin cá nhân ngoài danh mục bị loại bỏ hoàn toàn trong bộ nhớ.
              </div>
            </div>
          )}

          {step === 'preview' && previewResult && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                  Kết quả phân tích trước khi nạp
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                    <span className="text-emerald-700 font-semibold block">Thêm mới (Insert)</span>
                    <span className="text-lg font-bold font-mono text-emerald-900">
                      {previewResult.summary?.insert ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                    <span className="text-blue-700 font-semibold block">Cập nhật (Update)</span>
                    <span className="text-lg font-bold font-mono text-blue-900">
                      {previewResult.summary?.update ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                    <span className="text-slate-600 font-semibold block">Không đổi</span>
                    <span className="text-lg font-bold font-mono text-slate-800">
                      {previewResult.summary?.unchanged ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                    <span className="text-rose-700 font-semibold block">Xung đột (Conflict)</span>
                    <span className="text-lg font-bold font-mono text-rose-900">
                      {previewResult.summary?.conflict ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                    <span className="text-amber-800 font-semibold block">Không có trong file (D3)</span>
                    <span className="text-lg font-bold font-mono text-amber-900">
                      {previewResult.summary?.absent_from_file ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                    <span className="text-slate-600 font-semibold block">Từ chối định dạng</span>
                    <span className="text-lg font-bold font-mono text-slate-800">
                      {previewResult.rejected?.length ?? 0}
                    </span>
                  </div>
                </div>
              </div>

              {previewResult.summary?.conflict > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
                  <span className="font-bold">Lưu ý quan trọng:</span> Có {previewResult.summary.conflict} mã bưu tá xung đột với tên đã nhập tay. Hệ thống sẽ giữ nguyên tên nhập tay và chuyển vào tab &quot;Xung đột&quot; để PO phê duyệt.
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6 pt-3.5 border-t border-slate-100">
          {step === 'preview' ? (
            <button
              type="button"
              onClick={() => setStep('upload')}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Chọn lại file
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Đóng
            </button>
            {step === 'upload' ? (
              <button
                type="button"
                onClick={handlePreview}
                disabled={!file || loading}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 disabled:opacity-40 shadow-xs"
              >
                {loading ? 'Đang đọc file...' : 'Kiểm tra xem trước'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 disabled:opacity-40 shadow-xs"
              >
                {loading ? 'Đang nạp dữ liệu...' : 'Xác nhận nạp vào CSDL'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Sub-component: History & Rollback Drawer ──
function HistoryDrawer({ onClose, onRollbackSuccess }) {
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await networkMapClient.getPostmanHistory(30);
      setHistoryData(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      setError(e.message || 'Không thể tải lịch sử đợt nạp.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRollback = async (batchId) => {
    try {
      setLoading(true);
      setError(null);
      await networkMapClient.rollbackPostmanBatch(batchId);
      onRollbackSuccess();
      fetchHistory();
    } catch (e) {
      setError(e.message || 'Khôi phục đợt nạp thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
      <div className="h-full w-full max-w-lg bg-white p-6 shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 mb-4">
          <div className="flex items-center gap-2">
            <History size={18} className="text-slate-600" />
            <h3 className="text-base font-bold text-slate-800">Lịch sử thay đổi & Khôi phục</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 rounded-lg p-1">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw size={24} className="mx-auto animate-spin mb-2" />
              <span>Đang tải lịch sử...</span>
            </div>
          ) : historyData.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Chưa có đợt thay đổi nào được ghi nhận.
            </div>
          ) : (
            historyData.map((batch) => (
              <div
                key={batch.batch_id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-800 block">
                      {batch.batch_id}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Bởi <strong>{batch.created_by || 'system'}</strong> · {batch.created_at}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Xác nhận khôi phục đợt thay đổi "${batch.batch_id}"? Tất cả bản ghi trong đợt này sẽ quay về trạng thái trước đó.`)) {
                        handleRollback(batch.batch_id);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition-colors shadow-xs"
                  >
                    <RotateCcw size={12} />
                    <span>Khôi phục</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  {batch.operation_counts && (
                    <>
                      {batch.operation_counts.INSERT > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          +{batch.operation_counts.INSERT} Thêm mới
                        </span>
                      )}
                      {batch.operation_counts.UPDATE > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {batch.operation_counts.UPDATE} Cập nhật
                        </span>
                      )}
                      {batch.operation_counts.RESOLVE_CONFLICT > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {batch.operation_counts.RESOLVE_CONFLICT} Xử lý xung đột
                        </span>
                      )}
                      {batch.operation_counts.ROLLBACK > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {batch.operation_counts.ROLLBACK} Rollback
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3.5 border-t border-slate-100 mt-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
