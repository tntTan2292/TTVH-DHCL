// HOME-BI-02 - labels of the Home page period filter (Ngày / Tuần / Tháng + back / forward buttons).
// Pure helpers: the server decides the range of each indicator, the page only names it.

export const PERIOD_OPTIONS = Object.freeze([
  { id: 'day', label: 'Ngày' },
  { id: 'week', label: 'Tuần' },
  { id: 'month', label: 'Tháng' },
]);

export function formatDayMonth(iso) {
  const [, m, d] = String(iso || '').split('-');
  return d && m ? `${d}/${m}` : '—';
}

export function formatFullDate(iso) {
  const [y, m, d] = String(iso || '').split('-');
  return d && m && y ? `${d}/${m}/${y}` : '—';
}

/** What the figures are compared with: "So hôm trước" / "So tuần trước" / "So tháng trước". */
export function previousBasisLabel(period) {
  if (period === 'week') return 'tuần trước';
  if (period === 'month') return 'tháng trước';
  return 'hôm trước';
}

/**
 * Name of the period an indicator (or the whole page) is showing, from the server's period fields
 * { period, period_from, period_to, period_partial, period_week, period_year }.
 *  day   -> "20/10/2026"
 *  week  -> "Tuần 42 · 15/10 → 20/10" (a running week: "Tuần 42 · đến 20/10")
 *  month -> "Tháng 10/2026" (a running month: "Tháng 10/2026 · đến 20/10")
 */
export function periodTitle(info) {
  if (!info || !info.period_to) return 'Chưa có dữ liệu';
  if (info.period === 'week') {
    const range = info.period_partial
      ? `đến ${formatDayMonth(info.period_to)}`
      : `${formatDayMonth(info.period_from)} → ${formatDayMonth(info.period_to)}`;
    return `Tuần ${info.period_week} · ${range}`;
  }
  if (info.period === 'month') {
    const [y, m] = String(info.period_from || info.period_to).split('-');
    const base = `Tháng ${Number(m)}/${y}`;
    return info.period_partial ? `${base} · đến ${formatDayMonth(info.period_to)}` : base;
  }
  return formatFullDate(info.period_to);
}

/** Short form for the chip on each card: the same naming without the year. */
export function periodShortTitle(info) {
  if (!info || !info.period_to) return '—';
  if (info.period === 'week') {
    return info.period_partial
      ? `Tuần ${info.period_week} · đến ${formatDayMonth(info.period_to)}`
      : `Tuần ${info.period_week} · ${formatDayMonth(info.period_from)}–${formatDayMonth(info.period_to)}`;
  }
  if (info.period === 'month') {
    const month = Number(String(info.period_from || info.period_to).split('-')[1]);
    return info.period_partial ? `T${month} · đến ${formatDayMonth(info.period_to)}` : `Tháng ${month}`;
  }
  return formatFullDate(info.period_to);
}

/**
 * Which of the period buttons may be pressed. Both back and forward are locked while a request is running
 * (a quick double click would step past the data), and back also stops at the server's own limit.
 */
export function navState({ periodInfo, offset, loading }) {
  const maxBack = Number.isInteger(periodInfo?.max_back) ? periodInfo.max_back : 120;
  return {
    canGoBack: !loading && Boolean(periodInfo?.has_previous) && offset > -maxBack,
    canGoForward: !loading && offset < 0,
  };
}

/** Tiny form for the chips of the control bar: "20/10", "Tuần 42", "T10". */
export function periodChipTitle(info) {
  if (!info || !info.period_to) return '—';
  if (info.period === 'week') return `Tuần ${info.period_week}`;
  if (info.period === 'month') return `T${Number(String(info.period_from || info.period_to).split('-')[1])}`;
  return formatDayMonth(info.period_to);
}

/** Caption of the small line chart inside a card. */
export function sparkCaption(trendKind) {
  if (trendKind === 'week') return '12 tuần gần nhất';
  if (trendKind === 'month') return 'các tháng từ T1';
  return '30 ngày gần nhất';
}
