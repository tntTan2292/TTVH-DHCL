# TODAY-006-R1 PO Acceptance Checklist

## 1. Purpose

Verify the KPI route and dashboard fallback states behave correctly under canonical BCVH filtering while preserving the accepted charts.

## 2. Checklist Context

- Ticket ID: `TODAY-006-R1`
- Ticket Name: `Runtime KPI and Stable Dashboard Surfaces Recovery`
- Affected Module: `Leadership Dashboard`
- Affected Screen / Menu: `Executive Dashboard`
- Route / URL: `/f13/dashboard`
- Required Test Context: authenticated local dashboard session with runtime data
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`

## 3. Data Conditions

- Required environment or login: authenticated dashboard session
- Required date range: current runtime dashboard window
- Required dataset or seed state: KPI data with different scoped BCVH values, timeline data with missing days, and accepted daily-trend payload
- Any optional filters to set: all six canonical `ma_bcvh` values and `Tất cả BCVH`
- Any known data gaps or limitations: missing days stay null and the timeline stays mounted

## 4. Step-by-Step Checks

### Step 1

- Action: Open `/f13/dashboard`.
- Expected Result: KPI cards are visible, and the fourth card is labeled `Tỷ lệ Không đạt` rather than `Xếp hạng`.

### Step 2

- Action: Switch through all six canonical BCVH values and then back to `Tất cả BCVH`.
- Expected Result: KPI values change according to the selected BCVH, and `all` shows the aggregate values.

### Step 3

- Action: Inspect the network request for `/api/f13/dashboard/kpi`.
- Expected Result: `ma_bcvh` is forwarded correctly and the response scope changes with the selected BCVH.

### Step 4

- Action: Trigger or verify a timeline failure state.
- Expected Result: Loading, empty, and error cards remain visible, and the weekly/monthly/heatmap/ranking surfaces remain mounted.

### Step 5

- Action: Inspect the accepted trend charts and the network panel.
- Expected Result: The 30-day and 7-day charts remain correct, and exactly one shared `daily-trend` request is issued.

## 5. PASS / WARNING / FAIL Criteria

### PASS

- KPI route respects canonical `ma_bcvh` filtering.
- `all` remains aggregate.
- The fourth KPI card no longer uses `Xếp hạng` or `f13_303_rate`.
- Timeline fallback cards remain visible.
- Accepted charts remain correct.
- Only one `daily-trend` request appears.

### WARNING

- Some data is missing, but the null semantics remain explicit.

### FAIL

- KPI scope does not change by BCVH.
- The fourth KPI card still shows `Xếp hạng`.
- The timeline panel disappears on error.
- A second `daily-trend` request appears.

## 6. Follow-Up Actions

- After PASS: update governance and keep the ticket open only until explicit PO PASS is recorded.
- After WARNING: keep the ticket open for recheck.
- After FAIL: create or update the responsible recovery work and keep `TODAY-006-R1` open.

## 7. Documents To Update

- `docs/10_TICKETS/TODAY-006-R1_MANIFEST.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`

## 8. Authority Notes

- Do not change SSOT from this checklist.
- Do not introduce new business rules.
- Keep `TODAY-007` inactive.
