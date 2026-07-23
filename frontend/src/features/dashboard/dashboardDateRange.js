import { isIsoDate } from './components/qualityTrendlineWindow.js';

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
