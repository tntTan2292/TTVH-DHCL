# F13-BCVH-RANKING-REDESIGN-IMPL Manifest

- Ticket ID: `F13-BCVH-RANKING-REDESIGN-IMPL`
- Ticket Name: `BCVH Ranking Redesign Implementation`
- Phase: `F1.3 Operational Module`
- Current state: `COMPLETED / PO PASS / CLOSED`
- Technical Status: `WAVE 1 + WAVE 2 COMPLETE`
- Runtime Status: `RUNTIME PO VERIFICATION COMPLETE`
- PO UI Check Required: `No - Product Owner verification completed`
- PO Product Status: `PO PASS`
- Activation authority: `PO APPROVE the BCVH Ranking redesign agreed in planning session`
- Handoff date: `2026-07-29`
- Closure date: `2026-07-29`
- Latest verified implementation commit: `a6235b2fc99fd662971a7c0fc9d7f43190b133b4`
- Primary executor: `Codex`
- Secondary executor: `Antigravity only if a later explicit UI-polish follow-up is requested after runtime-backed implementation is stable`

## Fresh-Chat Onboarding Authority

Required onboarding chain:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`
5. Required Reading from this manifest

Required Reading:

- `docs/06_REVIEWS/BCVH/F13_BCVH_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md`
- `docs/06_REVIEWS/BCVH/F13_BCVH_RANKING_REDESIGN_IMPL_WAVE1_CHECKPOINT_001.md`
- `docs/06_REVIEWS/BCVH/F13_BCVH_RANKING_REDESIGN_IMPL_WAVE2_CHECKPOINT_001.md`
- `docs/06_REVIEWS/Dashboard/DA-IMPL-004_UNIFIED_BCVH_ANALYSIS_TABLE.md`
- `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md`
- `docs/07_REFERENCE/Shared_Business/F13_INTERNAL_ROUTE_CATALOG.md`
- `docs/04_TECHNICAL_PLANNING/F13_OPERATIONAL_CAPABILITY_AUDIT.md`
- `docs/10_TICKETS/F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md`

## Product Owner Scope Locked

Implement only the approved BCVH Ranking redesign documented in `F13_BCVH_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md`.

This manifest now records that both implementation waves are complete, runtime PO verification is complete, the Product Owner recorded `PO PASS`, and the ticket is closed.

The accepted product contract preserves:

- Dashboard SSOT
- semantic colors
- existing business thresholds
- confirmed non-postman route exclusions
- current Route Ranking route-context contract
- current D-1 and D-7 comparison semantics only where already supported

## Final Accepted Product Contract

- Dashboard BCVH table remains the original compact overview surface.
- `/f13/ranking/bcvh` remains the detailed independent ranking surface.
- `D-1` and `D-7` each render exactly:
  - `Sản lượng`
  - `Tỷ lệ`
  - `SS SL`
  - `SS Tỷ lệ`
- comparison-rank and rank-movement columns are not rendered on the BCVH Ranking screen.
- table block order remains:
  - `Đơn vị`
  - `Kết quả ngày đánh giá`
  - `Chậm nộp tiền`
  - `So sánh D-1`
  - `So sánh D-7`
  - `Phân bổ tuyến`
  - `Hành động`
- KPI 2026 labels remain:
  - `Tốt`
  - `Cần chú ý`
  - `Cảnh báo`
  - `Rủi ro cao`
- route-distribution labels remain:
  - `Tốt`
  - `Khá`
  - `Trung bình`
  - `Kém`
- visibility rule remains:
  - raw `Sản lượng` and raw `Tỷ lệ` in `D-1` / `D-7` may be hidden
  - `SS SL` and `SS Tỷ lệ` remain visible
- delayed-cash SSOT remains:
  - denominator includes selected-day canonical BCVH facts with `danh_gia_2026 != Đạt`
  - delayed only when valid `thoi_gian_ptc` and `thoi_gian_nop_tien` both exist and the gap is strictly greater than `3` hours
  - missing or invalid timestamps remain in the denominator but are not delayed
  - zero denominator publishes `0%`
- accepted runtime evidence for `2026-07-28`:
  - delayed numerator `334`
  - eligible denominator `1536`
  - delayed rate `21.7%`

## In Scope

- Preserve the completed Wave 1 backend/runtime contract documented in `F13_BCVH_RANKING_REDESIGN_IMPL_WAVE1_CHECKPOINT_001.md`.
- Preserve the completed Wave 2 frontend presentation documented in `F13_BCVH_RANKING_REDESIGN_IMPL_WAVE2_CHECKPOINT_001.md`.
- Reuse the existing runtime fields without changing formulas or thresholds.
- Preserve existing route drill-down parameters and current Route Ranking exclusions/behavior.
- Close the ticket as completed and preserve the accepted contract and evidence for fresh onboarding.

## Out Of Scope

- Product-code changes outside the BCVH Ranking redesign boundary.
- New KPI formulas, new business thresholds, or new color semantics.
- Schema changes, historical fact-data changes, or Import changes.
- Reopening Dashboard, Route Ranking, Shipment, Data Quality, or Import tickets.
- Broad repository audit.
- Antigravity-led final visual polish unless separately authorized after runtime-backed implementation is stable.

## Technical Contract Direction

- Use the current BCVH ranking endpoint as the base contract: `GET /api/f13/ranking/bcvh`.
- Reuse existing accepted D-1 and D-7 comparison delta fields: `kpi_2026_dod`, `kpi_2026_swc`.
- Consume the Wave 1 runtime contract additions from `F13_BCVH_RANKING_REDESIGN_IMPL_WAVE1_CHECKPOINT_001.md`.
- Preserve current route drill-down params: `from_date`, `to_date`, `interval`, `bcvh_id`, `bcvh_name`.
- Preserve the `7` confirmed non-postman/customer-pickup routes as excluded from participating postman-route counts.
- Do not reopen backend/runtime formulas, thresholds, exclusions, or accepted semantics unless explicit new authority is granted.

### Delivery Lock

Wave 1 completed the backend/runtime scope for:

- raw `San luong D-1`
- raw `San luong D-7`
- raw `Ty le F1.3 D-1`
- raw `Ty le F1.3 D-7`
- `Delta san luong D-1`
- `Delta san luong D-7`
- `Hang D-1`
- `Hang D-7`
- `Dich chuyen hang D-1`
- `Dich chuyen hang D-7`
- `BG cham nop tien`
- `So tuyen buu ta tham gia`
- `Tuyen xanh`
- `Tuyen vang`
- `Tuyen do`

Authority now explicitly confirms BCVH rank-movement semantics:

- current rank lower than comparison rank = improvement
- current rank higher than comparison rank = decline
- equal = unchanged

Wave 2 completed the frontend scope for:

- grouped BCVH ranking table
- current-day fields
- separate `D-1` and `D-7` grouped columns
- allowed hide/show behavior for raw comparison columns only
- independent KPI, late-cash, and rank-movement signals
- green / pink / yellow / red route columns
- 4-segment doughnut
- inline `Phan tich BCVH`
- preserved Route Ranking drill-down context
- factual unavailable states without fallback calculations

Latest bounded PO remediation also completed:

- runtime-backed operational KPI widgets for evaluation-day volume, F1.3 quality, delayed cash handover, and 4-band route-quality distribution
- compact doughnut bound to the same green / pink / yellow / red runtime distribution counts
- removal of visible technical/explanatory placeholder cards
- factual no-data state with selected date, supported nearest available date, and `Xem ngay gan nhat` when metadata support exists

## Documents To Update

- `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md`
- implementation review/checkpoint document(s) created under `docs/06_REVIEWS/BCVH/`
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `README_AI.md` if the active handoff/current manifest changes
- `PROJECT_PROGRESS.md`
- `PROJECT_STATUS.md`
- `docs/01_GOVERNANCE/PROJECT_HANDOVER.md`
- `docs/01_GOVERNANCE/PROJECT_CONTEXT.md`

## Validation

- Final accepted implementation evidence:
  - `node --test backend/src/services/F13DashboardService.recovery.test.js`
  - `node --test frontend/src/features/dashboard/components/dashboardComposition.smoke.test.js frontend/src/features/dashboard/components/dashboardStaleKpiRecovery.test.js frontend/src/features/dashboard/components/unifiedBcvhAnalysisTableData.test.js`
  - `npm.cmd run build`
  - `npm.cmd run lint`
- Governance closure validation:
  - fresh authority-chain reread from `README_AI.md`
  - document state synchronization for `PO PASS`
- `git diff --check`
- Remote verification of the pushed commit and active onboarding Blob URLs.
- Fresh onboarding simulation starting from `README_AI.md`.

## PO Acceptance

Product Owner decision recorded: `PO PASS`.

## Next Ticket

- Next ticket ID: `None currently authorized`
- Blockers or handoff notes:
  - Project is awaiting Product Owner direction for the next authorized ticket.
  - Do not reopen this ticket, Dashboard isolation, or Import remediation without explicit new authority.

## Handoff

This manifest is now a closure record. A fresh executor must read the onboarding chain, confirm that `F13-BCVH-RANKING-REDESIGN-IMPL` is `COMPLETED / PO PASS / CLOSED`, preserve the accepted BCVH Ranking and Dashboard contracts, and wait for a newly authorized ticket before implementing more work.
