# AUTO-IMPORT-003 PO Acceptance Record

- Ticket: `AUTO-IMPORT-003`
- Ticket name: `Scheduled Import, Retry, Monitoring and Operations UI`
- Affected module: Data Import Center
- Affected screen/menu: System Administration -> Data Import Center
- Route/URL: `/import`
- PO result: `PASS`
- PO decision date: `2026-07-20`
- Final status: `COMPLETED / PO PASS`

## 1. Preconditions

| Requirement | Expected condition |
| --- | --- |
| Backend version | Backend includes AUTO-IMPORT-003 scan, coverage summary, backfill queue, retry/stop, and DKCL authentication preflight APIs. |
| Frontend version | Frontend includes AUTO-IMPORT-003 Data Import Center operations panel and configurable API base URL support. |
| Test database/environment | Project runtime database/environment prepared for AUTO-IMPORT-003 technical validation. No mock data is accepted as final PO evidence. |
| Test dates | PO checks covered completed, missing, and duplicate/completed rejection cases, including `2026-07-13..2026-07-19` and long-range scan validation. |
| Required permissions | Product Owner or System Administrator account with access to Data Import Center. |
| Accepted operational condition | Manual Huế F1.3 backfill requires a valid DKCL authenticated session. The operator does not need to log in for every `Update` while the session remains valid. If the DKCL session is expired or invalid, queue creation is blocked before `RUNNING` and the operator is instructed to re-authenticate. |
| Explicit exclusions | No automatic login, credential storage, or additional DKCL session persistence is added in this ticket. |
| Scope boundaries | No TCT, no KPI formula changes, no unattended scheduling, no queue persistence, and no force replacement are included in this ticket. |

## 2. Acceptance Checklist

| # | Item | Expected observable business result | PO result |
| ---: | --- | --- | --- |
| 1 | Open Data Import Center. | The Data Import Center opens successfully and shows the Huế F1.3 manual backfill panel above the import history. | PASS |
| 2 | Scan a date range. | The screen shows date-by-date scan results and summary counts. Long reasonable ranges are not blocked by an arbitrary 62-day limit. | PASS |
| 3 | Verify completed dates are disabled. | Dates with completed import evidence show completed/non-missing status and cannot be selected. | PASS |
| 4 | Verify missing dates are selectable. | Missing dates show `MISSING` status and can be selected. | PASS |
| 5 | Select one missing date. | The selected missing date remains visibly checked and `Update` becomes available. | PASS |
| 6 | Press Update. | With a valid DKCL session, a Huế F1.3 backfill queue is created. With an invalid/expired DKCL session, queue creation is blocked before `RUNNING`. | PASS |
| 7 | Verify queue is created. | The queue panel shows queue status, item list, business date, run ID when available, and progress count. | PASS |
| 8 | Verify progress updates correctly. | Progress moves from queued/running toward terminal completion, and completed item count matches terminal queue items. | PASS |
| 9 | Verify queue status changes correctly. | Queue/item status changes are understandable, including `QUEUED`, `RUNNING`, `SUCCESS`, `FAILED`, `AUTHENTICATION_REQUIRED`, `STOPPED`, or `SKIPPED` where applicable. | PASS |
| 10 | Verify evidence information is displayed. | Each queue item displays safe evidence when available: business date, queue/run ID, exported filename or safe error, workbook row count, DB import count, distinct shipment count, and success/error log counts. | PASS |
| 11 | Verify duplicate dates cannot be submitted. | The system rejects duplicate business dates instead of processing duplicates. | PASS |
| 12 | Verify completed dates cannot be submitted. | Completed dates cannot be selected and API/business behavior rejects completed dates so existing data is not force replaced. | PASS |
| 13 | Verify Stop behavior. | Stop does not kill the currently running one-date sync unsafely; current date is allowed to finish and remaining not-yet-started dates become stopped. | PASS |
| 14 | Verify Retry eligibility. | Retry is visible/enabled only for `FAILED` or `AUTHENTICATION_REQUIRED` items; successful items cannot be retried. | PASS |
| 15 | Verify restart/in-memory warning. | The screen clearly communicates that queue state is in memory and backend restart can clear active queue state. | PASS |
| 16 | Verify no AUTO-IMPORT-002 functionality is affected. | Existing one-date Huế F1.3 sync behavior remains consistent with AUTO-IMPORT-002 expectations. | PASS |

## 3. PO Result Section

| Item | PASS / FAIL | Comment | Defect ID (if any) |
| --- | --- | --- | --- |
| Open Data Import Center | PASS | Accepted by PO. |  |
| Scan a date range | PASS | Accepted after unsupported 62-day limit was removed. | DEFECT-003 fixed |
| Completed dates are disabled | PASS | Accepted by PO. |  |
| Missing dates are selectable | PASS | Accepted by PO. |  |
| Select one missing date | PASS | Accepted by PO. |  |
| Press Update | PASS | Accepted with valid DKCL session operational condition. | DEFECT-004 fixed |
| Queue is created | PASS | Queue is created only when DKCL session is valid; invalid session is rejected before `RUNNING`. | DEFECT-004 fixed |
| Progress updates correctly | PASS | Accepted by PO. |  |
| Queue status changes correctly | PASS | Accepted by PO. |  |
| Evidence information is displayed | PASS | Accepted by PO. |  |
| Duplicate dates cannot be submitted | PASS | Accepted by PO. |  |
| Completed dates cannot be submitted | PASS | Accepted by PO. |  |
| Stop behavior matches expectation | PASS | Accepted by PO. |  |
| Retry eligibility is correct | PASS | Accepted by PO. |  |
| Restart/in-memory warning is understandable | PASS | Accepted by PO. |  |
| AUTO-IMPORT-002 remains unaffected | PASS | Accepted by PO; no automatic login, credential storage, or additional session persistence added. |  |

## 4. PO Decision

Final result: `PASS`

PO comment:

```text
AUTO-IMPORT-003 PO ACCEPTANCE: PASS.

Accepted operational condition:
- Manual Huế F1.3 backfill requires a valid DKCL authenticated session.
- The operator does not need to log in for every Update while the session remains valid.
- If the DKCL session is expired or invalid, the system must block queue creation before RUNNING and instruct the operator to re-authenticate.

Do not add automatic login, credential storage, or session persistence in this ticket.
```
