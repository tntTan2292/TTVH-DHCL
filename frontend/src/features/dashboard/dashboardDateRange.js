import { isIsoDate } from './components/qualityTrendlineWindow.js';

const DASHBOARD_STATE_RECOVERY_VERSION = '2026-07-23-dashboard-date-range-v2';
const RECOVERY_VERSION_KEY = 'qis.dashboard.dateStateRecoveryVersion';
const STALE_DASHBOARD_DATE_KEY_PATTERN = /(dashboard|f13).*(date|from|to|filter|range)|(date|from|to|filter|range).*(dashboard|f13)/i;
const PRESERVED_STORAGE_KEY_PATTERN = /session|token|auth|columns|theme|sidebar/i;

export function resolveDashboardDateRange({ rawFromDate, rawToDate, minDate, maxDate } = {}) {
  if (!isIsoDate(maxDate)) {
    return {
      fromDate: null,
      toDate: null,
      normalized: false,
      ready: false,
    };
  }

  const lowerBound = isIsoDate(minDate) ? minDate : maxDate;
  let fromDate = isIsoDate(rawFromDate) ? rawFromDate : maxDate;
  let toDate = isIsoDate(rawToDate) ? rawToDate : maxDate;

  if (fromDate > maxDate) fromDate = maxDate;
  if (toDate > maxDate) toDate = maxDate;
  if (fromDate < lowerBound) fromDate = lowerBound;
  if (toDate < lowerBound) toDate = lowerBound;
  if (fromDate > toDate) fromDate = toDate;

  return {
    fromDate,
    toDate,
    normalized: fromDate !== rawFromDate || toDate !== rawToDate,
    ready: true,
  };
}

function removeStaleDashboardKeys(storage) {
  if (!storage) return [];

  const removed = [];
  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (!key) continue;
    if (PRESERVED_STORAGE_KEY_PATTERN.test(key)) continue;
    if (!STALE_DASHBOARD_DATE_KEY_PATTERN.test(key)) continue;
    storage.removeItem(key);
    removed.push(key);
  }

  return removed;
}

export function recoverDashboardDateState(storageScope = globalThis) {
  const local = storageScope?.localStorage;
  const session = storageScope?.sessionStorage;

  if (local?.getItem?.(RECOVERY_VERSION_KEY) === DASHBOARD_STATE_RECOVERY_VERSION) {
    return { removedLocalKeys: [], removedSessionKeys: [], skipped: true };
  }

  const removedLocalKeys = removeStaleDashboardKeys(local);
  const removedSessionKeys = removeStaleDashboardKeys(session);
  local?.setItem?.(RECOVERY_VERSION_KEY, DASHBOARD_STATE_RECOVERY_VERSION);

  return { removedLocalKeys, removedSessionKeys, skipped: false };
}
