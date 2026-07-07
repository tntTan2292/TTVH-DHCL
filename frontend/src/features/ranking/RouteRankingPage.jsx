import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { LoadingLayout, ErrorLayout, EmptyLayout } from '../../components/common/StateLayouts';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Download, ArrowRight, ChevronRight as Chevron } from 'lucide-react';

// ─── Mock data keyed by bcvh_id (BĐTP Thừa Thiên Huế) ───────────────────────
const MOCK_ROUTES_BY_BCVH = {
  BC_HUE01: [ // TP Huế
    { id: 'R_HUE01_01', code: 'TH-01', name: 'Tuyến Phường Phú Hội',      total_bg: 620, passed: 572, failed:  48, passed_rate: 92.3, f13_303_rate:  3.1 },
    { id: 'R_HUE01_02', code: 'TH-02', name: 'Tuyến Phường Vĩnh Ninh',    total_bg: 580, passed: 519, failed:  61, passed_rate: 89.5, f13_303_rate:  5.2 },
    { id: 'R_HUE01_03', code: 'TH-03', name: 'Tuyến Phường Thuận Hòa',    total_bg: 540, passed: 459, failed:  81, passed_rate: 85.0, f13_303_rate:  8.3 },
    { id: 'R_HUE01_04', code: 'TH-04', name: 'Tuyến Phường Tây Lộc',      total_bg: 495, passed: 416, failed:  79, passed_rate: 84.0, f13_303_rate:  7.9 },
    { id: 'R_HUE01_05', code: 'TH-05', name: 'Tuyến Phường Phú Thuận',    total_bg: 440, passed: 356, failed:  84, passed_rate: 80.9, f13_303_rate: 10.5 },
    { id: 'R_HUE01_06', code: 'TH-06', name: 'Tuyến Phường Kim Long',      total_bg: 390, passed: 295, failed:  95, passed_rate: 75.6, f13_303_rate: 14.1 },
    { id: 'R_HUE01_07', code: 'TH-07', name: 'Tuyến Phường Phường Đúc',   total_bg: 350, passed: 248, failed: 102, passed_rate: 70.9, f13_303_rate: 15.7 },
    { id: 'R_HUE01_08', code: 'TH-08', name: 'Tuyến Phường An Tây',       total_bg: 405, passed: 263, failed: 142, passed_rate: 64.9, f13_303_rate: 22.4 },
  ],
  BC_HUE02: [ // Hương Thủy
    { id: 'R_HUE02_01', code: 'HT-01', name: 'Tuyến Phường Phú Bài',      total_bg: 540, passed: 470, failed:  70, passed_rate: 87.0, f13_303_rate:  8.1 },
    { id: 'R_HUE02_02', code: 'HT-02', name: 'Tuyến TT Phú Lương',        total_bg: 490, passed: 407, failed:  83, passed_rate: 83.1, f13_303_rate: 10.2 },
    { id: 'R_HUE02_03', code: 'HT-03', name: 'Tuyến Xã Thủy Phương',      total_bg: 430, passed: 330, failed: 100, passed_rate: 76.7, f13_303_rate: 16.8 },
    { id: 'R_HUE02_04', code: 'HT-04', name: 'Tuyến Xã Thủy Vân',         total_bg: 385, passed: 270, failed: 115, passed_rate: 70.1, f13_303_rate: 20.0 },
    { id: 'R_HUE02_05', code: 'HT-05', name: 'Tuyến Xã Thủy Thanh',       total_bg: 410, passed: 253, failed: 157, passed_rate: 61.7, f13_303_rate: 24.6 },
    { id: 'R_HUE02_06', code: 'HT-06', name: 'Tuyến Xã Thủy Dương',       total_bg: 380, passed: 196, failed: 184, passed_rate: 51.6, f13_303_rate: 30.3 },
    { id: 'R_HUE02_07', code: 'HT-07', name: 'Tuyến Xã Thủy Châu',        total_bg: 470, passed: 494, failed: -24, passed_rate: 56.0, f13_303_rate: 26.1 },
  ],
  BC_HUE03: [ // Phú Lộc
    { id: 'R_HUE03_01', code: 'PL-01', name: 'Tuyến TT Phú Lộc',          total_bg: 480, passed: 388, failed:  92, passed_rate: 80.8, f13_303_rate: 11.2 },
    { id: 'R_HUE03_02', code: 'PL-02', name: 'Tuyến TT Lăng Cô',          total_bg: 350, passed: 262, failed:  88, passed_rate: 74.9, f13_303_rate: 15.6 },
    { id: 'R_HUE03_03', code: 'PL-03', name: 'Tuyến Xã Lộc An',           total_bg: 310, passed: 214, failed:  96, passed_rate: 69.0, f13_303_rate: 22.0 },
    { id: 'R_HUE03_04', code: 'PL-04', name: 'Tuyến Xã Lộc Điền',         total_bg: 290, passed: 186, failed: 104, passed_rate: 64.1, f13_303_rate: 25.3 },
    { id: 'R_HUE03_05', code: 'PL-05', name: 'Tuyến Xã Vinh Hưng',        total_bg: 280, passed: 148, failed: 132, passed_rate: 52.9, f13_303_rate: 31.8 },
    { id: 'R_HUE03_06', code: 'PL-06', name: 'Tuyến Xã Vinh Mỹ',          total_bg: 260, passed: 130, failed: 130, passed_rate: 50.0, f13_303_rate: 33.7 },
    { id: 'R_HUE03_07', code: 'PL-07', name: 'Tuyến Xã Lộc Trì',          total_bg: 270, passed: 272, failed:  -2, passed_rate: 59.8, f13_303_rate: 27.1 },
  ],
  BC_HUE04: [ // Hương Trà
    { id: 'R_HUE04_01', code: 'HTR-01', name: 'Tuyến TT Tứ Hạ',           total_bg: 420, passed: 344, failed:  76, passed_rate: 81.9, f13_303_rate: 12.0 },
    { id: 'R_HUE04_02', code: 'HTR-02', name: 'Tuyến Phường Hương Vân',    total_bg: 360, passed: 263, failed:  97, passed_rate: 73.1, f13_303_rate: 16.5 },
    { id: 'R_HUE04_03', code: 'HTR-03', name: 'Tuyến Xã Hương Toàn',      total_bg: 310, passed: 201, failed: 109, passed_rate: 64.8, f13_303_rate: 24.2 },
    { id: 'R_HUE04_04', code: 'HTR-04', name: 'Tuyến Xã Hương Phong',     total_bg: 290, passed: 165, failed: 125, passed_rate: 56.9, f13_303_rate: 28.9 },
    { id: 'R_HUE04_05', code: 'HTR-05', name: 'Tuyến Xã Hương Vinh',      total_bg: 280, passed: 140, failed: 140, passed_rate: 50.0, f13_303_rate: 35.4 },
    { id: 'R_HUE04_06', code: 'HTR-06', name: 'Tuyến Xã Bình Tiến',       total_bg: 320, passed: 213, failed: 107, passed_rate: 66.6, f13_303_rate: 22.1 },
  ],
  BC_HUE08: [ // A Lưới
    { id: 'R_HUE08_01', code: 'AL-01', name: 'Tuyến TT A Lưới',           total_bg: 180, passed: 113, failed:  67, passed_rate: 62.8, f13_303_rate: 25.5 },
    { id: 'R_HUE08_02', code: 'AL-02', name: 'Tuyến Xã A Roàng',          total_bg: 120, passed:  66, failed:  54, passed_rate: 55.0, f13_303_rate: 30.8 },
    { id: 'R_HUE08_03', code: 'AL-03', name: 'Tuyến Xã Nhâm',             total_bg:  95, passed:  47, failed:  48, passed_rate: 49.5, f13_303_rate: 36.2 },
    { id: 'R_HUE08_04', code: 'AL-04', name: 'Tuyến Xã Hồng Thái',        total_bg:  85, passed:  38, failed:  47, passed_rate: 44.7, f13_303_rate: 40.1 },
    { id: 'R_HUE08_05', code: 'AL-05', name: 'Tuyến Xã Bắc Sơn',          total_bg:  90, passed:  37, failed:  53, passed_rate: 41.1, f13_303_rate: 43.6 },
    { id: 'R_HUE08_06', code: 'AL-06', name: 'Tuyến Xã Đông Sơn',         total_bg: 150, passed:  131, failed:  19, passed_rate: 87.3, f13_303_rate:  8.0 },
  ],
  BC_HUE09: [ // Nam Đông
    { id: 'R_HUE09_01', code: 'ND-01', name: 'Tuyến TT Khe Tre',          total_bg: 160, passed:  82, failed:  78, passed_rate: 51.3, f13_303_rate: 29.4 },
    { id: 'R_HUE09_02', code: 'ND-02', name: 'Tuyến Xã Hương Phú',        total_bg: 110, passed:  49, failed:  61, passed_rate: 44.5, f13_303_rate: 38.7 },
    { id: 'R_HUE09_03', code: 'ND-03', name: 'Tuyến Xã Hương Sơn',        total_bg:  90, passed:  36, failed:  54, passed_rate: 40.0, f13_303_rate: 44.5 },
    { id: 'R_HUE09_04', code: 'ND-04', name: 'Tuyến Xã Thượng Nhật',      total_bg:  85, passed:  30, failed:  55, passed_rate: 35.3, f13_303_rate: 50.2 },
    { id: 'R_HUE09_05', code: 'ND-05', name: 'Tuyến Xã Hương Hữu',        total_bg:  95, passed:  73, failed:  22, passed_rate: 76.8, f13_303_rate: 13.3 },
  ],
  // Fallback cho các BCVH chưa có dữ liệu chi tiết
  DEFAULT: [
    { id: 'R_DEF_01', code: 'TU-01', name: 'Tuyến khu vực 1', total_bg: 310, passed: 248, failed:  62, passed_rate: 80.0, f13_303_rate: 12.5 },
    { id: 'R_DEF_02', code: 'TU-02', name: 'Tuyến khu vực 2', total_bg: 280, passed: 204, failed:  76, passed_rate: 72.9, f13_303_rate: 18.3 },
    { id: 'R_DEF_03', code: 'TU-03', name: 'Tuyến khu vực 3', total_bg: 250, passed: 168, failed:  82, passed_rate: 67.2, f13_303_rate: 23.1 },
    { id: 'R_DEF_04', code: 'TU-04', name: 'Tuyến khu vực 4', total_bg: 220, passed: 132, failed:  88, passed_rate: 60.0, f13_303_rate: 28.6 },
  ],
};

// ─── Rate Badge ───────────────────────────────────────────────────────────────
function RateBadge({ rate }) {
  if (rate >= 70) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />{rate.toFixed(1)}%
    </span>
  );
  if (rate >= 60) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 inline-block" />{rate.toFixed(1)}%
    </span>
  );
  if (rate >= 50) return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />{rate.toFixed(1)}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />{rate.toFixed(1)}%
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

export default function RouteRankingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL Query State — inherited from BCVH Ranking
  const fromDate  = searchParams.get('from_date')  || '';
  const toDate    = searchParams.get('to_date')    || '';
  const interval  = searchParams.get('interval')   || 'daily';
  const bcvhId    = searchParams.get('bcvh_id')    || '';
  const bcvhName  = searchParams.get('bcvh_name')  || 'Toàn mạng';

  // Local state
  const [status,  setStatus]  = useState('loading');
  const [data,    setData]    = useState([]);
  const [error,   setError]   = useState(null);
  const [search,  setSearch]  = useState('');
  const [sortCol, setSortCol] = useState('passed_rate');
  const [sortDir, setSortDir] = useState('asc');
  const [page,    setPage]    = useState(1);

  // Mock fetch keyed by bcvh_id
  useEffect(() => {
    setStatus('loading');
    setPage(1);
    const t = setTimeout(() => {
      try {
        const rows = MOCK_ROUTES_BY_BCVH[bcvhId] || MOCK_ROUTES_BY_BCVH.DEFAULT;
        // Normalise any data anomaly (negative failed from copy-paste)
        const clean = rows.map(r => ({
          ...r,
          failed: Math.max(0, r.failed),
          passed_rate: Math.min(100, Math.max(0, r.passed_rate)),
        }));
        setData(clean);
        setStatus('success');
      } catch (e) {
        setError({ message: e.message });
        setStatus('error');
      }
    }, 500);
    return () => clearTimeout(t);
  }, [bcvhId, fromDate, toDate, interval]);

  // Sort
  const handleSort = (col) => {
    if (status === 'loading') return;
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  // Search
  const handleSearch = (e) => {
    if (status === 'loading') return;
    setSearch(e.target.value);
    setPage(1);
  };

  // Derived
  const processed = useMemo(() => {
    let rows = [...data];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q)
      );
    }
    rows.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (typeof a[sortCol] === 'string') return a[sortCol].localeCompare(b[sortCol]) * mul;
      return (a[sortCol] - b[sortCol]) * mul;
    });
    return rows;
  }, [data, search, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const paginated  = processed.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Drill-down → RCA, carry all params + route_id, route_name
  const handleDrillDown = (route) => {
    if (status === 'loading') return;
    const params = new URLSearchParams();
    if (fromDate)  params.set('from_date',  fromDate);
    if (toDate)    params.set('to_date',    toDate);
    if (interval)  params.set('interval',   interval);
    if (bcvhId)    params.set('bcvh_id',    bcvhId);
    if (bcvhName)  params.set('bcvh_name',  bcvhName);
    params.set('route_id',   route.id);
    params.set('route_name', route.name);
    navigate(`/f13/pareto?${params.toString()}`);
  };

  const COLS = [
    { key: 'rank',         label: 'XH',               sortable: false },
    { key: 'code',         label: 'Mã Tuyến',          sortable: true  },
    { key: 'name',         label: 'Tên Tuyến',          sortable: false },
    { key: 'total_bg',     label: 'Tổng BG',            sortable: true  },
    { key: 'passed',       label: 'Đạt',               sortable: true  },
    { key: 'failed',       label: 'Không đạt',         sortable: true  },
    { key: 'passed_rate',  label: 'Tỷ lệ Đạt (%)',     sortable: true  },
    { key: 'f13_303_rate', label: 'Chậm nộp (F13_303)', sortable: true },
    { key: 'action',       label: '',                  sortable: false },
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* ── Header + Breadcrumb context ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          {/* Inline context breadcrumb */}
          <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] mb-1">
            <button
              onClick={() => navigate(`/f13/ranking/bcvh?from_date=${fromDate}&to_date=${toDate}&interval=${interval}`)}
              className="hover:text-[var(--color-primary-600)] transition-colors"
            >
              BCVH Ranking
            </button>
            <Chevron className="w-3.5 h-3.5" />
            <span className="font-medium text-[var(--color-text-main)]">{bcvhName || 'Toàn mạng'}</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-text-main)]">Route Ranking</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            Bảng xếp hạng tuyến phát — {bcvhName}
          </p>
        </div>
        {/* Inherited filter badges */}
        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] flex-shrink-0">
          {fromDate && <span className="px-2 py-1 bg-[var(--color-surface-100)] rounded">{fromDate}</span>}
          {fromDate && toDate && <span>→</span>}
          {toDate   && <span className="px-2 py-1 bg-[var(--color-surface-100)] rounded">{toDate}</span>}
          {interval && <span className="px-2 py-1 bg-[var(--color-primary-50)] text-[var(--color-primary-700)] rounded capitalize">{interval}</span>}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-lg border border-[var(--color-surface-200)] shadow-sm p-4 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Tìm tuyến phát..."
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

      {/* ── Content ── */}
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
                setTimeout(() => {
                  setData(MOCK_ROUTES_BY_BCVH[bcvhId] || MOCK_ROUTES_BY_BCVH.DEFAULT);
                  setStatus('success');
                }, 500);
              }}
            />
          </div>
        )}

        {status === 'success' && processed.length === 0 && (
          <div className="flex-1 flex items-center justify-center min-h-64">
            <EmptyLayout
              message="Không tìm thấy tuyến phát"
              subMessage={search ? `Không có tuyến nào khớp với "${search}".` : `Chưa có dữ liệu tuyến phát cho ${bcvhName}.`}
            />
          </div>
        )}

        {status === 'success' && processed.length > 0 && (
          <>
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
                        {/* Mã tuyến */}
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs px-2 py-0.5 bg-[var(--color-surface-100)] rounded text-[var(--color-text-muted)]">
                            {row.code}
                          </span>
                        </td>
                        {/* Tên tuyến — drill-down */}
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
                            title={`Phân tích RCA tuyến ${row.name}`}
                          >
                            RCA <ArrowRight className="w-3 h-3" />
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
                <span className="font-semibold"> {processed.length}</span> tuyến phát
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
