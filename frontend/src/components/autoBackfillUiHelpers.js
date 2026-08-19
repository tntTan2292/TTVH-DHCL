/**
 * Helper utilities for Auto Backfill V2 Operator UI contracts & data aggregation.
 */

export function resolveEffectiveRunState(run) {
  if (!run) return null;
  return run.safety_state || run.status || null;
}

export function resolveWaitingAuthLanes(run, jobs = []) {
  if (!run) return [];
  const waitingJobs = (jobs || []).filter(
    (job) => job.safety_state === 'WAITING_AUTH' || job.state === 'WAITING_AUTH'
  );
  if (waitingJobs.length > 0) {
    const lanes = new Set(waitingJobs.map((j) => j.source_lane).filter(Boolean));
    return Array.from(lanes);
  }
  if (run.requested_lane && run.requested_lane !== 'ALL') {
    return [run.requested_lane];
  }
  return [];
}

export function aggregateReportTotals(report) {
  if (!report) {
    return { total: 0, success: 0, pending: 0, failed: 0, statusCounts: {} };
  }
  const totalsObj = report.totals || null;
  const itemsArr = Array.isArray(report.items) ? report.items : [];

  if (totalsObj && totalsObj.total !== undefined) {
    const total = totalsObj.total;
    const success = (totalsObj.SUCCESS || 0) + (totalsObj.SKIPPED_ALREADY_SUCCESS || 0);
    const pending = (totalsObj.QUEUED || 0) + (totalsObj.RUNNING || 0) + (totalsObj.RETRY_WAIT || 0) + (totalsObj.RECOVERY_CHECK || 0);
    const failed = (totalsObj.FAILED_TERMINAL || 0) + (totalsObj.FAILED_ISOLATED || 0) + (totalsObj.WAITING_AUTH || 0) + (totalsObj.CIRCUIT_OPEN || 0) + (totalsObj.BLOCKED_INTEGRITY || 0) + (totalsObj.MANUAL_ONLY || 0);

    return { total, success, pending, failed, statusCounts: { ...totalsObj } };
  }

  // Fallback: Aggregate directly from items array
  const total = itemsArr.length;
  let success = 0;
  let pending = 0;
  let failed = 0;
  const statusCounts = { total };

  itemsArr.forEach((item) => {
    const st = item.state || item.safety_state || 'UNKNOWN';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    if (['SUCCESS', 'SKIPPED_ALREADY_SUCCESS'].includes(st)) {
      success += 1;
    } else if (['QUEUED', 'RUNNING', 'RETRY_WAIT', 'RECOVERY_CHECK'].includes(st)) {
      pending += 1;
    } else {
      failed += 1;
    }
  });

  return { total, success, pending, failed, statusCounts };
}

export function resolveRunActionButtons(effectiveState) {
  return {
    canPause: ['RUNNING', 'PLANNED'].includes(effectiveState),
    canResume: ['PAUSED', 'WAITING_AUTH'].includes(effectiveState),
    canResetCircuit: effectiveState === 'CIRCUIT_OPEN',
    isBlockedIntegrity: effectiveState === 'BLOCKED_INTEGRITY',
    isTerminal: ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'CANCELLED'].includes(effectiveState),
  };
}

export function groupItemsByIndicator(items = []) {
  const result = {};
  items.forEach((item) => {
    const key = item.indicator || 'OTHER';
    if (!result[key]) result[key] = [];
    result[key].push(item);
  });
  return result;
}

export function groupItemsByDate(items = []) {
  const map = new Map();
  items.forEach((item) => {
    const date = item.business_date || 'N/A';
    if (!map.has(date)) map.set(date, []);
    map.get(date).push(item);
  });
  return Array.from(map.entries()).map(([date, dateItems]) => ({
    date,
    items: dateItems
  }));
}

export function paginateItems(items = [], page = 1, pageSize = 10) {
  const safePageSize = Math.max(1, parseInt(pageSize, 10) || 10);
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const currentPage = Math.min(Math.max(1, parseInt(page, 10) || 1), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;
  const endIndex = Math.min(startIndex + safePageSize, totalItems);
  const pageItems = items.slice(startIndex, endIndex);

  return {
    pageItems,
    currentPage,
    totalPages,
    totalItems,
    pageSize: safePageSize,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
}

export function resolveDynamicIndicators(coverageData, rawItems = []) {
  const APPROVED_THEMES = {
    blue: { badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', activeTabClass: 'bg-blue-600 text-white' },
    teal: { badgeClass: 'bg-teal-50 text-teal-700 border-teal-200', activeTabClass: 'bg-teal-600 text-white' },
    indigo: { badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200', activeTabClass: 'bg-indigo-600 text-white' },
    purple: { badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', activeTabClass: 'bg-purple-600 text-white' },
    emerald: { badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', activeTabClass: 'bg-emerald-600 text-white' },
    amber: { badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', activeTabClass: 'bg-amber-600 text-white' },
    rose: { badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', activeTabClass: 'bg-rose-600 text-white' },
    slate: { badgeClass: 'bg-slate-100 text-slate-700 border-slate-200', activeTabClass: 'bg-slate-700 text-white' },
  };

  const NEUTRAL_FALLBACK = APPROVED_THEMES.slate;

  const items = Array.isArray(rawItems) ? rawItems : (coverageData?.items || []);
  const apiIndicators = Array.isArray(coverageData?.indicators) ? coverageData.indicators : [];

  if (apiIndicators.length > 0) {
    return apiIndicators.map((ind) => {
      const themeKey = APPROVED_THEMES[ind.badge_theme] ? ind.badge_theme : 'slate';
      const theme = APPROVED_THEMES[themeKey] || NEUTRAL_FALLBACK;
      const indicatorItems = items.filter((item) => item.indicator === ind.code);

      return {
        code: ind.code,
        displayName: ind.display_name || ind.code,
        displayOrder: ind.display_order || 99,
        status: ind.status || 'ACTIVE',
        trackingStartDate: ind.tracking_start_date || '2026-01-01',
        supportedLanes: ind.supported_lanes || ['HUE', 'TCT'],
        automationMode: ind.automation_mode || 'AUTOMATED',
        badgeThemeKey: themeKey,
        badgeClass: theme.badgeClass,
        activeTabClass: theme.activeTabClass,
        items: indicatorItems,
        missingCount: indicatorItems.filter((i) => i.status === 'MISSING').length,
        successCount: indicatorItems.filter((i) => i.status === 'SUCCESS').length,
      };
    });
  }

  // Zero-code fallback: Group items dynamically by indicator code
  const itemsGrouped = groupItemsByIndicator(items);
  const indicatorCodes = Object.keys(itemsGrouped);

  return indicatorCodes.map((code, index) => {
    const themeKey = code === 'F1.3' ? 'blue' : code === 'F4.1' ? 'teal' : 'slate';
    const theme = APPROVED_THEMES[themeKey] || NEUTRAL_FALLBACK;
    const indicatorItems = itemsGrouped[code] || [];

    return {
      code,
      displayName: code === 'F1.3' ? 'F1.3 KPI Chất lượng' : code === 'F4.1' ? 'F4.1 Phát BC' : code,
      displayOrder: index + 1,
      status: 'ACTIVE',
      trackingStartDate: '2026-01-01',
      supportedLanes: ['HUE', 'TCT'],
      automationMode: 'AUTOMATED',
      badgeThemeKey: themeKey,
      badgeClass: theme.badgeClass,
      activeTabClass: theme.activeTabClass,
      items: indicatorItems,
      missingCount: indicatorItems.filter((i) => i.status === 'MISSING').length,
      successCount: indicatorItems.filter((i) => i.status === 'SUCCESS').length,
    };
  });
}

