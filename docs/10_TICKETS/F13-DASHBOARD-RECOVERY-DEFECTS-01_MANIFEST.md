# F13-DASHBOARD-RECOVERY-DEFECTS-01 Manifest

Status: `DISCOVERED / NOT ACTIVATED (2026-09-08)`. Registration only — no code was changed by this ticket, and no fix is authorized yet.

## 1. Ticket Information

- Ticket ID: `F13-DASHBOARD-RECOVERY-DEFECTS-01`
- Ticket Name: `F1.3 Dashboard recovery test failures — 2 real pre-existing defects`
- Owner: unassigned — pending Product Owner/CTO prioritization.
- Governance Version: `V2 Active`
- Discovery authority: `ITR-F41-NB-02` (`F41-DASHBOARD-MINIMUM-01` Independent Technical Review, `docs/06_REVIEWS/Shared/F41-DASHBOARD-MINIMUM-01_CHECKPOINT_001.md` Section 7), remediated (registered, not fixed) in that ticket's B1 ITR-remediation pass.
- Branch discovered on: `codex/da-impl-006`

## 2. Objective (for whoever activates this ticket)

Two `backend/src/**/*.test.js` failures are real, pre-existing F1.3-territory defects — not environmental, not related to F4.1/F41. They reproduce on every full backend sweep. This ticket exists only to record them so they are not lost or mischaracterized; it is explicitly out of scope for `F41-DASHBOARD-MINIMUM-01` and no F1.3 file was opened for edit to investigate or fix either one.

## 3. Findings

1. **`backend/src/controllers/DashboardController.recovery.test.js:11`** — `"KPI all and missing ma_bcvh normalize to aggregate null and never pass all to SQL"` fails: `assert.equal(calls[0].filters.bcvhId, ...)`-style aggregate-count assertion expects `3`, gets `12`. This is a real assertion failure (`ERR_ASSERTION`, `12 !== 3`), not a wiring/environment issue — needs root-cause investigation into why the aggregate SQL call count observed by the test is `12` instead of the expected `3`.
2. **`backend/src/services/timelineService.recovery.test.js:80`** — `"monthly rank enrichment uses full prior months and latest-data current month without BCVH scope"` fails: a source-text regex assertion (`/const includeMonthlyNationalRank = Boolean\(options\.includeNationalRank\) && mode === 'month' && \(!ma_bcvh \|\| ma_bcvh === 'all'\)/`) no longer matches the current `backend/src/services/timelineService.js`, which commit `b075b96` (`fix(f13-dashboard): correct "Theo thứ" filter-context label to real 90-day window`, pre-dating `F41-DASHBOARD-MINIMUM-01`) edited. The test's source-text expectation is stale relative to that refactor; needs reconciliation between the test's expected source snippet and the current implementation.

## 4. Scope

Not scoped yet — activation, root-cause, and fix all require their own ticket per `CLAUDE.md`'s One Bug → One Ticket → One Commit rule. Out of scope for `F41-DASHBOARD-MINIMUM-01`: no F1.3 file (`DashboardController.js`, `timelineService.js`, or either recovery test file) was modified to investigate or fix these.

## 5. Evidence

Reproduced directly, isolated from the rest of the sweep:

```
node --experimental-sqlite --test src/controllers/DashboardController.recovery.test.js \
  src/services/timelineService.recovery.test.js
# not ok 1 - KPI all and missing ma_bcvh normalize to aggregate null and never pass all to SQL
#   AssertionError: Expected values to be strictly equal: 12 !== 3
# not ok 11 - monthly rank enrichment uses full prior months and latest-data current month without BCVH scope
#   AssertionError: source regex did not match current timelineService.js
```

Both are counted among the "4 pre-existing baseline failures" the project has referenced in prior tickets' evidence; the other two (`DashboardController.r6.integration.test.js`, `fetch failed` x2) are genuinely environmental (need a live HTTP server) and are not part of this ticket.

## 6. Next Step

Awaiting Product Owner/CTO decision to activate, prioritize, and scope this ticket. Not self-activated by this registration.
