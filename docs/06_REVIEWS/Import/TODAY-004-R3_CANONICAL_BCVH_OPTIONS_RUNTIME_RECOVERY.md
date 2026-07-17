# TODAY-004-R3 Canonical BCVH Options Runtime Recovery

## Status

| Field | Value |
| --- | --- |
| Ticket | `TODAY-004-R3 Canonical BCVH Options Runtime Recovery` |
| Source Ticket | `TODAY-004-R2 BCVH Filter and Combo Trendline Recovery` |
| PO Result Source | `PO FAIL` |
| Technical Status | `PASS` |
| Runtime Status | `PASS` |
| PO UI Check Required | `Yes` |
| PO Product Status | `PO UI ACCEPTANCE REQUIRED` |
| Current Manifest | `docs/10_TICKETS/TODAY-004-R3_MANIFEST.md` |
| Responsible PO Finding | `POF-TODAY-004-03` |

## Root Cause

- `TODAY-004-R2` still derived `/api/f13/dashboard/meta` BCVH options from `SELECT DISTINCT ... FROM fact_f13`.
- The Operation Dashboard initialized frontend BCVH state with only `Tất cả BCVH` before validated metadata existed.
- If metadata was stale, missing, blocked, or malformed in the PO browser session, the UI could silently render a usable one-option dropdown.
- The previous browser PASS claim cannot be reused as PO acceptance evidence.

## Canonical BCVH Units

| Value | Label |
| --- | --- |
| `all` | `Tất cả BCVH` |
| `535790` | `BCVH A Lưới` |
| `536250` | `BCVH Hương Thủy` |
| `535470` | `BCVH Hương Trà` |
| `537220` | `BCVH Phú Lộc` |
| `537015` | `BCVH Thuận An` |
| `533140` | `BCVH Thuận Hóa` |

## Implementation Result

- Added stable backend configuration: `backend/src/config/canonicalBcvhUnits.js`.
- Changed `/api/f13/dashboard/meta` to return canonical units from configuration, not operational fact rows.
- Added no-stale-cache headers to `/dashboard/meta`.
- Added frontend metadata validation before enabling the BCVH filter.
- Invalid or empty metadata now disables the filter, shows a Vietnamese error, and provides retry.
- Preserved absent `Đạt/Không đạt` status selector.
- Preserved one combo chart, rolling 30-day window, canonical `ma_bcvh`, and chart-card loading/empty/error behavior.

## Runtime Metadata Evidence

- Request URL: `http://localhost:5050/api/f13/dashboard/meta`
- HTTP status: `200`
- Response headers:
  - `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`
  - `Pragma: no-cache`
  - `Expires: 0`
- Response payload:

```json
{
  "success": true,
  "data": {
    "max_date": "2026-07-15",
    "bcvh_units": [
      { "ma_bcvh": "535790", "ten_bcvh": "BCVH A Lưới" },
      { "ma_bcvh": "536250", "ten_bcvh": "BCVH Hương Thủy" },
      { "ma_bcvh": "535470", "ten_bcvh": "BCVH Hương Trà" },
      { "ma_bcvh": "537220", "ten_bcvh": "BCVH Phú Lộc" },
      { "ma_bcvh": "537015", "ten_bcvh": "BCVH Thuận An" },
      { "ma_bcvh": "533140", "ten_bcvh": "BCVH Thuận Hóa" }
    ]
  }
}
```

- `data.bcvh_units` exists: `Yes`
- `data.bcvh_units.length`: `6`

## Browser DOM Evidence

Authenticated browser route: `http://localhost:5178/f13/dashboard`

- `BCVH Filter` exists: `Yes`
- `BCVH Filter disabled`: `false`
- `KPI Filter` count: `0`
- rendered option count: `7`
- chart visible: `true`

Rendered options:

| Value | Label |
| --- | --- |
| `all` | `Tất cả BCVH` |
| `535790` | `BCVH A Lưới` |
| `536250` | `BCVH Hương Thủy` |
| `535470` | `BCVH Hương Trà` |
| `537220` | `BCVH Phú Lộc` |
| `537015` | `BCVH Thuận An` |
| `533140` | `BCVH Thuận Hóa` |

Screenshots:

- `docs/06_REVIEWS/Import/screenshots/TODAY-004-R3_dashboard_select_closed.png`
- `docs/06_REVIEWS/Import/screenshots/TODAY-004-R3_bcvh_dropdown_open.png`

Note: direct browser navigation to the backend JSON URL was blocked by the browser client (`net::ERR_BLOCKED_BY_CLIENT`). Metadata payload and headers were therefore recorded from the live backend route after process restart, while DOM and selection evidence were recorded from the authenticated browser dashboard.

## Selection Evidence

Authenticated browser selection preserved URL context and chart visibility:

| Selected | URL contained | Chart visible |
| --- | --- | --- |
| `535790` | `?ma_bcvh=535790` | `true` |
| `536250` | `?ma_bcvh=536250` | `true` |
| `535470` | `?ma_bcvh=535470` | `true` |
| `537220` | `?ma_bcvh=537220` | `true` |
| `537015` | `?ma_bcvh=537015` | `true` |
| `533140` | `?ma_bcvh=533140` | `true` |
| `all` | `?ma_bcvh=all` | `true` |

Runtime API validation confirmed each canonical `ma_bcvh` returned `HTTP 200`, 30 rows, and the rolling window `2026-06-16` to `2026-07-15`.

## Automated Validation

- Backend: `node --test test_canonical_bcvh_units.js` -> `PASS` (2 tests)
- Frontend: `node --test src/features/dashboard/components/qualityTrendlineWindow.test.js src/features/dashboard/components/comboTrendlineData.test.js src/features/dashboard/components/dashboardFilterOptions.test.js` -> `PASS` (13 tests)
- Build: `cmd /c npm run build` -> `PASS`
- Lint: `cmd /c npm run lint` -> `PASS` with existing warnings only

## PO Validation

- PO UI ACCEPTANCE REQUIRED.
- Do not close `TODAY-004-R3`.
- Do not activate `TODAY-005` without explicit PO PASS.
