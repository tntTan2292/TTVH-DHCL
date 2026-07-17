# TODAY-007 PO Acceptance Checklist

## 1. Purpose

Provide the concise manual Product Owner checklist for TODAY-007 after duplicate dashboard request recovery.

## 2. Test Context

- Module: F13 Operation Dashboard
- Screen: Executive Dashboard
- Route: `/f13/dashboard`
- Required context: authenticated user session with dashboard runtime data available
- Ticket state: `READY FOR PO CHECK`

## 3. PO Check Steps

1. Open `/f13/dashboard`.
2. Confirm the Executive Summary renders as four metric cards in a 2x2 layout.
3. Confirm there is no visible Executive Summary `Xếp hạng` card.
4. Confirm KPI cards remain populated with runtime values.
5. Confirm `Sản lượng và chất lượng phát - 30 ngày` remains visible.
6. Confirm `So sánh cùng kỳ 7 ngày` remains visible.
7. Confirm Quality Timeline, weekly pattern, monthly pattern, heatmap, ranking, message, and table surfaces remain visible.
8. Select `Tất cả BCVH` and each canonical BCVH option.
9. Confirm the canonical `ma_bcvh` URL context updates correctly.
10. Confirm the `Đạt / Không đạt` selector is absent.

## 4. PASS / WARNING / FAIL Criteria

- PASS: layout cleanup is acceptable, all listed dashboard surfaces remain visible, filters work, and no blocking visible regression is observed.
- WARNING: core dashboard is acceptable but a non-blocking visual issue should be tracked separately.
- FAIL: any accepted dashboard surface disappears, the Executive Summary rank card returns, filters break, or a blocking visible regression appears.

## 5. Result

- PO Check Required: `Yes`
- PO Product Status: `READY FOR PO CHECK`
- Codex Technical Status: `PASS`
- Codex Runtime Status: `PASS`
- PO PASS: pending explicit Product Owner decision
