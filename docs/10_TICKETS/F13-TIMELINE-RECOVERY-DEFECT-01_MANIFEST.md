# F13-TIMELINE-RECOVERY-DEFECT-01 Manifest

Status: `DISCOVERED / NOT ACTIVATED (2026-09-09)`. Registration only — no code was changed by this ticket, and no fix is authorized yet.

## 1. Ticket Information

- Ticket ID: `F13-TIMELINE-RECOVERY-DEFECT-01`
- Ticket Name: `F1.3 timelineService recovery test failure — stale source-regex assertion`
- Owner: unassigned — pending Product Owner/CTO prioritization.
- Governance Version: `V2 Active`
- Discovery authority: `ITR-F41-NB-02` (`F41-DASHBOARD-MINIMUM-01` Independent Technical Review, `docs/06_REVIEWS/Shared/F41-DASHBOARD-MINIMUM-01_CHECKPOINT_001.md` Section 7), originally registered together with the `DashboardController` failure under `F13-DASHBOARD-RECOVERY-DEFECTS-01` in that ticket's B1 ITR-remediation pass (2026-09-08); split into its own ticket same-day per governance correction below.
- Branch discovered on: `codex/da-impl-006`
- Governance correction (2026-09-09): originally combined with the `DashboardController` failure under `F13-DASHBOARD-RECOVERY-DEFECTS-01`, violating `CLAUDE.md`'s One Bug → One Ticket rule. Split into this standalone ticket; `F13-DASHBOARD-RECOVERY-DEFECTS-01` is narrowed to the `DashboardController` failure only (`docs/10_TICKETS/F13-DASHBOARD-RECOVERY-DEFECTS-01_MANIFEST.md`). No code was touched by the split.

## 2. Objective (for whoever activates this ticket)

`backend/src/services/timelineService.recovery.test.js:80` fails with a real, pre-existing F1.3-territory defect — not environmental, not related to F4.1/F41. It reproduces on every full backend sweep. This ticket exists only to record it so it is not lost or mischaracterized; it is explicitly out of scope for `F41-DASHBOARD-MINIMUM-01` and no F1.3 file was opened for edit to investigate or fix it.

## 3. Finding

**`backend/src/services/timelineService.recovery.test.js:80`** — `"monthly rank enrichment uses full prior months and latest-data current month without BCVH scope"` fails: a source-text regex assertion (`/const includeMonthlyNationalRank = Boolean\(options\.includeNationalRank\) && mode === 'month' && \(!ma_bcvh \|\| ma_bcvh === 'all'\)/`) no longer matches the current `backend/src/services/timelineService.js`, which commit `b075b96` (`fix(f13-dashboard): correct "Theo thứ" filter-context label to real 90-day window`, pre-dating `F41-DASHBOARD-MINIMUM-01`) edited. The test's source-text expectation is stale relative to that refactor; needs reconciliation between the test's expected source snippet and the current implementation.

## 4. Scope

Not scoped yet — activation, root-cause, and fix all require their own ticket per `CLAUDE.md`'s One Bug → One Ticket → One Commit rule. Out of scope for `F41-DASHBOARD-MINIMUM-01`: no F1.3 file (`timelineService.js` or `timelineService.recovery.test.js`) was modified to investigate or fix this.

## 5. Evidence

Reproduced directly, isolated from the rest of the sweep:

```
node --experimental-sqlite --test src/services/timelineService.recovery.test.js
# not ok 11 - monthly rank enrichment uses full prior months and latest-data current month without BCVH scope
#   AssertionError: source regex did not match current timelineService.js
```

Counted among the "4 pre-existing baseline failures" the project has referenced in prior tickets' evidence. The other three are: `DashboardController.recovery.test.js:11` — a separate, independent defect, registered as its own ticket `F13-DASHBOARD-RECOVERY-DEFECTS-01`; and `DashboardController.r6.integration.test.js` (`fetch failed` x2) — genuinely environmental (need a live HTTP server), not part of any ticket.

## 6. Next Step

Awaiting Product Owner/CTO decision to activate, prioritize, and scope this ticket. Not self-activated by this registration.
