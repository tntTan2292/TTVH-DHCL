/**
 * Helper utilities for Auto Backfill V2 Operator UI contracts & data aggregation.
 */

// AB-CALENDAR-01 remediation: the single source of truth for collapsing any
// status this panel may ever see -- the 4 current PO-facing statuses, or one
// of the frozen 6-state statuses a mismatched/rollback backend could still
// emit -- onto exactly one of COMPLETED / INCOMPLETE / EXCLUDED / DATA_ERROR
// (AB-CALENDAR-01_4_STATUS_MODEL_DESIGN.md Section 2, "Old 6-state -> new 4").
// `resolveNoCodeStatus()`, `groupItemsByIndicatorAndMonth()` and
// `isSelectable()` all normalize through this one table, so a legacy status
// can never disagree with itself across label, count bucket and selectability.
const PO_STATUSES = Object.freeze(['COMPLETED', 'INCOMPLETE', 'EXCLUDED', 'DATA_ERROR']);

const LEGACY_STATUS_TO_PO_STATUS = Object.freeze({
  DATA_COMPLETE_WITH_EVIDENCE: 'COMPLETED',
  LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE: 'COMPLETED',
  SUCCESS: 'COMPLETED',
  TRUE_MISSING: 'INCOMPLETE',
  MISSING: 'INCOMPLETE',
  MANUAL_ONLY_MISSING: 'INCOMPLETE',
  VERIFIED_NO_DATA: 'EXCLUDED',
  PO_EXEMPTED: 'EXCLUDED',
  MANUAL_REVIEW_REQUIRED: 'DATA_ERROR',
});

// Returns exactly one of the 4 PO statuses, or null when `status` is neither
// a current nor a legacy recognized value.
export function normalizePoStatus(status) {
  if (PO_STATUSES.includes(status)) return status;
  return LEGACY_STATUS_TO_PO_STATUS[status] || null;
}

// AB-CALENDAR-01 (design Section 4.1): the single predicate that decides
// whether a coverage item can ever be selected or offered a PO-exception
// action. Replaces the old `!item.holiday && [...]` special-case: a holiday
// or an exception now always maps its day to EXCLUDED, so checking `status`
// alone is sufficient and correct -- COMPLETED and EXCLUDED can never be
// selected, by any UI path.
export function isSelectable(item) {
  const normalized = normalizePoStatus(item?.status);
  return normalized === 'INCOMPLETE' || normalized === 'DATA_ERROR';
}

export function resolveEffectiveRunState(run) {
  if (!run) return null;
  return run.safety_state || run.status || null;
}

export function resolveIndicatorGridClass(count = 0) {
  const safeCount = Math.max(0, parseInt(count, 10) || 0);
  if (safeCount <= 1) return 'grid grid-cols-1 gap-4';
  if (safeCount === 2) return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  if (safeCount === 3) return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4';
  return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';
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
  // Only fall back to the requested lane when the run itself is genuinely
  // WAITING_AUTH — never infer it merely from an empty waitingJobs list
  // (e.g. a normally RUNNING/COMPLETED run with no matching job in `jobs`).
  if (run.safety_state === 'WAITING_AUTH' && run.requested_lane && run.requested_lane !== 'ALL') {
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
    const key = (item.indicator || item.indicator_code || 'OTHER').trim().toUpperCase();
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

  const items = (Array.isArray(rawItems) && rawItems.length > 0)
    ? rawItems
    : (Array.isArray(coverageData?.items) ? coverageData.items : []);
  const apiIndicators = Array.isArray(coverageData?.indicators) ? coverageData.indicators : [];

  if (apiIndicators.length > 0) {
    return apiIndicators.map((ind) => {
      const themeKey = APPROVED_THEMES[ind.badge_theme] ? ind.badge_theme : 'slate';
      const theme = APPROVED_THEMES[themeKey] || NEUTRAL_FALLBACK;
      const indCodeNormalized = (ind.code || '').trim().toUpperCase();
      const indicatorItems = items.filter(
        (item) => (item.indicator || item.indicator_code || '').trim().toUpperCase() === indCodeNormalized
      );

      const missingItems = indicatorItems.filter((i) => ['INCOMPLETE', 'TRUE_MISSING', 'MISSING', 'MANUAL_ONLY_MISSING'].includes(i.status));
      const uniqueMissingDates = new Set(missingItems.map((i) => i.business_date).filter(Boolean));

      const successItems = indicatorItems.filter((i) => ['COMPLETED', 'EXCLUDED', 'DATA_COMPLETE_WITH_EVIDENCE', 'LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE', 'PO_EXEMPTED', 'VERIFIED_NO_DATA', 'SUCCESS'].includes(i.status));
      const uniqueSuccessDates = new Set(successItems.map((i) => i.business_date).filter(Boolean));

      const supportedLanes = ind.supported_lanes || ['HUE', 'TCT'];
      const lanesBreakdown = {};
      supportedLanes.forEach((lane) => {
        const laneItems = indicatorItems.filter((i) => (i.source_lane || i.lane || '').trim().toUpperCase() === lane.toUpperCase());
        const laneMissingItems = laneItems.filter((i) => ['INCOMPLETE', 'TRUE_MISSING', 'MISSING', 'MANUAL_ONLY_MISSING'].includes(i.status));
        const laneMissingDates = Array.from(new Set(laneMissingItems.map((i) => i.business_date).filter(Boolean))).sort().reverse();

        const laneReviewItems = laneItems.filter((i) => i.status === 'DATA_ERROR' || i.status === 'MANUAL_REVIEW_REQUIRED');
        const laneReviewDates = Array.from(new Set(laneReviewItems.map((i) => i.business_date).filter(Boolean))).sort().reverse();

        const laneActionableItems = laneItems.filter((i) => ['INCOMPLETE', 'DATA_ERROR', 'TRUE_MISSING', 'MISSING', 'MANUAL_ONLY_MISSING', 'MANUAL_REVIEW_REQUIRED'].includes(i.status));

        // AB-CALENDAR-01: "đã xử lý xong" = COMPLETED + EXCLUDED (processed).
        const laneSuccessItems = laneItems.filter((i) => ['COMPLETED', 'EXCLUDED', 'DATA_COMPLETE_WITH_EVIDENCE', 'SUCCESS'].includes(i.status));
        const laneSuccessDates = Array.from(new Set(laneSuccessItems.map((i) => i.business_date).filter(Boolean)));

        lanesBreakdown[lane] = {
          lane,
          missingCount: laneMissingItems.length,
          missingDates: laneMissingDates,
          missingItems: laneMissingItems,
          reviewReqCount: laneReviewItems.length,
          reviewReqDates: laneReviewDates,
          reviewReqItems: laneReviewItems,
          unresolvedCount: laneMissingItems.length + laneReviewItems.length,
          actionableItems: laneActionableItems,
          successCount: laneSuccessItems.length,
          successDates: laneSuccessDates,
          totalCount: laneItems.length,
          isFullyComplete: laneItems.length > 0 && laneSuccessItems.length === laneItems.length,
        };
      });

      return {
        code: ind.code,
        displayName: ind.display_name || ind.code,
        displayOrder: ind.display_order || 99,
        status: ind.status || 'ACTIVE',
        trackingStartDate: ind.tracking_start_date || '2026-01-01',
        supportedLanes,
        automationMode: ind.automation_mode || 'AUTOMATED',
        badgeThemeKey: themeKey,
        badgeClass: theme.badgeClass,
        activeTabClass: theme.activeTabClass,
        items: indicatorItems,
        missingCount: uniqueMissingDates.size,
        successCount: uniqueSuccessDates.size,
        lanesBreakdown,
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

    const missingItems = indicatorItems.filter((i) => ['INCOMPLETE', 'TRUE_MISSING', 'MISSING', 'MANUAL_ONLY_MISSING'].includes(i.status));
    const uniqueMissingDates = new Set(missingItems.map((i) => i.business_date).filter(Boolean));

    const successItems = indicatorItems.filter((i) => ['COMPLETED', 'EXCLUDED', 'DATA_COMPLETE_WITH_EVIDENCE', 'LEGACY_DATA_PRESENT_WITHOUT_EVIDENCE', 'PO_EXEMPTED', 'VERIFIED_NO_DATA', 'SUCCESS'].includes(i.status));
    const uniqueSuccessDates = new Set(successItems.map((i) => i.business_date).filter(Boolean));

    const supportedLanes = ['HUE', 'TCT'];
    const lanesBreakdown = {};
    supportedLanes.forEach((lane) => {
      const laneItems = indicatorItems.filter((i) => (i.source_lane || i.lane || '').trim().toUpperCase() === lane.toUpperCase());
      const laneMissingItems = laneItems.filter((i) => ['INCOMPLETE', 'TRUE_MISSING', 'MISSING', 'MANUAL_ONLY_MISSING'].includes(i.status));
      const laneMissingDates = Array.from(new Set(laneMissingItems.map((i) => i.business_date).filter(Boolean))).sort().reverse();

      const laneReviewItems = laneItems.filter((i) => i.status === 'DATA_ERROR' || i.status === 'MANUAL_REVIEW_REQUIRED');
      const laneReviewDates = Array.from(new Set(laneReviewItems.map((i) => i.business_date).filter(Boolean))).sort().reverse();

      const laneActionableItems = laneItems.filter((i) => ['INCOMPLETE', 'DATA_ERROR', 'TRUE_MISSING', 'MISSING', 'MANUAL_ONLY_MISSING', 'MANUAL_REVIEW_REQUIRED'].includes(i.status));

      const laneSuccessItems = laneItems.filter((i) => ['COMPLETED', 'EXCLUDED', 'DATA_COMPLETE_WITH_EVIDENCE', 'SUCCESS'].includes(i.status));
      const laneSuccessDates = Array.from(new Set(laneSuccessItems.map((i) => i.business_date).filter(Boolean)));

      lanesBreakdown[lane] = {
        lane,
        missingCount: laneMissingItems.length,
        missingDates: laneMissingDates,
        missingItems: laneMissingItems,
        reviewReqCount: laneReviewItems.length,
        reviewReqDates: laneReviewDates,
        reviewReqItems: laneReviewItems,
        unresolvedCount: laneMissingItems.length + laneReviewItems.length,
        actionableItems: laneActionableItems,
        successCount: laneSuccessItems.length,
        successDates: laneSuccessDates,
        totalCount: laneItems.length,
        isFullyComplete: laneItems.length > 0 && laneSuccessItems.length === laneItems.length,
      };
    });

    return {
      code,
      displayName: code === 'F1.3' ? 'F1.3 KPI Chất lượng' : code === 'F4.1' ? 'F4.1 Phát BC' : code,
      displayOrder: index + 1,
      status: 'ACTIVE',
      trackingStartDate: '2026-01-01',
      supportedLanes,
      automationMode: 'AUTOMATED',
      badgeThemeKey: themeKey,
      badgeClass: theme.badgeClass,
      activeTabClass: theme.activeTabClass,
      items: indicatorItems,
      missingCount: uniqueMissingDates.size,
      successCount: uniqueSuccessDates.size,
      lanesBreakdown,
    };
  });
}

// AB-CALENDAR-01: the exhaustive, canonical display info for exactly the 4
// PO-facing statuses. Any legacy 6-state status is normalized onto one of
// these 4 via `normalizePoStatus()` before lookup -- a legacy status can
// never surface its own old label, badge, or icon again.
const PO_STATUS_INFO = Object.freeze({
  COMPLETED: {
    label: 'Đã hoàn tất',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    isResolved: true,
    iconType: 'success',
  },
  INCOMPLETE: {
    label: 'Chưa hoàn tất',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300',
    isResolved: false,
    iconType: 'missing',
  },
  EXCLUDED: {
    label: 'Được loại trừ',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
    isResolved: true,
    iconType: 'excluded',
  },
  DATA_ERROR: {
    label: 'Lỗi dữ liệu',
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    isResolved: false,
    iconType: 'error',
  },
});

export function resolveNoCodeStatus(status) {
  const normalized = normalizePoStatus(status);
  if (normalized) return PO_STATUS_INFO[normalized];

  return {
    label: status || 'Chưa xác định',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    isResolved: false,
    iconType: 'neutral',
  };
}

export function groupItemsByIndicatorAndMonth(items = []) {
  const map = new Map();

  items.forEach((item) => {
    const indicator = item.indicator || 'OTHER';
    const dateStr = item.business_date || '';
    const yearMonth = dateStr.length >= 7 ? dateStr.slice(0, 7) : 'N/A';
    const key = `${indicator}::${yearMonth}`;

    if (!map.has(key)) {
      map.set(key, {
        indicator,
        yearMonth,
        items: [],
        // AB-CALENDAR-01: the 4 PO-facing buckets, plus the processed
        // (COMPLETED+EXCLUDED) / unprocessed (INCOMPLETE+DATA_ERROR) roll-up
        // from the operational-completion delta (design Section 1.1).
        counts: {
          total: 0,
          completed: 0,
          incomplete: 0,
          excluded: 0,
          dataError: 0,
          processed: 0,
          unprocessed: 0,
          // Deprecated aliases, kept for one release.
          missing: 0,
          complete: 0,
          reviewReq: 0,
        },
      });
    }

    const group = map.get(key);
    group.items.push(item);
    group.counts.total += 1;

    switch (normalizePoStatus(item.status)) {
      case 'INCOMPLETE':
        group.counts.incomplete += 1;
        group.counts.missing += 1;
        break;
      case 'COMPLETED':
        group.counts.completed += 1;
        group.counts.complete += 1;
        break;
      case 'EXCLUDED':
        group.counts.excluded += 1;
        break;
      case 'DATA_ERROR':
        group.counts.dataError += 1;
        group.counts.reviewReq += 1;
        break;
      default:
        break;
    }
    group.counts.processed = group.counts.completed + group.counts.excluded;
    group.counts.unprocessed = group.counts.incomplete + group.counts.dataError;
  });

  const groups = Array.from(map.values());

  // Sort groups: indicator priority first, then yearMonth descending (newest month first)
  groups.sort((a, b) => {
    if (a.indicator !== b.indicator) {
      return a.indicator.localeCompare(b.indicator);
    }
    return b.yearMonth.localeCompare(a.yearMonth);
  });

  // Sort items inside each month descending by business_date
  groups.forEach((g) => {
    g.items.sort((left, right) => (right.business_date || '').localeCompare(left.business_date || ''));
  });

  return groups;
}

// AB-AUTH-07 (design Section 5, C2): per-row decision logic for the "Tất cả tiến trình đang mở"
// table -- pulled out of JSX so it is unit-testable the same way every other decision helper in
// this file is, instead of only being exercisable by hand in the browser.
export function resolveOpenRunRowActions(entry) {
  if (!entry?.run) {
    return { runState: null, isBlocking: false, blockedLanes: [], canResume: false };
  }
  const runState = resolveEffectiveRunState(entry.run);
  const blockedLanes = Array.isArray(entry.blockedLanes) ? entry.blockedLanes : [];
  return {
    runState,
    isBlocking: blockedLanes.length > 0,
    blockedLanes,
    // Only a genuinely WAITING_AUTH run can be resumed -- a run merely queued behind a blocked
    // lane (P1-C/A1) is not itself stuck and must not show a resume button that does nothing.
    canResume: runState === 'WAITING_AUTH',
  };
}

// AB-AUTH-05 (design Section 4, plan B): the single biggest recurring Product Owner complaint --
// "Đang khởi tạo..." never distinguished (a) a job genuinely executing, (b) a job merely queued
// behind other work, (c) a login the Product Owner is actively completing (PENDING, not an
// error), or (d) a session that is truly broken and needs manual login (BLOCKED). Backend-side,
// (c) surfaces as a job in `RETRY_WAIT` whose `terminal_reason` is the AB-AUTH-05
// `SESSION_PENDING_HUMAN_ACTION` code -- distinct from every other RETRY_WAIT reason (e.g.
// AB-AUTH-04's EXPORT_TIMEOUT), which stays generic "Đang khởi tạo...".
const TERMINAL_RUN_STATES = new Set(['COMPLETED', 'COMPLETED_WITH_ERRORS', 'CANCELLED']);
const EXECUTING_JOB_STATES = new Set(['RUNNING', 'LEASED', 'RECOVERY_CHECK']);

export function resolveRunIdleState(runData) {
  const run = runData?.run || null;
  const jobs = Array.isArray(runData?.jobs) ? runData.jobs : [];
  const effectiveState = resolveEffectiveRunState(run);

  if (TERMINAL_RUN_STATES.has(effectiveState)) {
    return { kind: 'TERMINAL', runState: effectiveState, job: null };
  }

  const executingJob = jobs.find((job) => EXECUTING_JOB_STATES.has(job.state || job.status || job.safety_state));
  if (executingJob) {
    return { kind: 'EXECUTING', runState: effectiveState, job: executingJob };
  }

  const sessionPendingJob = jobs.find(
    (job) => job.safety_state === 'RETRY_WAIT' && job.terminal_reason === 'SESSION_PENDING_HUMAN_ACTION'
  );
  if (sessionPendingJob) {
    return { kind: 'SESSION_PENDING', runState: effectiveState, job: sessionPendingJob };
  }

  if (effectiveState === 'WAITING_AUTH') {
    return { kind: 'WAITING_AUTH', runState: effectiveState, job: null };
  }

  const queuedJob = jobs.find((job) => (job.state || job.safety_state) === 'QUEUED');
  if (queuedJob) {
    return { kind: 'QUEUED_BEHIND_OTHER_WORK', runState: effectiveState, job: queuedJob };
  }

  return { kind: 'INITIALIZING', runState: effectiveState, job: null };
}


