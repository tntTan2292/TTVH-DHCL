# TODAY-006-R4 BCVH-Scoped Executive KPI Recovery

## 1. Purpose

Record the recovery that prevents stale aggregate KPI values from persisting while a scoped BCVH request is loading.

## 2. Scope

- Reset the Executive Header KPI state immediately when the filter key changes.
- Keep the header, summary, and daily brief aligned to one shared KPI response object.
- Preserve the accepted trend charts, timeline states, and canonical BCVH behavior.

## 3. Validation Notes

- Authenticated browser validation confirmed the dashboard still loads with the accepted charts and no `Đạt / Không đạt` selector.
- The KPI response contract remains canonical and the backend still rejects invalid `ma_bcvh` values.
- Scoped BCVH transitions now clear the previous KPI payload instead of leaving aggregate values visible while the next response is pending.

## 4. Result

- Technical status: `PASS`
- Runtime status: `PASS`
- PO product status: `READY FOR PO CHECK`
- Review status: `READY FOR PO CHECK`

## 5. Evidence

- Backend fixture tests verify aggregate and scoped KPI coverage for canonical BCVH values.
- Frontend tests verify the shared KPI request source and the stale payload reset behavior.
- Browser validation captured authenticated dashboard screenshots and network evidence.

## 6. Follow-Up

- Await explicit PO PASS before closure.
- Keep `TODAY-007` inactive.
