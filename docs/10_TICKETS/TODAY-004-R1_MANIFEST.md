# TODAY-004-R1 Ticket Manifest

## 1. Ticket Information

- Ticket ID: `TODAY-004-R1`
- Ticket Name: `Quality and Volume Combo Trendline Recovery`
- Phase: `Leadership Dashboard Delivery`
- Owner: `Codex`
- Governance Version: `V2 Active`

## 2. Objective

Replace the rejected two-chart presentation with one professional 30-day combo trendline on the Operation Dashboard, preserving existing dashboard contracts, filters, missing-date behavior, and unrelated analysis surfaces.

## 3. Current Status

- Current state: `Technical PASS / Runtime PASS / READY FOR PO CHECK`
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`
- Recovery source: `TODAY-004` PO FAIL
- Live phase, branch, PO status, and next-ticket routing are owned by `PROJECT_SNAPSHOT.md`

## 4. Required Reading

Only the following documents are required to continue this ticket:

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md)
- [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
- [docs/10_TICKETS/TODAY-004_MANIFEST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/10_TICKETS/TODAY-004_MANIFEST.md)
- [docs/06_REVIEWS/Import/TODAY-004-R1_QUALITY_AND_VOLUME_COMBO_TRENDLINE_RECOVERY.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-004-R1_QUALITY_AND_VOLUME_COMBO_TRENDLINE_RECOVERY.md)
- [docs/06_REVIEWS/Import/TODAY-004-R1_PO_ACCEPTANCE_CHECKLIST.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/TODAY-004-R1_PO_ACCEPTANCE_CHECKLIST.md)
- [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)

## 5. Business Context

- Product Owner rejected the separate Quality Delivery Rate Trendline and Volume Trendline presentation.
- The approved recovery requirement is one combined 30-day trendline that shows volume and quality together.
- Technical PASS and Runtime PASS do not replace PO PASS.
- `TODAY-005` must remain inactive until this recovery passes the applicable PO and closure gates.

## 6. Technical Context

- Relevant frontend files:
  - `frontend/src/features/dashboard/DashboardPage.jsx`
  - `frontend/src/features/dashboard/components/QualityVolumeComboTrendlineAdapter.jsx`
  - `frontend/src/features/dashboard/components/comboTrendlineData.js`
  - `frontend/src/features/dashboard/components/comboTrendlineData.test.js`
  - `frontend/src/features/dashboard/components/qualityTrendlineWindow.js`
  - `frontend/src/api/client.js`
- Relevant backend route:
  - `GET /api/f13/dashboard/daily-trend`
- Contract constraints:
  - use one `daily-trend` request
  - normalize one dataset in the orchestration layer
  - the chart component receives props
  - preserve the rolling 30-day window
  - preserve optional BCVH filtering
  - preserve missing-date gaps

## 7. Implementation Scope

- Replace the separate Quality Delivery Rate Trendline and Volume Trendline sections with one combo chart.
- Use Recharts `ComposedChart`.
- Bar: `total_volume`, left Y-axis, domain starts at `0`.
- Line: `quality_rate`, right Y-axis, fixed domain `0-100%`.
- ReferenceLine: `90%` quality target on the right axis.
- Combined tooltip must show date, volume, passed, failed, quality rate, target, and target variance.
- Use clear axis units, restrained colors, horizontal gridlines, and uncluttered labels.
- Do not create duplicate API calls for the trendline.

## 8. Out Of Scope

- Do not activate `TODAY-005`.
- Do not change backend contracts.
- Do not modify frozen architecture or SSOT.
- Do not alter unrelated dashboard surfaces.
- Do not infer missing business rules, date-window behavior, or contract behavior.

## 9. Validation

- Unit/component-level validation for combo trendline normalization and tooltip values.
- Frontend build validation.
- Frontend lint validation.
- Browser runtime validation at `/f13/dashboard`.
- Runtime API validation must confirm `daily-trend` returns one 30-day dataset with volume and quality fields.

## 10. Documents To Update

- `docs/10_TICKETS/TODAY-004_MANIFEST.md`
- `docs/10_TICKETS/TODAY-004-R1_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-004-R1_QUALITY_AND_VOLUME_COMBO_TRENDLINE_RECOVERY.md`
- `docs/06_REVIEWS/Import/TODAY-004-R1_PO_ACCEPTANCE_CHECKLIST.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`

## 11. Expected Output

- Technical PASS.
- Runtime PASS.
- PO UI ACCEPTANCE REQUIRED.
- `TODAY-004-R1` remains open until PO PASS.
- `TODAY-005` remains inactive.

## 12. Next Ticket

- Next ticket ID: `TODAY-005`
- Next ticket name: `Same-Period Comparison Trendline`
- Blockers or handoff notes: do not activate until `TODAY-004-R1` receives PO PASS and closure gates pass.
