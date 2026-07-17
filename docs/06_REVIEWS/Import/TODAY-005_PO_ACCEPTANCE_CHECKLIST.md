# TODAY-005 PO Acceptance Checklist

## 1. Purpose

Verify that the dashboard shows the accepted 30-day combo chart and the new same-period 7-day comparison card without adding duplicate daily-trend requests.

## 2. Checklist Context

- Ticket ID: `TODAY-005`
- Ticket Name: `Same-Period Comparison Trendline`
- Affected Module: `Leadership Dashboard`
- Affected Screen / Menu: `Executive Dashboard`
- Route / URL: `/f13/dashboard`
- Required Test Context: authenticated local dashboard session with current runtime data
- PO UI Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`

## 3. Data Conditions

- Required environment or login: authenticated dashboard session
- Required date range: latest available 30-day trend window ending on the selected `to_date`
- Required dataset or seed state: daily-trend payload that contains both complete and missing calendar days
- Any optional filters to set: each canonical `ma_bcvh` plus `Tất cả BCVH`
- Any known data gaps or limitations: missing days stay null and do not render as zero

## 4. Step-by-Step Checks

### Step 1

- Action: Open `/f13/dashboard`.
- Expected Result: The accepted 30-day combo chart is visible and loading/empty/error fallback states remain single-card and Vietnamese.

### Step 2

- Action: Confirm the new card titled `So sánh cùng kỳ 7 ngày` is displayed directly below the accepted combo chart.
- Expected Result: A single composed comparison chart is visible with seven x-axis positions and the 90% target line.

### Step 3

- Action: Switch the BCVH dropdown through all six canonical BCVH values and then back to `Tất cả BCVH`.
- Expected Result: All seven options work, the chart remains visible, and aggregate data is restored on `Tất cả BCVH`.

### Step 4

- Action: Inspect the tooltip on several positions in the 7-day card.
- Expected Result: The tooltip shows current/previous dates, current/previous volume, volume delta, current/previous quality, quality delta in điểm %, and the 90% target.

### Step 5

- Action: Check the browser network panel while the dashboard loads.
- Expected Result: Only one shared daily-trend request is issued for the dashboard charts.

### Validation Summary

- frontend unit tests PASS
- backend daily-trend tests 23 passed
- build PASS
- lint PASS with existing warnings only
- authenticated browser PASS
- exactly one daily-trend request
- current period `2026-07-09` through `2026-07-15`
- previous period `2026-07-02` through `2026-07-08`
- accepted 30-day chart preserved
- new 7-day card visible

## 5. PASS / WARNING / FAIL Criteria

### PASS

- Both charts are visible and render correctly.
- BCVH dropdown contains exactly seven options.
- No `Đạt/Không đạt` selector appears.
- Shared daily-trend request is used once.

### WARNING

- Data is partially missing, but missing days remain null and the period is clearly incomplete.

### FAIL

- The new card is missing.
- The 30-day combo chart regresses.
- The dropdown loses canonical values or adds the status selector.
- A second daily-trend request appears.

## 6. Follow-up Actions

- After PASS: record explicit PO PASS and close the ticket only after governance update.
- After WARNING: keep the ticket open for recheck.
- After FAIL: create or update the responsible recovery work and keep `TODAY-005` open.

## 7. Documents To Update

- `docs/10_TICKETS/TODAY-005_MANIFEST.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md`

## 8. Authority Notes

- Do not change SSOT from this checklist.
- Do not introduce new business rules.
- Use only the local environment setup or a secret manager reference for credentials.
- Escalate to the current manifest, snapshot, or Governance V1 fallback if the checklist conflicts with higher authority.
