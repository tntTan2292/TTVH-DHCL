# AUTO-IMPORT-004 Manifest

- Ticket ID: `AUTO-IMPORT-004`
- Ticket Name: `TCT Source Discovery and Nationwide Ranking Contract`
- Phase: `Auto Import / Smart Leadership Dashboard Implementation`
- Current state: `COMPLETED / PO PASS`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO UI Check Required: `No`
- PO Product Status: `PO PASS`
- Activation authority: Product Owner request `Activate a new governed Auto Import ticket for the TCT nationwide-ranking data source`
- Activation date: `2026-07-20`
- Implementation branch: `codex/auto-import-004`
- Prior ticket gates: `AUTO-IMPORT-003 COMPLETED / PO PASS`; `DA-IMPL-005 COMPLETED / PO PASS`
- Closure authority: Product Owner acceptance `AUTO-IMPORT-004 has received Product Owner PASS`
- Closure date: `2026-07-20`

## Objective

Discover and define the governed source contract for Tổng công ty/TCT nationwide F1.3 ranking data used by the Hue Dashboard national-rank card and related evidence paths.

## Approved Scope

- Identify the authoritative TCT source used for nationwide F1.3 ranking.
- Determine whether the source is portal download, API, report file, database feed, or another governed source.
- Inspect authentication and session requirements without exposing credentials, cookies, tokens, or session IDs.
- Document available source fields for province/unit identity, reporting date or period, volume, pass, fail, returned quantity, KPI/pass rate, nationwide rank, ranked population, and source update timestamp where available.
- Determine whether nationwide rank is supplied directly or must be calculated later.
- Determine ranking population, tie-handling rules, and data frequency where discoverable.
- Execute the Product Owner-authorized one-date TCT F1.3 controlled import for `2026-07-19` using the confirmed workbook/download flow and the existing national F1.3 destination contract.
- Map TCT data to existing Hue Dashboard requirements.
- Define the minimal import/evidence contract required for a later implementation checkpoint.
- Identify missing authority, SSOT conflicts, or Product Owner business decisions.

## Exclusions

- No TCT importer implementation in Checkpoint 001.
- No Dashboard UI changes.
- No KPI formula changes.
- No ranking-rule changes.
- No SSOT changes.
- No schema changes.
- No AUTO-IMPORT-002 or AUTO-IMPORT-003 behavior changes.
- No BCVH mapping changes.
- No Architecture Freeze changes.
- No unattended scheduling, queue persistence, or force replacement.
- No credential, cookie, token, or session persistence changes.
- No Product Owner UI acceptance or PO PASS activity.
- No automatic login, credential storage, Dashboard UI change, SSOT change, KPI formula change, or ranking-rule change in the controlled import validation.

## Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/10_TICKETS/AUTO-IMPORT-001_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-001_MANIFEST.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-001_SECURE_LOCAL_CREDENTIAL_SETUP.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-001_SECURE_LOCAL_CREDENTIAL_SETUP.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-001_DKCL_SYNC_ATOMIC_IMPORT_HANDOFF.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-001_DKCL_SYNC_ATOMIC_IMPORT_HANDOFF.md)
- [docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-002_HUE_F13_ACQUISITION_ENGINE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-002_HUE_F13_ACQUISITION_ENGINE.md)
- [docs/10_TICKETS/AUTO-IMPORT-003_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/AUTO-IMPORT-003_MANIFEST.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-003_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-003_PO_ACCEPTANCE_CHECKLIST.md)
- [docs/06_REVIEWS/Dashboard/DA-IMPL-002_UNIFIED_COMMAND_SUMMARY.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Dashboard/DA-IMPL-002_UNIFIED_COMMAND_SUMMARY.md)
- [backend/src/services/nationalExcelParser.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/nationalExcelParser.js)
- [backend/src/services/importPipeline.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/importPipeline.js)
- [backend/src/services/importProcessor.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/importProcessor.js)
- [backend/src/services/F13DashboardService.js](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/services/F13DashboardService.js)
- [backend/src/db/schema.sql](https://github.com/tntTan2292/TTVH-DHCL/blob/main/backend/src/db/schema.sql)
- [docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md)

## Checkpoints

### Checkpoint 001 - Source Discovery and Contract Definition

- Discover the current repository evidence for the TCT nationwide-ranking source.
- Inspect authentication/session requirements and account isolation.
- Inspect existing national parser, import pipeline, database table, and Dashboard national-rank consumer.
- Define available fields, unavailable fields, and prohibited inferred fields.
- Document ranking semantics currently used by the Dashboard and distinguish them from unconfirmed TCT source authority.
- Define the minimal import/evidence contract for a later implementation checkpoint.
- Evidence: `docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_001.md`.
- Status: `COMPLETED - DISCOVERY / CONTRACT DEFINED`.

### Checkpoint 002 - Proposed Narrow Vertical Slice

Activated by Product Owner for a live TCT source walkthrough and controlled F1.3 export/download discovery only.

- Scope executed: authorized TCT session, DKCL F1.3 module, GR `Tinh`, from/to `19/07/2026`, `Thong ke`, `Xuat toan bo`, green export-success notification, `Quan ly tep`, and identification of the generated F1.3 file-list record.
- Confirmed file-list record: `20-07-2026_15-08-23_F1.3_chat_luong_phat_buu_giay_lien_tinh(1).xlsx`, created `20/07/2026 - 15:08:24`, type `xlsx`.
- Evidence: `docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_002.md`.
- Reused implementation path: `backend/src/services/dkclHueF13PortalClient.js` (`launchPersistentContext`, `acceptDownloads`, `/files`, newest/exact row identification, `page.waitForEvent('download')`, `download.saveAs(targetPath)`).
- TCT configuration boundary: national/TCT account credentials from local environment, isolated profile `Data DKCL/BrowserProfiles/TCT`, temp download directory `portal-downloads/dkcl/tct/f13/checkpoint-002-temp`, module `F1.3`, GR `Tinh`, date `19/07/2026..19/07/2026`, matching filename pattern `F1.3_chat_luong_phat_buu_giay_lien_tinh`.
- Confirmed workbook: `xlsx`, size `10879` bytes, sheet `Worksheet`, range `A1:V39`, `39` rows, `22` columns, header row `1`, formula/index row `2`, three excluded source rows after SSOT filtering, and `34` ranked province/city rows.
- Confirmed field presence: province identity, volume, pass/PTC, fail/late/non-success fields, KPI/rate fields, and CH/returned quantity embedded in a combined column. No explicit source-supplied nationwide rank or total-ranked-unit columns were present.
- Local cleanup confirmed: workbook was deleted from the temp directory immediately after metadata inspection and the path no longer existed.
- Controlled import result: `F1.3-2026.07.19.xlsx` imported to `fact_f13_national` with `34` rows, `34` distinct units, `0` errors, `0` skipped, latest import log `SUCCESS`, and Hue rank `24/34`.
- Status: `COMPLETED - CONTROLLED IMPORT VALIDATED`.

### Checkpoint 003 - Proposed PO Check Preparation

- Proposed scope: prepare PO comparison evidence for the imported `2026-07-19` TCT nationwide rank, including the exact Dashboard module/filter, Hue rank/value evidence, import log, and database row-count checks.
- No Dashboard UI change, KPI/ranking-rule change, schema change, scheduling, or AUTO-IMPORT-002/003 behavior change unless separately activated.

## PO Acceptance Boundary

Codex may complete technical discovery and later implementation checkpoints, but must stop at `READY FOR PO CHECK` if a visible Product Owner verification path is introduced. Codex must not mark `PO PASS`.

## Evidence Locations

- Checkpoint 001 review: `docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_001.md`
- Checkpoint 002 review: `docs/06_REVIEWS/Import/AUTO-IMPORT-004_CHECKPOINT_002.md`
- PO acceptance: `docs/06_REVIEWS/Import/AUTO-IMPORT-004_PO_ACCEPTANCE.md`
- Manifest: `docs/10_TICKETS/AUTO-IMPORT-004_MANIFEST.md`
- Prior Auto Import evidence: `docs/06_REVIEWS/Import/`

## Final PO Acceptance

- AUTO-IMPORT-004 is `COMPLETED / PO PASS`.
- Accepted business date: `2026-07-19`.
- Ranked population: `34` provinces/cities according to SSOT.
- Hue volume: `2,399`.
- Hue pass: `1,261`.
- Hue KPI: `52.56%`.
- Hue nationwide rank: `24/34`.
- TCT workbook was downloaded, imported, and deleted successfully.
- Dashboard result was accepted by Product Owner.
- Known implementation boundary: the workbook does not contain explicit source-supplied rank or total-ranked-unit columns, so the existing accepted Dashboard rank contract calculates rank from the approved 34-unit population using `tl_ptc_dung_qd_ct DESC, sl_bg_ptc DESC`.
