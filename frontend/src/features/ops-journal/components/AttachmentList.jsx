import React, { useState } from 'react';
import { Paperclip, X, Download, FileSpreadsheet, FileText, Image as ImageIcon } from 'lucide-react';
import opsJournalAdapter from '../api/opsJournalApi.js';
import { formatFileSize } from '../opsJournalHelpers.js';

function iconFor(name = '') {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (['.xlsx', '.xls', '.csv'].includes(ext)) return FileSpreadsheet;
  if (['.png', '.jpg', '.jpeg'].includes(ext)) return ImageIcon;
  return FileText;
}

/** Saves a Blob under a name (the authenticated download cannot be a plain link: the session travels in a header). */
function saveBlob(blob, filename) {
  const url = globalThis.URL.createObjectURL(blob);
  const link = globalThis.document.createElement('a');
  link.href = url;
  link.download = filename;
  globalThis.document.body.appendChild(link);
  link.click();
  link.remove();
  globalThis.setTimeout(() => globalThis.URL.revokeObjectURL(url), 1000);
}

/**
 * Evidence files of a row: click a name to download it. `canRemove(file)` decides which ones show the remove button
 * (the uploader, until the row is accepted); `onRemoved` tells the parent to reload.
 */
export default function AttachmentList({ attachments = [], canRemove = () => false, onRemoved, compact = false }) {
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');

  if (!attachments.length) return null;

  const handleDownload = async (file) => {
    setError('');
    setBusyId(file.id);
    try {
      const res = await opsJournalAdapter.downloadAttachment(file.id);
      if (!res.success) setError(res.error?.message || 'Không tải được tệp.');
      else saveBlob(res.data, file.name || res.filename || 'tep-dinh-kem');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (file) => {
    if (!globalThis.confirm?.(`Gỡ tệp "${file.name}" khỏi báo cáo?`)) return;
    setError('');
    setBusyId(file.id);
    try {
      const res = await opsJournalAdapter.removeAttachment(file.id);
      if (!res.success) setError(res.error?.message || 'Không gỡ được tệp.');
      else if (onRemoved) onRemoved(file);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={compact ? 'mt-1 space-y-1' : 'mt-2 space-y-1.5'} data-testid="attachment-list">
      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700">
        <Paperclip size={12} />
        <span>Minh chứng đính kèm ({attachments.length})</span>
      </div>
      <ul className="space-y-1">
        {attachments.map((file) => {
          const Icon = iconFor(file.name);
          return (
            <li key={file.id} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px]">
              <Icon size={13} className="shrink-0 text-slate-500" />
              <button
                type="button"
                onClick={() => handleDownload(file)}
                disabled={busyId === file.id}
                className="min-w-0 flex-1 truncate text-left font-semibold text-blue-700 hover:underline cursor-pointer disabled:opacity-50"
                title={`Tải về: ${file.name}`}
              >
                {file.name}
              </button>
              <span className="shrink-0 text-slate-400">{formatFileSize(file.size)}</span>
              {file.uploadedByName && <span className="hidden shrink-0 text-slate-400 sm:inline">• {file.uploadedByName}</span>}
              <Download size={12} className="shrink-0 text-slate-400" />
              {canRemove(file) && (
                <button
                  type="button"
                  onClick={() => handleRemove(file)}
                  disabled={busyId === file.id}
                  className="shrink-0 rounded p-0.5 text-rose-500 hover:bg-rose-50 cursor-pointer disabled:opacity-50"
                  title="Gỡ tệp này"
                  aria-label={`Gỡ tệp ${file.name}`}
                >
                  <X size={13} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {error && <p className="text-[11px] font-semibold text-rose-600">{error}</p>}
    </div>
  );
}
