# TODAY-008 PO Data Reconciliation and Leadership View

## 1. Review Result

- Ticket ID: `TODAY-008`
- Ticket name: `PO Data Reconciliation and Leadership View`
- Technical Status: `PASS`
- Runtime Status: `PASS`
- PO Product Status: `READY FOR PO CHECK`
- Review status: `READY FOR PO CHECK`
- Review date: `2026-07-17`

## 2. Scope

- Provide one repeatable PO path from `/import` to `/f13/dashboard`.
- Preserve accepted dashboard behavior from TODAY-003 through TODAY-007.
- Do not change KPI formulas, SSOT, canonical BCVH mapping, dashboard API contracts, database schema, chart semantics, or executive layout scope.

## 3. Implementation Summary

- Added a focused reconciliation helper for import rows.
- Added a `Đối chiếu Dashboard` action on successful import log rows.
- The action opens `/f13/dashboard` with the imported data date as both `from_date` and `to_date`, and aggregate `ma_bcvh=all`.
- Failed imports and invalid import dates do not expose an actionable dashboard reconciliation link.
- No dashboard product code, KPI calculations, request contracts, or chart behavior were changed.

## 4. Approved Runtime Routes and Fields

### Import Source

- Route: `/import`
- API: `/api/import/f13/status?page=1&pageSize=20`
- Fields used for reconciliation:
  - `id`
  - `ten_file`
  - `ngay_so_lieu`
  - `so_luong_bg`
  - `so_bi_bo_qua`
  - `so_loi`
  - `trang_thai`

### Dashboard Target

- Route: `/f13/dashboard`
- URL context:
  - `from_date`
  - `to_date`
  - `ma_bcvh`
- APIs validated:
  - `/api/f13/dashboard/meta`
  - `/api/f13/dashboard/kpi`
  - `/api/f13/dashboard/daily-trend`
  - `/api/f13/dashboard/quality-timeline`
  - `/api/f13/dashboard/top`

## 5. Deterministic Reconciliation Scenario

- Import log ID: `118`
- Import file: `F1.3-2026.07.15.xlsx`
- Imported data date: `2026-07-15`
- Import total records: `3677`
- Aggregate dashboard URL: `/f13/dashboard?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all`
- Canonical BCVH spot-check: `535790`

## 6. Source Data Evidence

### Import Log

| Field | Value |
| --- | --- |
| `id` | `118` |
| `file_name` | `F1.3-2026.07.15.xlsx` |
| `ngay_do_kiem` | `2026-07-15` |
| `total_records` | `3677` |
| `skipped_records` | `0` |
| `error_records` | `0` |

### Fact Records For `2026-07-15`

| Status | Count |
| --- | ---: |
| `Đạt` | `2471` |
| `Không đạt` | `1037` |
| Missing status | `169` |
| Total | `3677` |

### Canonical BCVH Distribution

| `ma_bcvh` | BCVH | Count |
| --- | --- | ---: |
| `533140` | `BCVH Thuận Hóa` | `1694` |
| `535470` | `BCVH Hương Trà` | `476` |
| `535790` | `BCVH A Lưới` | `96` |
| `536250` | `BCVH Hương Thủy` | `775` |
| `537015` | `BCVH Thuận An` | `209` |
| `537220` | `BCVH Phú Lộc` | `427` |

- Non-canonical rows for `2026-07-15`: `0`

## 7. API Reconciliation Result

### Aggregate Context

- Request: `/api/f13/dashboard/kpi?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all`
- Status: `200`
- Result:
  - `total_bg`: `3677`
  - `passed_rate`: `67.2`
  - `failed_rate`: `28.2`

- Request: `/api/f13/dashboard/daily-trend?from_date=2026-07-15&to_date=2026-07-15`
- Status: `200`
- Result:
  - `date`: `2026-07-15`
  - `total_volume`: `3677`
  - `passed`: `2471`
  - `failed`: `1037`
  - `data_available`: `true`

### Canonical BCVH Context `535790`

- Request: `/api/f13/dashboard/kpi?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=535790`
- Status: `200`
- Result:
  - `total_bg`: `96`
  - `passed_rate`: `71.9`
  - `failed_rate`: `26`

- Request: `/api/f13/dashboard/daily-trend?from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=535790`
- Status: `200`
- Result:
  - `date`: `2026-07-15`
  - `total_volume`: `96`
  - `passed`: `69`
  - `failed`: `25`
  - `data_available`: `true`

## 8. Targeted Browser Runtime Evidence

- Browser executable: project Playwright Chromium headless shell.
- Preview route: `/import`
- Runtime action: clicked `Đối chiếu Dashboard` from a successful import row.
- Runtime target: `/f13/dashboard` with date and aggregate `ma_bcvh=all` context.
- Dashboard surfaces confirmed visible:
  - KPI cards
  - Timeline
  - Accepted 30-day chart
  - Accepted 7-day comparison chart
  - Ranking/table surfaces
  - Canonical BCVH filter options
- `Đạt / Không đạt` selector: absent.
- Console/page errors: none observed.

### Normalized Dashboard Request Counts

| Request | Count |
| --- | ---: |
| `GET /api/f13/dashboard/daily-trend` | `1` |
| `GET /api/f13/dashboard/kpi` | `1` |
| `GET /api/f13/dashboard/message` | `1` |
| `GET /api/f13/dashboard/meta` | `1` |
| `GET /api/f13/dashboard/quality-timeline` | `1` |
| `GET /api/f13/dashboard/top` | `1` |

- Duplicate identical dashboard requests: `0`

## 9. Automated Validation

- Focused tests:
  - `node --test frontend/src/pages/importDashboardReconciliation.test.js frontend/src/features/dashboard/components/dashboardStaleKpiRecovery.test.js frontend/src/features/dashboard/components/dashboardFilterOptions.test.js`
  - Result: `PASS`, `14` tests.
- Lint:
  - `npm run lint`
  - Result: `PASS` with existing warnings only.
- Build:
  - `npm run build`
  - Result: `PASS`.

## 10. PO Handoff

- TODAY-008 is technically and runtime validated.
- TODAY-008 is ready for manual PO acceptance.
- Codex stops at `READY FOR PO CHECK`.
- No PO PASS is recorded by Codex.
- `TICKET-0101` remains inactive.
