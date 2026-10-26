import React, { useEffect, useState, useRef } from 'react';
import {
  FileText,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
} from 'lucide-react';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { nextSortState } from '../../../components/common/tableSort.js';
import BlockCaptureButton from '../../../components/common/BlockCaptureButton.jsx';
import { fetchItems, downloadItemsFile } from '../api/hangtonClient.js';
import {
  getLevelConfig,
  formatNumber,
  formatCurrency,
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
const SORT_TEXT_FIELDS = ['item_code', 'office', 'status', 'postman', 'customer'];
const DEFAULT_SORT = { field: 'rank', direction: 'desc' };

// Page sizes; 0 = every row on one page (the API allows up to 20 000).
const PAGE_SIZES = [50, 100, 200, 500, 1000, 0];
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
  selectedCustomers = [],
}) {
  const customerKey = selectedCustomers.join('|');
  const tableBlockRef = useRef(null);
  const snapshotLabel = formatSnapshotLabel(currentSnapshot);

  const [office, setOffice] = useState(initialOffice || '');
  const [minRank, setMinRank] = useState(initialMinRank || '');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState(DEFAULT_SORT); // { field, direction }
  const [limit, setLimit] = useState(100);
  const [pageInput, setPageInput] = useState('1');
  const [exporting, setExporting] = useState(false);
  const pageSize = limit === 0 ? ALL_ROWS : limit;
  const [page, setPage] = useState(1);

  const [data, setData] = useState({ total: 0, rows: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
          snapshotId: currentSnapshot.id, office, customers: selectedCustomers, minRank, status, sort: sort.field, dir: sort.direction, limit: pageSize, offset,
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
  }, [currentSnapshot?.id, office, customerKey, minRank, status, sort, pageSize, page]);

  useEffect(() => { setPage(1); }, [customerKey]);

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
    setSort(DEFAULT_SORT);
    setPage(1);
  };

  // Every row of the current filter (not just this page), built by the server.
  const handleExport = async (format) => {
    setExporting(true);
    try {
      await downloadItemsFile(buildItemsParams({
        snapshotId: currentSnapshot.id, office, customers: selectedCustomers, minRank, status, sort: sort.field, dir: sort.direction,
      }), format);
    } catch (err) {
      setError(err?.message || 'Không tải được tệp.');
    } finally {
      setExporting(false);
    }
  };

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

        {/* Reset button */}
        {(office || minRank || status || sort.field !== 'rank' || sort.direction !== 'desc') && (
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

      {pageBar}

      {/* Main Detail Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold text-[13px] uppercase tracking-wider">
              <th className="py-2.5 px-3">STT</th>
              <SortableTh field="item_code" sort={sort} onSort={handleSort} className="py-2.5 px-3" activeClassName="bg-rose-100 text-rose-950 font-bold">Số hiệu bưu gửi</SortableTh>
              <SortableTh field="office" sort={sort} onSort={handleSort} className="py-2.5 px-3" activeClassName="bg-rose-100 text-rose-950 font-bold">Bưu cục phát</SortableTh>
              <SortableTh field="customer" sort={sort} onSort={handleSort} className="py-2.5 px-3" activeClassName="bg-rose-100 text-rose-950 font-bold">Nhóm KH</SortableTh>
              <SortableTh field="status" sort={sort} onSort={handleSort} className="py-2.5 px-3" activeClassName="bg-rose-100 text-rose-950 font-bold">Trạng thái TMS</SortableTh>
              <SortableTh field="rank" sort={sort} onSort={handleSort} className="py-2.5 px-3" activeClassName="bg-rose-100 text-rose-950 font-bold">Loại tồn</SortableTh>
              <SortableTh field="cod" sort={sort} onSort={handleSort} className="py-2.5 px-3 text-right" activeClassName="bg-rose-100 text-rose-950 font-bold">Tiền COD</SortableTh>
              <SortableTh field="postman" sort={sort} onSort={handleSort} className="py-2.5 px-3" activeClassName="bg-rose-100 text-rose-950 font-bold">Bưu tá phụ trách</SortableTh>
              <th className="py-2.5 px-3">Lý do</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  Đang tải danh sách bưu gửi...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-red-600 font-semibold">
                  {error}
                </td>
              </tr>
            ) : !data.rows || data.rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  Không tìm thấy bưu gửi nào thỏa mãn điều kiện lọc
                </td>
              </tr>
            ) : (
              data.rows.map((row, idx) => {
                const cfg = getLevelConfig(row.ton_level);
                const rowNum = (page - 1) * pageSize + idx + 1;
                return (
                  <tr key={`${row.item_code}_${idx}`} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[13px]">{rowNum}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{row.item_code}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{row.office || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-700">{row.customer_class || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-700">{row.status_name}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[13px] font-semibold border ${cfg.badgeClass}`}>
                        {row.ton_level}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800">
                      {row.cod ? formatCurrency(row.cod) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {row.postman_name || row.postman_code || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 max-w-[200px] truncate" title={row.reason || ''}>
                      {row.reason || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pageBar}
    </div>
  );
}
