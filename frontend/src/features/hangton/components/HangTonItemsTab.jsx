import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  FileText,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  Search,
  Upload,
  CheckCheck,
  X,
} from 'lucide-react';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { nextSortState } from '../../../components/common/tableSort.js';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import {
  fetchItems, downloadItemsFile, saveHandlingEntries, saveHandlingEntryList, downloadHandlingTemplate, importHandlingFile, handlingErrorMessage,
} from '../api/hangtonClient.js';
import HandlingDrawer from '../handling/HandlingDrawer.jsx';
import HandlingForm from '../handling/HandlingForm.jsx';
import HangTonItemRow from './HangTonItemRow.jsx';
import {
  REVIEW_FILTER_OPTIONS, emptyForm, describeSaveResult, toggleSelected, togglePage,
  chunkCodes, mergeSaveResults, rowForm, applyEdit, splitDrafts, remainingDrafts, localToday,
} from '../handling/handlingModel.js';
import {
  formatNumber,
  formatSnapshotLabel,
} from '../hangtonLevels.js';
import { buildItemsParams } from '../hangtonExport.js';

const SCOPE_STATUSES = [
  'Phát không thành công',
  'Vu hồi về bưu cục',
  'Đã giao cho bưu tá',
  'Đã phân tuyến',
  'Đã xác nhận đến',
];

// Column title -> backend sort key (GET /api/hangton/items ?sort=&dir=).
const SORT_TEXT_FIELDS = ['item_code', 'office', 'status', 'postman', 'customer', 'reason', 'review', 'cause', 'plan', 'due', 'result', 'note'];
const TH_ACTIVE = 'bg-rose-100 text-rose-950 font-bold';
const DEFAULT_SORT = { field: 'rank', direction: 'desc' };

// Page sizes; 0 = every row on one page (the API allows up to 20 000).
const PAGE_SIZES = [20, 50, 100, 200, 500, 1000, 0];
const ALL_ROWS = 20000;

const MIN_RANK_OPTIONS = [
  { value: '', label: 'Tất cả mức tồn' },
  { value: '1', label: 'Tồn ≥ 1 ngày' },
  { value: '1.5', label: 'Tồn ≥ 1.5 ngày' },
  { value: '2', label: 'Tồn ≥ 2 ngày' },
  { value: '3', label: 'Tồn ≥ 3 ngày' },
  { value: '4', label: 'Tồn ≥ 4 ngày' },
  { value: '5', label: 'Tồn ≥ 5 ngày (Báo động)' },
  { value: '7', label: 'Tồn ≥ 7 ngày (Nặng)' },
  { value: '14', label: 'Tồn ≥ 14 ngày (Rất nặng)' },
];

export default function HangTonItemsTab({
  currentSnapshot,
  officeOptions = [],
  initialOffice = '',
  initialMinRank = '',
  initialReview = '',
  handlingCatalog = null,
  onHandlingChanged,
  selectedCustomers = [],
}) {
  const customerKey = selectedCustomers.join('|');
  const tableBlockRef = useRef(null);
  const snapshotLabel = formatSnapshotLabel(currentSnapshot);

  const [office, setOffice] = useState(initialOffice || '');
  const [minRank, setMinRank] = useState(initialMinRank || '');
  const [status, setStatus] = useState('');
  const [review, setReview] = useState(initialReview || '');
  const [searchInput, setSearchInput] = useState(''); // what is typed in the parcel-code box
  const [search, setSearch] = useState(''); // what the list is filtered by (the typing, after a short pause)
  const [sort, setSort] = useState(DEFAULT_SORT); // { field, direction }
  const [limit, setLimit] = useState(20);
  const [pageInput, setPageInput] = useState('1');
  const [exporting, setExporting] = useState(false);
  const pageSize = limit === 0 ? ALL_ROWS : limit;
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ total: 0, rows: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // HANGTON-HANDLING-01: review state columns, tick boxes, bulk entry, Excel in/out, one-parcel panel.
  const canHandle = Boolean(handlingCatalog);
  const canWrite = Boolean(handlingCatalog?.can?.write);
  const [reloadKey, setReloadKey] = useState(0);
  const [selected, setSelected] = useState([]);
  const [drawerRow, setDrawerRow] = useState(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [notice, setNotice] = useState(null);
  const fileInputRef = useRef(null);
  // With the handling columns the table is narrow: STT, Số hiệu, Bưu cục, Loại tồn, COD, Rà soát, 4 entry columns (+ tick and Lưu).
  const TH = canHandle ? 'py-2 px-2 whitespace-nowrap' : 'py-2.5 px-3';
  // one office chosen: its name is already in the heading, so the column is left out (room for larger text)
  const showOffice = !(canHandle && office);
  const colCount = (canHandle ? 10 + (canWrite ? 2 : 0) : 9) - (showOffice ? 0 : 1);
  // Direct entry in the table: what was typed (by parcel code) waits here until it is confirmed.
  const [drafts, setDrafts] = useState({});
  const [flagged, setFlagged] = useState({}); // parcels whose save was tried while something was missing
  const draftCount = Object.keys(drafts).length;
  const readyCount = useMemo(
    () => (handlingCatalog ? splitDrafts(handlingCatalog, drafts, localToday()).ready.length : 0),
    [handlingCatalog, drafts],
  );
  const today = localToday();
  const reloadList = () => { setReloadKey((n) => n + 1); onHandlingChanged?.(); };

  // Typed but not confirmed rows are lost when the page is closed: ask first.
  useEffect(() => {
    if (draftCount === 0) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draftCount]);

  // Sync if initialOffice changes from parent drilldown
  useEffect(() => {
    if (initialOffice !== undefined) {
      setOffice(initialOffice);
      setPage(1);
    }
  }, [initialOffice]);

  // The hot-spot block opens the list already limited to 5 days and more
  useEffect(() => {
    setMinRank(initialMinRank || '');
    setPage(1);
  }, [initialMinRank]);

  useEffect(() => {
    setReview(initialReview || '');
    setPage(1);
  }, [initialReview]);

  // Load items when filter/page/sort changes
  useEffect(() => {
    if (!currentSnapshot?.id) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const offset = (page - 1) * pageSize;
        const res = await fetchItems(buildItemsParams({
          snapshotId: currentSnapshot.id, office, customers: selectedCustomers, minRank, status, review, search, sort: sort.field, dir: sort.direction, limit: pageSize, offset,
        }));
        if (active && res) {
          setData(res);
        }
      } catch (err) {
        if (active) setError(err.message || 'Lỗi khi tải chi tiết bưu gửi');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
    // selectedCustomers is represented by customerKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSnapshot?.id, office, customerKey, minRank, status, review, search, sort, pageSize, page, reloadKey]);

  useEffect(() => { setPage(1); }, [customerKey]);

  // The search follows the typing after a short pause (Enter applies it at once).
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = Math.max(1, Math.ceil((data.total || 0) / pageSize));

  useEffect(() => { setPageInput(String(page)); }, [page]);

  const goToPage = (value) => {
    const n = Math.min(totalPages, Math.max(1, Math.floor(Number(value)) || 1));
    setPage(n);
    setPageInput(String(n));
  };

  const handleSort = (field) => {
    setSort((current) => nextSortState(current, field, { textFields: SORT_TEXT_FIELDS }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setOffice('');
    setMinRank('');
    setStatus('');
    setReview('');
    setSearchInput('');
    setSearch('');
    setSort(DEFAULT_SORT);
    setPage(1);
  };

  // Every row of the current filter (not just this page), built by the server.
  const handleExport = async (format) => {
    setExporting(true);
    try {
      await downloadItemsFile(buildItemsParams({
        snapshotId: currentSnapshot.id, office, customers: selectedCustomers, minRank, status, review, search, sort: sort.field, dir: sort.direction,
      }), format);
    } catch (err) {
      setError(err?.message || 'Không tải được tệp.');
    } finally {
      setExporting(false);
    }
  };

  const pageCodes = (data.rows || []).map((r) => r.item_code);
  const pageAllSelected = canWrite && pageCodes.length > 0 && pageCodes.every((c) => selected.includes(c));

  const finish = (result) => {
    setNotice(describeSaveResult(result));
    setSelected([]);
    setDrafts((current) => remainingDrafts(current, result));
    reloadList();
  };

  // Same answers for every ticked parcel (in chunks the server accepts), or "keep as before".
  const saveSelected = async (mode, input) => {
    if (selected.length === 0) return;
    setWorking(true);
    setNotice(null);
    try {
      const parts = [];
      for (const codes of chunkCodes(selected)) parts.push(await saveHandlingEntries({ mode, itemCodes: codes, input }));
      finish(mergeSaveResults(parts));
      setBulkOpen(false);
    } catch (err) {
      setNotice({ tone: 'error', lines: [handlingErrorMessage(err)] });
    } finally {
      setWorking(false);
    }
  };

  // Tick every parcel of the current filter, not only this page.
  const selectAllOfFilter = async () => {
    setWorking(true);
    try {
      const res = await fetchItems(buildItemsParams({
        snapshotId: currentSnapshot.id, office, customers: selectedCustomers, minRank, status, review, search, sort: sort.field, dir: sort.direction, limit: ALL_ROWS, offset: 0,
      }));
      setSelected((res?.rows || []).map((r) => r.item_code));
    } catch (err) {
      setNotice({ tone: 'error', lines: [handlingErrorMessage(err)] });
    } finally {
      setWorking(false);
    }
  };

  const downloadTemplate = async () => {
    setWorking(true);
    try {
      const sent = await downloadHandlingTemplate({ id: currentSnapshot.id, office: office || undefined, min_rank: minRank || undefined, customers: selectedCustomers.length ? selectedCustomers.join('|') : undefined, review: review || undefined, status: status || undefined, q: search.trim() || undefined });
      if (sent?.total > sent?.included) {
        setNotice({ tone: 'warning', lines: [`File chỉ chứa ${formatNumber(sent.included)} / ${formatNumber(sent.total)} bưu gửi của bộ lọc. Lọc nhỏ hơn (theo bưu cục, mức tồn hoặc trạng thái rà soát) rồi tải tiếp phần còn lại.`] });
      }
    } catch (err) {
      setNotice({ tone: 'error', lines: [handlingErrorMessage(err)] });
    } finally {
      setWorking(false);
    }
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setWorking(true);
    setNotice(null);
    try {
      finish(await importHandlingFile(file));
    } catch (err) {
      setNotice({ tone: 'error', lines: [handlingErrorMessage(err)] });
    } finally {
      setWorking(false);
    }
  };

  const editRow = useCallback((row, patch) => {
    setDrafts((current) => ({ ...current, [row.item_code]: applyEdit(handlingCatalog, rowForm(row, current), patch) }));
  }, [handlingCatalog]);

  const discardRow = useCallback((code) => {
    setDrafts((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== code)));
    setFlagged((current) => Object.fromEntries(Object.entries(current).filter(([key]) => key !== code)));
  }, []);

  const toggleRow = useCallback((code) => setSelected((s) => toggleSelected(s, code)), []);
  const openRow = useCallback((row) => setDrawerRow(row), []);

  // Confirms the typed rows: `codes` = one parcel ("Lưu" of its row), nothing = every typed row ("Xác nhận dữ liệu").
  // Complete rows are saved; an incomplete one stays on the table with its empty cells marked red.
  const confirmDrafts = async (codes = null) => {
    const picked = codes ? Object.fromEntries(Object.entries(drafts).filter(([code]) => codes.includes(code))) : drafts;
    const { ready, incomplete } = splitDrafts(handlingCatalog, picked, today);
    setFlagged((current) => ({ ...current, ...Object.fromEntries(incomplete.map((code) => [code, true])) }));
    if (ready.length === 0) {
      setNotice({ tone: 'error', lines: [`${incomplete.length} dòng chưa đủ Nội dung xử lý, Hướng xử lý (và ngày nếu cần) nên chưa lưu. Điền đủ các ô viền đỏ rồi lưu lại.`] });
      return;
    }
    setWorking(true);
    setNotice(null);
    try {
      const parts = [];
      for (const part of chunkCodes(ready)) parts.push(await saveHandlingEntryList(part));
      const merged = mergeSaveResults(parts);
      const summary = describeSaveResult(merged);
      if (incomplete.length > 0) summary.lines.push(`${incomplete.length} dòng chưa đủ thông tin nên chưa lưu, vẫn còn trên bảng để bạn điền tiếp.`);
      setNotice(incomplete.length > 0 && summary.tone === 'success' ? { ...summary, tone: 'warning' } : summary);
      setDrafts((current) => remainingDrafts(current, merged));
      setFlagged((current) => Object.fromEntries(Object.entries(current).filter(([code]) => !ready.some((r) => r.item_code === code))));
      reloadList();
    } catch (err) {
      setNotice({ tone: 'error', lines: [handlingErrorMessage(err)] });
    } finally {
      setWorking(false);
    }
  };
  // The row's "Lưu" always runs the newest confirmDrafts, so the rows keep a stable handler and stay memoised.
  const confirmRef = useRef(confirmDrafts);
  confirmRef.current = confirmDrafts;
  const saveRow = useCallback((code) => confirmRef.current([code]), []);

  const discardDrafts = () => { setDrafts({}); setFlagged({}); setNotice(null); };

  const noticeTone = { success: 'border-emerald-200 bg-emerald-50 text-emerald-900', warning: 'border-amber-200 bg-amber-50 text-amber-900', error: 'border-rose-200 bg-rose-50 text-rose-900' };

  const pageBar = (
    <div className="flex flex-col gap-3 pt-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between" data-no-capture="true">
      <div>
        Hiển thị <strong>{formatNumber(data.rows?.length || 0)}</strong> / <strong>{formatNumber(data.total || 0)}</strong> bưu gửi
        {office ? ` tại bưu cục ${office}` : ''}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5">
          <span>Số dòng/trang:</span>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 shadow-2xs focus:outline-none"
          >
            {PAGE_SIZES.map((n) => (<option key={n} value={n}>{n === 0 ? 'Tất cả' : n}</option>))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => goToPage(1)} disabled={page <= 1} title="Trang đầu"
            className="cursor-pointer rounded-md border border-slate-200 p-1 text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40"><ChevronsLeft size={16} /></button>
          <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1} title="Trang trước"
            className="cursor-pointer rounded-md border border-slate-200 p-1 text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
          <span className="flex items-center gap-1 px-1">
            Trang
            <input
              type="number" min={1} max={totalPages} value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => goToPage(pageInput)}
              onKeyDown={(e) => { if (e.key === 'Enter') goToPage(pageInput); }}
              className="w-16 rounded-md border border-slate-300 px-1.5 py-0.5 text-center text-sm font-bold text-slate-800"
              aria-label="Số trang"
            />
            / <strong>{totalPages}</strong>
          </span>
          <button type="button" onClick={() => goToPage(page + 1)} disabled={page >= totalPages} title="Trang sau"
            className="cursor-pointer rounded-md border border-slate-200 p-1 text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={16} /></button>
          <button type="button" onClick={() => goToPage(totalPages)} disabled={page >= totalPages} title="Trang cuối"
            className="cursor-pointer rounded-md border border-slate-200 p-1 text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40"><ChevronsRight size={16} /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div
      ref={tableBlockRef}
      className="rounded-2xl border border-slate-200/80 bg-white shadow-xs p-6 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText size={18} className="text-rose-600" />
            Chi tiết danh sách Bưu gửi Tồn đọng ({snapshotLabel})
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Tra cứu theo bưu cục, ngưỡng tuổi tồn và trạng thái TMS. Màu đỏ đậm dần theo Loại Tồn.
          </p>
        </div>

        <div className="flex items-center gap-2" data-no-capture="true">
          <button
            type="button"
            onClick={() => handleExport('xlsx')}
            disabled={exporting || !data.total}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-2xs transition-colors hover:bg-emerald-700 disabled:opacity-50"
            title="Tải toàn bộ bưu gửi theo bộ lọc hiện tại (không chỉ trang này)"
          >
            <Download size={13} />
            <span>{exporting ? 'Đang tạo tệp...' : 'Tải Excel (tất cả)'}</span>
          </button>
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={exporting || !data.total}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50"
            title="Tải toàn bộ bưu gửi theo bộ lọc hiện tại (CSV)"
          >
            <Download size={13} />
            <span>CSV (tất cả)</span>
          </button>
          <BlockCaptureButton
            targetRef={tableBlockRef}
            blockTitle="Chi tiết bưu gửi hàng tồn"
            dateOrPeriod={snapshotLabel}
          />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/70" data-no-capture="true">
        <div className="flex items-center gap-1 text-sm font-bold text-slate-600 uppercase tracking-wider">
          <Filter size={13} />
          <span>Bộ lọc:</span>
        </div>

        {/* Parcel code search: one code, a piece of it, or several pasted together */}
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput.trim()); setPage(1); } }}
            placeholder="Tìm mã bưu gửi (dán được nhiều mã)"
            className="w-64 rounded-lg border border-slate-300 bg-white py-1.5 pl-7 pr-2.5 text-sm text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-none"
            aria-label="Tìm theo mã bưu gửi"
          />
        </div>

        {/* Office filter */}
        <select
          value={office}
          onChange={(e) => {
            setOffice(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-sm text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-none"
        >
          <option value="">Tất cả bưu cục ({officeOptions.length})</option>
          {officeOptions.map((off) => (
            <option key={off} value={off}>{off}</option>
          ))}
        </select>

        {/* Min Rank / Level filter */}
        <select
          value={minRank}
          onChange={(e) => {
            setMinRank(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-sm text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-none"
        >
          {MIN_RANK_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-sm text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-none"
        >
          <option value="">Tất cả trạng thái</option>
          {SCOPE_STATUSES.map((st) => (
            <option key={st} value={st}>{st}</option>
          ))}
        </select>

        {/* Review state filter (stock handling) */}
        {canHandle ? (
          <select
            value={review}
            onChange={(e) => { setReview(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 bg-white py-1.5 px-2.5 text-sm text-slate-800 shadow-2xs focus:border-rose-500 focus:outline-none"
            aria-label="Trạng thái rà soát"
          >
            {REVIEW_FILTER_OPTIONS.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        ) : null}

        {/* Reset button */}
        {(office || minRank || status || review || search || sort.field !== 'rank' || sort.direction !== 'desc') && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 text-sm text-rose-600 hover:text-rose-700 font-semibold cursor-pointer ml-auto"
          >
            <RotateCcw size={12} />
            <span>Xóa lọc</span>
          </button>
        )}
      </div>

      {canHandle ? (
        <div className="space-y-2" data-no-capture="true">
          {canWrite ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-rose-200 bg-rose-50/60 px-2.5 py-1.5">
              <span className="text-xs font-bold text-rose-900">
                {selected.length > 0 ? `Đã chọn ${formatNumber(selected.length)} bưu gửi` : 'Nhập ngay trên bảng, hoặc tick nhiều bưu gửi để nhập cùng lúc'}
              </span>
              <button type="button" disabled={working || selected.length === 0} onClick={() => setBulkOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-rose-600 bg-rose-600 px-2 py-0.5 text-xs font-bold text-white shadow-2xs hover:bg-rose-700 disabled:opacity-40">
                Rà soát đã chọn
              </button>
              <button type="button" disabled={working || selected.length === 0} onClick={() => saveSelected('KEEP')}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-amber-600 bg-amber-600 px-2 py-0.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 disabled:opacity-40"
                title="Lặp lại đúng nội dung đã nhập lần trước cho các bưu gửi đã chọn vẫn còn tồn">
                <CheckCheck size={12} /> Giữ nguyên
              </button>
              {data.total > pageCodes.length && selected.length < data.total ? (
                <button type="button" disabled={working} onClick={selectAllOfFilter} className="cursor-pointer text-xs font-bold text-rose-700 hover:underline">
                  Chọn cả {formatNumber(data.total)} theo bộ lọc
                </button>
              ) : null}
              {selected.length > 0 ? (
                <button type="button" onClick={() => setSelected([])} className="cursor-pointer text-xs font-semibold text-slate-600 hover:underline">Bỏ chọn</button>
              ) : null}
              <span className="ml-auto flex items-center gap-1.5">
                <button type="button" disabled={working || !data.total} onClick={downloadTemplate}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-emerald-600 bg-white px-2 py-0.5 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-50 disabled:opacity-40"
                  title="Tải file Excel các bưu gửi theo bộ lọc, điền xử lý rồi nhập lại">
                  <Download size={12} /> Tải file để điền
                </button>
                <button type="button" disabled={working} onClick={() => fileInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-emerald-600 bg-emerald-600 px-2 py-0.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-40">
                  <Upload size={12} /> Nhập file đã điền
                </button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={uploadFile} />
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {pageBar}

      {/* Main Detail Table */}
      <div data-fit-table="true" className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className={`bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase ${canHandle ? 'text-[12px] tracking-wide' : 'text-[13px] tracking-wider'}`}>
              {canWrite ? (
                <th className={`${TH} `} data-no-capture="true">
                  <input type="checkbox" checked={pageAllSelected} onChange={() => setSelected((s) => togglePage(s, pageCodes))} aria-label="Chọn cả trang" className="cursor-pointer" />
                </th>
              ) : null}
              <th className={`${TH} `}>STT</th>
              <SortableTh field="item_code" sort={sort} onSort={handleSort} className={`${TH} `} activeClassName={TH_ACTIVE}>Số hiệu bưu gửi</SortableTh>
              {showOffice ? (<SortableTh field="office" sort={sort} onSort={handleSort} className={`${TH} `} activeClassName={TH_ACTIVE}>Bưu cục phát</SortableTh>) : null}
              {canHandle ? null : (<SortableTh field="customer" sort={sort} onSort={handleSort} className={`${TH} `} activeClassName={TH_ACTIVE}>Nhóm KH</SortableTh>)}
              {canHandle ? null : (<SortableTh field="status" sort={sort} onSort={handleSort} className={`${TH} `} activeClassName={TH_ACTIVE}>Trạng thái TMS</SortableTh>)}
              <SortableTh field="rank" sort={sort} onSort={handleSort} className={`${TH} `} activeClassName={TH_ACTIVE}>Loại tồn</SortableTh>
              <SortableTh field="cod" sort={sort} onSort={handleSort} className={`${TH}  text-right`} activeClassName={TH_ACTIVE}>Tiền COD</SortableTh>
              {canHandle ? null : (<SortableTh field="postman" sort={sort} onSort={handleSort} className={`${TH} `} activeClassName={TH_ACTIVE}>Bưu tá phụ trách</SortableTh>)}
              {canHandle ? null : (<SortableTh field="reason" sort={sort} onSort={handleSort} className={`${TH} `} activeClassName={TH_ACTIVE}>Lý do</SortableTh>)}
              {canHandle ? (
                <>
                  <SortableTh field="review" sort={sort} onSort={handleSort} className={`${TH} `} activeClassName={TH_ACTIVE}>Rà soát</SortableTh>
                  <SortableTh field="cause" sort={sort} onSort={handleSort} className={`${TH}  min-w-[9rem]`} activeClassName={TH_ACTIVE}>Nội dung xử lý</SortableTh>
                  <SortableTh field="plan" sort={sort} onSort={handleSort} className={`${TH}  min-w-[9rem]`} activeClassName={TH_ACTIVE} title="Hướng xử lý (kèm ngày phát lại / chuyển hoàn). Bấm để sắp xếp.">Hướng xử lý</SortableTh>
                  <SortableTh field="result" sort={sort} onSort={handleSort} className={`${TH}  min-w-[7rem]`} activeClassName={TH_ACTIVE} title="Tự động theo nội dung xử lý. Bấm để sắp xếp.">Kết quả xử lý</SortableTh>
                  <SortableTh field="note" sort={sort} onSort={handleSort} className={`${TH}  min-w-[8rem]`} activeClassName={TH_ACTIVE}>Ghi chú</SortableTh>
                  {canWrite ? (<th className={`${TH} `} data-no-capture="true">Lưu</th>) : null}
                </>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={colCount} className="py-12 text-center text-slate-400">
                  Đang tải danh sách bưu gửi...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={colCount} className="py-8 text-center text-red-600 font-semibold">
                  {error}
                </td>
              </tr>
            ) : !data.rows || data.rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-12 text-center text-slate-400">
                  Không tìm thấy bưu gửi nào thỏa mãn điều kiện lọc
                </td>
              </tr>
            ) : (
              data.rows.map((row, idx) => (
                <HangTonItemRow
                  key={`${row.item_code}_${idx}`}
                  row={row}
                  rowNum={(page - 1) * pageSize + idx + 1}
                  canWrite={canWrite}
                  canHandle={canHandle}
                  showOffice={showOffice}
                  catalog={handlingCatalog}
                  checked={selected.includes(row.item_code)}
                  draft={drafts[row.item_code]}
                  flagged={Boolean(flagged[row.item_code])}
                  saving={working}
                  today={today}
                  onToggle={toggleRow}
                  onOpen={openRow}
                  onEdit={editRow}
                  onSave={saveRow}
                  onDiscard={discardRow}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageBar}

      {/* Always in view while typing: what is waiting to be confirmed, and the answer of the last save. */}
      {canHandle && (notice || (canWrite && draftCount > 0)) ? (
        <div className="sticky bottom-3 z-30 space-y-2" data-no-capture="true">
          {notice ? (
            <div className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-semibold shadow-md ${noticeTone[notice.tone] || noticeTone.error}`} role="status">
              <div className="max-h-40 overflow-y-auto">{notice.lines.map((line) => (<p key={line}>{line}</p>))}</div>
              <button type="button" onClick={() => setNotice(null)} className="cursor-pointer rounded p-0.5 hover:bg-black/5" aria-label="Đóng thông báo"><X size={14} /></button>
            </div>
          ) : null}
          {canWrite && draftCount > 0 ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-3 shadow-lg">
              <span className="text-sm font-bold text-amber-900">
                {formatNumber(draftCount)} dòng đã nhập, chưa lưu
                {readyCount < draftCount ? ` (${formatNumber(readyCount)} dòng đủ thông tin)` : ''}
                <span className="ml-1 font-medium text-amber-800">· Bấm “Lưu” ở cuối từng dòng, hoặc xác nhận tất cả:</span>
              </span>
              <button type="button" disabled={working} onClick={() => confirmDrafts()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-700 px-3 py-1 text-xs font-bold text-white shadow-2xs hover:bg-emerald-800 disabled:opacity-40">
                <CheckCheck size={13} /> {working ? 'Đang lưu...' : `Xác nhận dữ liệu (${formatNumber(draftCount)})`}
              </button>
              <button type="button" disabled={working} onClick={discardDrafts} className="cursor-pointer text-sm font-semibold text-slate-600 hover:underline">Bỏ các dòng đã nhập</button>
            </div>
          ) : null}
        </div>
      ) : null}

      {drawerRow ? (
        <HandlingDrawer
          row={drawerRow}
          catalog={handlingCatalog}
          canWrite={canWrite}
          onClose={() => setDrawerRow(null)}
          onSaved={reloadList}
        />
      ) : null}

      {bulkOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-label="Rà soát hàng loạt">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Rà soát {formatNumber(selected.length)} bưu gửi đã chọn</h3>
            <p className="mb-4 mt-1 text-sm text-slate-500">Cùng một nội dung được lưu cho mọi bưu gửi đã chọn; mỗi bưu gửi có một dòng nhật ký riêng.</p>
            <HandlingForm
              catalog={handlingCatalog}
              initial={emptyForm()}
              submitLabel={`Lưu cho ${formatNumber(selected.length)} bưu gửi`}
              submitting={working}
              onSubmit={(input) => saveSelected('REVIEW', input)}
              onCancel={() => setBulkOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
