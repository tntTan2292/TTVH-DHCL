import { useState } from 'react';
import networkMapClient from '../../../api/NetworkMapClient';
import ExportButton, { triggerDownload } from './ExportButton';

/**
 * Sơ đồ tuyến phát Export: defaults to a month/date-range, opt-in "toàn
 * bộ" for admin, always shows the expected row count before download.
 */
export default function DeliveryExportPanel() {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [exportAll, setExportAll] = useState(false);
  const [rowCount, setRowCount] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const checkCount = async () => {
    setStatus('checking');
    setError(null);
    try {
      const res = await networkMapClient.exportDeliveryRoutesPreviewCount(exportAll ? { all: true } : { from, to });
      setRowCount(res.data.rowCount);
      setStatus('idle');
    } catch (err) {
      setError(err?.message || 'Không thể đếm số dòng.');
      setStatus('idle');
    }
  };

  const doExport = async () => {
    setStatus('exporting');
    setError(null);
    try {
      const { blob, fileName } = await networkMapClient.exportDeliveryRoutes(exportAll ? { all: true } : { from, to });
      triggerDownload(blob, fileName);
      setStatus('idle');
    } catch (err) {
      setError(err?.message || 'Export thất bại.');
      setStatus('idle');
    }
  };

  return (
    <div className="text-xs flex flex-col gap-2">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={exportAll} onChange={(e) => { setExportAll(e.target.checked); setRowCount(null); }} />
        Xuất toàn bộ (bỏ qua khoảng ngày)
      </label>
      {!exportAll && (
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setRowCount(null); }} className="border rounded px-2 py-1" />
          <span>đến</span>
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setRowCount(null); }} className="border rounded px-2 py-1" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <button type="button" onClick={checkCount} disabled={status === 'checking'} className="px-3 py-1.5 bg-gray-200 rounded-lg disabled:opacity-50">
          Xem số dòng dự kiến
        </button>
        {rowCount !== null && <span>{rowCount} dòng sẽ được xuất.</span>}
      </div>
      <div>
        <ExportButton onExport={doExport} label="Export Excel (tuyến phát)" />
      </div>
      {error && <p className="text-red-600">{error}</p>}
    </div>
  );
}
