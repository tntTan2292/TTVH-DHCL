import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, PackageSearch, RefreshCw, Trash2 } from 'lucide-react';
import Modal from '../../../components/ui/Modal.jsx';
import {
  fetchHangtonImportStatus,
  runHangtonManualSnapshot,
  runHangtonMakeupSnapshot,
  deleteHangtonSnapshot,
  hangtonImportErrorMessage,
} from './hangtonImportClient.js';
import {
  buildSlotRows,
  canDeleteSnapshot,
  formatBusinessDate,
  formatCapturedAt,
  groupRecentByDate,
  runResultText,
  snapshotSlotLabel,
  triggerText,
} from './hangtonImportModel.js';
import { formatNumber } from '../hangtonLevels.js';

const POLL_MS = 30000;

const STATE_STYLE = Object.freeze({
  OK: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  MISSED: 'bg-red-50 text-red-800 border-red-200',
  WAITING: 'bg-slate-100 text-slate-600 border-slate-200',
});

// Import Center tab "Hàng tồn" (admin): take the stock now when the portal data changed after a scheduled slot,
// make up a missed slot, look at the last days and delete a mistaken manual point or make-up.
export default function HangtonImportPanel() {
  const [status, setStatus] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [running, setRunning] = useState(null); // 'MANUAL' | slot being made up | null
  const [notice, setNotice] = useState(null); // { tone: 'ok' | 'error', text }
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchHangtonImportStatus();
      if (alive.current) { setStatus(data); setLoadError(null); }
    } catch (error) {
      if (alive.current) setLoadError(hangtonImportErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    const timer = setInterval(load, POLL_MS);
    return () => { alive.current = false; clearInterval(timer); };
  }, [load]);

  const run = async (key, action, label) => {
    setRunning(key);
    setNotice(null);
    try {
      const result = await action();
      setNotice({ tone: 'ok', text: runResultText(result, label) });
    } catch (error) {
      setNotice({ tone: 'error', text: hangtonImportErrorMessage(error) });
    } finally {
      setRunning(null);
      load();
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteHangtonSnapshot(toDelete.id);
      setNotice({ tone: 'ok', text: `Đã xóa ${snapshotSlotLabel(toDelete)} ngày ${formatBusinessDate(toDelete.business_date)}.` });
    } catch (error) {
      setNotice({ tone: 'error', text: hangtonImportErrorMessage(error) });
    } finally {
      setDeleting(false);
      setToDelete(null);
      load();
    }
  };

  const busy = Boolean(running) || Boolean(status?.busy);
  const slotRows = buildSlotRows(status);
  const extra = status?.extra || [];
  const groups = groupRecentByDate(status?.recent || []);

  return (
    <div className="space-y-5" data-testid="hangton-import-panel">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <PackageSearch size={20} className="text-rose-600" />
              Chỉ số rà soát Hàng tồn: lấy dữ liệu
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Hệ thống tự lấy lúc 07:30, 11:30 và 21:00. Khi dữ liệu trên hangton thay đổi giữa các khung, bấm
              <strong> Lấy hàng tồn ngay</strong> để tạo thêm một mốc mới; mốc thêm không ghi đè mốc của lịch.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              title="Tải lại trạng thái"
            >
              <RefreshCw size={15} />
              Làm mới
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => run('MANUAL', runHangtonManualSnapshot, 'Lấy hàng tồn')}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {running === 'MANUAL' ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              {running === 'MANUAL' ? 'Đang lấy từ hangton...' : 'Lấy hàng tồn ngay'}
            </button>
          </div>
        </div>

        {busy && running === null ? (
          <p className="mt-3 text-sm font-semibold text-amber-700">Đang có một lần lấy dữ liệu khác chạy (lịch hoặc người khác), chờ vài giây rồi thử lại.</p>
        ) : null}

        {notice ? (
          <div
            role="status"
            className={`mt-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
              notice.tone === 'ok' ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {notice.tone === 'ok' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" /> : <AlertTriangle size={18} className="mt-0.5 shrink-0" />}
            <span>{notice.text}</span>
          </div>
        ) : null}

        {loadError ? (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Hôm nay {status ? formatBusinessDate(status.business_date) : ''}: 3 khung của lịch</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="px-3 py-2.5 font-bold">Khung</th>
                <th className="px-3 py-2.5 font-bold">Trạng thái</th>
                <th className="px-3 py-2.5 font-bold">Nguồn</th>
                <th className="px-3 py-2.5 text-right font-bold">Số bưu gửi</th>
                <th className="px-3 py-2.5 font-bold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slotRows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">{status ? 'Không có dữ liệu.' : 'Đang tải...'}</td></tr>
              ) : slotRows.map((row) => (
                <tr key={row.slot}>
                  <td className="px-3 py-2.5 font-bold text-slate-900">{row.clock}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block rounded-md border px-2 py-0.5 text-sm font-semibold ${STATE_STYLE[row.state]}`}>{row.text}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{row.fromText}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-slate-900">{row.kept === null ? '—' : formatNumber(row.kept)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {row.canMakeup ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => run(row.slot, () => runHangtonMakeupSnapshot(row.slot), `Lấy bù khung ${row.clock}`)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Lấy dữ liệu hangton ngay bây giờ và lưu vào khung này"
                        >
                          {running === row.slot ? <Loader2 size={14} className="animate-spin" /> : null}
                          Lấy bù
                        </button>
                      ) : null}
                      {canDeleteSnapshot(row.snapshot) ? (
                        <button
                          type="button"
                          onClick={() => setToDelete(row.snapshot)}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <Trash2 size={14} /> Xóa
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="mt-5 text-base font-bold text-slate-900">Các mốc thêm hôm nay (thủ công)</h3>
        {extra.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Chưa có mốc thêm nào.</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {extra.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 text-sm">
                <span>
                  <strong className="text-slate-900">{snapshotSlotLabel(row)}</strong>
                  <span className="text-slate-600"> · {formatNumber(row.kept_row_count)} bưu gửi · người bấm: {row.actor || '—'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setToDelete(row)}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Trash2 size={14} /> Xóa
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">7 ngày gần nhất</h3>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                <th className="px-3 py-2.5 font-bold">Ngày</th>
                <th className="px-3 py-2.5 font-bold">Mốc</th>
                <th className="px-3 py-2.5 font-bold">Lấy lúc</th>
                <th className="px-3 py-2.5 font-bold">Nguồn</th>
                <th className="px-3 py-2.5 font-bold">Người bấm</th>
                <th className="px-3 py-2.5 text-right font-bold">Số bưu gửi</th>
                <th className="px-3 py-2.5 font-bold" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groups.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">{status ? 'Chưa có snapshot nào.' : 'Đang tải...'}</td></tr>
              ) : groups.flatMap((group) => group.rows.map((row, i) => (
                <tr key={row.id} className={i === 0 ? 'border-t-2 border-slate-200' : ''}>
                  <td className="px-3 py-2 font-semibold text-slate-900">{i === 0 ? formatBusinessDate(group.date) : ''}</td>
                  <td className="px-3 py-2 font-semibold text-slate-800">{snapshotSlotLabel(row)}</td>
                  <td className="px-3 py-2 text-slate-700">{formatCapturedAt(row.captured_at)}</td>
                  <td className="px-3 py-2 text-slate-700">{triggerText(row.trigger)}{row.is_stale ? ' (cổng chưa làm mới)' : ''}</td>
                  <td className="px-3 py-2 text-slate-700">{row.actor || '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatNumber(row.kept_row_count)}</td>
                  <td className="px-3 py-2 text-right">
                    {canDeleteSnapshot(row) ? (
                      <button type="button" onClick={() => setToDelete(row)} className="cursor-pointer text-sm font-semibold text-slate-600 hover:text-red-700" title="Xóa mốc này">
                        Xóa
                      </button>
                    ) : null}
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={Boolean(toDelete)}
        onClose={() => (deleting ? null : setToDelete(null))}
        title="Xóa mốc hàng tồn?"
        description={toDelete ? `${snapshotSlotLabel(toDelete)} ngày ${formatBusinessDate(toDelete.business_date)} · ${formatNumber(toDelete.kept_row_count)} bưu gửi · ${triggerText(toDelete.trigger)}` : ''}
        size="sm"
        footer={(
          <>
            <button type="button" disabled={deleting} onClick={() => setToDelete(null)} className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
            <button type="button" disabled={deleting} onClick={confirmDelete} className="cursor-pointer rounded-lg bg-red-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
              {deleting ? 'Đang xóa...' : 'Xóa mốc này'}
            </button>
          </>
        )}
      >
        <p className="text-sm text-slate-700">Dữ liệu của mốc này sẽ bị xóa hẳn và không khôi phục được (hangton không trả lại số liệu cũ). Mốc của lịch không bị ảnh hưởng.</p>
      </Modal>
    </div>
  );
}
