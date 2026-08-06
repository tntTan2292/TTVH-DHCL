import { useState } from 'react';

export function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Admin-only Export trigger — downloads the flat, Import-ready .xlsx. */
export default function ExportButton({ onExport, label = 'Export Excel' }) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const handleClick = async () => {
    setStatus('exporting');
    setError(null);
    try {
      const { blob, fileName } = await onExport();
      triggerDownload(blob, fileName);
      setStatus('idle');
    } catch (err) {
      setError(err?.message || 'Export thất bại.');
      setStatus('idle');
    }
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'exporting'}
        className="px-3 py-1.5 bg-gray-700 text-white rounded-lg text-xs disabled:opacity-50"
      >
        {status === 'exporting' ? 'Đang xuất...' : label}
      </button>
      {error && <span className="text-red-600 text-xs">{error}</span>}
    </span>
  );
}
