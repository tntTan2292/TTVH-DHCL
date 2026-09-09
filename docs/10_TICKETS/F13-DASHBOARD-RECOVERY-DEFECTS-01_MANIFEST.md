# F13-DASHBOARD-RECOVERY-DEFECTS-01 Manifest

Status: `DISCOVERED / NOT ACTIVATED (2026-09-08)`. Registration only — no code was changed by this ticket, and no fix is authorized yet.

## 1. Ticket Information

- Ticket ID: `F13-DASHBOARD-RECOVERY-DEFECTS-01`
- Ticket Name: `F1.3 DashboardController recovery test failure — real KPI aggregate-count defect`
- Owner: unassigned — pending Product Owner/CTO prioritization.
- Governance Version: `V2 Active`
- Discovery authority: `ITR-F41-NB-02` (`F41-DASHBOARD-MINIMUM-01` Independent Technical Review, `docs/06_REVIEWS/Shared/F41-DASHBOARD-MINIMUM-01_CHECKPOINT_001.md` Section 7), remediated (registered, not fixed) in that ticket's B1 ITR-remediation pass.
- Branch discovered on: `codex/da-impl-006`
- Governance correction (2026-09-09): this ticket originally combined two independent test failures (`DashboardController.recovery.test.js` and `timelineService.recovery.test.js`), violating `CLAUDE.md`'s One Bug → One Ticket rule. Split same-day: this ticket is narrowed to the `DashboardController` failure only; the `timelineService` failure is now its own ticket, `docs/10_TICKETS/F13-TIMELINE-RECOVERY-DEFECT-01_MANIFEST.md`. No code was touched by the split.

## 2. Objective (for whoever activates this ticket)

`backend/src/controllers/DashboardController.recovery.test.js:11` fails with a real, pre-existing F1.3-territory assertion defect — not environmental, not related to F4.1/F41. It reproduces on every full backend sweep. This ticket exists only to record it so it is not lost or mischaracterized; it is explicitly out of scope for `F41-DASHBOARD-MINIMUM-01` and no F1.3 file was opened for edit to investigate or fix it.

## 3. Finding

**`backend/src/controllers/DashboardController.recovery.test.js:11`** — `"KPI all and missing ma_bcvh normalize to aggregate null and never pass all to SQL"` fails: `assert.equal(calls[0].filters.bcvhId, ...)`-style aggregate-count assertion expects `3`, gets `12`. This is a real assertion failure (`ERR_ASSERTION`, `12 !== 3`), not a wiring/environment issue — needs root-cause investigation into why the aggregate SQL call count observed by the test is `12` instead of the expected `3`.

## 4. Scope

Not scoped yet — activation, root-cause, and fix all require their own ticket per `CLAUDE.md`'s One Bug → One Ticket → One Commit rule. Out of scope for `F41-DASHBOARD-MINIMUM-01`: no F1.3 file (`DashboardController.js` or `DashboardController.recovery.test.js`) was modified to investigate or fix this.

## 5. Evidence

Reproduced directly, isolated from the rest of the sweep:

```
node --experimental-sqlite --test src/controllers/DashboardController.recovery.test.js
# not ok 1 - KPI all and missing ma_bcvh normalize to aggregate null and never pass all to SQL
#   AssertionError: Expected values to be strictly equal: 12 !== 3
```

Counted among the "4 pre-existing baseline failures" the project has referenced in prior tickets' evidence. The other three are: `timelineService.recovery.test.js:80` — a separate, independent defect, now registered as its own ticket `F13-TIMELINE-RECOVERY-DEFECT-01`; and `DashboardController.r6.integration.test.js` (`fetch failed` x2) — genuinely environmental (need a live HTTP server), not part of any ticket.

## 6. Next Step

Awaiting Product Owner/CTO decision to activate, prioritize, and scope this ticket. Not self-activated by this registration.
