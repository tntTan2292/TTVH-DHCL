# TODAY-004 PO Acceptance Checklist

## 1. Purpose

Let a Product Owner independently verify that the Volume Trendline renders daily shipment volume on the Operation Dashboard, uses the correct runtime data, and preserves existing dashboard behavior.

## 2. Checklist Context

- Ticket ID: `TODAY-004`
- Ticket Name: `Volume Trendline`
- Affected Module: `Operation Dashboard / Daily Total Shipment Volume Trendline`
- Affected Screen / Menu: `Operation Dashboard`
- Route / URL: `/f13/dashboard`
- Required Test Context: signed-in browser session using the local test account
- PO UI Check Required: `Yes`
- PO Product Status: `NOT READY`

## 3. Data Conditions

- Required environment or login: local development runtime with backend available on `http://localhost:5050`
- Required date range: authoritative contract-defined range for the implementation ticket
- Required dataset or seed state: runtime payload exists for the selected dashboard context
- Any optional filters to set: use the approved dashboard filter set as defined by the authoritative contract
- Any known data gaps or limitations: missing-date behavior must follow the authoritative contract and must not be invented in this checklist

## 4. Step-by-Step Checks

### Step 1

- Action: Open `http://localhost:5178/`
- Expected Result: The application loads and the authenticated dashboard entry is available.

### Step 2

- Action: Open `Operation Dashboard`
- Expected Result: The dashboard shell renders without layout breakage.

### Step 3

- Action: Open browser DevTools and Network, then refresh the page
- Expected Result: Network requests are visible for dashboard meta, KPI, and daily trend data.

### Step 4

- Action: Inspect the volume trendline data request
- Expected Result: The trendline resolves through the approved backend route and returns runtime data.

### Step 5

- Action: Inspect the chart tooltip and date labels
- Expected Result: Tooltip values clearly show daily shipment volume and the chart is date-based.

### Step 6

- Action: Verify the chart against the runtime payload
- Expected Result: The visible volume values match the backend response.

### Step 7

- Action: Check adjacent dashboard analysis surfaces
- Expected Result: KPI cards, Quality Trendline, heatmap, frequency charts, rankings, and tables do not regress.

## 5. PASS / WARNING / FAIL Criteria

### PASS

- The screen loads successfully.
- The chart displays daily shipment volume correctly.
- Tooltip values match the backend payload.
- Existing dashboard analysis surfaces remain visible and stable.
- No frozen contract was changed to make the screen work.

### WARNING

- The core behavior works, but a non-blocking display issue or acceptable contract edge case remains.
- The warning must be linked to a responsible recovery ticket or follow-up doc.

### FAIL

- The chart does not render runtime data.
- The route does not resolve to the backend.
- Existing dashboard analysis surfaces regress unexpectedly.
- Any contract, SSOT, or business rule was changed to force acceptance.

## 6. Follow-up Actions

- After PASS: record PO PASS in the review trail and keep the ticket open until closure policy is satisfied.
- After WARNING: record the warning and link the responsible recovery ticket if needed.
- After FAIL: keep the ticket open, log the failure in PO findings, and do not mark the module completed.

## 7. Documents To Update

- After PASS: `docs/06_REVIEWS/Import/TODAY-004_ACTIVE_MANIFEST_REMEDIATION.md`, `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md` if any finding status changes
- After WARNING: `docs/06_REVIEWS/Import/TODAY-004_ACTIVE_MANIFEST_REMEDIATION.md`, `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`, and the linked recovery ticket if one exists
- After FAIL: `docs/06_REVIEWS/Import/TODAY-004_ACTIVE_MANIFEST_REMEDIATION.md`, `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`, and the responsible fix or recovery ticket

## 8. Authority Notes

- This checklist does not change SSOT.
- This checklist does not change frozen contracts.
- If a higher-authority document conflicts with this checklist, follow the higher-authority document and escalate the discrepancy.
