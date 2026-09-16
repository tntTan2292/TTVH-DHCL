# F13-BCVH-MONTHLY-CUMULATIVE-01 Checkpoint 001

## Section 1 — Activation

Product Owner decision received in chat, 2026-09-15: **"Tạm dừng F4.1 và chuyển ưu tiên khẩn sang nâng cấp F1.3."** As part of that decision, the Product Owner named and authorized this ticket directly:

- Bổ sung "Lũy kế tháng hiện tại" (current-month cumulative) vào Operation Dashboard và BCVH Ranking.
- Hiển thị tổng thể tất cả BCVH (không chỉ theo một đơn vị).
- Đối chiếu với file Excel điều hành của Product Owner.
- Bổ sung trên chức năng hiện có — không xây lại Dashboard/BCVH Ranking.
- Không đổi KPI/SSOT của F1.3.
- Trạng thái kích hoạt: `DISCOVERY / READ-ONLY AUDIT`.
- Executor kế tiếp: `Antigravity (Gemini)`.

Baseline at activation: `19b0021` on branch `codex/da-impl-006`. Working tree otherwise carries only unrelated, untouched concurrent-session changes (`frontend/src/features/networkMap/*`, `backend/test_dkclSessionPreflightService.js`, `.claude/`, `Data QLML/`, root-level CSV/patch scratch files) — none touched by this activation.

This is a **governance activation only**, performed by Claude Code (Sonnet): no discovery, audit, design, or code work has been performed under this ticket yet. The actual read-only audit is explicitly assigned to the next executor, `Antigravity (Gemini)`.

## Section 2 — Scope Lock

In scope for the discovery phase (read-only):

1. How "current month" and "cumulative across all BCVH" would be computed from the existing `fact_f13` data and the existing F1.3 service layer (`backend/src/services/F13DashboardService.js`, `backend/src/services/bcvhOverviewService.js`), without altering either.
2. Reconciliation against the Product Owner's own operating Excel file — not yet supplied to this workspace; must be requested from the Product Owner before any figure is asserted. No structure or figure may be guessed.
3. Where a "Lũy kế tháng hiện tại" view fits into the existing `frontend/src/features/dashboard/DashboardPage.jsx` (Operation Dashboard) and `frontend/src/features/ranking/BcvhRankingPage.jsx` (BCVH Ranking) without disrupting either screen's current behavior.
4. A discovery report and, if warranted, a proposed (not yet authorized) data-contract/UI addition for a later, separately-authorized design/implementation phase.

Explicitly out of scope:

- Any product code, database, schema, or API change during discovery.
- Any change to the F1.3 KPI definition (`danh_gia_2026`), `data_blueprint.md`, `measurement.md`, or any other frozen SSOT document.
- Any change to F4.1 or `F41-DASHBOARD-MINIMUM-01` (separately `PAUSED BY PO PRIORITY`, unrelated).
- `F13-ROUTE-POSTMAN-IDENTITY-01` (separate, independent ticket registered by the same Product Owner decision — not merged into this ticket's scope, per explicit instruction that the two tickets are independent).

## Section 3 — Required Reading (for the next executor)

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` — current live state.
- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/` — the F1.3 SSOT package. `data_blueprint.md` and `measurement.md` define the KPI this ticket must not change; `business_rules.md` and `acceptance_criteria.md` define the existing operating rules a monthly-cumulative view must not contradict.
- Frontend: `frontend/src/features/dashboard/DashboardPage.jsx` and its `components/` directory (Operation Dashboard); `frontend/src/features/ranking/BcvhRankingPage.jsx` (BCVH Ranking).
- Backend: `backend/src/controllers/DashboardController.js`, `backend/src/services/F13DashboardService.js`, `backend/src/services/bcvhOverviewService.js`, `backend/src/repositories/FactBuuGuiRepository.js`.
- `backend/src/config/canonicalBcvhUnits.js` — the canonical 6-unit BCVH list already used by every existing F1.3 screen; any "all BCVH" view should reconcile against this same canonical set unless the audit finds a documented reason it must not.

## Section 4 — Completion State

`DISCOVERY / READ-ONLY AUDIT` — activated, not yet performed. Next step: `Antigravity (Gemini)` performs the read-only audit and returns findings to the Product Owner for a design/implementation authorization decision. Not self-activated by this checkpoint.


## Section 5 — PO Requirement Lock After Audit R1 (2026-09-16)

The Product Owner accepted the audit's separation of current-month cumulative and daily operations, then locked the target Operation Dashboard BCVH table:

- Identity: STT, Mã bưu cục, Tên bưu cục.
- Current-month cumulative: Sản lượng đo kiểm, Tỷ lệ đạt KPI 2026, rate movement versus the same elapsed period of the previous month.
- Daily operations: Sản lượng đo kiểm, Tỷ lệ đạt KPI 2026, rate movement versus the previous available fact date.
- `TỔNG CỘNG` appears first; six canonical BCVH rows follow.
- One common latest available fact date anchors every row.
- All rate movements use percentage points; missing comparison data is `—`.

This locks requirements only. The ticket remains `DISCOVERY TECHNICAL AUDIT COMPLETE / NOT READY FOR DESIGN / BLOCKED ON PO EXCEL`. No implementation, Design activation, KPI/SSOT change or PO PASS is granted.
