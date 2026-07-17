# TODAY-005 Same-Period Comparison Trendline Review

## Summary

This review records the implementation validation for the `TODAY-005` dashboard enhancement.

Validation status:

- frontend unit tests PASS
- backend daily-trend tests PASS with 23 passed
- build PASS
- lint PASS with existing warnings only
- authenticated browser PASS

The dashboard now consumes one shared daily-trend payload and derives both:

- the existing 30-day quality/volume combo chart
- the new 7-day same-period comparison card

## Scope

- Compare the current 7 calendar days ending on the selected `to_date`.
- Compare them with the immediately preceding 7 calendar days.
- Align the display by weekday/day position.
- Preserve missing calendar days as unavailable.
- Keep the existing accepted combo chart unchanged in behavior.

## Implementation Notes

- The dashboard page requests daily-trend data once.
- The 7-day comparison card derives its rows from the normalized 30-day dataset.
- The card uses two volume series, two quality lines, and a 90% target reference line.
- Missing values remain `null` and are not replaced with zero.

## Validation Results

- Current 7-day range: `2026-07-09` through `2026-07-15`
- Previous 7-day range: `2026-07-02` through `2026-07-08`
- Accepted 30-day chart preserved
- New 7-day card visible
- Exactly one daily-trend request
- Authenticated browser PASS
- frontend unit tests PASS
- backend daily-trend tests 23 passed
- build PASS
- lint PASS with existing warnings only

## Validation Targets

- Current 7-day range correctness
- Previous 7-day range correctness
- Weekday alignment
- Month/year boundary handling
- Equal period length
- Missing-date handling
- Volume delta
- Quality delta in percentage points
- All six canonical `ma_bcvh` values
- Aggregate `Tất cả BCVH`
- One shared daily-trend request
- No regression of the seven-option BCVH dropdown
- No `Đạt/Không đạt` selector

## Related Documents

- `docs/10_TICKETS/TODAY-005_MANIFEST.md`
- `docs/06_REVIEWS/Import/TODAY-005_PO_ACCEPTANCE_CHECKLIST.md`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
