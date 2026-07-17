# TODAY-008 PO Acceptance Checklist

## 1. Ticket

- Ticket ID: `TODAY-008`
- Ticket name: `PO Data Reconciliation and Leadership View`
- PO UI Check Required: `Yes`
- Current PO Product Status: `READY FOR PO CHECK`
- Checklist date: `2026-07-17`

## 2. Test Context

- Import route: `/import`
- Dashboard route: `/f13/dashboard`
- Selected import log: `118`
- Import file: `F1.3-2026.07.15.xlsx`
- Data date: `2026-07-15`
- Aggregate context: `Tất cả BCVH`
- Canonical BCVH spot-check: `535790`

## 3. Expected Values

### Import Row

| Field | Expected value |
| --- | --- |
| File | `F1.3-2026.07.15.xlsx` |
| Date | `2026-07-15` |
| Total records | `3677` |
| Skipped records | `0` |
| Error records | `0` |
| Status | `Thành công` |

### Dashboard Aggregate Context

| Surface | Expected value |
| --- | --- |
| URL context | `from_date=2026-07-15&to_date=2026-07-15&ma_bcvh=all` |
| KPI total | `3677` |
| KPI `Tỷ lệ đạt` | `67.2%` |
| KPI `Tỷ lệ Không đạt` | `28.2%` |
| Daily trend total volume | `3677` |

### Dashboard BCVH `535790`

| Surface | Expected value |
| --- | --- |
| KPI total | `96` |
| KPI `Tỷ lệ đạt` | `71.9%` |
| KPI `Tỷ lệ Không đạt` | `26%` |
| Daily trend total volume | `96` |

## 4. Manual PO Steps

1. Open `/import`.
2. Locate the successful import row for `F1.3-2026.07.15.xlsx` and date `2026-07-15`.
3. Confirm the row shows `3677` total records, `0` skipped records, `0` error records, and status `Thành công`.
4. Click `Đối chiếu Dashboard`.
5. Confirm the browser opens `/f13/dashboard` with `from_date=2026-07-15`, `to_date=2026-07-15`, and `ma_bcvh=all`.
6. Confirm the dashboard aggregate KPI and daily trend values match the expected aggregate values above.
7. Select BCVH `535790`.
8. Confirm the dashboard KPI and daily trend values match the expected BCVH values above.
9. Confirm the accepted 30-day chart, accepted 7-day comparison chart, timeline, ranking/table surfaces, KPI cards, and filters remain visible.
10. Confirm there is no visible `Đạt / Không đạt` selector and no Executive Summary `Xếp hạng` KPI card.

## 5. PO Decision Criteria

- `PASS`: Import row, dashboard URL context, aggregate values, BCVH scoped values, and accepted dashboard surfaces match this checklist.
- `WARNING`: Reconciliation values match, but the PO observes a minor wording, spacing, or usability concern that does not block acceptance.
- `FAIL`: The import row cannot be reconciled to dashboard values, dashboard context is wrong, accepted surfaces disappear, or prohibited controls/cards return.

## 6. PO Decision

- PO Product Status: `PENDING PO DECISION`
- PO decision must be recorded explicitly by the Product Owner.
- Codex must not self-award PO PASS.
