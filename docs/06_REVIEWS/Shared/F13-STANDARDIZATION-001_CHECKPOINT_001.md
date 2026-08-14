# F13-STANDARDIZATION-001 — CHECKPOINT 001

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Program State](#2-program-state)
- [3. Baseline](#3-baseline)
- [4. Allowed Scope](#4-allowed-scope)
- [5. Locked Scope](#5-locked-scope)
- [6. Required Reading](#6-required-reading)
- [7. Exact Next Action](#7-exact-next-action)
- [8. Proposed Executor](#8-proposed-executor)
- [9. Next PO Gate](#9-next-po-gate)
- [10. Current Blockers](#10-current-blockers)
- [11. Route Ranking Delta Closure](#11-route-ranking-delta-closure)
- [12. Evidence / Chi tiết bưu gửi Discovery Delta](#12-evidence--chi-tiết-bưu-gửi-discovery-delta)
- [13. Evidence / Chi tiết bưu gửi Implementation](#13-evidence--chi-tiết-bưu-gửi-implementation)
- [14. Evidence / Chi tiết bưu gửi PO Runtime Check Pass — Closure](#14-evidence--chi-tiết-bưu-gửi-po-runtime-check-pass--closure)
- [15. Evidence Product-Value Audit](#15-evidence-product-value-audit)
- [16. Evidence Consolidation Plan](#16-evidence-consolidation-plan)
- [17. Evidence Consolidation Phase 1 Implementation](#17-evidence-consolidation-phase-1-implementation)
- [18. Evidence Consolidation Phase 1 Remediation](#18-evidence-consolidation-phase-1-remediation)
- [19. Evidence Consolidation PO Finding Locked Into Phase 2](#19-evidence-consolidation-po-finding-locked-into-phase-2)
- [20. Date-Filter Cross-Module Remediation](#20-date-filter-cross-module-remediation)
- [21. Evidence Consolidation Phase 1 — Formal Closure](#21-evidence-consolidation-phase-1--formal-closure)
- [22. Frozen-Document Governance Delta — Execution](#22-frozen-document-governance-delta--execution)
- [23. Evidence Consolidation Phase 2 — Implementation](#23-evidence-consolidation-phase-2--implementation)
- [24. Evidence Consolidation Phase 2 — Runtime Recheck FAIL + Search-Result Remediation](#24-evidence-consolidation-phase-2--runtime-recheck-fail--search-result-remediation)
- [25. Evidence Consolidation Phase 2 — Full-Screen PO Acceptance, Formal Closure](#25-evidence-consolidation-phase-2--full-screen-po-acceptance-formal-closure)
- [26. Phase 3 — Rewire Tuyến Ranking + Redirect Old Path](#26-phase-3--rewire-tuyến-ranking--redirect-old-path)

## 1. Purpose

This checkpoint is the current-state entry point for `F13-STANDARDIZATION-001`. It exists so a fresh AI session can immediately answer: is the program active, which Phase is current, what has closed, what baseline applies, what is permitted, what is locked, what to read, and what to do next.

## 2. Program State

| Field | Value |
| --- | --- |
| Program | `F13-STANDARDIZATION-001` |
| Program State | `EVIDENCE CONSOLIDATION — PHASE 1 REMEDIATION READY FOR PO RECHECK; PO Finding locked into Phase 2 scope, not implemented` (as of `2026-08-12`, Section 19 / manifest Section 24) — Phase 0-4 of the five-phase program plan unaffected, program itself remains open/not fully closed, delta scope only |
| Current Phase | `PHASE 0 — foundational items implemented (commits `e3ca2429`, `a0d4b041`), technical validation PASS; no standalone Product Owner runtime confirmation was recorded for this scope specifically` |
| Phase 0 Implementation Performed | `Yes, partially` — KPI field standardization (`danh_gia_2026`), the two audited `/f13` API path fixes, and `dd/MM/yyyy` timestamp parsing were implemented and technically validated; not separately PO-runtime-confirmed as its own closure |
| Phase 1 | `PLANNED / NOT ACTIVE` — not started; PO Gate 1 has not been reached |
| Phase 2 | `PLANNED / NOT ACTIVE` for its full scope (Operation Dashboard, BCVH Ranking) — **except** the Tuyến Ranking item, executed and closed out of the original five-phase sequence as a bounded delta (Section 11) |
| Phase 3 | `PLANNED / NOT ACTIVE` |
| Phase 4 | `PLANNED / NOT ACTIVE` |
| Phases Completed | `None` — no Phase has met its full locked exit criteria; only the Tuyến Ranking delta item within Phase 2's scope is closed |
| PO Gates Passed | `None` — PO Gate 1 requires Phase 1 completion, which has not occurred |

## 3. Baseline

- Authoritative baseline commit at program activation: `e6deae006387d2086360b1354e40295518fc0851`
- Branch: `codex/da-impl-006`
- At activation time, local `HEAD` and `origin/codex/da-impl-006` both matched this baseline exactly; no delta governance read was required.
- Last closed ticket before this activation: `F13-DATA-2098-CLEANUP-IMPL` — `COMPLETED / TECHNICAL PASS / CLOSED`, reviewed implementation commit `3b605beb7ed2deeae239dbb050cf9b03fbad9c43`.
- Latest Product Owner-tested implementation commit (Route Ranking delta closure, Section 11): `03ce28bacc36b49d961caa1c006a011beb804bc7`.

## 4. Allowed Scope

For this documentation-activation step only:

- Create the activation package (this checkpoint, the program manifest, and required live-state updates).
- Lock the five-phase plan defined in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 6.
- Set Phase 0 to `AUTHORIZED / READY FOR IMPLEMENTATION` without performing any Phase 0 work.

## 5. Locked Scope

Not permitted under this checkpoint or this ticket's current activation step:

- Any Phase 0 implementation (KPI-field remediation, data/API fixes, unified KPI source lock).
- Any Phase 1-4 work of any kind.
- Product code changes.
- Database or business-data changes.
- Broad audits beyond what is already on record from prior closed audits.
- Activating any ticket other than `F13-STANDARDIZATION-001`.
- Adding scope items not present in the Product Owner-approved plan.

Locked product decisions and locked out-of-scope items are recorded once in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Sections 7-8 and are not duplicated here; read them there.

## 6. Required Reading

1. `README_AI.md`
2. `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md`
3. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
4. `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` (Current Manifest)
5. This checkpoint (Current Checkpoint)
6. Phase 0 required reading (once Phase 0 discovery begins): `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md` and `docs/06_REVIEWS/Shared/F13-DATA-2098-CLEANUP-IMPL_CHECKPOINT_001.md`

## 7. Exact Next Action

`No active ticket / Awaiting Product Owner direction.` The Route Ranking delta item is closed (Section 11). No next ticket, Phase, or scope is authorized or self-activated by this closure. Phase 1 (Section 6 of the manifest) remains the next item in the original five-phase sequence, but starting it requires explicit Product Owner authorization, not inference from this closure.

## 8. Proposed Executor

Claude Code (Sonnet) — discovery, implementation, tests, and documentation, per the executor plan in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 9. Antigravity owns runtime/UI validation when Phase 0 or later phases produce UI-visible change.

## 9. Next PO Gate

No PO Gate has been passed. The first PO Gate (Gate 1) is defined to sit after Phase 1 closes, per `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 10, and Phase 1 has not started. The Route Ranking delta closure (Section 11) carries its own explicit Product Owner PO PASS, evidenced there, but is not PO Gate 1 and does not substitute for it.

## 10. Current Blockers

None. The Route Ranking delta item is closed. The program returns to `NO ACTIVE TICKET / AWAITING PRODUCT OWNER DIRECTION` for whatever scope the Product Owner authorizes next — including, but not limited to, formally starting Phase 1.

## 11. Route Ranking Delta Closure

Between the original Phase 0 activation and this closure, the Product Owner authorized a bounded delta scope covering only the Tuyến Ranking (Route Ranking) screen and its violation drill-down — executed and documented as an in-branch delta, not as a separately named ticket. This section is the closure record for that delta.

**Product Owner result (`2026-08-04`): `PO PASS / CLOSED`.**

- Tuyến Ranking (`/f13/ranking/route`) and the violation drill-down detail window (`/f13/ranking/route/violations`) were runtime-tested by the Product Owner.
- Pagination confirmed correct: `10 tuyến/trang`.
- Default sort confirmed correct: ascending by `Tỷ lệ đạt` (`passed_rate`), so the weakest-performing route ranks first.
- Page navigation and the reconciliation (đối soát) table confirmed working correctly.

**Implementation chain (main commits, in order):**

1. `a892a276310705920cb298264ebfeb2db3ae64da` — violation-reason classification (Chậm nộp tiền / Không đạt khác / Chưa xác định nguyên nhân) and the corresponding `/f13/evidence-list` API contract (`violation_reason`, `meta.violation_summary`, `reason` filter).
2. `6e5753089ccda7b4f90706c32ed1482be3aadb12` — UI/UX refinement of the Tuyến Ranking table and the violation drill-down detail window (Antigravity).
3. `03ce28bacc36b49d961caa1c006a011beb804bc7` — frontend pagination (`10 tuyến/trang`) and default ascending `passed_rate` sort, confirmed by this PO PASS.

Supporting prior commits on the same branch that this delta built on: `e3ca24292f39b5c59022b161b63c4603cced1949` (Phase 0 foundations: KPI field, API path, timestamp parsing) and `a0d4b041573798b08eb2992698bdc9cc20031083` (Route Ranking data-contract standardization and the first violation drill-down).

**Scope discipline:** this closure covers only the Tuyến Ranking screen and its violation drill-down. It does not close Operation Dashboard, BCVH Ranking, Pareto/RCA, Evidence, Message Center, or Shipment Performance Center, and it does not close Phase 0, Phase 1, Phase 2 in full, Phase 3, Phase 4, or the `F13-STANDARDIZATION-001` program as a whole. The Shipment Performance Center delta remains preserved, untouched, in `stash@{0}` (`F13-SHIPMENT-001: preserved Shipment Performance Center delay/status changes`), pending Product Owner reactivation of `F13-SHIPMENT-001`.

## 12. Evidence / Chi tiết bưu gửi Discovery Delta

- Opened: `2026-08-10`
- Scope: read-only discovery of the Evidence / Chi tiết bưu gửi (shipment detail) screen area only — no other F1.3 or Network Management screen, no product code change, `Data QLML/`/`.claude/`/both stashes untouched.
- Status: `DISCOVERY COMPLETE / AWAITING PO DECISION` — does not reactivate Phase 1, Phase 3, or any other Phase of this program, and does not reopen `NETWORK-MANAGEMENT-001`/`NETWORK-MANAGEMENT-002`.

Full findings and the decision request are recorded in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 17, to avoid duplicating the same evidence in two documents. Summary: the nav-visible `/f13/evidence` route is still a `PlaceholderPage` (unchanged since the `2026-08-04` audit); a real, working shipment-detail implementation already exists at the orphaned (not nav-linked) `/f13/ranking/shipment` (`ShipmentPerformancePage.jsx`); both consume the same single backend contract (`GET /f13/evidence-list`), confirmed via `F13DashboardClient.js`'s `getShipmentEvidenceList()` still being a direct alias of `getEvidenceList()`. This convergence is already recorded, unresolved, in three prior artifacts (this program's own Phase 1/3, the `2026-08-04` database audit's outstanding MERGE confirmation, and the deferred `F13-SHIPMENT-001`), plus a fourth named-but-never-created candidate (`F13-SURFACE-CLEANUP-PLAN`). Superseded by Section 13: the Product Owner answered the decision request and authorized implementation.

## 13. Evidence / Chi tiết bưu gửi Implementation

- Opened: `2026-08-11`, following an explicit 12-point Product Owner remediation decision (full text in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 18).
- Locked decision, summarized: `ShipmentPerformancePage.jsx` becomes the official component at canonical route `/f13/evidence`; `/f13/ranking/shipment` becomes a query-preserving redirect, not deleted; `admin`+`viewer` read access; a real, BCVH-dependent Tuyến selector with "Tất cả tuyến" support and no fake fallback IDs; the screen must open usefully from the Sidebar with zero query params; the existing single-day F1.3 analysis contract is kept (no silent range-filter switch); the implicit `pageSize=1000` cap must be fixed with no record loss; full drill-down context preserved (`from_date`/`date`, `bcvh_id`, `bcvh_name`, `route_id`, `route_name`, `shipment_id`); no competing ticket opened; no change to Dashboard/BCVH Ranking/Tuyến Ranking beyond minimal deep-link wiring; `NETWORK-MANAGEMENT-001`/`002`, `Data QLML/`, both stashes, `.claude/` untouched.
- Contract verification performed before coding (manifest Section 18): date semantics confirmed single-day and already shared via `resolveDefaultRouteDate`; BCVH list and route list both already served by real, `viewer`-readable endpoints (`/f13/dashboard/meta`, `/f13/ranking/route?route_type=all`); "Tất cả tuyến" requires a backward-compatible backend relaxation (drop the hard `ma_tuyen` predicate only when route is absent) — assessed as a technical change, not a business-rule change; pagination is already correct server-side, the 1,000-row cap is frontend-only; `/evidence-list` role gate is the only access change needed, `VIEWER_ALLOWED_PATH_PREFIXES` reconfirmed dead and left untouched per the `NETWORK-MANAGEMENT-002` precedent. No authority conflict found; nothing escalated.
- Implementation delivered: `ShipmentPerformancePage.jsx` now the canonical `/f13/evidence` component (`admin`+`viewer`); `/f13/ranking/shipment` a query-preserving redirect; real BCVH/route selectors (no fake fallback IDs); `/f13/evidence-list` opened to `viewer`; `getEvidenceListFacts` route made optional for "Tất cả tuyến"; `fetchAllEvidenceRows()` removes the 1,000-row cap by walking every backend page. Full record and file list: `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 18.
- Validation: backend targeted suite 16/16 pass (2 new); full backend sweep 107/111 pass, the 4 failures confirmed pre-existing via `git stash` (unrelated live-KPI-database/timeline tests); frontend 25/25 pass (15 new); `oxlint` clean; `vite build` succeeds (688 modules).
- Runtime: not performed — no usable plaintext credential (admin or viewer) exists in this workspace, same precedent as `NETWORK-MANAGEMENT-001` Phase 4. A concrete PO/Antigravity runtime checklist (11 items) is recorded in manifest Section 18.
- State: `READY FOR PO CHECK`. Claude Code does not self-award PO PASS.

## 14. Evidence / Chi tiết bưu gửi PO Runtime Check Pass — Closure

- Closed on: `2026-08-11`
- Closure authority: explicit Product Owner runtime recheck of implementation commit `a66fa57d` (governance baseline before the check: `ca170c40`)
- Result: `8/9 mục PASS`, 1 `NOT TESTABLE` (the >1,000-row live-dataset check — the real production dataset's largest matching set found is `318` records, below the cap this delta fixed; not a fail, and the underlying `fetchAllEvidenceRows()` page-walking behavior has independent automated test PASS, not represented here as a live-runtime PASS).
- Admin+Viewer access: recorded as technical verification (`ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_VIEWER]}`) + automated routing test PASS (`App.role-routing.test.js`) only — the Product Owner report does not evidence an actual dual-role live login, so no live dual-role runtime PASS is claimed.
- Backend test status carried forward precisely: `107/111` at commit `a66fa57d`, the 4 failures pre-existing and confirmed via `git stash` — never described as "full backend PASS".
- Scope of this closure: the Evidence/Chi tiết bưu gửi delta only (Sections 12-14 here; Sections 17-19 of the manifest). `F13-STANDARDIZATION-001` as a program is **not** closed by this — Phase 0-4 status is unchanged and unaffected.
- No next ticket activated. `F13-SHIPMENT-001` (`stash@{0}`) and `F13-SURFACE-CLEANUP-PLAN` remain untouched/not created. `NETWORK-MANAGEMENT-001`/`002` not reopened. `Data QLML/`, `.claude/`, both stashes confirmed untouched. Documentation-only closure — no product code changed in this round.
- Full decision-by-decision detail: `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 19.

## 15. Evidence Product-Value Audit

- Opened: `2026-08-11`, following explicit Product Owner instruction that the Section 14 closure proved technical function only, not product value.
- Scope: discovery/planning only, tracing Tuyến Ranking → current shipment detail → `/f13/evidence`. No product code changed. `F13-SHIPMENT-001` not opened; Dashboard/BCVH Ranking/`Data QLML/` not touched; `NETWORK-MANAGEMENT-001`/`002` not reopened.
- Status: `AUDIT COMPLETE / AWAITING PO DECISION`.

Full audit in its own dedicated checkpoint (to avoid duplicating the same evidence in two documents): `docs/06_REVIEWS/Shared/F13-EVIDENCE-PRODUCT-VALUE-AUDIT_CHECKPOINT_001.md`. Summary and the 5 Product Owner decisions requested are also recorded in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 20, to avoid a third duplication.

**Central finding**: the frozen Evidence Center architecture (`EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md`, `EVIDENCE_CENTER_WIDGET_SPECIFICATION.md`) explicitly forbids Evidence Center from duplicating Shipment Performance Center or carrying Recommendation content. The Product Owner-accepted canonical `/f13/evidence` today runs `ShipmentPerformancePage.jsx` — the Shipment Performance Center component itself, including a Recommendation widget — which is exactly what those frozen documents forbid. This is escalated to the Product Owner (Decision 1) rather than resolved by this audit.

No implementation authorized. Does not reopen or amend the Section 14 `PO RUNTIME CHECK PASS` closure — this adds a later, separate finding on top of it, per explicit instruction that the prior closure proved technical function only. **Superseded by Section 16** — the Product Owner issued the decision.

## 16. Evidence Consolidation Plan

- Opened: `2026-08-11`, immediately after the Section 15 audit, on explicit Product Owner decision. Baseline `e2c32178`.
- Scope: planning only. No product code changed; no frozen document edited. `F13-SHIPMENT-001` not opened; Dashboard/BCVH Ranking/`Data QLML/`/`NETWORK-MANAGEMENT` untouched and unexpanded.
- Status: `PLAN COMPLETE / AWAITING PO APPROVAL`.

Full plan: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md`. Decision text, summary and the frozen-document amendment list are recorded once in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 21.

**Product Owner decision**: keep `/f13/evidence` as the single shared violation-detail screen; Tuyến Ranking must lead into it; streamline per the audit; remove Recommendation; controlled amendment of the frozen architecture documents may be *planned* (not executed).

**Three new defects found while planning**: (F-1, blocking) the evidence-list API mapper discards `ma_tuyen`/`ten_tuyen`/`ma_bcvh`/`ten_bcvh`, so in "Tất cả tuyến" mode every row displays "Tất cả tuyến" as its route and route search matches nothing; (F-2, latent crash) an out-of-scope `row` reference in `RoutePerformancePage.jsx:262`; (F-3, baseline correction) the true full frontend suite is 256/269 with 13 proven-pre-existing failures, not the "25/25" previously reported for a narrow subset.

No implementation authorized by this plan. **Superseded by Section 17** — the Product Owner approved the plan and Phase 1 was implemented.

## 17. Evidence Consolidation Phase 1 Implementation

- Implemented: `2026-08-11`, implementation commit `b147df7c` (plan approved at `34f42c57`). Status: `PHASE 1 IMPLEMENTED / READY FOR PO CHECK`.
- Scope: backend-only, additive-only. `f13DashboardService.getEvidenceList()`'s mapper now passes through `ma_tuyen`/`ten_tuyen`/`ma_bcvh`/`ten_bcvh` (fixes F-1 — the repository already returned them; the mapper discarded them). Zero frontend changes were required — both existing consumers already prefer a real API value over their own URL-parameter fallback.
- Tests: 2 new pass-through tests (incl. a direct regression guard proving two rows in "Tất cả tuyến" mode resolve two different real routes, never a shared fallback) + 2 new tests proving the violation-reason classification is a true partition (mutually exclusive, exhaustive over `ma_bg`) before trusting the numeric summary, per explicit Product Owner instruction. Targeted evidence suite 20/20; full backend sweep 111/115 (same 4 pre-existing failures, unchanged); full frontend sweep 256/269 (no frontend file touched, confirms no incidental regression) — reported as the true full-suite figure, not a narrowed subset.
- Product Owner decisions recorded for Phase 2/3 (not implemented this round): screen name "Evidence — Chi tiết bưu gửi vi phạm"; arriving from Tuyến Ranking keeps the clicked violation group (total click → "Tất cả không đạt"); no Action Center button until a real hand-off exists; frozen-document amendment approved in principle but requires its own governance delta before Phase 2.
- No Phase 2-4 work performed. No frozen document edited. `F13-SHIPMENT-001` not opened; Dashboard/BCVH Ranking/`Data QLML/`/`NETWORK-MANAGEMENT` untouched; `.claude/` and both stashes untouched.
- Full decision-by-decision detail: `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 22.

## 18. Evidence Consolidation Phase 1 Remediation

- Implemented: `2026-08-11`, frontend-only. Status: `PO PHASE 1 REMEDIATION RECHECK PASS / CLOSURE PAUSED` (recheck passed by PO `2026-08-13`; formal Phase 1 closure itself stays paused pending the date-filter finding — Section 20).
- Product Owner runtime evidence surfaced 2 defects, both remediated within Phase 1 scope (no widget consolidation, no frozen document, no Phase 2-4).
- **DEFECT A**: Vietnamese IME input corrupted the shared `GlobalFilterBar` search box (every keystroke triggered a router navigation, interrupting IME composition). Fixed via a new composition-aware debounced controller (`searchCommitController.js`) in the shared component, plus a diacritic-insensitive search fallback that never weakens exact route-code matching.
- **DEFECT B**: empty state didn't distinguish "route genuinely has no violations" from "keyword didn't match." Re-verified against the real operational database (read-only) before any code change: Tuyến 53579015 ("Hương Phong"), BCVH A Lưới, 2026-08-10 has exactly 2 real shipments, both `Đạt`, zero `Không đạt` — the filter was correct, only the empty-state messaging needed fixing. Route-dropdown contract also verified correct by construction (routes only appear if they have real activity that day). Empty state now has 3 distinguished, keyword-prioritized messages instead of one generic one.
- 24 new tests; full frontend sweep 280/293 (same 13 pre-existing failures, unchanged); backend untouched, sanity re-run 111/115 unchanged; `oxlint` clean.
- Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 13; manifest Section 23.

## 19. Evidence Consolidation PO Finding Locked Into Phase 2

- Recorded: `2026-08-12`. Documentation only — no product code, route, component, schema, or frozen document changed.
- Product Owner finding: search filters correctly but presentation misleads (keyword "hồng th" matched 9 rows; `ShipmentExecutiveBrief` auto-displayed one representative row/route; other matching routes hidden; "Evidence Runtime" KPI kept showing the pre-search total with no results list near the search box).
- A 10-point contract is now locked into Phase 2 (no auto-selection on search; explicit result-count summary; results grouped by real route with expandable shipment lists; every matching route shown; detail panel updates only on explicit selection; pre-search/post-search/selected counts kept distinct; Tuyến dropdown stays independent; explicit 0/1/n states + clear-keyword control + desktop/mobile; reconciliation by real `ma_bg`/`ma_tuyen`; no interim patch to `ShipmentExecutiveBrief`). 9 new acceptance criteria (AC-15 to AC-23) added.
- Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 14; manifest Section 24. Phase 2 remains blocked on the frozen-document governance delta regardless of this addition.

## 20. Date-Filter Cross-Module Remediation

- Status: `CLOSED / PO DATE-FILTER RUNTIME RECHECK PASS`. Implemented: `2026-08-13`. Recheck PASS: `2026-08-13`.
- PO discovered Operation Dashboard's "Bảng điều hành BCVH" table silently ignored `from_date` and only ever queried a single exact day (`to_date`), contradicting its own page's correctly-ranged KPI cards. A bounded, read-only diagnosis was performed first (recorded in `F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 15); PO then authorized a bounded fix.
- Fix (backend + one frontend line, purely parameter-driven, no page-name branching): `/f13/ranking/bcvh` now genuinely aggregates `ngay_do_kiem BETWEEN from_date AND to_date` (inclusive); BCVH Ranking's own request now explicitly sends `from_date === to_date` to keep its single-evaluation-day contract; reversed ranges rejected `400 INVALID_RANGE`. Tuyến Ranking, Evidence, Pareto/RCA untouched.
- Live-database verification reproduced the PO's exact evidence (BCVH Thuận Hóa `533140`: single day `2026-08-11` → `1,820/753/986`; range `2026-08-01`–`2026-08-11` → `18,895/10,179/7,841`). The 81-count gap on `2026-08-11` was confirmed (direct read-only query) to be pre-existing `danh_gia_2026 IS NULL` rows, the same unclassified category already modeled elsewhere (`total_unknown`, `Chưa xác định nguyên nhân`) — no metric/formula changed.
- 12 new tests (9 backend + 3 frontend source-level), all passing; full backend sweep 209/213 and full frontend sweep 283/296, both against a freshly re-verified true baseline (200/204 backend, 280/293 frontend) — identical pre-existing failures by name, zero regressions.
- Product Owner runtime recheck PASS confirmed 4 points: (1) Operation Dashboard's BCVH table aggregates correctly across the full selected range; (2) changing the range updates the table correctly; (3) the earlier to_date-only observation was an unrestarted backend process, not a residual defect at commit `0a15ddf4`; (4) a BCVH-filtered Sản lượng widget correctly hides national rank in that context — confirmed as intended behavior, not data loss.
- Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 16 (implementation) and Section 17 (recheck PASS/closure).

## 21. Evidence Consolidation Phase 1 — Formal Closure

- Status: `PHASE 1 CLOSED / PO PASS`. Closed: `2026-08-13`.
- Phase 1 (Section 17 above, F-1 backend fix) and its remediation (Section 18, DEFECT A/B) both received Product Owner runtime PASS. Formal closure was sequenced behind the date-filter remediation's own recheck, per explicit PO instruction (`2026-08-12`); that condition is now satisfied.
- Closes Phase 1 of the Evidence Consolidation plan only — Phase 2 (widget consolidation, the 10-point search-result-presentation contract) remains `NOT IMPLEMENTED`, requiring its own separate implementation authorization. The `F13-STANDARDIZATION-001` program itself remains open (Phase 0 of the original 5-phase program plan partial; Phases 1-4 `PLANNED / NOT ACTIVE`).
- Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 18.

## 22. Frozen-Document Governance Delta — Execution

- Status: `GOVERNANCE DELTA EXECUTED`. Executed: `2026-08-13`.
- Authority: Product Owner instruction executing the `2026-08-11` approval-in-principle (plan Section 8) as its own separate governance delta.
- All 8 documents named in the plan's Section 8 amended, each gaining a `## 0. GOVERNANCE AMENDMENT NOTICE` section, original content preserved below as historical record: `EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md`, `EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md`, `EVIDENCE_CENTER_WIDGET_SPECIFICATION.md` (AMENDED — redefined to the merged design); `SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md`, `SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md`, `SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md` (SUPERSEDED); `EVIDENCE_CENTER_UX_ARCHITECTURE.md` (AMENDED); `SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` (SUPERSEDED). `PROJECT_PROGRESS.md`'s Frozen Documents list updated with the amendment record.
- Documentation-only; no product code touched. Phase 2 not thereby authorized to begin — both stated prerequisites (PO recheck, frozen-document delta) are now satisfied, but implementation still requires its own separate explicit Product Owner authorization.
- Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 19.

## 23. Evidence Consolidation Phase 2 — Implementation

- Status: `PHASE 2 IMPLEMENTED / READY FOR PO RUNTIME RECHECK`. Implemented: `2026-08-13`. Frontend-only.
- Authority: Product Owner instruction, "PO AUTHORIZATION — BEGIN EVIDENCE CONSOLIDATION PHASE 2 IMPLEMENTATION" (baseline `457329e2`, confirmed matching before any edit).
- Scope: plan Section 9's "Phase 2 — Evidence screen rebuild" file scope plus the Section 14 search-result-presentation contract (AC-15..AC-23), same round per explicit PO instruction.
- `ShipmentPerformancePage.jsx` rewritten (violation group tabs, conditional Tuyến column, search-result summary, 3 distinct KPI counts, header-merged BCVH/Tuyến/Ngày, auto-select-first-row removed); `shipmentPerformanceData.js` gained `formatSearchResultSummary`/`groupRowsByRoute`; `ShipmentEvidenceSummary.jsx` reworked into the primary flat/grouped violation table; new `ShipmentEvidenceDetail.jsx` consolidates the old Timeline+RootCause widgets into one evidence-detail panel, populated only on explicit selection. Deleted: `ShipmentImpactOverview.jsx`, `ShipmentRecommendation.jsx`, `ShipmentDrilldown.jsx`, `ShipmentExecutiveBrief.jsx` (AC-23: removed entirely rather than patched), `ShipmentTimeline.jsx`, `ShipmentRootCause.jsx` (superseded by the new consolidated panel), `ShipmentShellShared.jsx` (disclosed deviation — deleted as dead code once its only consumers were reworked/removed, rather than reworked as the plan's file list literally said).
- No metric/formula/date-contract/data-source change; the pre-existing DEFECT A/B empty-state logic and single-day `analysisDate` resolution left byte-for-byte unchanged. No backend file touched. Operation Dashboard, BCVH Ranking, Tuyến Ranking, Pareto/RCA, Network Management confirmed untouched. `F13-SHIPMENT-001` not opened; `Data QLML/`, `.claude/`, both stashes confirmed untouched.
- Live-database proof (service layer, not mocked): real context (2026-07-27, BCVH 533140, 1,573 "Không đạt" rows) — `reason=delayed_cash` returns exactly 217 rows, matching `violation_summary.delayed_cash_count` exactly, every row correctly classified; 32 distinct real routes present in "Tất cả tuyến" mode.
- Tests: 19 new (`ShipmentPerformancePage.phase2.test.js` ×14, `shipmentPerformanceData.test.js` +5), all passing. Full frontend sweep 302/315 — same 13 pre-existing failures by name, zero regressions. Prior Phase 1/remediation source-regex tests (15 tests) unmodified and still 100% passing. `oxlint` clean; `vite build` succeeds.
- Simplification disclosed: mobile uses responsive column-hiding/stacking rather than a full-screen tap sheet (plan Section 4.2) — a scope-conscious simplification, not a silent deviation.
- Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 20 (includes the full AC-15..AC-23 → implementation/test mapping table).

Governance state: `PHASE 2 SEARCH-RESULT REMEDIATION IMPLEMENTED / READY FOR PO RECHECK` (superseded by Section 24). Claude Code does not self-award PO PASS and does not self-close Phase 2.

## 24. Evidence Consolidation Phase 2 — Runtime Recheck FAIL + Search-Result Remediation

- Status: `PHASE 2 SEARCH-RESULT REMEDIATION IMPLEMENTED / READY FOR PO RECHECK`
- Authority: Product Owner runtime recheck FAIL (tested at commit `b3de0ea6`/`857f9b55`), authorizing bounded diagnosis and remediation of the search-result-presentation contract only.

**Defect**: typing a keyword only ever showed one route ("chỉ đưa ra một tuyến gần nhất"), violating AC-17/AC-18. **Root cause, reproduced with a real React render against real data** (temporary, unsaved `jsdom` + Vite SSR harness — never committed, `git status --porcelain -- frontend/package.json frontend/package-lock.json` confirmed empty before and after): the evidence fetch was scoped server-side to the currently active violation-reason tab (default "Chậm nộp tiền," ~14% of a typical day's rows); a real BCVH/date context with 1,573 rows across 8 routes matching "HCC" reduced to exactly 1 row/1 route under the default tab — the Product Owner's exact symptom, reproduced precisely.

**Fix**: the evidence fetch now always pulls every reason group in one request (`reason` removed from the query and from the fetch effect's dependencies); reason-tab scoping became a pure client-side filter (`reasonScopedRows`); while a keyword is active, matching intentionally spans every reason group (AC-17/18 are unconditional — "mọi tuyến... đều phải xuất hiện" — no matching route is hidden by which tab happens to be selected); `contextTotal` (AC-19) re-derived from the tab-scoped `reasonScopedRows` instead of the now-broad fetch total.

Reconciled against real data: default-tab "HCC" search now correctly shows 8 groups/208 rows (previously 1/1); a specific route selected stays correctly scoped (An Cựu: 1 group/44 rows, matching the database exactly); clearing search restores the tab-scoped 217 rows, not the broad 1,573.

14 new tests (`ShipmentPerformancePage.searchRemediation.test.js`, mapped to the Product Owner's C.1–13 list), all passing; full frontend sweep 316/329 (same 13 pre-existing failures by name, zero regressions); `oxlint` clean (removed a now-dead `meta` state, not suppressed); `vite build` succeeds.

Bounded to Phase 2 search-result presentation only — no metric/date-contract/schema change, no backend file touched, no other module expanded, no governance closure performed. Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 21.

Governance state: `SEARCH-RESULT REMEDIATION: PO RUNTIME PASS` (2026-08-13, tested at commit `e2ae87ac`/`1a6c490b`) — confirmed against the real BCVH Thuận Hóa `533140`/`2026-07-27`/"Tất cả tuyến" context: search "HCC" correctly returns 208 bưu gửi across 8 real routes; every matching group listed, no auto-selection, detail panel updates only on explicit selection, route-filtered search stays correctly scoped (An Cựu: 1 tuyến/44 bưu gửi), clearing the keyword restores the exact tab-scoped 217 bưu gửi, dropdown independence and IME input both correct. This PASS covered the search-result defect only, superseded by full closure in Section 25 below.

## 25. Evidence Consolidation Phase 2 — Full-Screen PO Acceptance, Formal Closure

- Status: `PHASE 2 CLOSED / PO FULL-SCREEN RUNTIME PASS`
- Authority: Product Owner instruction, "PO EVIDENCE CONSOLIDATION PHASE 2 FULL-SCREEN RUNTIME ACCEPTANCE PASS" (chat, `2026-08-13`), baseline `88c4bfd0` confirmed matching before any edit.

Product Owner tested the complete merged Evidence screen against the full AC-1..AC-23 set and confirmed 11 checked items: merged layout/zones correct; conditional Tuyến column correct; no auto-selection; detail panel updates only on explicit selection; identity/kết quả/nhóm vi phạm/timeline correctly shown; the `>3.0h` rule statement correct; Action Center hand-off state honestly reflects real scope (no simulated unsupported action); `ShipmentExecutiveBrief`/`ShipmentImpactOverview`/`ShipmentRecommendation`/`ShipmentDrilldown` correctly removed; violation-reason tabs/search/clear-keyword/Tuyến dropdown all function correctly; desktop/mobile both usable with no acceptance-blocking defect; **AC-1 through AC-23, in full: PO RUNTIME PASS.**

**This closes Evidence Consolidation Phase 2 in full**, including the search-result-presentation remediation already passed in Section 24. Does not close: Phase 3 (rewire Tuyến Ranking's drill-down button, translating redirect for the old screen), Phase 4 (retire `RouteViolationEvidencePage.jsx`), or the `F13-STANDARDIZATION-001` program itself — all remain `PLANNED / NOT ACTIVE` / open, each requiring its own separate explicit Product Owner authorization.

Governance-only; no product code touched. `F13-SHIPMENT-001` not opened; `Data QLML/`, `NETWORK-MANAGEMENT`, and every other module untouched; `.claude/` and both stashes confirmed untouched. Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 22.

Governance state: Evidence Consolidation Phase 2 `CLOSED / PO FULL-SCREEN RUNTIME PASS`. Phase 3/4 and any next ticket remain unauthorized.

## 26. Phase 3 — Rewire Tuyến Ranking + Redirect Old Path

- Status: `PHASE 3 IMPLEMENTED / READY FOR PO RUNTIME RECHECK`. Implemented: `2026-08-13`. Frontend-only.
- Authority: Product Owner instruction, "PO AUTHORIZATION — BEGIN F13-STANDARDIZATION-001 PHASE 3" (baseline `b6177b88`, confirmed matching before any edit).

Tuyến Ranking's drill-down button now targets `/f13/evidence` directly (`from_date`/`to_date` both set to the clicked row's `analysisDate`, `bcvh_id`/`bcvh_name`, `route_id`/`route_name`, `reason` defaulting to `delayed_cash`, `return_to`); `/f13/ranking/route/violations` converted into a translating redirect (`admin`+`viewer`) via a new `LegacyRouteViolationsRedirect`/`translateLegacyViolationsSearch` — old `date` bookmarks resolve to the identical `from_date`/`to_date` value. F-2 (`RouteSelectedPanel`'s latent `ReferenceError`, `row` undefined in scope) fixed to `route.total_failed`; the drill-down button's label reconciled to "Xem bưu gửi vi phạm," resolving the one pre-existing test that mismatch caused (F-3) — 12 of the 13 pre-existing failures remain, unrelated.

`RouteViolationEvidencePage.jsx` and its tests untouched (Phase 4 explicitly not performed this round — component stays on disk, simply unrouted). Residual disclosed: `ShipmentPerformancePage.jsx` doesn't yet render a "Quay lại Tuyến Ranking" link from `return_to` (out of Phase 3's declared file scope; the parameter is correctly carried end-to-end, just not consumed on the destination screen).

21 new/updated tests, all passing (including a real behavioral F-2 regression test, not just source-regex); full frontend sweep 325/337 (12 pre-existing failures, down from 13 — the label fix is a disclosed, plan-sanctioned resolution, not scope creep); `oxlint` clean; `vite build` succeeds. No backend file touched; `F13-SHIPMENT-001` not opened; Phase 2 not reopened. Full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 23.

Governance state: `PHASE 3 IMPLEMENTED / READY FOR PO RUNTIME RECHECK`. Claude Code does not self-close Phase 3 and does not self-start Phase 4.
