# TODAY-003-R2 PO Acceptance Checklist

Status: `Completed`

## 1. Purpose

Let a Product Owner independently verify that the Quality Delivery Rate Trendline always spans a 30-calendar-day rolling window ending on the selected end date or latest reporting date.

## 2. Checklist Context

- Ticket ID: `TODAY-003-R2`
- Ticket Name: `Quality Trendline 30-Day Window Recovery`
- Affected Module: `F13 Dashboard / Quality Delivery Rate Trendline`
- Affected Screen / Menu: `Home -> F13 -> Dashboard`
- Route / URL: `http://localhost:5178/`
- Required Test Context: use the local test account configured for this environment
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`

## 3. Data Conditions

- Required environment or login: local development runtime with backend available on `http://localhost:5050`
- Required date range: select `2026-07-15` as the dashboard end date, then expect the trendline to cover `2026-06-16` through `2026-07-15`
- Required dataset or seed state: a runtime payload exists for `2026-07-15` with available daily data
- Any optional filters to set: BCVH may be changed to verify the filter still works, but it must not shrink the 30-day window
- Any known data gaps or limitations: missing calendar dates must remain gaps, not zero-filled values

## 4. Step-by-Step Checks

### Step 1

- Action: Open `http://localhost:5178/`
- Expected Result: The dashboard application loads successfully.

### Step 2

- Action: Sign in with the local test account configured for this environment
- Expected Result: The authenticated dashboard shell opens without errors.

### Step 3

- Action: Set the dashboard date filter to a single day, `2026-07-15`
- Expected Result: KPI cards represent the selected reporting date.

### Step 4

- Action: Open `Home -> F13 -> Dashboard`
- Expected Result: The Quality Delivery Rate Trendline is visible.

### Step 5

- Action: Open browser DevTools and Network, then refresh the page
- Expected Result: Network requests are visible for `meta`, `kpi`, and `daily-trend`.

### Step 6

- Action: Confirm the `daily-trend` request resolves to the backend origin
- Expected Result: The request goes to `http://localhost:5050/api/f13/dashboard/daily-trend`.

### Step 7

- Action: Inspect the request query parameters
- Expected Result: The trendline request uses a 30-day window ending on the selected end date, for example `from_date=2026-06-16` and `to_date=2026-07-15`.

### Step 8

- Action: Change BCVH selection and refresh the view
- Expected Result: The BCVH filter still changes the trend data without shrinking the 30-day window.

### Step 9

- Action: Inspect the chart across dates with no records
- Expected Result: Missing dates remain gaps and are not converted to `0%`.

### Step 10

- Action: Confirm the chart target line
- Expected Result: The 90% target line remains visible and unchanged.

## 5. PASS / WARNING / FAIL Criteria

### PASS

- KPI cards still reflect the selected reporting date.
- The trendline request covers a 30-day window.
- BCVH filtering still works.
- Missing dates remain gaps.
- The 90% target line remains visible.
- No business rule, SSOT, or frozen contract was changed to achieve the result.

### WARNING

- The trendline works, but a non-blocking display issue or a follow-up improvement remains.
- The issue must not change the 30-day contract or the missing-date semantics.

### FAIL

- The trendline collapses to a one-day window.
- The request does not cover the 30-day period ending on the selected date.
- BCVH filtering breaks the trendline window.
- Missing dates are zero-filled.
- The 90% target line is removed or altered.

## 6. Follow-up Actions

- After PASS: record PO PASS in the review trail and keep the ticket at `READY FOR PO CHECK` until closure policy is satisfied.
- After PASS: record PO PASS in the review trail and mark the ticket closed.
- After WARNING: record the warning, link the responsible recovery ticket if needed, and keep the ticket open for recheck.
- After FAIL: keep the ticket open, log the failure in PO findings, and do not mark the module completed.

## 7. Documents To Update

- After PASS: `docs/06_REVIEWS/Import/TODAY-003-R2_QUALITY_TRENDLINE_30_DAY_WINDOW_RECOVERY.md`, `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md` if any finding status changes
- After WARNING: `docs/06_REVIEWS/Import/TODAY-003-R2_QUALITY_TRENDLINE_30_DAY_WINDOW_RECOVERY.md`, `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`, and the linked recovery ticket if one exists
- After FAIL: `docs/06_REVIEWS/Import/TODAY-003-R2_QUALITY_TRENDLINE_30_DAY_WINDOW_RECOVERY.md`, `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`, and the responsible fix or recovery ticket

## 8. Authority Notes

- This checklist does not change SSOT.
- This checklist does not change frozen contracts.
- If a higher-authority document conflicts with this checklist, follow the higher-authority document and escalate the discrepancy.
