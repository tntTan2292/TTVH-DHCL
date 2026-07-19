# AUTO-IMPORT-002 Manifest

- Ticket ID: `AUTO-IMPORT-002`
- Ticket Name: `Automated Download and Validation Pipeline`
- Phase: `Smart Leadership Dashboard Implementation`
- Current state: `COMPLETED / VERIFIED - awaiting PO commit approval`
- Technical Status: `IMPLEMENTED WITH PERSISTENT PROFILE, HRM LOGIN, VISIBLE METRIC DRILL-DOWN, AND EXACT PORTAL EXPORT CLEANUP / VERIFIED`
- Runtime Status: `LIVE END-TO-END VERIFICATION PASSED FOR 2026-07-16`
- PO UI Check Required: `No`
- PO Product Status: `VERIFIED / AWAITING PO COMMIT APPROVAL`
- Activation authority: Product Owner requested `IMPLEMENT AUTO-IMPORT-002 — HUẾ F1.3 ACQUISITION ENGINE` from commit `b71cf4eb830f4d135cb80573f15884cffce5e4e7`.
- Activation date: `2026-07-19`

## Required Reading

- [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
- [docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-001_DKCL_SYNC_ATOMIC_IMPORT_HANDOFF.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-001_DKCL_SYNC_ATOMIC_IMPORT_HANDOFF.md)
- [docs/06_REVIEWS/Import/AUTO-IMPORT-002_HUE_F13_ACQUISITION_ENGINE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Import/AUTO-IMPORT-002_HUE_F13_ACQUISITION_ENGINE.md)
- [docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Dashboard/DA_IMPLEMENTATION_TICKET_REGISTER.md)
- [docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md)

## Scope

AUTO-IMPORT-002 implements a reusable backend/manual-trigger Huế F1.3 acquisition engine.

Included:

- one-date Huế F1.3 sync orchestration
- dedicated persistent Playwright profile for Huế DKCL automation
- one automatic login attempt using local username, password, and fixed HRM employee identifier
- idempotency before portal access
- one active Huế job at a time
- export-file matching rules
- portal export cleanup after successful local download
- XLSX validation and row-count reconciliation
- raw file preservation
- standardized `Incoming\HUE` handoff
- atomic importer result verification
- manual API trigger and status endpoint

## Out of Scope

- Data Import Center UI
- missing-date scan
- daily scheduler
- retry/monitoring operations UI
- TCT/nationwide account workflow
- KPI business-rule changes
- force replacement of existing data
- bulk or historical portal-file cleanup
- repeated login attempts or HRM bypass

## Implementation Decisions

- DKCL hidden date fields use `MM/DD/YYYY`; visible date fields use portal display format.
- `BCKT Tinh Phat` and `Buu cuc Phat` all-default values use `NULL`.
- F1.3 drill-down must use the visible business metric column `SL bưu gửi phát thành công/Nộp tiền/CH`, not hidden `d-none` cells.
- Detail-table `Tong so` is the authoritative export/import row count after visible drill-down.
- Portal cleanup targets the exact generated filename row first, then locates the delete action only inside that row.
- Huế automation uses a dedicated persistent profile with one automatic username/password/fixed HRM login attempt from local `.env`.
- `AUTHENTICATION_REQUIRED` remains the fallback when login, security step, or portal layout recognition cannot be completed safely.
- Force replacement is not allowed.

## Live Verification Evidence

- Live date: `2026-07-16`
- Visible business metric: `SL bưu gửi phát thành công/Nộp tiền/CH`
- Visible metric/detail population: `3941`
- Workbook rows: `3941`
- Imported DB rows: `3941`
- Distinct shipment codes: `3941`
- Import logs: exactly `1 SUCCESS`
- Skipped/error rows: `0`
- Dashboard backend `total_bg`: `3941`
- Portal cleanup target: `19-07-2026_23-08-07_F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet(1).xlsx`
- Portal cleanup result: target generated file deleted successfully
- Cleanup verification: exact filename `matchCount = 0`
- Final result: `AUTO-IMPORT-002 live end-to-end verification PASSED`

## Acceptance Gate

AUTO-IMPORT-002 is `COMPLETED / VERIFIED - awaiting PO commit approval` after automated tests and controlled live verification passed.

Do not self-award `PO PASS`.

## Next Ticket

`AUTO-IMPORT-003` remains `PLANNED / INACTIVE` until AUTO-IMPORT-002 receives Product Owner acceptance or explicit Governance authority permits activation.
