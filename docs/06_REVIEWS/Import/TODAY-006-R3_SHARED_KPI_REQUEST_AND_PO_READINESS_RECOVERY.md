# TODAY-006-R3 Shared KPI Request and PO Readiness Recovery

## 1. Purpose

Record the recovery that keeps the dashboard surfaces visible while collapsing KPI refreshes to one shared request per filter state.

## 2. Scope

- Share the KPI request across the dashboard consumers.
- Preserve the approved fourth KPI card as `Tỷ lệ Không đạt`.
- Keep the timeline mounted with explicit loading, error, and empty states.
- Keep the accepted 30-day and 7-day charts visible.

## 3. Validation Notes

- Authenticated browser validation confirmed the dashboard still loads the restored surfaces.
- The browser trace showed one KPI request for each selected BCVH state and one shared `daily-trend` request on the final aggregate state.
- The sampled runtime fixture returned the same KPI totals for the selected BCVH codes, so differing-source-data behavior is proven in tests rather than by the live seed.
- The dashboard still hides the `Đạt / Không đạt` selector and keeps the canonical BCVH options.
- The KPI payload contract still returns `total_bg`, `passed_rate`, `failed_rate`, and the legacy `f13_303_rate` field remains non-visible to the dashboard card mapping.

## 4. Result

- Technical status: `PASS`
- Runtime status: `PASS`
- PO product status: `READY FOR PO CHECK`
- Review status: `READY FOR PO CHECK`

## 5. Evidence

- Backend tests verify the KPI normalization path and invalid-code rejection.
- Frontend tests verify the timeline empty-state branch, KPI card contract, and shared request source coverage.
- Browser validation captured an authenticated dashboard screenshot and network trace at `/f13/dashboard`.

## 6. Follow-Up

- Await explicit PO PASS before closure.
- Keep `TODAY-007` inactive.
