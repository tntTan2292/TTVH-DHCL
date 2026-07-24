# AUTO-IMPORT-004 Checkpoint 001

- Ticket: `AUTO-IMPORT-004`
- Name: `TCT Source Discovery and Nationwide Ranking Contract`
- Branch: `codex/auto-import-004`
- Status: `COMPLETED - DISCOVERY / CONTRACT DEFINED`
- Date: `2026-07-20`

## Activation Result

AUTO-IMPORT-004 is activated as `ACTIVE / IMPLEMENTATION` under Product Owner authority.

Confirmed gates:

- `AUTO-IMPORT-003 = COMPLETED / PO PASS`.
- `DA-IMPL-005 = COMPLETED / PO PASS`.

## Sources Inspected

Governance and prior evidence:

- `README_AI.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/10_TICKETS/AUTO-IMPORT-001_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-001_SECURE_LOCAL_CREDENTIAL_SETUP.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-001_DKCL_SYNC_ATOMIC_IMPORT_HANDOFF.md`
- `docs/10_TICKETS/AUTO-IMPORT-002_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-002_HUE_F13_ACQUISITION_ENGINE.md`
- `docs/10_TICKETS/AUTO-IMPORT-003_MANIFEST.md`
- `docs/06_REVIEWS/Import/AUTO-IMPORT-003_PO_ACCEPTANCE_CHECKLIST.md`
- `docs/06_REVIEWS/Dashboard/DA-IMPL-002_UNIFIED_COMMAND_SUMMARY.md`

Code and data contracts:

- `.env.example`
- `backend/src/services/nationalExcelParser.js`
- `backend/src/services/importPipeline.js`
- `backend/src/services/importProcessor.js`
- `backend/src/services/F13DashboardService.js`
- `backend/src/controllers/kpiController.js`
- `backend/src/db/schema.sql`
- `frontend/src/features/dashboard/components/dashboardKpiCards.js`
- `frontend/src/features/dashboard/components/UnifiedCommandSummary.jsx`

## Source Discovery

Current repository evidence identifies the intended source family as DKCL/TCT nationwide F1.3 data:

- AUTO-IMPORT-001 records Product Owner-provided portal URL `https://dkcl.vnpost.vn/`.
- AUTO-IMPORT-001 records two account groups: Hue operational account and `Tổng công ty / nationwide` account.
- `.env.example` includes `PORTAL_NATIONAL_USERNAME` and `PORTAL_NATIONAL_PASSWORD`.
- Existing parser `nationalExcelParser.js` is explicitly labeled as `Parser for F1.3 National (TCT) Aggregated Data`.
- Existing import pipeline routes files placed under `Data DKCL/F1.3/Incoming/TCT` through `parseF13NationalExcel` and `importNationalParsedData`.

Checkpoint 001 conclusion:

- Authoritative source category discovered from repository evidence: DKCL/TCT nationwide F1.3 report file, currently modeled as an Excel workbook import into `fact_f13_national`.
- Live source mechanism still unverified: whether the workbook is downloaded from portal UI, an API, a generated report file, a database feed, or another TCT-controlled channel requires source access validation in a later authorized checkpoint.

## Authentication Model

Known:

- The national source requires the separate nationwide/TCT account group recorded by AUTO-IMPORT-001.
- The Hue acquisition engine uses only `PORTAL_HUE_USERNAME`, `PORTAL_HUE_PASSWORD`, and `PORTAL_HUE_HRM_CODE`.
- AUTO-IMPORT-002 explicitly excludes TCT/nationwide account workflow.
- AUTO-IMPORT-003 explicitly excludes TCT and preserves the valid-session operational condition for Hue only.

Required for later checkpoints:

- A separate national/TCT browser profile or equivalent session isolation must be used.
- Hue and TCT accounts must not share cached identity unexpectedly.
- No credentials, cookies, tokens, authorization headers, session IDs, or personal information may be committed or documented.

Unconfirmed:

- Whether TCT login requires HRM code, CAPTCHA, OTP, manual approval, SSO, or another security step.
- Whether a persistent authenticated session is allowed for TCT.
- Whether queue creation must preflight TCT authentication, as AUTO-IMPORT-003 does for Hue.

## Existing Data Contract

Target table: `fact_f13_national`.

Unique key:

- `ngay_do_kiem`
- `ma_tinh_phat`

Current stored fields:

| Field | Meaning from existing parser/schema | Status |
| --- | --- | --- |
| `ngay_do_kiem` | Measurement/reporting date parsed from filename | Available |
| `ma_tinh_phat` | Province/unit code | Available |
| `ten_tinh_phat` | Province/unit name | Available |
| `sl_bg_ptc` | Volume: successful delivery/payment/return population column | Available |
| `sl_ptc_nop_tien` | PTC/payment volume | Available |
| `sl_bg_bd10` | BD10/TMS/KTT related volume | Available |
| `sl_ptc_dung_qd_14h` | Pass quantity under <=14h criterion | Available |
| `tl_ptc_dung_qd_14h` | Pass rate under <=14h criterion | Available |
| `sl_qua_qd_14h` | Fail/over-14h quantity | Available |
| `sl_ptc_dung_qd_ct` | Pass quantity under KPI 2026 criterion | Available |
| `tl_ptc_dung_qd_ct` | KPI/pass rate under KPI 2026 criterion | Available |
| `sl_qua_qd_ct` | Fail quantity under KPI 2026 criterion | Available |
| `tl_qua_qd_ct` | Fail rate under KPI 2026 criterion | Available |
| `sl_chua_du_tt` | Missing information quantity | Available |
| `sl_loai_tru` | Excluded quantity | Available |
| `sl_phat_ktc` | Unsuccessful delivery quantity | Available |
| `sl_ptc_kxd` | Unidentified PTC quantity | Available |
| `created_at` | Local database import timestamp | Available |

Unavailable in the current table/parser:

- Source-supplied nationwide rank.
- Total ranked units as a stored source field.
- Source update timestamp from TCT.
- Report generation timestamp from portal.
- Explicit reporting frequency metadata.
- Official ranking population definition.
- Official tie-handling rule.
- Source file checksum or raw source evidence path in `fact_f13_national`.

## Nationwide-Ranking Semantics

Existing Dashboard behavior:

- Dashboard national rank is calculated from imported `fact_f13_national` rows.
- Hue province code comes from `system_config.default_province_code`, default `53`.
- Latest national period at or before the selected dashboard `to_date` is used.
- Current code orders rows by:
  - `tl_ptc_dung_qd_ct DESC`
  - `sl_bg_ptc DESC`
- Existing code reports rank as `index + 1`.
- Existing code reports total ranked units as the number of rows available for the selected national period.
- Existing code does not group tied rows into a shared rank.

Important distinction:

- The above is current system behavior accepted by earlier Dashboard scope, but it is not yet proven to be the official TCT source ranking rule.
- Checkpoint 001 does not change KPI formulas, ranking rules, or Dashboard behavior.

## Mapping To Hue Dashboard Requirements

| Dashboard requirement | Current source mapping | Status |
| --- | --- | --- |
| National rank card value | Calculated from `fact_f13_national` ordering | Available, but official TCT rank authority unconfirmed |
| Rank denominator | Count of imported rows for selected national period | Available, but official ranked population unconfirmed |
| Rank period wording | Latest `ngay_do_kiem <= dashboard to_date` | Available |
| Province identity | `default_province_code = 53`, matched to `ma_tinh_phat` | Available |
| KPI/pass rate | `tl_ptc_dung_qd_ct` | Available |
| Volume | `sl_bg_ptc` | Available |
| Pass | `sl_ptc_dung_qd_ct` | Available |
| Fail | `sl_qua_qd_ct` | Available |
| Returned quantity | No authoritative Dashboard mapping confirmed from national source | Unavailable |
| Source freshness | `created_at` only records local DB import time | Partial |

## Minimal Later Import/Evidence Contract

A later implementation checkpoint should define or expose at least:

- source type: portal report file/API/database feed/other;
- source authority label: TCT/DKCL nationwide F1.3;
- reporting date or period;
- imported filename and source filename where available;
- raw file evidence path or governed evidence reference;
- workbook/report row count;
- imported database row count;
- distinct province/unit count;
- Hue province row presence check for `ma_tinh_phat = 53`;
- KPI/pass-rate source column used for ranking;
- whether rank is source-supplied or calculated;
- calculated rank and denominator if rank is calculated;
- source update timestamp if present;
- local import timestamp;
- success/error log evidence;
- validation errors with safe operator-facing messages.

## Data Gaps And Risks

- Live TCT source screen/export/API has not been verified.
- Existing parser headers are mojibake in source code and should be validated against actual UTF-8 workbook headers before implementation.
- Existing national parser does not capture source-supplied rank, source update timestamp, or official denominator.
- Existing ranking calculation uses KPI descending and volume descending as a local calculation; official TCT tie behavior may differ.
- Current import pipeline can route `TCT` files, but Checkpoint 001 does not prove source acquisition, authentication preflight, or evidence UX.
- Current import log is generic and may not distinguish Hue vs TCT strongly enough for operator evidence without a later compatible evidence contract.

## Genuine PO / SSOT Blockers

The following require Product Owner, SSOT, or source-authority confirmation before a TCT importer can be accepted:

- Confirm the authoritative TCT source mechanism: portal download, API, report file, database feed, or other governed source.
- Confirm whether TCT supplies rank directly or whether the system must calculate rank.
- If rank is calculated, confirm official ranking population and tie-handling.
- Confirm reporting frequency: daily, month-to-date, monthly, or other.
- Confirm whether returned quantity in the national source should map to Dashboard `Chuyển hoàn`, and which source column is authoritative if yes.
- Confirm TCT authentication requirements and whether persistent national session/profile behavior is allowed.

## Proposed Checkpoint 002 Vertical Slice

Narrowest compatible next slice:

- Use a Product Owner-authorized controlled TCT source artifact or live TCT source access.
- Validate authentication/session preflight for the national account without touching Hue AUTO-IMPORT-002/003 behavior.
- Parse one controlled national F1.3 period through the existing national parser or a narrow UTF-8 compatible adapter.
- Import to `fact_f13_national` through the existing national import path only if the source contract is confirmed.
- Record safe evidence: source filename, reporting period, row count, imported row count, distinct province count, Hue row, rank calculation/source-rank status, local import timestamp, and validation errors.
- Do not change Dashboard UI, KPI formulas, ranking rules, schemas, AUTO-IMPORT-002/003 behavior, BCVH mappings, or scheduling.

## Validation

- Governance activation and Checkpoint 001 discovery only.
- No TCT importer implemented.
- No Dashboard UI changed.
- `git diff --check` must pass before handoff.
