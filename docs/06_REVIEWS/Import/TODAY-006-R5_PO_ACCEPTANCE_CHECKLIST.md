# TODAY-006-R5 PO Acceptance Checklist

## 1. Purpose

Verify that the KPI spinner always finishes and the dashboard reaches success, empty, or error for each stable filter context.

## 2. Checklist Context

- Ticket ID: `TODAY-006-R5`
- Ticket Name: `Executive KPI Infinite Loading Recovery`
- Affected Module: `Leadership Dashboard`
- Affected Screen / Menu: `Executive Dashboard`
- Route / URL: `/f13/dashboard`
- Required Test Context: authenticated local dashboard session with runtime data if needed
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`

## 3. Step-by-Step Checks

1. Open `/f13/dashboard`.
2. Confirm KPI spinner finishes.
3. Confirm aggregate KPI values appear.
4. Change to three BCVH values.
5. Confirm KPI values reload and loading always finishes.
6. Confirm Header, Summary and Daily Brief change together.
7. Return to `Tất cả BCVH`.
8. Confirm aggregate values return.
9. Confirm both trend charts still change by BCVH.
10. Confirm `Đạt / Không đạt` filter remains absent.

## 4. PASS / WARNING / FAIL Criteria

### PASS

- KPI loading always resolves to success, empty, or error.
- A later filter change after error can issue a new request.
- Header, Summary, and Daily Brief continue sharing the same payload.
- Accepted trend charts remain correct.

### WARNING

- Some data is missing, but null semantics remain explicit.

### FAIL

- KPI stays on the loading spinner indefinitely.
- The dashboard stops issuing valid KPI requests after an error or filter change.

## 5. Follow-Up Actions

- After PASS: update governance and keep the ticket open only until explicit PO PASS is recorded.
- After WARNING: keep the ticket open for recheck.
- After FAIL: create or update the responsible recovery work and keep `TODAY-006-R5` open.

## 6. Documents To Update

- `docs/10_TICKETS/TODAY-006-R5_MANIFEST.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`

## 7. Authority Notes

- Do not change SSOT from this checklist.
- Do not introduce new business rules.
- Keep `TODAY-007` inactive.
