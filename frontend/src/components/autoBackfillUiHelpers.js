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
