// HANGTON-INVENTORY-01: pure model of the Import Center "Hàng tồn" tab (no React).
import { formatSlot, formatNumber } from '../hangtonLevels.js';

const TRIGGER_TEXT = Object.freeze({ SCHEDULE: 'Lịch tự động', MANUAL: 'Thủ công', MAKEUP: 'Lấy bù' });
const DELETABLE = Object.freeze(['MANUAL', 'MAKEUP']);

export function triggerText(trigger) {
  return TRIGGER_TEXT[trigger] || String(trigger || '—');
}

// Only extra points and make-ups can be deleted; scheduled snapshots cannot.
export function canDeleteSnapshot(snapshot) {
  return Boolean(snapshot) && DELETABLE.includes(snapshot.trigger);
}

// "10:45 27/10" in the viewer's local time (the snapshot's real capture time).
export function formatCapturedAt(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())} ${p(d.getDate())}/${p(d.getMonth() + 1)}`;
}

// Label of a stored snapshot: its slot ("07:30") or "Thủ công 10:45" for an extra point.
export function snapshotSlotLabel(snapshot) {
  return snapshot ? formatSlot(snapshot.slot) : '—';
}

// Rows of "today's three scheduled slots": the state, what is shown and which action is offered.
export function buildSlotRows(status) {
  const slots = Array.isArray(status?.slots) ? status.slots : [];
  return slots.map((s) => {
    const snap = s.snapshot || null;
    const text = s.state === 'OK'
      ? `Đã lấy lúc ${formatCapturedAt(snap.captured_at)}`
      : s.state === 'MISSED' ? 'Đã lỡ, chưa có dữ liệu' : 'Chưa đến giờ';
    return {
      slot: s.slot,
      clock: s.clock,
      state: s.state,
      text,
      snapshot: snap,
      kept: snap ? snap.kept_row_count : null,
      fromText: snap ? triggerText(snap.trigger) : '—',
      canMakeup: s.state === 'MISSED',
    };
  });
}

// Last days grouped by business date, newest first (each group already newest first from the API).
export function groupRecentByDate(recent = []) {
  const groups = [];
  for (const row of recent) {
    let group = groups[groups.length - 1];
    if (!group || group.date !== row.business_date) {
      group = { date: row.business_date, rows: [] };
      groups.push(group);
    }
    group.rows.push(row);
  }
  return groups;
}

// Text for the result line after a successful run.
export function runResultText(result, kindLabel = 'Lấy hàng tồn') {
  if (!result) return '';
  const stale = result.isStale ? ' Cổng chưa làm mới dữ liệu so với mốc trước.' : '';
  return `${kindLabel} xong: ${formatNumber(result.keptRows)} bưu gửi (cổng trả ${formatNumber(result.sourceRows)}).${stale}`;
}

// dd/MM/yyyy of a YYYY-MM-DD business date
export function formatBusinessDate(value) {
  const [y, m, d] = String(value || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : String(value || '—');
}
