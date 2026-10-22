// IMPORT-DAILYLOG-01 -- labels and rules for the "Log ngày mới" tab (data: GET /import/daily-log).

export const CELL_META = {
  OK: { label: 'Xong', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  FAILED: { label: 'Lỗi', cls: 'bg-red-100 text-red-800 border-red-300' },
  RUNNING: { label: 'Đang chạy', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  QUEUED: { label: 'Đang chờ', cls: 'bg-sky-50 text-sky-800 border-sky-200' },
  WAITING_AUTH: { label: 'Chờ đăng nhập', cls: 'bg-amber-100 text-amber-800 border-amber-300' },
  MISSING: { label: 'Chưa nhập', cls: 'bg-slate-100 text-slate-600 border-slate-300' }
};

export const VERDICT_META = {
  COMPLETE: { cls: 'border-emerald-300 bg-emerald-50 text-emerald-900', title: 'Đã đủ' },
  IN_PROGRESS: { cls: 'border-blue-300 bg-blue-50 text-blue-900', title: 'Đang chạy' },
  INCOMPLETE: { cls: 'border-amber-300 bg-amber-50 text-amber-900', title: 'Chưa đủ' },
  ATTENTION: { cls: 'border-red-300 bg-red-50 text-red-900', title: 'Cần PO xử lý' }
};

export const SEVERITY_META = {
  high: { label: 'Cần xử lý ngay', cls: 'bg-red-600 text-white' },
  medium: { label: 'Cần theo dõi', cls: 'bg-amber-500 text-white' },
  low: { label: 'Để biết', cls: 'bg-slate-400 text-white' }
};

export const cellMeta = (state) => CELL_META[state] || CELL_META.MISSING;
export const verdictMeta = (code) => VERDICT_META[code] || VERDICT_META.INCOMPLETE;

/** '2026-10-21' -> '21/10' */
export const shortDate = (iso) => {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return match ? `${match[2]}/${match[1]}` : String(iso || '');
};

/** Column heading of a day of the window: the first (newest) is the new day, the others are refreshed. */
export const dayHeading = (index, iso) => (index === 0 ? `Ngày mới ${shortDate(iso)}` : `Làm mới ${shortDate(iso)}`);

const vnFormatter = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'
});
export const formatVnTime = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : vnFormatter.format(date);
};

/** The tooltip text of a grid cell. */
export const cellTitle = (cell) => {
  const parts = [`${cell.indicator} ${cell.lane} · ${cell.date}`, cellMeta(cell.state).label];
  if (cell.reason) parts.push(`Mã: ${cell.reason}`);
  if (cell.detail) parts.push(`Chi tiết: ${cell.detail}`);
  if (cell.has_data && cell.state === 'FAILED') parts.push('Đã có số liệu cũ, chưa làm mới được');
  if (cell.last_import_at) parts.push(`Nhập gần nhất: ${formatVnTime(cell.last_import_at)}`);
  return parts.join('\n');
};

export const countHigh = (data) => (data?.attention || []).filter((item) => item.severity === 'high').length;

/** Where the "Mở" button of an attention item leads: the Auto Backfill tab, the manual upload tab, or nowhere. */
export const attentionTarget = (item) => {
  if (item.code === 'FILE_IMPORT_FAILED') return 'MANUAL';
  if (['CELL_FAILED', 'CELL_WAITING_AUTH', 'CELL_MISSING', 'SCHEDULE_GAVE_UP', 'SCHEDULE_RETRYING', 'SCHEDULE_NOT_STARTED'].includes(item.code)) return 'PLATFORM';
  return null;
};

export const schedulerLine = (scheduler) => {
  if (!scheduler) return 'Không có thông tin lịch.';
  if (!scheduler.enabled) return 'Lịch tự động đang tắt (AUTO_IMPORT_SCHEDULE_ENABLED).';
  const time = (scheduler.times || []).join(', ');
  if (!scheduler.cycle) {
    return scheduler.overdue
      ? `Lịch ${time}: đã quá giờ mà chưa có lượt chạy nào hôm nay.`
      : `Lịch ${time}: chưa tới giờ chạy.`;
  }
  const { cycle } = scheduler;
  if (cycle.gave_up) return `Lịch ${cycle.slot}: đã bỏ cuộc sau ${cycle.attempts} lần thử.`;
  if (cycle.done) return `Lịch ${cycle.slot}: xong sau ${cycle.attempts} lần thử.`;
  const next = cycle.next_attempt_at ? `, lần tiếp theo ${formatVnTime(cycle.next_attempt_at)}` : '';
  return `Lịch ${cycle.slot}: ${cycle.attempt_running ? 'đang chạy lần' : 'đã thử'} ${cycle.attempts}${next}.`;
};
