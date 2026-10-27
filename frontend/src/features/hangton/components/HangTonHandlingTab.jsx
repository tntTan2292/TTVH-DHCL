import React, { useCallback, useEffect, useState } from 'react';
import HandlingStatsPanel from '../handling/HandlingStatsPanel.jsx';
import { ApprovalsPanel, ReasonsPanel, LogPanel } from '../handling/HandlingOpsPanels.jsx';
import { fetchHandlingStats, fetchHandlingEditRequests, handlingErrorMessage } from '../api/hangtonClient.js';
import { customersParam } from '../hangtonCustomers.js';
import { formatSnapshotLabel } from '../hangtonLevels.js';

// "Xử lý tồn": statistics of the review, the edit requests waiting for approval, the grouping of free-text reasons and
// the audit log. Leaders see the statistics, the requests and the log; only chuyên quản / admin see the grouping.
export default function HangTonHandlingTab({ currentSnapshot, selectedCustomers = [], handlingCatalog, onOpenList, refreshKey = 0 }) {
  const [view, setView] = useState('stats');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(0);
  const customerKey = selectedCustomers.join('|');
  const canReasons = Boolean(handlingCatalog?.can?.reasons);

  const loadStats = useCallback(async () => {
    if (!currentSnapshot?.id) return;
    setLoading(true);
    setError(null);
    try {
      setStats(await fetchHandlingStats({ id: currentSnapshot.id, customers: customersParam(selectedCustomers) }));
    } catch (err) {
      setError(handlingErrorMessage(err));
    } finally {
      setLoading(false);
    }
    // selectedCustomers is represented by customerKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSnapshot?.id, customerKey]);

  const loadPending = useCallback(async () => {
    try {
      const rows = await fetchHandlingEditRequests({ status: 'PENDING' });
      setPending(rows.filter((r) => r.can_decide).length);
    } catch {
      setPending(0);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats, refreshKey]);
  useEffect(() => { loadPending(); }, [loadPending, refreshKey]);

  const views = [
    { id: 'stats', label: 'Thống kê rà soát' },
    { id: 'approvals', label: 'Yêu cầu sửa', badge: pending },
    ...(canReasons ? [{ id: 'reasons', label: 'Gom nhóm lý do' }] : []),
    { id: 'log', label: 'Nhật ký nhập' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" data-no-capture="true">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-bold ${view === v.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            {v.label}
            {v.badge > 0 ? <span className="rounded-full bg-rose-600 px-1.5 text-xs text-white">{v.badge}</span> : null}
          </button>
        ))}
        {handlingCatalog?.position_label ? (
          <span className="ml-auto rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
            Vai trò: {handlingCatalog.position_label}{handlingCatalog.can?.write ? '' : ' · chỉ xem'}
          </span>
        ) : null}
      </div>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800">{error}</p> : null}

      {view === 'stats' ? (
        <HandlingStatsPanel stats={stats} loading={loading} snapshotLabel={formatSnapshotLabel(currentSnapshot)} onOpenList={onOpenList} />
      ) : null}
      {view === 'approvals' ? <ApprovalsPanel onChanged={() => { loadPending(); loadStats(); }} /> : null}
      {view === 'reasons' && canReasons ? <ReasonsPanel onChanged={loadStats} /> : null}
      {view === 'log' ? <LogPanel defaultDate={currentSnapshot?.business_date} /> : null}
    </div>
  );
}
