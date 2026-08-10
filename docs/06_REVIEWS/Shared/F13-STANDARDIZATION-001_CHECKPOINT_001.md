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

## 1. Purpose

This checkpoint is the current-state entry point for `F13-STANDARDIZATION-001`. It exists so a fresh AI session can immediately answer: is the program active, which Phase is current, what has closed, what baseline applies, what is permitted, what is locked, what to read, and what to do next.

## 2. Program State

| Field | Value |
| --- | --- |
| Program | `F13-STANDARDIZATION-001` |
| Program State | `DISCOVERY DELTA OPEN / AWAITING PO DECISION` (as of `2026-08-10`, Evidence/Chi tiết bưu gửi discovery delta, Section 12) — no Phase reactivated |
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

## 12. Evidence / Chi tiết bưu gửi Discovery Delta

- Opened: `2026-08-10`
- Scope: read-only discovery of the Evidence / Chi tiết bưu gửi (shipment detail) screen area only — no other F1.3 or Network Management screen, no product code change, `Data QLML/`/`.claude/`/both stashes untouched.
- Status: `DISCOVERY COMPLETE / AWAITING PO DECISION` — does not reactivate Phase 1, Phase 3, or any other Phase of this program, and does not reopen `NETWORK-MANAGEMENT-001`/`NETWORK-MANAGEMENT-002`.

Full findings and the decision request are recorded in `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` Section 17, to avoid duplicating the same evidence in two documents. Summary: the nav-visible `/f13/evidence` route is still a `PlaceholderPage` (unchanged since the `2026-08-04` audit); a real, working shipment-detail implementation already exists at the orphaned (not nav-linked) `/f13/ranking/shipment` (`ShipmentPerformancePage.jsx`); both consume the same single backend contract (`GET /f13/evidence-list`), confirmed via `F13DashboardClient.js`'s `getShipmentEvidenceList()` still being a direct alias of `getEvidenceList()`. This convergence is already recorded, unresolved, in three prior artifacts (this program's own Phase 1/3, the `2026-08-04` database audit's outstanding MERGE confirmation, and the deferred `F13-SHIPMENT-001`), plus a fourth named-but-never-created candidate (`F13-SURFACE-CLEANUP-PLAN`). No implementation is authorized by this delta; a Product Owner MERGE/scope-ownership decision is requested before any of the four converging plans proceeds.

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
