export const DEFAULT_RECONCILIATION_BCVH = 'all';

export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function buildDashboardReconciliationUrl({ date, maBcvh = DEFAULT_RECONCILIATION_BCVH } = {}) {
  if (!isIsoDate(date)) return null;

  const params = new URLSearchParams({
    from_date: date,
    to_date: date,
    ma_bcvh: maBcvh || DEFAULT_RECONCILIATION_BCVH,
  });

  return `/f13/dashboard?${params.toString()}`;
}

export function buildImportReconciliationContext(log = {}) {
  const date = log.ngay_so_lieu;
  const dashboardUrl = buildDashboardReconciliationUrl({ date });

  return {
    importLogId: log.id ?? null,
    fileName: log.ten_file || null,
    dataDate: isIsoDate(date) ? date : null,
    importedRecords: Number(log.so_luong_bg || 0),
    dashboardUrl,
    bcvhContext: DEFAULT_RECONCILIATION_BCVH,
    canOpenDashboard: Boolean(dashboardUrl && log.trang_thai === 'SUCCESS'),
  };
}
