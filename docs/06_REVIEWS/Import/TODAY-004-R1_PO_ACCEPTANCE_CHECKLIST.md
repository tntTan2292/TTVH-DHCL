# TODAY-004-R1 PO Acceptance Checklist

## 1. Purpose

Let a Product Owner verify that the Operation Dashboard shows one combined 30-day Quality and Volume Combo Trendline instead of two separate charts.

## 2. Checklist Context

- Ticket ID: `TODAY-004-R1`
- Ticket Name: `Quality and Volume Combo Trendline Recovery`
- Affected Module: `Operation Dashboard / Combo Trendline`
- Affected Screen / Menu: `Operation Dashboard`
- Route / URL: `/f13/dashboard`
- Required Test Context: signed-in browser session using the local test account
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`

## 3. Data Conditions

- Required environment or login: local development runtime with backend available on `http://localhost:5050`
- Required date range: rolling 30-day window ending on the selected dashboard end date or latest available reporting date
- Required dataset or seed state: `GET /api/f13/dashboard/daily-trend` returns daily `total_volume`, `passed`, `failed`, and `quality_rate`
- Optional filters: approved dashboard BCVH filter
- Known data behavior: missing-date gaps must remain gaps and must not display as zero volume or zero quality

## 4. Step-By-Step Checks

### Step 1

- Action: Open `http://localhost:5178/f13/dashboard`.
- Expected Result: The Operation Dashboard loads.

### Step 2

- Action: Inspect the trendline section.
- Expected Result: One combined Quality and Volume Combo Trendline is visible. The previous two separate chart sections are not shown.

### Step 3

- Action: Open browser DevTools and refresh the page.
- Expected Result: The combo trendline uses a single `daily-trend` request for its chart data.

### Step 4

- Action: Inspect chart axes.
- Expected Result: Volume bars use the left Y-axis starting at 0, and quality rate uses the right Y-axis fixed to 0-100%.

### Step 5

- Action: Inspect the 90% target line.
- Expected Result: The target line is visible and aligned to the quality-rate axis.

### Step 6

- Action: Hover daily points.
- Expected Result: Tooltip shows date, volume, passed, failed, quality rate, target, and target variance.

### Step 7

- Action: Change the BCVH filter and date context.
- Expected Result: The rolling 30-day window and optional BCVH filter are preserved.

### Step 8

- Action: Check adjacent dashboard surfaces.
- Expected Result: KPI cards, executive summary, recommendations, daily brief, message, ranking, tables, and other analysis surfaces do not regress.

## 5. PASS / WARNING / FAIL Criteria

### PASS

- One combo chart replaces the rejected two-chart layout.
- Tooltip values match the runtime payload.
- Missing dates remain visual gaps.
- Existing dashboard surfaces remain stable.
- No frozen contract, SSOT, or unrelated behavior changed.

### WARNING

- Core behavior works, but a non-blocking display issue remains.
- The warning must be linked to a responsible follow-up ticket or document.

### FAIL

- The two-chart layout remains.
- More than one trendline data request is used for the combo chart.
- Missing data becomes zero.
- Existing dashboard analysis surfaces regress.
- Contract, SSOT, or frozen behavior is changed to force acceptance.

## 6. Follow-Up Actions

- After PASS: record PO PASS and proceed with closure policy.
- After WARNING: record the warning and keep the responsible follow-up visible.
- After FAIL: keep `TODAY-004-R1` open, update PO findings, and do not activate `TODAY-005`.
