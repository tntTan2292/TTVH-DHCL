import { useState } from 'react';
import { useAuth } from '../../../auth/AuthContext';
import { isAdminRole } from '../../../auth/roles';
import ImportHistoryPanel from './ImportHistoryPanel';

/**
 * Admin-only Import/Export/History container for one module. Frontend
 * gate here is a UX convenience only — every underlying API call is
 * independently re-checked server-side by requireRole(['admin']).
 */
export default function NetworkAdminSection({ module, exportSlot, importSlot }) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const refreshHistory = () => setHistoryRefreshKey((k) => k + 1);

  if (!isAdminRole(user?.role)) return null;

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="px-4 py-2 bg-vnpost-blue-dark text-white rounded-lg text-sm"
      >
        {expanded ? 'Ẩn' : 'Quản trị dữ liệu (Import / Export / Lịch sử)'}
      </button>

      {expanded && (
        <div className="mt-3 p-3 bg-white border border-gray-200 rounded-xl">
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <div className="text-xs font-semibold text-gray-700 mb-1">Export</div>
              {exportSlot}
            </div>
            <div className="flex-1 min-w-[280px]">
              <div className="text-xs font-semibold text-gray-700 mb-1">Import</div>
              {typeof importSlot === 'function' ? importSlot(refreshHistory) : importSlot}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-700 mb-1">Lịch sử Import</div>
            <ImportHistoryPanel module={module} refreshKey={historyRefreshKey} onRolledBack={refreshHistory} />
          </div>
        </div>
      )}
    </div>
  );
}
