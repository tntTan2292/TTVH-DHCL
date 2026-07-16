# TODAY-003-R1 PO Acceptance Checklist

## 1. Purpose

Let a Product Owner independently verify that the Quality Delivery Rate Trendline loads real runtime data, resolves through the backend, and still preserves the approved business contract.

## 2. Checklist Context

- Ticket ID: `TODAY-003-R1`
- Ticket Name: `Quality Trendline Runtime Route Recovery`
- Affected Module: `F13 Dashboard / Quality Delivery Rate Trendline`
- Affected Screen / Menu: `Home -> F13 -> Dashboard`
- Route / URL: `http://localhost:5178/`
- Required Test Context: signed-in browser session using `admin / admin123`
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`

## 3. Data Conditions

- Required environment or login: local development runtime with backend available on `http://localhost:5050`
- Required date range: `2026-07-15` to `2026-07-15`
- Required dataset or seed state: a runtime payload exists for `2026-07-15` with `meta.record_count = 1`
- Any optional filters to set: leave BCVH filter at `all` unless the PO wants to test filter behavior separately
- Any known data gaps or limitations: missing calendar dates must remain gaps, not zero-filled values

## 4. Step-by-Step Checks

### Step 1

- Action: Open `http://localhost:5178/`
- Expected Result: The app loads and the login screen or authenticated session entry is available.

### Step 2

- Action: Sign in with `admin / admin123`
- Expected Result: The authenticated dashboard shell opens without errors.

### Step 3

- Action: Open `Home -> F13 -> Dashboard`
- Expected Result: The Quality Delivery Rate Trendline screen is visible.

### Step 4

- Action: Open browser DevTools and Network, then refresh the page
- Expected Result: Network requests are visible for `meta`, `kpi`, and `daily-trend`.

### Step 5

- Action: Confirm the `daily-trend` request resolves to the backend origin
- Expected Result: The request goes to `http://localhost:5050/api/f13/dashboard/daily-trend`.

### Step 6

- Action: Inspect the returned data for `2026-07-15`
- Expected Result: The payload shows actual runtime data, including `quality_rate = 67.2015` and `data_available = true`.

### Step 7

- Action: Confirm the chart display
- Expected Result: The chart shows the 90% target line and the actual daily point for `2026-07-15`.

### Step 8

- Action: Check adjacent missing dates in the series
- Expected Result: Missing dates remain gaps and are not converted to `0%`.

## 5. PASS / WARNING / FAIL Criteria

### PASS

- The screen loads successfully.
- Network traffic resolves to the backend.
- The chart displays the correct target line and actual data.
- No business rule or frozen contract was changed to make the screen work.

### WARNING

- The screen works, but the PO notices a non-blocking display issue or an acceptable contract edge case that needs follow-up.
- The issue must not change the runtime contract or the approved data semantics.

### FAIL

- The request does not resolve to the backend.
- The chart fails to show real data.
- Missing dates are zero-filled.
- Any contract, SSOT, or business rule was changed to force acceptance.

## 6. Follow-up Actions

- After PASS: record PO PASS in the review trail and keep the ticket at `READY FOR PO CHECK` until closure policy is satisfied.
- After WARNING: record the warning, link the responsible recovery ticket if needed, and keep the ticket open for recheck.
- After FAIL: keep the ticket open, log the failure in PO findings, and do not mark the module completed.

## 7. Documents To Update

- After PASS: `docs/06_REVIEWS/Import/TODAY-003-R1_QUALITY_TRENDLINE_RUNTIME_ROUTE_RECOVERY.md`, `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md` if any finding status changes
- After WARNING: `docs/06_REVIEWS/Import/TODAY-003-R1_QUALITY_TRENDLINE_RUNTIME_ROUTE_RECOVERY.md`, `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`, and the linked recovery ticket if one exists
- After FAIL: `docs/06_REVIEWS/Import/TODAY-003-R1_QUALITY_TRENDLINE_RUNTIME_ROUTE_RECOVERY.md`, `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`, and the responsible fix or recovery ticket

## 8. Authority Notes

- This checklist does not change SSOT.
- This checklist does not change frozen contracts.
- If a higher-authority document conflicts with this checklist, follow the higher-authority document and escalate the discrepancy.
