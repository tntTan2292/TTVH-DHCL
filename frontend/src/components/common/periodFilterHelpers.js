/**
 * Period filter helpers for blocks with day/week/month switchers (F1.1 Pair Table, F4.2 Postman Table, etc.).
 * Standardizes T5-T4 week ranges and calendar months without modifying underlying business logic.
 */

export function generateRecentWeeks(anchorDate, count = 12) {
  const base = anchorDate && /^\d{4}-\d{2}-\d{2}$/.test(anchorDate)
    ? anchorDate
    : new Date().toISOString().slice(0, 10);
  const d = new Date(`${base}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 is Sunday, 4 is Thursday
  const diffToThu = (dow - 4 + 7) % 7;
  const currentThu = new Date(d);
  currentThu.setUTCDate(d.getUTCDate() - diffToThu);

  const weeks = [];
  for (let i = 0; i < count; i++) {
    const thu = new Date(currentThu);
    thu.setUTCDate(currentThu.getUTCDate() - i * 7);
    const wed = new Date(thu);
    wed.setUTCDate(thu.getUTCDate() + 6);

    const thuStr = thu.toISOString().slice(0, 10);
    const wedStr = wed.toISOString().slice(0, 10);

    const [, tm, td] = thuStr.split('-');
    const [wy, wm, wd] = wedStr.split('-');

    weeks.push({
      value: wedStr,
      start: thuStr,
      end: wedStr,
      label: `Tuần (${td}/${tm} – ${wd}/${wm}/${wy})`,
    });
  }
  return weeks;
}

export function generateRecentMonths(anchorDate, count = 12) {
  const base = anchorDate && /^\d{4}-\d{2}-\d{2}$/.test(anchorDate)
    ? anchorDate
    : new Date().toISOString().slice(0, 10);
  const [y, m] = base.split('-').map(Number);

  const months = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const monthStr = `${year}-${month}`;
    months.push({
      value: `${monthStr}-01`,
      monthStr,
      label: `Tháng ${month}/${year}`,
    });
  }
  return months;
}
