# TODAY-004-R3 PO Acceptance Checklist

## 1. Purpose

Let a Product Owner verify that the Operation Dashboard BCVH dropdown is backed by stable canonical metadata and contains all required options.

## 2. Checklist Context

- Ticket ID: `TODAY-004-R3`
- Ticket Name: `Canonical BCVH Options Runtime Recovery`
- Route / URL: `/f13/dashboard`
- Required login: authenticated browser session
- PO UI Check Required: `Yes`
- PO Product Status: `PO UI ACCEPTANCE REQUIRED`

## 3. Step-By-Step Checks

### Step 1

- Action: Hard refresh `/f13/dashboard`.
- Expected Result: Dashboard loads and combo chart card remains visible.

### Step 2

- Action: Open Network evidence for `GET /api/f13/dashboard/meta`.
- Expected Result: response includes `data.bcvh_units` with exactly six canonical units.

### Step 3

- Action: Open the BCVH dropdown.
- Expected Result: exactly seven options are visible:
  - `Tất cả BCVH`
  - `BCVH A Lưới`
  - `BCVH Hương Thủy`
  - `BCVH Hương Trà`
  - `BCVH Phú Lộc`
  - `BCVH Thuận An`
  - `BCVH Thuận Hóa`

### Step 4

- Action: Confirm the status filter.
- Expected Result: no `Đạt/Không đạt` status selector appears on `/f13/dashboard`.

### Step 5

- Action: Select each BCVH unit one by one.
- Expected Result: URL preserves canonical `ma_bcvh`, the combo chart remains visible, and the rolling 30-day window remains unchanged.

### Step 6

- Action: Switch back to `Tất cả BCVH`.
- Expected Result: aggregate dashboard context returns.

## 4. PASS / FAIL Criteria

### PASS

- Metadata contains exactly six canonical BCVH units.
- Dropdown contains exactly seven options.
- No usable one-option dropdown appears when metadata is invalid.
- Status selector remains absent.
- Combo chart remains one chart and visible for all six selections.

### FAIL

- Dropdown shows only `Tất cả BCVH`.
- Any canonical BCVH unit is missing.
- Placeholder values such as `BC_HUE01` appear.
- Selecting a valid unit hides the chart.
- `TODAY-005` is activated before explicit PO PASS.

## 5. Follow-Up Actions

- After PASS: record PO PASS and proceed with closure policy.
- After FAIL: keep `TODAY-004-R3` active and register the next PO finding.
