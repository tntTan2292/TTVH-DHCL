# TODAY-006-R3 PO Acceptance Checklist

## 1. Purpose

Verify the shared KPI request behavior and confirm the dashboard is ready for PO review without regressing the accepted analysis surfaces.

## 2. Checklist Context

- Ticket ID: `TODAY-006-R3`
- Ticket Name: `Shared KPI Request and PO Readiness Recovery`
- Affected Module: `Leadership Dashboard`
- Affected Screen / Menu: `Executive Dashboard`
- Route / URL: `/f13/dashboard`
- Required Test Context: authenticated local dashboard session with runtime data
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`

## 3. Data Conditions

- Required environment or login: authenticated dashboard session
- Required date range: current runtime dashboard window
- Required dataset or seed state: KPI data with aggregate and scoped BCVH values, timeline data, and accepted daily-trend payload
- Any optional filters to set: all six canonical `ma_bcvh` values and `Tất cả BCVH`
- Any known data gaps or limitations: missing days remain null and the timeline stays mounted

## 4. Step-by-Step Checks

### Step 1

- Action: Open `/f13/dashboard`.
- Expected Result: KPI cards are visible and the dashboard shell loads in the authenticated browser.

### Step 2

- Action: Select `Tất cả BCVH`.
- Expected Result: The KPI request returns aggregate values and the response is nonzero when source data exists.

### Step 3

- Action: Select each of the six canonical BCVH values.
- Expected Result: Each KPI request contains the correct canonical code and scoped KPI values change accordingly.

### Step 4

- Action: Return to `Tất cả BCVH`.
- Expected Result: Aggregate KPI values are restored.

### Step 5

- Action: Inspect timeline and chart surfaces.
- Expected Result: Weekly, monthly, heatmap, ranking, and the accepted 30-day and 7-day charts remain visible; the timeline shows explicit loading, error, and successful empty states as applicable.

### Step 6

- Action: Inspect the browser network panel.
- Expected Result: Exactly one shared `daily-trend` request is issued for the accepted trend surfaces.

## 5. PASS / WARNING / FAIL Criteria

### PASS

- Aggregate KPI context is restored when `ma_bcvh=all` or omitted.
- Unknown BCVH codes are rejected.
- The fourth KPI card remains `Tỷ lệ Không đạt`.
- The timeline has explicit stable loading/error/empty states.
- Accepted charts remain correct.
- Only one shared `daily-trend` request appears.
- Real browser evidence is captured.

### WARNING

- Some data is missing, but null semantics remain explicit.

### FAIL

- `all` reaches SQL as a literal string.
- Unknown codes are accepted.
- The dashboard loses restored surfaces.
- A second shared `daily-trend` request appears.

## 6. Follow-Up Actions

- After PASS: update governance and keep the ticket open only until explicit PO PASS is recorded.
- After WARNING: keep the ticket open for recheck.
- After FAIL: create or update the responsible recovery work and keep `TODAY-006-R3` open.

## 7. Documents To Update

- `docs/10_TICKETS/TODAY-006-R3_MANIFEST.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`

## 8. Authority Notes

- Do not change SSOT from this checklist.
- Do not introduce new business rules.
- Keep `TODAY-007` inactive.
