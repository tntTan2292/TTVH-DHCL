# AUTO-IMPORT-005 Checkpoint 001

- Ticket: `AUTO-IMPORT-005 TCT Manual Backfill and Shared DKCL Background Operations`
- Status: `ACTIVE / IMPLEMENTATION`
- Checkpoint status: `COMPLETED - DISCOVERY / CONTRACT DEFINED`
- Branch: `codex/auto-import-005`
- Date: `2026-07-20`

## Activation Result

AUTO-IMPORT-004 is closed as `COMPLETED / PO PASS`.

AUTO-IMPORT-005 is activated as `ACTIVE / IMPLEMENTATION` under Product Owner authority. Current active ticket is `AUTO-IMPORT-005`; implementation branch is `codex/auto-import-005`.

## Sources Inspected

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-002_HUE_F13_ACQUISITION_ENGINE.md`
- `docs/10_TICKETS/AUTO-IMPORT-003_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-003_CHECKPOINT_002.md`
- `docs/10_TICKETS/AUTO-IMPORT-004_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_001.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_002.md`
- `backend/src/services/dkclHueF13PortalClient.js`
- `backend/src/services/dkclHueF13SyncService.js`
- `backend/src/services/dkclHueF13BackfillService.js`
- `backend/src/services/nationalExcelParser.js`
- `backend/src/services/importPipeline.js`
- `backend/src/services/importProcessor.js`
- `frontend/src/pages/DataImportCenter.jsx`

## Authoritative Scope

Build a TCT F1.3 manual backfill workflow equivalent to the completed Hue manual backfill workflow, but backed by one shared configurable DKCL browser/session/download workflow. The TCT workflow must preserve the accepted AUTO-IMPORT-004 national ranking contract: 34 ranked province/city rows, rank by `tl_ptc_dung_qd_ct DESC` then `sl_bg_ptc DESC`, no shared-tie grouping.

## Shared Hue/TCT Portal Contract

Reusable component boundary:

| Component Concern | Existing Source | AUTO-IMPORT-005 Contract |
| --- | --- | --- |
| Browser/session launch | `DkclHueF13PortalClient.authenticate` | Extract or adapt into a configurable DKCL portal client. |
| Persistent profile | Hue profile in `Data DKCL/BrowserProfiles/HUE`; TCT profile proven in AUTO-IMPORT-004 | Keep strict profile separation: `HUE` and `TCT`. |
| Profile lock | Existing `.lock` directory guard | Reuse for both sources; reject concurrent profile access; release in `finally`. |
| File manager | `page.goto(/files)` and table row projection | Reuse for Hue/TCT with configurable filename/description match. |
| Download | Playwright `page.waitForEvent('download')` and `download.saveAs(targetPath)` | Single primary download path; do not use browser-only download handoff as primary. |
| Portal filters | Hue uses `BC`/province `53`; TCT uses `Tinh`/all province | Use source-specific config for group, province/default filters, dates, and module path. |
| Parser/importer | Hue detail parser/import; TCT national parser/import | Configure parser/importer per source without duplicate engines. |

Interactive authentication mode:

- Open a visible browser only when no valid authenticated profile exists, session preflight returns invalid/expired, or operator explicitly requests re-authentication.
- Product Owner/operator enters credentials manually.
- System must not read, store, log, or expose username/password, cookies, tokens, CSRF, session IDs, or browser storage.
- Persist only the approved authenticated browser profile/session.
- After successful interactive login, verify the session and return future operations to background mode.

Background operation mode:

- Run headless/background when session preflight is valid.
- Reuse the existing persistent profile for the selected source.
- Never share Hue and TCT profiles.
- Acquire lock before profile use and release lock after success, failure, graceful stop, or abort.
- If a portal action cannot run headlessly, fail the item/queue with an operator-safe reason and require interactive authentication or manual review; do not silently open a hidden login page.

Authentication preflight:

`POST /api/import/dkcl/session/preflight` or source-specific equivalent should accept `source = HUE | TCT` and return:

- `SESSION_VALID`: queue creation may proceed.
- `AUTHENTICATION_REQUIRED`: reject queue creation before `RUNNING`; show re-authentication action.
- `SESSION_CHECK_FAILED`: reject queue creation before `RUNNING`; show concise operator message and safe error code.

No automatic credential-based login is approved.

## TCT Coverage and Missing-Date Contract

Coverage source: `fact_f13_national` and `import_log`.

Coverage summary response should include:

- `source = TCT`
- `indicator = F1.3`
- `first_business_date`
- `last_business_date`
- `available_years`
- `available_months`
- `imported_dates_count`
- `latest_successful_import`
- selected range context when provided
- existing/completed/missing dates for selected scan range

Completed date rule:

- A date is completed only when `fact_f13_national` has exactly `34` distinct ranked `ma_tinh_phat` rows for the business date and there is successful import evidence for that date.
- Dates with partial rows, failed logs, missing processed evidence, or count mismatch require non-selectable manual review.

Missing-date scan:

- Operator supplies `from_date` and `to_date`.
- Do not predefine or automatically choose the range.
- Enumerate inclusive date range.
- Existing/completed dates are displayed but disabled.
- Missing dates are selectable.
- Partial/manual-review dates are visible but not selectable.

## Data Import Center TCT UI Contract

Add a TCT section in Data Import Center parallel to the accepted Hue section:

- Source/session status panel for TCT.
- Date inputs: `Từ ngày`, `Đến ngày`.
- `Quét` action.
- Coverage summary above selection.
- Lists/counts for existing dates, completed dates, missing dates, and manual-review dates.
- Selectable missing-date rows.
- `Update` action enabled only when at least one selectable missing date is selected and TCT session preflight is valid.
- Queue progress panel with queue status, item statuses, and evidence.
- Graceful `Stop`.
- `Retry` only on `FAILED` or `AUTHENTICATION_REQUIRED`.
- Clear notice: active queue state is in memory and can be cleared by backend restart.

No Dashboard UI changes are authorized.

## Queue and API Contract

Only one active TCT queue may exist at a time. Process selected dates sequentially in ascending date order.

Required queue/item states:

- `QUEUED`
- `RUNNING`
- `SUCCESS`
- `FAILED`
- `AUTHENTICATION_REQUIRED`
- `STOPPED`
- `SKIPPED`
- `MANUAL_REVIEW_REQUIRED`

API candidates:

| API | Purpose |
| --- | --- |
| `GET /api/import/dkcl/tct/f13/coverage-summary` | Return TCT national coverage and optional selected-range summary. |
| `GET /api/import/dkcl/tct/f13/missing-dates` | Scan operator-selected date range. |
| `POST /api/import/dkcl/tct/f13/backfill` | Create a TCT queue after session preflight and date validation. |
| `GET /api/import/dkcl/tct/f13/backfill/active` | Restore active in-memory queue view after frontend refresh. |
| `GET /api/import/dkcl/tct/f13/backfill/:queueId` | Return queue and item status/evidence. |
| `POST /api/import/dkcl/tct/f13/backfill/:queueId/stop` | Graceful stop. |
| `POST /api/import/dkcl/tct/f13/backfill/:queueId/retry` | Retry eligible failed/authentication-required item. |
| `POST /api/import/dkcl/session/preflight` | Shared session preflight for `HUE` or `TCT`. |

Validation rules:

- Reject duplicate dates in submitted selection.
- Reject dates already completed.
- Reject dates duplicated with an active queue.
- Reject queue creation when another TCT queue is active.
- Reject queue creation before `RUNNING` if TCT session preflight is not `SESSION_VALID`.
- Do not force-replace completed data.
- Stop is graceful: allow current one-date item to finish safely and prevent remaining queued dates from starting.
- Successful items cannot be retried.

## TCT Workbook Lifecycle Contract

For each queue item:

1. Use TCT authenticated profile.
2. Open DKCL F1.3 module.
3. Apply `GR = Tỉnh`, `From date = selected date`, `To date = selected date`.
4. Click `Thống kê`.
5. Click `Xuất toàn bộ`.
6. Wait for successful export state.
7. Open `Quản lý tệp`.
8. Identify newest matching F1.3 file.
9. Download with the shared Playwright workflow.
10. Save only in the approved temporary directory.
11. Validate workbook type, sheet, header, columns, and row contract.
12. Parse exactly the approved 34-unit population.
13. Import into `fact_f13_national` through the existing national import contract.
14. Record evidence.
15. Delete temporary workbook after success, failure, or safe abort.
16. Verify deletion.

## Evidence Contract

Queue evidence:

- queue ID
- source `TCT`
- run ID / item ID
- business date
- start/end timestamps
- queue state and item state
- session preflight result
- generated portal filename
- downloaded filename
- workbook size
- workbook sheet names
- workbook row/column counts
- parsed ranked row count
- excluded rows and reasons
- imported database row count
- distinct ranked unit count
- Hue values and rank when available
- import log ID/status/counts
- processed file path
- temp cleanup result
- safe error code/message

No credentials, cookies, tokens, CSRF values, session IDs, browser storage, or secrets may be logged or included in evidence.

## Narrowest Checkpoint 002 Vertical Slice

Implement shared session preflight and TCT missing-date discovery only:

- Extract/adapt shared DKCL session preflight with source config for Hue/TCT.
- Keep existing Hue AUTO-IMPORT-002/003 behavior passing.
- Add TCT coverage-summary API.
- Add TCT missing-date scan API.
- Add the Data Import Center TCT section showing session status, coverage, scan results, and selectable missing dates.
- Do not start TCT queue/import in Checkpoint 002 unless separately approved after the scan/preflight slice is validated.

## Risks and Gaps

- Some DKCL portal actions may not run reliably headlessly; fallback must be explicit interactive authentication or safe failure, not hidden login continuation.
- TCT active queue state may remain in memory for this ticket; restart recovery is intentionally not implemented.
- The existing national import table does not store source rank because the workbook does not provide it; Dashboard rank remains calculated from accepted rows and ordering.

## Blockers

No genuine Product Owner business, SSOT, KPI, ranking, population, or scope blocker is open for Checkpoint 001.
