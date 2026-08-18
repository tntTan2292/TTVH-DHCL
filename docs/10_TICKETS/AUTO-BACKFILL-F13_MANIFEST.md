# AUTO-BACKFILL-F13 Manifest

Status: `IMPLEMENTED / READY FOR PO GATE 3` (2026-08-18).

## 1. Ticket Information

- Ticket ID: `AUTO-BACKFILL-F13`
- Phase: `Shared Auto Backfill - Verified F1.3 Portal Adapters`
- Executor: `Codex`, explicitly authorized by the Product Owner for this ticket only
- Branch: `codex/da-impl-006`
- Baseline: `64e9a8550752ef5fc6723dadc9d05d9cda442327`
- Activation authority: `PO AUTO-BACKFILL-QUEUE GATE 2 PASS and authorizes AUTO-BACKFILL-F13 only`
- Initial worktree: no tracked changes; only excluded untracked `.claude/` and `Data QLML/`

## 2. Objective

Wrap the already verified F1.3 HUE and TCT single-date acquisition/import operations as two separate verified adapters for the shared persistent Auto Backfill platform. Preserve every accepted Portal, session, source-lock, filename, parser, Import and completion rule; do not route shared execution through either legacy multi-date in-memory queue.

## 3. Required Reading

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Import/AUTO-BACKFILL-PLAN_CHECKPOINT_001.md`, especially Sections 10, 11.3 and 12
- `docs/10_TICKETS/AUTO-BACKFILL-QUEUE_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-BACKFILL-QUEUE_CHECKPOINT_001.md`
- `backend/src/services/importIndicatorRegistry.js`
- `backend/src/services/autoBackfillQueueRuntime.js`
- `backend/src/services/dkclHueF13SyncService.js`
- `backend/src/services/dkclHueF13BackfillService.js`
- `backend/src/services/tctF13BackfillService.js`
- `backend/src/services/dkclSessionCoordinator.js`
- `backend/src/services/dkclSessionPreflightService.js`
- `backend/src/services/importPipeline.js`

## 4. In Scope

- Separate verified F1.3/HUE and F1.3/TCT adapter identities implementing one-date execution.
- Reuse of accepted source report identity, manual session/profile, navigation/filter/export, source operation lock, filename rule, parser and Import pipeline.
- Normalized authentication-required propagation without Safety retry/circuit behavior.
- Runtime registration of both adapters before coordinator startup/drain.
- Switch only F1.3 HUE/TCT shared registry lanes from `MANUAL_ONLY` to `AUTOMATED`.
- Isolated fake/mocked acceptance and full Queue/Coverage/F1.3/F4.1 regression proof.
- Append-only governance and Gate 3 handoff.

## 5. Out Of Scope

- Real Portal session, download, Import, business-data or Data DKCL operation.
- Any F4.1 adapter or change to F4.1 `MANUAL_ONLY` state.
- Retry/backoff, circuit breaker, full Safety reporting, frontend/UI or Runtime acceptance.
- Changes to legacy F1.3 manual Import/backfill API behavior.
- Activation of AUTO-BACKFILL-F41, SAFETY, UI, RUNTIME or unrelated work.

## 6. Locked Contracts

- Adapter input is exactly indicator, source lane and one business date.
- No adapter starts or nests a legacy multi-date queue.
- Shared queue completion recheck remains before executor invocation; SUCCESS is never forced or overwritten.
- Existing verified report identities/selectors and acquisition workflow are reused, never inferred or redesigned.
- Existing manual interactive HUE/TCT sessions, preflight and per-source operation locks remain mandatory.
- Successful work passes through the existing Import pipeline and must satisfy facts + exact Import evidence + Processed artifact completion.
- Authentication loss returns the approved `AUTHENTICATION_REQUIRED` adapter contract and does not invent retry/circuit behavior.
- SQLite shared queue lease remains the global concurrency authority.

## 7. Mandatory Validation

- One exact date per HUE/TCT adapter; correct report/session/source lock; no legacy queue start.
- SUCCESS precheck skips Portal and Import.
- Fake download flows through the existing Import pipeline and satisfies exact completion.
- Authentication-required propagation stops later shared work under the bounded adapter contract.
- HUE/TCT global-lease exclusion; registration before coordinator start; persisted restart executor resolution.
- F4.1 remains manual-only with zero executable jobs.
- Queue/Coverage acceptance and existing F1.3/F4.1 regressions remain PASS.
- Scope, staged files, worktree and operational-data safety checks.

## 8. PO Gate 3

Required stop: `AUTO-BACKFILL-F13 IMPLEMENTED / READY FOR PO GATE 3`.

Gate 3 must confirm both adapter contracts, existing F1.3 workflow preservation, no SUCCESS overwrite path and no real execution. No successor ticket is activated by technical completion.

## 9. Implementation Handoff

Status: `AUTO-BACKFILL-F13 IMPLEMENTED / READY FOR PO GATE 3` (2026-08-18).

Delivered:

- Added one authoritative F1.3 adapter-identity contract with separate verified HUE detail and TCT summary identities copied from the accepted live flows.
- Added shared-queue executors that accept only `F1.3 × HUE/TCT × one ISO business date`, require preflight plus the existing interactive client, hold the existing per-source operation lock/marker, and call only the existing bounded one-date operations.
- HUE waits for its accepted asynchronous single-date sync to reach a terminal result. TCT receives the already-owned interactive client in its existing `runOneDateImport`; neither shared adapter creates or invokes a legacy multi-date queue.
- Runtime registers both verified executors before Queue service/coordinator construction. F1.3 HUE/TCT are now `AUTOMATED`; F4.1 HUE/TCT remain unchanged `MANUAL_ONLY` with no Portal adapter.
- Queue completion remains authoritative before executor invocation and after execution. Shared adapters hard-code refresh/force to false; an external SUCCESS is `SKIPPED_ALREADY_SUCCESS` before Portal or Import access.
- `AUTHENTICATION_REQUIRED` propagates unchanged and makes the coordinator dormant until a later explicit wake; no retry, backoff or circuit behavior was introduced.

Validation summary:

- Focused F1.3 adapter/registration/restart/global-lease/auth/SUCCESS-skip/F4.1-manual tests: `7/7 PASS`.
- Combined Coverage + F1.3 adapter + Queue + controller acceptance: `43/43 PASS`.
- HUE verified acquisition/Import fake suite: `135/135 PASS`; HUE legacy backfill: `39/39 PASS`; TCT legacy backfill: PASS.
- F1.3 Import processor: `59/59 PASS`; race/atomic pipeline: `41/41 PASS`; Import E2E: `65/65 PASS`.
- F4.1 parser/Import/migration regression: `19/19 PASS`. Import and migration writes used isolated temporary databases/directories; the two existing source-reconciliation parser checks are read-only and performed no business-data mutation.

No frontend, schema, Portal selector, browser/login flow, retry/circuit runtime, F4.1 adapter or successor ticket was implemented. No real Portal session, download, queue run or Import was started.

## 10. Gate 3 Stop

`AUTO-BACKFILL-F13 IMPLEMENTED / READY FOR PO GATE 3`

`AUTO-BACKFILL-F41`, `AUTO-BACKFILL-SAFETY`, `AUTO-BACKFILL-UI` and `AUTO-BACKFILL-RUNTIME` remain unauthorized and inactive.

## 11. PO Gate 3 PASS And F41 Activation

On `2026-08-18`, the Product Owner granted `AUTO-BACKFILL-F13 GATE 3 PASS` and explicitly authorized `AUTO-BACKFILL-F41` only from baseline `5a2cf358e68baa0ae6f7ae1f22814f535b564fb9`.

F13 closes `COMPLETED / PO GATE 3 PASS`. Its two verified adapters, completion recheck, authentication contract and shared-lease behavior remain authoritative. F41 begins discovery-first with HUE and TCT independently gated; no later ticket is active.
