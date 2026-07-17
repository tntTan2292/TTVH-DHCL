# TODAY-006-R1 Runtime KPI and Stable Dashboard Surfaces Recovery

## 1. Purpose

Record the recovery that restores the authoritative KPI route contract and keeps the dashboard surfaces mounted during loading, empty, and error states.

## 2. Scope

- Forward canonical `ma_bcvh` through the KPI route.
- Keep `all` as aggregate.
- Remove the invented `f13_303_rate` to `Xếp hạng` dashboard mapping.
- Keep timeline, weekly frequency, monthly heatmap, and ranking surfaces mounted during failure states.

## 3. Validation Notes

- The KPI route now receives `ma_bcvh` end-to-end.
- The fourth KPI card now shows the approved runtime field label `Tỷ lệ Không đạt`.
- The timeline panel keeps mounted fallback cards on loading and error states.
- The accepted 30-day and 7-day charts remain driven by one shared `daily-trend` request.

## 4. Result

- Technical status: `FAIL`
- Runtime status: `NOT PROVEN`
- PO product status: `NOT READY`
- Review status: `NOT READY`

## 5. Evidence

- Backend recovery tests verify filtered and aggregated KPI paths.
- Frontend source assertions verify the dashboard no longer maps `f13_303_rate` to `Xếp hạng`.
- Frontend source assertions verify stable KPI and timeline fallback states.

## 6. Follow-Up

- Await explicit PO PASS before closure.
- Keep `TODAY-007` inactive.
