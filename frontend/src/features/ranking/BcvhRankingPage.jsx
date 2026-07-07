import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { LoadingLayout, ErrorLayout, EmptyLayout } from '../../components/common/StateLayouts';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download, ArrowRight } from 'lucide-react';

// ─── Mock Data (BĐTP Huế — Buổi tỉnh Thừa Thiên Huế) ───────────────────────
const MOCK_BCVH_DATA = [
  { id: 'BC_HUE01', name: 'BCVH Thành phố Huế',       total_bg: 4820, passed: 4201, failed: 619, passed_rate: 87.2, f13_303_rate: 6.8 },
  { id: 'BC_HUE02', name: 'BCVH Hương Thủy',          total_bg: 3105, passed: 2420, failed: 685, passed_rate: 78.0, f13_303_rate: 14.5 },
  { id: 'BC_HUE03', name: 'BCVH Phú Lộc',             total_bg: 2240, passed: 1600, failed: 640, passed_rate: 71.4, f13_303_rate: 18.2 },
  { id: 'BC_HUE04', name: 'BCVH Hương Trà',           total_bg: 1980, passed: 1386, failed: 594, passed_rate: 70.0, f13_303_rate: 20.1 },
  { id: 'BC_HUE05', name: 'BCVH Phong Điền',          total_bg: 1455, passed: 1150, failed: 305, passed_rate: 79.0, f13_303_rate: 11.3 },
  { id: 'BC_HUE06', name: 'BCVH Quảng Điền',          total_bg: 1200, passed: 1008, failed: 192, passed_rate: 84.0, f13_303_rate: 9.5 },
  { id: 'BC_HUE07', name: 'BCVH Phú Vang',            total_bg: 1620, passed: 1231, failed: 389, passed_rate: 75.9, f13_303_rate: 16.7 },
  { id: 'BC_HUE08', name: 'BCVH A Lưới',              total_bg:  720, passed:  432, failed: 288, passed_rate: 60.0, f13_303_rate: 28.4 },
  { id: 'BC_HUE09', name: 'BCVH Nam Đông',            total_bg:  540, passed:  270, failed: 270, passed_rate: 50.0, f13_303_rate: 32.1 },
  { id: 'BC_HUE10', name: 'BCVH Bình Điền',           total_bg:  410, passed:  369, failed:  41, passed_rate: 90.0, f13_303_rate: 4.2 },
  { id: 'BC_HUE11', name: 'BCVH Thuận An',            total_bg:  890, passed:  703, failed: 187, passed_rate: 79.0, f13_303_rate: 12.1 },
  { id: 'BC_HUE12', name: 'BCVH Tứ Hạ',              total_bg:  760, passed:  631, failed: 129, passed_rate: 83.0, f13_303_rate: 10.4 },
];

// ─── Badge màu theo ngưỡng SSOT ──────────────────────────────────────────────
function RateBadge({ rate }) {
  if (rate >= 70) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
      {rate.toFixed(1)}%
    </span>
  );
  if (rate >= 60) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block" />
      {rate.toFixed(1)}%
    </span>
  );
  if (rate >= 50) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
      {rate.toFixed(1)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
      {rate.toFixed(1)}%
    </span>
  );
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3.5 h-3.5 text-[var(--color-primary-600)]" />
    : <ArrowDown className="w-3.5 h-3.5 text-[var(--color-primary-600)]" />;
}

const PAGE_SIZE = 8;

export default function BcvhRankingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL Query State (inherited from D7.0 Engineering Guideline)
  const fromDate = searchParams.get('from_date') || '';
  const toDate   = searchParams.get('to_date')   || '';
  const interval = searchParams.get('interval')  || 'daily';

  // Local state
  const [status,  setStatus]  = useState('loading');
  const [data,    setData]    = useState([]);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [sortCol, setSortCol] = useState('passed_rate');
  const [sortDir, setSortDir] = useState('asc'); // asc = worst first (default business view)
  const [page,    setPage]    = useState(1);

  // Mock fetch
  useEffect(() => {
    setStatus('loading');
    setPage(1);
    const t = setTimeout(() => {
      try {
        setData(MOCK_BCVH_DATA);
        setStatus('success');
      } catch (e) {
        setError({ message: e.message });
        setStatus('error');
      }
    }, 600);
    return () => clearTimeout(t);
  }, [fromDate, toDate, interval]);

  // Sort handler (Loading Guard: disable if loading)
  const handleSort = (col) => {
    if (status === 'loading') return;
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  // Search handler (Loading Guard)
  const handleSearch = (e) => {
    if (status === 'loading') return;
    setSearch(e.target.value);
    setPage(1);
  };

  // Derived: filter + sort
  const processed = useMemo(() => {
    let rows = [...data];
    if (search.trim()) {
      rows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
    }
    rows.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      return (a[sortCol] - b[sortCol]) * mul;
    });
    return rows;
  }, [data, search, sortCol, sortDir]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated  = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Drill-down: Click BCVH → Route Ranking, carry query params
  const handleDrillDown = (bcvh) => {
    if (status === 'loading') return;
    const params = new URLSearchParams();
    if (fromDate) params.set('from_date', fromDate);
    if (toDate)   params.set('to_date',   toDate);
    if (interval) params.set('interval',  interval);
    params.set('bcvh_id',   bcvh.id);
    params.set('bcvh_name', bcvh.name);
    navigate(`/f13/ranking/route?${params.toString()}`);
  };

  // Columns definition
  const COLS = [
    { key: 'rank',         label: 'XH',              sortable: false },
    { key: 'name',         label: 'BCVH',             sortable: false },
    { key: 'total_bg',     label: 'Tổng BG',          sortable: true  },
    { key: 'passed',       label: 'Đạt',              sortable: true  },
    { key: 'failed',       label: 'Không đạt',        sortable: true  },
    { key: 'passed_rate',  label: 'Tỷ lệ Đạt (%)',    sortable: true  },
    { key: 'f13_303_rate', label: 'Chậm nộp (F13_303)', sortable: true },
    { key: 'action',       label: '',                 sortable: false },
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">BCVH Ranking</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Bảng xếp hạng bưu cục vận hành — Bưu điện tỉnh Thừa Thiên Huế
          </p>
        </div>
        {/* Inherited filter badges */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          {fromDate && <span className="px-2 py-1 bg-[var(--color-surface-100)] rounded">{fromDate}</span>}
          {fromDate && toDate && <span>→</span>}
          {toDate   && <span className="px-2 py-1 bg-[var(--color-surface-100)] rounded">{toDate}</span>}
          {interval && <span className="px-2 py-1 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] rounded capitalize">{interval}</span>}
        </div>
      </div>

      {/* ── Toolbar: Search + Export ── */}
      <div className="bg-white rounded-lg border border-[var(--color-surface-200)] shadow-sm p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Tìm kiếm BCVH..."
            value={search}
            onChange={handleSearch}
            disabled={status === 'loading'}
            className="w-full pl-9 pr-4 py-2 text-sm border border-[var(--color-surface-200)] rounded-md bg-[var(--color-surface-50)] text-[var(--color-text-main)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        <button
          disabled={status !== 'success'}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--color-surface-200)] rounded-md text-[var(--color-text-main)] hover:bg-[var(--color-surface-50)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Xuất Excel"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Xuất Excel</span>
        </button>
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 bg-white rounded-lg border border-[var(--color-surface-200)] shadow-sm overflow-hidden flex flex-col">
        {status === 'loading' && (
          <div className="flex-1 flex items-center justify-center min-h-64">
            <LoadingLayout />
          </div>
        )}

        {status === 'error' && (
          <div className="flex-1 flex items-center justify-center min-h-64">
            <ErrorLayout error={error} onRetry={() => { setStatus('loading'); setTimeout(() => { setData(MOCK_BCVH_DATA); setStatus('success'); }, 600); }} />
          </div>
        )}

        {status === 'success' && processed.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-64">
            <EmptyLayout message="Không tìm thấy BCVH" subMessage={`Không có BCVH nào khớp với từ khóa "${search}".`} />
          </div>
        )}

        {status === 'success' && processed.length > 0 && (
          <>
            {/* Table */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-surface-50)] border-b border-[var(--color-surface-200)]">
                    {COLS.map(col => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable && handleSort(col.key)}
                        className={`px-4 py-3 text-left font-semibold text-[var(--color-text-muted)] select-none whitespace-nowrap
                          ${col.sortable ? 'cursor-pointer hover:text-[var(--color-text-main)] hover:bg-[var(--color-surface-100)] transition-colors' : ''}
                          ${sortCol === col.key ? 'text-[var(--color-primary-700)]' : ''}
                        `}
                      >
                        <span className="flex items-center gap-1.5">
                          {col.label}
                          {col.sortable && <SortIcon col={col.key} sortCol={sortCol} sortDir={sortDir} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((row, i) => {
                    const rank = (page - 1) * PAGE_SIZE + i + 1;
                    return (
                      <tr
                        key={row.id}
                        className="border-b border-[var(--color-surface-100)] hover:bg-[var(--color-surface-50)] transition-colors"
                      >
                        {/* XH */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                            ${rank === 1 ? 'bg-red-100 text-red-700' :
                              rank === 2 ? 'bg-orange-100 text-orange-700' :
                              rank <= 5  ? 'bg-yellow-50 text-yellow-700' :
                              'bg-[var(--color-surface-100)] text-[var(--color-text-muted)]'}`}
                          >
                            {rank}
                          </span>
                        </td>
                        {/* BCVH name — clickable drill-down */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDrillDown(row)}
                            className="font-medium text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] hover:underline text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)] rounded"
                          >
                            {row.name}
                          </button>
                        </td>
                        {/* Tổng BG */}
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-text-main)]">
                          {row.total_bg.toLocaleString('vi-VN')}
                        </td>
                        {/* Đạt */}
                        <td className="px-4 py-3 text-right font-mono text-green-700">
                          {row.passed.toLocaleString('vi-VN')}
                        </td>
                        {/* Không đạt */}
                        <td className="px-4 py-3 text-right font-mono text-red-600">
                          {row.failed.toLocaleString('vi-VN')}
                        </td>
                        {/* Tỷ lệ Đạt */}
                        <td className="px-4 py-3">
                          <RateBadge rate={row.passed_rate} />
                        </td>
                        {/* F13_303 */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-[var(--color-text-main)]">
                            {row.f13_303_rate.toFixed(1)}%
                          </span>
                        </td>
                        {/* Action */}
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleDrillDown(row)}
                            className="flex items-center gap-1 text-xs text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] font-medium px-2 py-1 rounded hover:bg-[var(--color-primary-50)] transition-colors"
                            title={`Phân tích tuyến của ${row.name}`}
                          >
                            Tuyến <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-[var(--color-surface-200)] flex items-center justify-between bg-[var(--color-surface-50)]">
              <p className="text-xs text-[var(--color-text-muted)]">
                Hiển thị <span className="font-semibold">{(page - 1) * PAGE_SIZE + 1}</span>–
                <span className="font-semibold">{Math.min(page * PAGE_SIZE, processed.length)}</span> /
                <span className="font-semibold"> {processed.length}</span> bưu cục
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded hover:bg-[var(--color-surface-200)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 text-xs rounded font-medium transition-colors
                      ${p === page
                        ? 'bg-[var(--color-primary-600)] text-white'
                        : 'hover:bg-[var(--color-surface-200)] text-[var(--color-text-main)]'
                      }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded hover:bg-[var(--color-surface-200)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
