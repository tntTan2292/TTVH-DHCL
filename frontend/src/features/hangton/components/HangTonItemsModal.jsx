import React, { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import Modal from '../../../components/ui/Modal.jsx';
import SortableTh from '../../../components/common/SortableTh.jsx';
import { nextSortState, sortRowsBy } from '../../../components/common/tableSort.js';
import { fetchItems, downloadItemsFile } from '../api/hangtonClient.js';
import { buildItemsParams } from '../hangtonExport.js';
import { getLevelConfig, formatNumber, formatCurrency, formatSnapshotLabel } from '../hangtonLevels.js';

const TEXT_FIELDS = ['item_code', 'office', 'status_name', 'postman_name', 'customer_class'];
const ALL_ROWS = 20000;

// Parcels behind one figure of the office table: every row is loaded (no paging), ordered by clicking a title.
export default function HangTonItemsModal({ isOpen, onClose, snapshot, office, levels = [], customers = [], title }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sort, setSort] = useState({ field: 'ton_rank', direction: 'desc' });
  const [busy, setBusy] = useState(false);

  const levelKey = levels.join('|');
  const customerKey = customers.join('|');

  useEffect(() => {
    if (!isOpen || !snapshot?.id) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    fetchItems(buildItemsParams({ snapshotId: snapshot.id, office, levels, customers, sort: 'rank', limit: ALL_ROWS, offset: 0 }))
      .then((res) => { if (active) setRows(res?.rows || []); })
      .catch((err) => { if (active) setError(err?.response?.data?.error?.message || err.message || 'Không tải được danh sách bưu gửi.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // levels is represented by levelKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, snapshot?.id, office, levelKey, customerKey]);

  const sorted = useMemo(() => sortRowsBy(rows, sort.field, sort.direction), [rows, sort]);
  const handleSort = (field) => setSort((current) => nextSortState(current, field, { textFields: TEXT_FIELDS }));

  const handleDownload = async (format) => {
    setBusy(true);
    try {
      await downloadItemsFile(buildItemsParams({ snapshotId: snapshot.id, office, levels, customers, sort: 'rank' }), format);
    } catch (err) {
      setError(err?.message || 'Không tải được tệp.');
    } finally {
      setBusy(false);
    }
  };

  const th = 'py-2.5 px-3';
  const activeCls = 'bg-rose-100 text-rose-950 font-bold';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="full"
      title={title}
      description={`${formatSnapshotLabel(snapshot)} · ${formatNumber(rows.length)} bưu gửi`}
      footer={(
        <>
          <button type="button" disabled={busy || rows.length === 0} onClick={() => handleDownload('xlsx')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer">
            <Download size={14} /> Tải Excel (.xlsx)
          </button>
          <button type="button" disabled={busy || rows.length === 0} onClick={() => handleDownload('csv')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer">
            <Download size={14} /> Tải CSV
          </button>
          <button type="button" onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
            Đóng
          </button>
        </>
      )}
    >
      {loading ? (
        <p className="py-10 text-center text-base text-slate-500">Đang tải danh sách bưu gửi...</p>
      ) : error ? (
        <p className="py-10 text-center text-base font-semibold text-red-600">{error}</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-base text-slate-500">Không có bưu gửi nào.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[13px] font-bold uppercase tracking-wider text-slate-700">
                <th className={th}>STT</th>
                <SortableTh field="item_code" sort={sort} onSort={handleSort} className={th} activeClassName={activeCls}>Số hiệu bưu gửi</SortableTh>
                <SortableTh field="office" sort={sort} onSort={handleSort} className={th} activeClassName={activeCls}>Bưu cục phát</SortableTh>
                <SortableTh field="customer_class" sort={sort} onSort={handleSort} className={th} activeClassName={activeCls}>Nhóm KH</SortableTh>
                <SortableTh field="status_name" sort={sort} onSort={handleSort} className={th} activeClassName={activeCls}>Trạng thái TMS</SortableTh>
                <SortableTh field="ton_rank" sort={sort} onSort={handleSort} className={th} activeClassName={activeCls}>Loại tồn</SortableTh>
                <SortableTh field="cod" sort={sort} onSort={handleSort} className={`${th} text-right`} activeClassName={activeCls}>Tiền COD</SortableTh>
                <SortableTh field="postman_name" sort={sort} onSort={handleSort} className={th} activeClassName={activeCls}>Bưu tá phụ trách</SortableTh>
                <th className={th}>Lý do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((row, idx) => {
                const cfg = getLevelConfig(row.ton_level);
                return (
                  <tr key={`${row.item_code}_${idx}`} className="hover:bg-slate-50/70">
                    <td className="px-3 py-2 font-mono text-[13px] text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2 font-mono font-bold text-slate-900">{row.item_code}</td>
                    <td className="px-3 py-2 font-semibold text-slate-800">{row.office || '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.customer_class || '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.status_name}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded border px-2 py-0.5 text-[13px] font-semibold ${cfg.badgeClass}`}>{row.ton_level}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-slate-800">{row.cod ? formatCurrency(row.cod) : '—'}</td>
                    <td className="px-3 py-2 text-slate-700">{row.postman_name || row.postman_code || '—'}</td>
                    <td className="px-3 py-2 text-slate-500">{row.reason || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
