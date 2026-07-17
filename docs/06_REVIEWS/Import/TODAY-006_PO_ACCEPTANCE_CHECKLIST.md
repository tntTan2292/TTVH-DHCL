# TODAY-006 PO Acceptance Checklist

## 1. Purpose

Verify the dashboard restores the approved analysis surfaces without regressing the accepted trend charts or BCVH behavior.

## 2. Checklist Context

- Ticket ID: `TODAY-006`
- Ticket Name: `Restore and Preserve Existing Dashboard Charts`
- Affected Module: `Leadership Dashboard`
- Affected Screen / Menu: `Executive Dashboard`
- Route / URL: `/f13/dashboard`
- Required Test Context: authenticated local dashboard session with current runtime data
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`

## 3. Data Conditions

- Required environment or login: authenticated dashboard session
- Required date range: current runtime dashboard window
- Required dataset or seed state: runtime payload with complete and missing days for daily-trend, plus ranking and timeline data
- Any optional filters to set: all canonical `ma_bcvh` values and `Tất cả BCVH`
- Any known data gaps or limitations: missing days stay null and are not fabricated

## 4. Step-by-Step Checks

### Step 1

- Action: Open `/f13/dashboard`.
- Expected Result: KPI cards show runtime values instead of `--`.

### Step 2

- Action: Inspect the analysis surfaces below the header.
- Expected Result: The accepted 30-day combo chart, the 7-day same-period comparison chart, the weekly frequency chart, the monthly heatmap, and the ranking table surface are visible.

### Step 3

- Action: Switch the BCVH dropdown through all six canonical BCVH values and then back to `Tất cả BCVH`.
- Expected Result: All seven options work, the canonical `ma_bcvh` context is preserved, and the dashboard surfaces remain stable.

### Step 4

- Action: Inspect the accepted charts and the timeline tooltips.
- Expected Result: The 30-day and 7-day charts remain correct, missing dates remain null, and Vietnamese labels are preserved.

### Step 5

- Action: Check the browser network panel while the dashboard loads.
- Expected Result: Only one shared `daily-trend` request is issued for the accepted chart pair.

## 5. PASS / WARNING / FAIL Criteria

### PASS

- Runtime KPI cards are populated.
- The monthly heatmap and weekly frequency chart are visible.
- The ranking table surface is visible.
- The accepted trend charts remain correct.
- The BCVH dropdown contains exactly seven options.
- No `Đạt/Không đạt` selector appears.
- Only one `daily-trend` request appears.

### WARNING

- Some data is missing, but the missing-day semantics remain null and clearly represented.

### FAIL

- KPI cards remain placeholders.
- The heatmap, frequency chart, or ranking surface is missing.
- The accepted charts regress.
- A second `daily-trend` request appears.
- The BCVH dropdown loses canonical values or shows the status selector.

## 6. Follow-Up Actions

- After PASS: update governance and close the ticket only after explicit PO PASS.
- After WARNING: keep the ticket open for recheck.
- After FAIL: create or update the responsible recovery work and keep `TODAY-006` open.

## 7. Documents To Update

- `docs/10_TICKETS/TODAY-006_MANIFEST.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`

## 8. Authority Notes

- Do not change SSOT from this checklist.
- Do not introduce new business rules.
- Escalate to the current manifest or snapshot if the checklist conflicts with higher authority.
