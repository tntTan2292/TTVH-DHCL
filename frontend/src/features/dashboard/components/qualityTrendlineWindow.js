export function isIsoDate(value) {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function shiftIsoDate(dateStr, deltaDays) {
  if (!isIsoDate(dateStr)) return null;
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

export function resolveRollingTrendlineWindow({ reportingToDate, latestDate } = {}) {
  const trendEndDate = isIsoDate(reportingToDate)
    ? reportingToDate
    : isIsoDate(latestDate)
      ? latestDate
      : null;

  if (!trendEndDate) {
    return {
      trendFromDate: null,
      trendToDate: null,
      trendWindowDays: 30,
    };
  }

  const trendFromDate = shiftIsoDate(trendEndDate, -29);
  return {
    trendFromDate,
    trendToDate: trendEndDate,
    trendWindowDays: 30,
  };
}

export function buildTrendlineRequestParams({ reportingFromDate, reportingToDate, latestDate, maBcvh } = {}) {
  if (isIsoDate(reportingFromDate) && isIsoDate(reportingToDate) && reportingFromDate <= reportingToDate) {
    const params = {
      from_date: reportingFromDate,
      to_date: reportingToDate,
    };

    if (maBcvh && maBcvh !== 'all') {
      params.ma_bcvh = maBcvh;
    }

    return params;
  }

  const { trendFromDate, trendToDate } = resolveRollingTrendlineWindow({
    reportingToDate,
    latestDate,
  });

  if (!trendFromDate || !trendToDate) {
    return null;
  }

  const params = {
    from_date: trendFromDate,
    to_date: trendToDate,
  };

  if (maBcvh && maBcvh !== 'all') {
    params.ma_bcvh = maBcvh;
  }

  return params;
}
