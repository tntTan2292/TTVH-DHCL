# TODAY-004-R2 PO Acceptance Checklist

## 1. Purpose

Let a Product Owner verify the Operation Dashboard BCVH filter and 30-day combo trendline recovery.

## 2. Checklist Context

- Ticket ID: `TODAY-004-R2`
- Ticket Name: `BCVH Filter and Combo Trendline Recovery`
- Route / URL: `/f13/dashboard`
- Required login: authenticated browser session
- PO UI Check Required: `Yes`
- PO Product Status: `PO UI ACCEPTANCE REQUIRED`

## 3. Step-By-Step Checks

### Step 1

- Action: Open `/f13/dashboard`.
- Expected Result: The dashboard loads and the combo chart card is visible.

### Step 2

- Action: Open the BCVH filter.
- Expected Result: It shows `Tất cả BCVH` plus exactly six units: `BCVH A Lưới`, `BCVH Hương Thủy`, `BCVH Hương Trà`, `BCVH Phú Lộc`, `BCVH Thuận An`, and `BCVH Thuận Hóa`.

### Step 3

- Action: Confirm the status filter.
- Expected Result: No `Đạt/Không đạt` status selector appears on `/f13/dashboard`.

### Step 4

- Action: Select each BCVH unit one by one.
- Expected Result: The request includes rolling 30-day `from_date`, rolling 30-day `to_date`, and canonical `ma_bcvh`; the combo chart card remains visible.

### Step 5

- Action: Switch back to `Tất cả BCVH`.
- Expected Result: Aggregate chart data is restored and the chart remains visible.

### Step 6

- Action: Inspect adjacent dashboard surfaces.
- Expected Result: KPI cards, executive summary, recommendations, daily brief, message, ranking, and placeholders do not regress.

## 4. PASS / WARNING / FAIL Criteria

### PASS

- Six canonical BCVH units plus `Tất cả BCVH` are visible.
- Status selector is absent on `/f13/dashboard`.
- Each BCVH selection keeps a valid 30-day combo chart.
- Missing dates remain gaps, not zeroes.
- Only one `daily-trend` request powers the chart.

### FAIL

- Placeholder BCVH codes appear.
- The `Đạt/Không đạt` selector remains.
- Selecting any valid BCVH hides the chart or breaks the request.
- `TODAY-005` is activated before explicit PO PASS.

## 5. Follow-Up Actions

- After PASS: record PO PASS and proceed with closure policy.
- After FAIL: keep `TODAY-004-R2` active and register the next PO finding.
