# AUTO-IMPORT-005 Manifest

- Ticket ID: `AUTO-IMPORT-005`
- Ticket Name: `TCT Manual Backfill and Shared DKCL Background Operations`
- Phase: `Auto Import / Smart Leadership Dashboard Implementation`
- Current state: `COMPLETED / PO PASS`
- Technical Status: `COMPLETED`
- Runtime Status: `PO ACCEPTED`
- PO UI Check Required: `Yes`
- PO Product Status: `PO PASS`
- Activation authority: Product Owner request after `AUTO-IMPORT-004 PO PASS`
- Activation date: `2026-07-20`
- Implementation branch: `codex/auto-import-005`
- Prior ticket gates: `AUTO-IMPORT-004 COMPLETED / PO PASS`; `AUTO-IMPORT-003 COMPLETED / PO PASS`; `DA-IMPL-005 COMPLETED / PO PASS`
- PO acceptance decision: Product Owner accepted `AUTO-IMPORT-005 = PO PASS`.
- PO acceptance date: `2026-07-20`

## Objective

Implement a governed TCT F1.3 manual backfill workflow in Data Import Center while extracting/reusing one shared configurable DKCL browser/session/download workflow for Hue and TCT operations.

## Approved Scope

- Shared DKCL browser/session workflow for Hue and TCT.
- Interactive authentication mode only when no valid authenticated profile exists, the session is invalid/expired, or the operator explicitly requests re-authentication.
- Background operation mode for routine DKCL work when session preflight is valid.
- Strict profile separation for Hue and TCT.
- Profile locking to prevent simultaneous profile access and safe lock release after success, failure, stop, or abort.
- Session preflight before queue creation returning `SESSION_VALID`, `AUTHENTICATION_REQUIRED`, or `SESSION_CHECK_FAILED`.
- TCT F1.3 manual backfill section in Data Import Center with operator-selected date range scanning, coverage summary, missing/completed/existing/incomplete date lists, selectable missing or incomplete dates, Update, progress, evidence, graceful Stop, and eligible Retry.
- TCT F1.3 import for selected dates using DKCL module F1.3, GR `Tỉnh`, one business date per item, `Xuất toàn bộ`, green/success export state, `Quản lý tệp`, newest matching file download, workbook validation, approved 34-unit parser, national import contract, evidence logging, and temp workbook deletion.
- Sequential in-memory TCT queue with one active TCT queue at a time.
- Preserve existing Dashboard nationwide-rank contract.
- Dashboard source separation: Hue operational metrics continue to come from the Hue dataset; TCT national data is used only for nationwide population coverage and Hue national rank.
- Cumulative nationwide rank for a selected Dashboard date range uses the accepted 34-unit TCT national population, cumulative volume, cumulative pass, cumulative pass rate, then volume tie-breaker; no daily-rank or daily-KPI averaging.

## Exclusions

- No unattended scheduling.
- No automatic import of all missing dates without operator selection.
- No credential storage.
- No automatic login using stored credentials.
- No SSOT changes.
- No KPI formula changes.
- No ranking-rule changes.
- No change to the 34-unit ranked population.
- No Dashboard UI changes except narrowly required Data Import Center TCT controls and session status.
- No BCVH mapping changes.
- No TCT schema changes unless a narrowly compatible extension is technically required.
- No broad Dashboard redesign.
- No future Nationwide Analysis module in this ticket.
- No Product Owner UI acceptance testing by Codex.
- No PO PASS by Codex.

## Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-002_HUE_F13_ACQUISITION_ENGINE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-002_HUE_F13_ACQUISITION_ENGINE.md)
- [docs/10_TICKETS/AUTO-IMPORT-003_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-003_MANIFEST.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-003_CHECKPOINT_002.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-003_CHECKPOINT_002.md)
- [docs/10_TICKETS/AUTO-IMPORT-004_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-004_MANIFEST.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_001.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_001.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_002.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_002.md)
- [backend/src/services/dkclHueF13PortalClient.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/dkclHueF13PortalClient.js)
- [backend/src/services/dkclHueF13SyncService.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/dkclHueF13SyncService.js)
- [backend/src/services/dkclHueF13BackfillService.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/dkclHueF13BackfillService.js)
- [backend/src/services/nationalExcelParser.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/nationalExcelParser.js)
- [backend/src/services/importPipeline.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/importPipeline.js)
- [backend/src/services/importProcessor.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/importProcessor.js)
- [frontend/src/pages/DataImportCenter.jsx](https://github.com/tntTan2292/TTVH-DHCL/blob/main/frontend/src/pages/DataImportCenter.jsx)
- [docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md)

## Checkpoints

### Checkpoint 001 - Discovery and Contract Definition

- Define shared Hue/TCT portal components.
- Define interactive/background browser lifecycle.
- Define profile separation and locking.
- Define TCT coverage-summary and missing-date contracts.
- Define Data Import Center TCT UI contract.
- Define queue/state/API contracts.
- Define authentication preflight.
- Define duplicate/completed-date rules.
- Define workbook lifecycle and deletion rules.
- Define evidence contract.
- Define fallback behavior if a portal action cannot run headlessly.
- Define narrowest Checkpoint 002 vertical slice.
- Evidence: `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_001.md`.
- Status: `COMPLETED - DISCOVERY / CONTRACT DEFINED`.

### Checkpoint 002 - Proposed Vertical Slice

- Implement shared configurable DKCL session preflight and background download adapter without changing Hue business behavior.
- Add TCT coverage summary and missing-date scan APIs.
- Add the smallest Data Import Center TCT section that scans an operator-selected date range and displays selectable missing dates.
- Add focused tests for session preflight, profile lock separation, TCT coverage/missing-date scan, and no Hue regression.
- Do not implement full TCT queue/import until the shared workflow and scan contract are technically accepted.
- Evidence: `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_002.md`.
- Status: `COMPLETED - TECHNICAL PASS`.

### Checkpoint 003 - TCT Manual Backfill Execution Slice

- Enable TCT `Update` only for operator-selected dates currently returned as `MISSING` or `INCOMPLETE`.
- Reject duplicate dates, completed dates, and force replacement of true `COMPLETE` 34/34 datasets.
- Allow controlled re-import of `INCOMPLETE` dates, including `0/34` with stale evidence, through the existing atomic national import transaction while preserving audit history; operator action label: `Xử lý lại`.
- Implement one active in-memory TCT queue at a time.
- Process selected dates sequentially in ascending business-date order.
- Support queue/item states `QUEUED`, `RUNNING`, `SUCCESS`, `FAILED`, `AUTHENTICATION_REQUIRED`, `STOPPED`, `SKIPPED`.
- Add status, progress, graceful Stop, and eligible Retry contracts.
- Validate TCT DKCL session before queue creation.
- Reject queue creation before `RUNNING` when TCT authentication is invalid or session check fails.
- Support an explicit interactive TCT re-authentication action; do not store credentials or perform automatic credential-based login.
- Run the shared DKCL portal workflow in background mode when the TCT session is valid.
- Validate workbook structure, parse exactly the SSOT-approved 34 ranked units, import through the existing national F1.3 contract, and delete temporary workbooks after success or failure.
- Expose per-date evidence including business date, queue/run IDs, timestamps, downloaded filename, workbook/parsed/imported counts, Hue values/rank, total ranked population, success/error evidence, error code/message, and temp-file deletion confirmation.
- Evidence: `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_003.md`.
- Status: `IMPLEMENTED - TECHNICAL VALIDATION IN PROGRESS`.

## PO Acceptance Boundary

Product Owner accepted `AUTO-IMPORT-005 = PO PASS` on `2026-07-20`.

Accepted result:

- TCT F1.3 manual backfill workflow: `PASS`.
- TCT session preflight and explicit re-authentication action: `PASS`.
- Missing/incomplete/completed date classification and controlled re-import: `PASS`.
- Sequential in-memory queue, graceful Stop, and eligible Retry: `PASS`.
- Source separation: Hue operational metrics remain Hue-source; TCT national data is rank-only: `PASS`.
- Cumulative nationwide ranking for selected date ranges: `PASS`.

Codex must not mark any future ticket `PO PASS` without a new Product Owner decision.

## Evidence Locations

- Checkpoint 001 review: `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_001.md`
- Checkpoint 002 review: `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_002.md`
- Checkpoint 003 review: `docs/06_REVIEWS/Import/AUTO-IMPORT-005_CHECKPOINT_003.md`
- Future technical review evidence: `docs/06_REVIEWS/Import/`
- Manifest: `docs/10_TICKETS/AUTO-IMPORT-005_MANIFEST.md`

## Current Blockers

- AUTO-IMPORT-005 has no open Product Owner business, SSOT, KPI, ranking, population, or scope blocker.
- Next-ticket activation blocker: this manifest does not contain a direct authoritative next-ticket handoff or roadmap reference. A next ticket must not be activated from assumption.
