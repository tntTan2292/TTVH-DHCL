# TODAY-004-R2 BCVH Filter and Combo Trendline Recovery

## Status

| Field | Value |
| --- | --- |
| Ticket | `TODAY-004-R2 BCVH Filter and Combo Trendline Recovery` |
| Source Ticket | `TODAY-004-R1 Quality and Volume Combo Trendline Recovery` |
| PO Result Source | `PO FAIL` |
| Technical Status | `PASS` |
| Runtime Status | `PASS` |
| PO UI Check Required | `Yes` |
| PO Product Status | `PO FAIL` |
| Current Manifest | `docs/10_TICKETS/TODAY-004-R2_MANIFEST.md` |
| Responsible PO Finding | `POF-TODAY-004-02` |
| Follow-up Recovery | `TODAY-004-R3 Canonical BCVH Options Runtime Recovery` |

## Root Cause

- The Operation Dashboard inherited placeholder BCVH options from the shared filter shell instead of using SSOT-backed runtime metadata.
- The shared KPI/status selector was rendered on `/f13/dashboard` even though this dashboard has no meaningful `Đạt/Không đạt` status-filter behavior.
- The combo trendline request used the legacy `bcvh_id` parameter while the approved runtime/business contract uses `ma_bcvh`, creating filter mismatch risk.
- Loading, empty, and error states were rendered outside the combo card, so the chart section could appear to disappear during filtering.

## Six SSOT BCVH Units

| Code | Name |
| --- | --- |
| `535790` | `BCVH A Lưới` |
| `536250` | `BCVH Hương Thủy` |
| `535470` | `BCVH Hương Trà` |
| `537220` | `BCVH Phú Lộc` |
| `537015` | `BCVH Thuận An` |
| `533140` | `BCVH Thuận Hóa` |

## Recovery Scope

- `/api/f13/dashboard/meta` returns `max_date` and the six canonical BCVH unit code/name pairs.
- `/f13/dashboard` consumes metadata-provided BCVH options and prepends `Tất cả BCVH`.
- `/f13/dashboard` removes the KPI/status selector while preserving shared filter capability by default.
- `daily-trend` requests now send canonical `ma_bcvh` for selected BCVH values.
- Backend `daily-trend` accepts `ma_bcvh` while preserving legacy aliases.
- The combo chart card remains mounted for loading, empty, error, and data states.

## Validation Evidence

- Unit/component validation: `PASS`
  - `node --test src/features/dashboard/components/qualityTrendlineWindow.test.js src/features/dashboard/components/comboTrendlineData.test.js src/features/dashboard/components/dashboardFilterOptions.test.js`
  - 12 tests passed.
- Build validation: `PASS`
  - `cmd /c npm run build`
- Lint validation: `PASS`
  - `cmd /c npm run lint`
  - Existing warnings only.
- Runtime API validation: `PASS`
  - `/api/f13/dashboard/meta` returns six BCVH units plus frontend `Tất cả BCVH`.
  - `/api/f13/dashboard/daily-trend?from_date=2026-06-16&to_date=2026-07-15&ma_bcvh=<code>` returns `HTTP 200` for each canonical code.
- Browser validation: `PASS`
  - Authenticated `/f13/dashboard` shows the BCVH filter with six units plus `Tất cả BCVH`.
  - KPI/status selector is absent.
  - Selecting each BCVH preserves the 30-day window and leaves the combo chart card visible.

## PO Validation

- PO Result: `PO FAIL`.
- PO finding: browser screenshot showed only `Tất cả BCVH` in the BCVH dropdown.
- Responsible Fix Ticket: `TODAY-004-R3 Canonical BCVH Options Runtime Recovery`.
- Do not activate `TODAY-005` without explicit PO PASS for `TODAY-004-R3`.
