# TODAY-006-R2 Aggregate KPI Context and Runtime Validation Recovery

## 1. Purpose

Record the recovery that normalizes KPI BCVH context and preserves stable dashboard runtime surfaces.

## 2. Scope

- Normalize `ma_bcvh` at the controller/service boundary.
- Keep `all` aggregate and reject unknown codes.
- Preserve the fourth KPI card as `Tỷ lệ Không đạt`.
- Keep the timeline mounted with explicit loading, error, and successful empty states.

## 3. Validation Notes

- Controller now rejects unknown BCVH codes with Vietnamese validation text.
- Repository never receives `"all"` as a SQL parameter.
- Timeline now shows a stable empty state when the request succeeds but no usable data exists.

## 4. Result

- Technical status: `PASS`
- Runtime status: `NOT PROVEN`
- PO product status: `READY FOR PO CHECK`
- Review status: `READY FOR PO CHECK`

## 5. Evidence

- Backend tests verify aggregate and filtered KPI normalization.
- Frontend tests verify the timeline empty-state branch and KPI label contract.
- Browser validation is still required with a real installed browser executable.

## 6. Follow-Up

- Await explicit runtime evidence before closing.
- Keep `TODAY-007` inactive.
