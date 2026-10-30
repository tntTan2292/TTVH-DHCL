import React from 'react';
import { CheckCircle2, Clock, MessageSquare } from 'lucide-react';

function getRowStatusStyle(status) {
  switch (status) {
    case 'DONE':
      return {
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        label: 'Hoàn thành',
      };
    case 'REPORTED':
      return {
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
        label: 'Đã báo cáo',
      };
    case 'IN_PROGRESS':
      return {
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
        label: 'Đang xử lý',
      };
    case 'ASSIGNED':
    default:
      return {
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        label: 'Đã giao việc',
      };
  }
}

export default function SpotActionReadOnlyTable({
  actions = [],
  assignableUsers = [],
  onMarkDone,
  markingDoneActionId = null,
  isClosed = false,
}) {
  const userMap = new Map((assignableUsers || []).map((u) => [u.id, u]));

  if (actions.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-slate-400">
        Điểm đen này chưa có hành động 6-rõ nào.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
      <table className="w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-600">
            <th className="py-2.5 px-2.5 w-10 text-center">#</th>
            <th className="py-2.5 px-3 w-44">Ai (Người thực hiện)</th>
            <th className="py-2.5 px-3">Làm gì</th>
            <th className="py-2.5 px-2.5 w-28">Ở đâu</th>
            <th className="py-2.5 px-2.5 w-24">Khi nào</th>
            <th className="py-2.5 px-3 w-40">Bằng cách nào</th>
            <th className="py-2.5 px-3 w-40">Kết quả gì</th>
            <th className="py-2.5 px-3 w-36 text-center">Tiến độ & Báo cáo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {actions.map((row, idx) => {
            const statusStyle = getRowStatusStyle(row.status);
            const hasReport = Boolean(row.reportText || row.reportCause);
            const isReported = row.status === 'REPORTED';
            const isDone = row.status === 'DONE';

            // Resolve assigned users
            const assignedUsers = (row.assigneeUserIds || [])
              .map((id) => userMap.get(id))
              .filter(Boolean);

            return (
              <tr key={row.id || idx} className="hover:bg-slate-50/60 transition-colors">
                {/* # */}
                <td className="py-2.5 px-2.5 text-center font-bold text-slate-400 align-top">
                  {row.seq || idx + 1}
                </td>

                {/* Ai */}
                <td className="py-2.5 px-3 align-top">
                  <div className="font-bold text-slate-900">{row.whoText || '-'}</div>
                  {assignedUsers.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {assignedUsers.map((u) => (
                        <span
                          key={u.id}
                          className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200"
                        >
                          {u.name}
                        </span>
                      ))}
                    </div>
                  )}
                </td>

                {/* Làm gì */}
                <td className="py-2.5 px-3 align-top">
                  <div className="font-semibold text-slate-800 leading-snug">{row.what || '-'}</div>
                </td>

                {/* Ở đâu */}
                <td className="py-2.5 px-2.5 align-top text-slate-600">
                  {row.where || '-'}
                </td>

                {/* Khi nào */}
                <td className="py-2.5 px-2.5 align-top text-slate-600 font-medium">
                  {row.due || '-'}
                </td>

                {/* Bằng cách nào */}
                <td className="py-2.5 px-3 align-top text-slate-600 leading-snug">
                  {row.how || '-'}
                </td>

                {/* Kết quả gì */}
                <td className="py-2.5 px-3 align-top text-slate-600 leading-snug">
                  {row.expectedResult || '-'}
                </td>

                {/* Tiến độ & Báo cáo */}
                <td className="py-2.5 px-3 align-top text-center">
                  <div className="flex flex-col items-center gap-1.5">
                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border ${statusStyle.badgeClass}`}
                    >
                      {isDone && <CheckCircle2 size={11} />}
                      {!isDone && <Clock size={11} />}
                      <span>{statusStyle.label}</span>
                    </span>

                    {/* Report callout banner */}
                    {hasReport && (
                      <div className="w-full text-left rounded-lg bg-amber-50/80 p-2 border border-amber-200 text-[11px] text-amber-900 space-y-1">
                        <div className="flex items-center gap-1 font-bold text-amber-900">
                          <MessageSquare size={11} className="text-amber-600" />
                          <span>Báo cáo:</span>
                        </div>
                        {row.reportCause && (
                          <div>
                            <span className="font-semibold text-amber-800">Nguyên nhân: </span>
                            <span>{row.reportCause}</span>
                          </div>
                        )}
                        {row.reportText && (
                          <div>
                            <span className="font-semibold text-amber-800">Nội dung: </span>
                            <span>{row.reportText}</span>
                          </div>
                        )}
                        {row.reportedAt && (
                          <div className="text-[10px] text-amber-700">
                            Thời điểm: {new Date(row.reportedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action button for REPORTED status */}
                    {isReported && !isClosed && (
                      <button
                        type="button"
                        onClick={() => onMarkDone(row.id)}
                        disabled={markingDoneActionId === row.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
                        title="Xác nhận dòng công việc này đã hoàn thành"
                      >
                        <CheckCircle2 size={12} />
                        <span>
                          {markingDoneActionId === row.id ? 'Đang xác nhận...' : 'Xác nhận hoàn thành'}
                        </span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
