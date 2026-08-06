import { useEffect, useState } from 'react';
import networkMapClient from '../../../api/NetworkMapClient';

/**
 * Admin-only Import history + Rollback. Shared shape across all 3 modules
 * (network_import_log). Rendered only inside an admin-gated parent.
 */
export default function ImportHistoryPanel({ module, refreshKey, onRolledBack }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [rollbackError, setRollbackError] = useState(null);
  const [rollingBackId, setRollingBackId] = useState(null);

  const load = () => {
    setStatus('loading');
    networkMapClient.importHistory(module)
      .then((res) => { setRows(res?.data || []); setStatus('ready'); })
      .catch(() => setStatus('error'));
  };

  useEffect(load, [module, refreshKey]);

  const handleRollback = async (importLogId) => {
    setRollbackError(null);
    setRollingBackId(importLogId);
    try {
      await networkMapClient.rollbackImport(importLogId);
      load();
      onRolledBack?.();
    } catch (error) {
      setRollbackError(error?.message || 'Rollback thất bại.');
    } finally {
      setRollingBackId(null);
    }
  };

  if (status === 'loading') return <p className="text-xs text-gray-500">Đang tải lịch sử Import...</p>;
  if (status === 'error') return <p className="text-xs text-red-600">Không thể tải lịch sử Import.</p>;
  if (rows.length === 0) return <p className="text-xs text-gray-500">Chưa có lịch sử Import.</p>;

  return (
    <div className="text-xs">
      {rollbackError && <p className="text-red-600 mb-2">{rollbackError}</p>}
      <table className="w-full border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200 text-gray-500">
            <th className="py-1 pr-2">#</th>
            <th className="py-1 pr-2">File</th>
            <th className="py-1 pr-2">Trạng thái</th>
            <th className="py-1 pr-2">Thêm/Sửa/Bỏ qua</th>
            <th className="py-1 pr-2">Thời gian</th>
            <th className="py-1 pr-2">Admin</th>
            <th className="py-1" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100">
              <td className="py-1 pr-2">{r.id}</td>
              <td className="py-1 pr-2">{r.file_name}</td>
              <td className="py-1 pr-2">
                <span className={
                  r.status === 'SUCCESS' ? 'text-green-700 font-semibold'
                    : r.status === 'ROLLED_BACK' ? 'text-gray-500'
                      : 'text-red-600 font-semibold'
                }
                >
                  {r.status}
                </span>
                {r.rollback_of_import_log_id && <span className="text-gray-400"> (của #{r.rollback_of_import_log_id})</span>}
              </td>
              <td className="py-1 pr-2">{r.inserted_records}/{r.updated_records}/{r.skipped_records}</td>
              <td className="py-1 pr-2">{r.created_at}</td>
              <td className="py-1 pr-2">{r.uploaded_by || '—'}</td>
              <td className="py-1">
                {r.status === 'SUCCESS' && (
                  <button
                    type="button"
                    disabled={rollingBackId === r.id}
                    onClick={() => handleRollback(r.id)}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    {rollingBackId === r.id ? 'Đang rollback...' : 'Rollback'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
