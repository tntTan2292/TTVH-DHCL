# IMPORT-BULK-REIMPORT-ALL-01 Manifest

Status: `DISCOVERY / READ-ONLY AUDIT COMPLETE (2026-09-21)`; `DISCOVERED / NOT ACTIVATED` for design or implementation. Registered 2026-09-15. See Section 6 for the completed audit; no design, implementation, queue action, or data reimport is authorized.

## 1. Ticket Information

- Ticket ID: `IMPORT-BULK-REIMPORT-ALL-01`
- Ticket Name: `Import — Chọn tất cả để tái nhập hàng loạt`
- Owner: unassigned — pending Product Owner/CTO activation.
- Governance Version: `V2 Active`
- Registration authority: Product Owner instruction received in chat, 2026-09-15.
- Branch registered on: `codex/da-impl-006`
- Baseline commit: `425ed1c`

## 2. Objective

Preserve the existing action **“Chọn tất cả chưa hoàn tất”** and add a separate **“Chọn tất cả”** action that can include records already imported successfully, so the Product Owner can intentionally reimport them in bulk.

This objective is registered only. No behavior is approved until a read-only audit establishes the exact operational contract.

## 3. Mandatory Audit Before Any Implementation

A future, separately activated read-only audit must determine and evidence:

1. **Selection scope** — which visible/filtered dates, indicators, sources, pages, statuses, and holiday/exclusion states each bulk action selects; “Chọn tất cả chưa hoàn tất” must remain unchanged.
2. **Queue and dedup behavior** — how selected records map to runs/jobs, how active or duplicate identities are handled, whether successful historical jobs can be selected safely, and how partial enqueue failures are reported.
3. **Reimport rules** — whether successful data is replaced, overwritten, skipped, or versioned; transaction boundaries; idempotency; import-log/evidence behavior; and protection against duplicate or concurrent execution.
4. **Confirmation warning** — a distinct confirmation step before enqueue that states the exact count/scope and clearly warns that already-successful imports are included and may be replaced.
5. **Safety and authorization** — interaction with Auto-Backfill runtime states, manual authentication/Resume, circuit/safety controls, calendar exclusions, permissions, and recovery/cancellation constraints.

The audit must trace the current frontend selection logic, backend queue/run creation, active-identity dedup, completion policy, per-row reimport path, and real database state read-only. It must not infer a new business rule.

## 4. Explicitly Out of Scope at Registration

- Any frontend/backend code, test, schema, migration, database, queue, or runtime change.
- Any actual selection, enqueue, reimport, Resume, Retry, cancellation, or business-data write.
- Any change to KPI definitions or frozen SSOT.
- Activation of this ticket by progress or closure of another ticket.
- Any change to the active `F13-BCVH-MONTHLY-CUMULATIVE-01` audit, `F13-ROUTE-POSTMAN-IDENTITY-01`, or paused `F41-DASHBOARD-MINIMUM-01`.

## 5. Next Step

Await explicit Product Owner/CTO activation for **DISCOVERY / READ-ONLY AUDIT**. The executor must return findings and a proposed contract to the Product Owner before any design or implementation is authorized. This registration does not self-activate the audit.

## 6. Discovery / Read-Only Audit — Completed (2026-09-21, Claude Code/Sonnet 5)

Product Owner instruction received in chat (2026-09-21) explicitly authorized starting the audit named in Section 5. Executor read commit `dfcefb850f2869b4dfec6285bb58fe772f7bfcc4` on `codex/da-impl-006`, static code only, read-only — no code, test, schema, or database changed; no Browser/Playwright/web automation used; no import, enqueue, Resume, Retry, cancellation, or business-data write performed. Full findings, file:line evidence, gaps/risks, and discovery-level contract observations: `docs/06_REVIEWS/Import/IMPORT-BULK-REIMPORT-ALL-01_CHECKPOINT_001.md`.

Headline finding: no code path in the current system can overwrite an already-successfully-imported (`COMPLETED`) date — the block is enforced independently at the coverage-eligibility layer (`ALREADY_SUCCESS`), the `createRun` `include_excluded` opt-in (which only re-admits `EXCLUDED` days, never `COMPLETED`), and every current Auto-Backfill executor's hard-coded `forceReimport:false` into the underlying import services. Delivering this ticket's objective therefore requires a new, explicit backend contract at all three layers, plus a still-unestablished trace of `importProcessor.js`'s actual row-level overwrite behavior, before any design can be written. Holiday (`LỊCH NGHỈ`) exclusion is confirmed enforced entirely server-side, upstream of every selection path (`scan()`/`selectable()`), and requires no new work to preserve.

Status: `DISCOVERY / READ-ONLY AUDIT COMPLETE`. This ticket remains `DISCOVERED / NOT ACTIVATED` for design or implementation. Next step unchanged from Section 5's intent: the Product Owner must review the checkpoint's Section 7 discovery-level contract observations and Section 6 gaps before any design/implementation activation.

## 7. Full Pipeline Trace — Gap 4 Closed (2026-09-21, Claude Code/Sonnet 5)

Product Owner instruction received in chat explicitly requested completing the audit with a full trace: `AutoBackfillOperatorPanel.jsx → API → autoBackfillQueueService/Store → executor/adapter → import service/importProcessor → database transaction → import log/evidence`. Still read-only, same commit `dfcefb850f2869b4dfec6285bb58fe772f7bfcc4`. Full findings with file:line citations: `docs/06_REVIEWS/Import/IMPORT-BULK-REIMPORT-ALL-01_CHECKPOINT_001.md` Sections 9-11.

Gap 4 (Section 6's checkpoint reference) is now closed with evidence: `forceReimport:true` in `backend/src/services/importProcessor.js` performs an unconditional `DELETE FROM <fact_table> WHERE ngay_do_kiem=?` followed by batched `INSERT OR IGNORE`, inside one `BEGIN TRANSACTION`/`COMMIT` — a delete-then-insert replace, not an upsert or a versioned scheme, matching the source's own SSOT comment. This is confirmed **unreachable from `AutoBackfillOperatorPanel.jsx`**: every Auto-Backfill executor (F1.3 HUE/TCT, F4.1 HUE/TCT) hard-codes `forceReimport:false`/`refreshRequested:false` all the way down to `importPipeline.js`'s `executeImport()`, so a `COMPLETED` date's file is always returned as `requiresConfirmation` without any write. The only place `forceReimport:true` is reachable from is `POST /import/upload` (`importController.js:104-111`, `source:'MANUAL'`) — the manual `DataImportCenter.jsx`-style upload path, structurally and permanently separate from the audited panel (grep-confirmed: `AutoBackfillOperatorPanel.jsx` never calls `/import/upload`).

New scope-relevant fact surfaced (recorded as Checkpoint Gap 7, not a business-rule decision): the `forceReimport` delete is scoped by `ngay_do_kiem` only, not by `source_lane` — if a future "reimport a completed day" contract reuses this mechanism as-is, it would delete a date's committed rows from every lane, not just the lane being reimported. This needs an explicit Product Owner decision before any design.

Also confirmed at the current commit: no run/job cancellation endpoint exists anywhere in the codebase (only a manual-DKCL-login `cancel-login` endpoint, unrelated) — consistent with the same finding already on record in `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`'s `AUTO-BACKFILL-RUNTIME` backlog-investigation entry (2026-08-20).

Status: `DISCOVERY / READ-ONLY AUDIT COMPLETE (full pipeline trace closed)`. This ticket remains `DISCOVERED / NOT ACTIVATED` for design or implementation. No new business rule was decided; the Product Owner must still resolve the confirmation-warning design, the selection-state design, the `forceReimport` lane-scope question, and the shared-selection-state question (Checkpoint Section 6 gaps 1-3/5-6 and Section 10 gap 7) before any implementation activation.
