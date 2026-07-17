# TODAY-006-R6 KPI Scoped Data Contract Recovery

## 1. Purpose

Record the direct database and HTTP proof that the active KPI contract returns scoped values when the stored data differs by BCVH.

## 2. Scope

- Verify the live runtime database grouped totals.
- Verify the live HTTP payloads for `all` and canonical BCVH codes.
- Keep the existing shared KPI request lifecycle and trend-chart behavior unchanged.

## 3. Validation Notes

- The live database contains the canonical BCVH codes plus two legacy identifiers in the queried range.
- The live backend now returns BCVH-specific KPI payloads after restart from the current source tree.
- The earlier zero-scope symptom was caused by an outdated runtime process, not the checked-in route/service/repository contract.

## 4. Result

- Technical status: `PASS`
- API Contract status: `PASS`
- PO product status: `READY FOR PO CHECK`
- Review status: `READY FOR PO CHECK`

## 5. Evidence

- Direct database query against `fact_f13` for the dashboard date range.
- Direct HTTP query against `GET /api/f13/dashboard/kpi` for `all` and each canonical BCVH code.
- Integration test against the live runtime database and backend API.

## 6. Follow-Up

- Await explicit PO PASS before closure.
- Keep `TODAY-007` inactive.
