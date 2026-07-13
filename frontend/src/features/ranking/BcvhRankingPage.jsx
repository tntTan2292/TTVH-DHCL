import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoadingLayout, ErrorLayout, EmptyLayout } from '../../components/common/StateLayouts';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download, ArrowRight } from 'lucide-react';
import f13DashboardClient from '../../api/F13DashboardClient';

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
  const navigate = useNavigate();

  // Local state
  const [status,  setStatus]  = useState('loading');
  const [data,    setData]    = useState([]);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [sortCol, setSortCol] = useState('passed_rate');
  const [sortDir, setSortDir] = useState('asc'); // asc = worst first (default business view)
  const [page,    setPage]    = useState(1);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [maxDate, setMaxDate] = useState('');

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      try {
        setStatus('loading');
        const meta = await f13DashboardClient.getDashboardMeta();
        if (!mounted) return;

        const latestDate = meta?.data?.max_date || '';
        setMaxDate(latestDate);
        setFromDate(latestDate);
        setToDate(latestDate);
      } catch (e) {
        if (!mounted) return;
        setError({ message: e.message || 'KhÃ´ng thá»ƒ táº£i ngÃ y dá»¯ liá»‡u má»›i nháº¥t' });
        setStatus('error');
      }
    };

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchRanking = async () => {
      try {
        setStatus('loading');
        setPage(1);
        setError(null);

        const result = await f13DashboardClient.getBcvhRankingForUi(fromDate, toDate, 1000, 'rank', 'asc');
        if (!mounted) return;

        setData(result.data || []);
        setStatus('success');
      } catch (e) {
        if (!mounted) return;
        setError({ message: e.message || 'Không thể tải dữ liệu BCVH Ranking' });
        setStatus('error');
      }
    };

    fetchRanking();
    return () => {
      mounted = false;
    };
  }, [fromDate, toDate]);

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

  const handleDateChange = (setter) => (e) => {
    if (status === 'loading') return;
    setter(e.target.value);
  };

  const isSingleDay = Boolean(fromDate && toDate && fromDate === toDate);

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
            B?ng x?p h?ng b?u c?c v?n h?nh ? B?u ?i?n t?nh Th?a Thi?n Hu?
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-[320px]">
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
              <span>Từ ngày</span>
              <input
                type="date"
                value={fromDate}
                onChange={handleDateChange(setFromDate)}
                disabled={status === 'loading'}
                className="px-3 py-2 text-sm border border-[var(--color-surface-200)] rounded-md bg-white text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] disabled:opacity-50"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-[var(--color-text-muted)]">
              <span>Đến ngày</span>
              <input
                type="date"
                value={toDate}
                onChange={handleDateChange(setToDate)}
                disabled={status === 'loading'}
                className="px-3 py-2 text-sm border border-[var(--color-surface-200)] rounded-md bg-white text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-500)] disabled:opacity-50"
              />
            </label>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="px-2 py-1 bg-[var(--color-surface-100)] rounded">
              Max date: {maxDate || 'N/A'}
            </span>
            <span className={`px-2 py-1 rounded ${isSingleDay ? 'bg-[var(--color-primary-50)] text-[var(--color-primary-700)]' : 'bg-[var(--color-surface-100)] text-[var(--color-text-muted)]'}`}>
              {isSingleDay ? 'Một ngày' : 'Lũy kế'}
            </span>
          </div>
        </div>
      </div>
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
            <ErrorLayout
              error={error}
              onRetry={() => {
                setStatus('loading');
                f13DashboardClient.getBcvhRankingForUi(fromDate, toDate, 1000, 'rank', 'asc')
                  .then((result) => {
                    setData(result.data || []);
                    setStatus('success');
                  })
                  .catch((e) => {
                    setError({ message: e.message || 'Không thể tải dữ liệu BCVH Ranking' });
                    setStatus('error');
                  });
              }}
            />
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




