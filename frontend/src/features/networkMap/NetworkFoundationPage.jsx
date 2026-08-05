import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { isAdminRole } from '../../auth/roles';

/**
 * NETWORK-MANAGEMENT-001 Phase 1 — Nền tảng scaffold screen.
 *
 * Confirms the authenticated read API for one Quản lý mạng lưới module is
 * reachable and that Import stays admin-only in the UI. The full Leaflet
 * map and Import preview/commit flow are out of scope until Phase 2/3.
 */
export default function NetworkFoundationPage({ title, description, fetchSummary }) {
  const { user } = useAuth();
  const [status, setStatus] = useState('loading');
  const [recordCount, setRecordCount] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetchSummary()
      .then((count) => {
        if (cancelled) return;
        setRecordCount(count);
        setStatus('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(error?.message || 'Không thể kết nối API nền tảng.');
        setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [fetchSummary]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-vnpost-blue-dark">{title}</h1>
      <p className="text-gray-600 mt-2">{description}</p>

      <div className="mt-8 p-12 bg-white rounded-xl border border-dashed border-gray-300 text-center text-gray-400">
        <p className="text-sm">NETWORK-MANAGEMENT-001 Phase 1 — Nền tảng</p>
        <p className="mt-2">Bản đồ đầy đủ và Import sẽ có ở Phase 2/Phase 3.</p>
        {status === 'loading' && <p className="mt-4">Đang kiểm tra kết nối API...</p>}
        {status === 'ready' && (
          <p className="mt-4">API hoạt động — hiện có {recordCount} bản ghi.</p>
        )}
        {status === 'error' && (
          <p className="mt-4 text-red-500">{errorMessage}</p>
        )}
      </div>

      {isAdminRole(user?.role) && (
        <button
          type="button"
          disabled
          title="Import sẽ được triển khai ở NETWORK-MANAGEMENT-001 Phase 3"
          className="mt-6 px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed"
        >
          Import (Phase 3)
        </button>
      )}
    </div>
  );
}
