# DOCUMENT INDEX

## Purpose

This index is metadata only. It does not delete, move, merge, or replace historical documents.

Use this file to understand which documents are active in fresh onboarding, which documents are conditional references, and which documents are archive/history.

## Status Legend

| Status | Meaning |
| --- | --- |
| Active Onboarding | Part of the fresh onboarding chain. |
| Current Required Reading | Read only when named by the current manifest/checkpoint. |
| Conditional Reference | Read only when the active ticket explicitly needs that domain, history, SSOT, design, or evidence. |
| Archive | Preserved history; do not use as current authority unless explicitly cited by an active document. |

## Authority Legend

| Authority | Meaning |
| --- | --- |
| L1 | Business or governance source of truth. |
| L2 | Current project/ticket control. |
| L3 | Planning, architecture, implementation, or evidence authority within a scoped area. |
| L4 | Reference, historical, archive, report, or supporting material. |

## Fresh Onboarding

Fresh onboarding must contain at most these `5` steps:

| Step | Path | Purpose | Authority | Status | When Read | Importance |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `README_AI.md` | External entry point and onboarding route. | L2 | Active Onboarding | Every fresh AI/chat session. | Mandatory |
| 2 | `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md` | First-prompt gate and executor prompt standard. | L2 | Active Onboarding | Before writing the first Antigravity/Claude Code execution prompt. | Mandatory |
| 3 | `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` | Current project/ticket state and active manifest pointer. | L2 | Active Onboarding | After Prompt Standard. | Mandatory |
| 4 | Current Manifest from `PROJECT_SNAPSHOT.md` | Current ticket authority, scope, exclusions, and required reading. | L2 | Active Onboarding | After Snapshot. | Mandatory |
| 5 | Required Reading named by Current Manifest | Scoped ticket evidence/checkpoint/reference documents. | L2/L3 | Current Required Reading | Only when the current manifest names it. | Mandatory for current ticket only |

Current active ticket:

- Current ticket: `None self-activated. NO ACTIVE TICKET / AWAITING PO DIRECTION.` Most recently closed: `F13-STANDARDIZATION-001` (existing program group) — Phase 4 (retire `RouteViolationEvidencePage.jsx`), `PHASE 4 CLOSED / PO RUNTIME PASS` (2026-08-15, frontend-only, baseline `f312fa36`, implementation commit `ede4684c`). Bounded dependency discovery found zero live imports/routes referencing the retired component or its test file; deleted `RouteViolationEvidencePage.jsx` + `RouteViolationEvidencePage.smoke.test.js`, added `RouteViolationEvidencePage.retired.test.js`. Product Owner's runtime recheck at HEAD `f3dbe1b9` confirmed Tuyến Ranking → Evidence, "Quay lại Tuyến Ranking", the legacy `/f13/ranking/route/violations` auto-redirect, and direct Evidence access all work correctly with no regression from the deletion. With this closure, the entire Evidence-consolidation delta (Sections 20-34: audit → plan → Phase 1 → Phase 2 → Phase 3 → Phase 4) is complete and closed end-to-end. Most recently closed full ticket outside this program: `NETWORK-MANAGEMENT-002`, `COMPLETED / PO PASS / CLOSED` (2026-08-11), unaffected.
- Current ticket (`2026-08-17`, supersedes the paragraph above): `F41-PHASE-0` — F4.1 SSOT/Reference Package. `PHASE 0 COMPLETE / READY FOR PO REVIEW`, activated by explicit Product Owner Gate 0 approval and Phase 0 authorization on `F41-MODULE-PLAN`, documentation only, baseline `94b32885`. Instantiated `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/` from `_template_indicator/`, transcribing the already-approved `F41-MODULE-PLAN` plan (42-column HUE + 38-column TCT contracts, `PO-1..PO-10`, the `F4_001/F4_002/F4_003` KPI formulas, 9 test scenario groups, 9 AI guardrails). `F41-MODULE-PLAN` itself remains `PLAN COMPLETE`, Gate 0 now `APPROVED`. The paragraph above remains accurate as the record of the most recently closed work (`F13-STANDARDIZATION-001` Phase 4), which this ticket does not reopen.
- Current manifest: `docs/10_TICKETS/F41-PHASE-0_MANIFEST.md`. Parent plan manifest (unchanged): `docs/10_TICKETS/F41-MODULE-PLAN_MANIFEST.md`.
- Current checkpoint: `docs/06_REVIEWS/Shared/F41-PHASE-0_CHECKPOINT_001.md`. Parent plan checkpoint (unchanged, source of record for every figure): `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md`. Previous (closed): `docs/06_REVIEWS/Shared/F13-STANDARDIZATION-001_CHECKPOINT_001.md` (Section 26) — full record: `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` Section 25; preceding audit: `docs/06_REVIEWS/Shared/F13-EVIDENCE-PRODUCT-VALUE-AUDIT_CHECKPOINT_001.md`.
- Next required action (`2026-08-17`, `F41-PHASE-0`): none self-activated — awaiting Product Owner review of the `F41-PHASE-0` package content, and separately, Product Owner authorization of Phase 1 (Nền tảng dữ liệu) before any F4.1 schema/code/Import work begins. `Q-1..Q-5` remain closed/resolved/non-blocking; `Q-6` (TCT denominator gap) remains non-blocking. Prior note, still accurate for the F1.3 program: none self-activated — awaiting Product Owner direction on the next scope. `F13-SHIPMENT-001` (`stash@{0}`) remains `DEFERRED / PRESERVED`; `F13-SURFACE-CLEANUP-PLAN` remains not created; `F13-STANDARDIZATION-001`'s original 5-phase program plan (Phase 0 partial, Phases 1-4 distinct from this delta's own Phase 1-4 numbering) remains `PLANNED / NOT ACTIVE`. `NETWORK-MANAGEMENT-001` and `NETWORK-MANAGEMENT-002` remain fully closed and must not be reopened without new explicit Product Owner authorization.



## Docs Inventory

Inventory count before cleanup and after metadata cleanup must match unless a future commit creates a new governance metadata file.

| Path / Pattern | Type | Purpose Summary | Authority | New Status | When Read | Importance |
| --- | --- | --- | --- | --- | --- | --- |
| `CLAUDE.md` | Governance | Condensed, auto-loaded onboarding equivalent of `README_AI.md` for Claude Code sessions only; points to `PROJECT_SNAPSHOT.md` for live state. | L2 | Active Onboarding | Auto-loaded by Claude Code at the start of every session in this repo. | Mandatory (Claude Code only) |
| `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md` | Governance | Prompt gate, single-defect remediation, executor selection, and prompt rules. | L2 | Active Onboarding | Every fresh session before first execution prompt. | Mandatory |
| `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` | Governance | Current project/ticket SSOT and manifest/checkpoint pointers. | L2 | Active Onboarding | Every fresh session. | Mandatory |
| `docs/10_TICKETS/F41-PHASE-0_MANIFEST.md` | Ticket Manifest | Current ticket F41-PHASE-0 (`PHASE 0 COMPLETE / READY FOR PO REVIEW`, 2026-08-17, baseline `94b32885`): the governed handoff from F41-MODULE-PLAN's approved Gate 0 into the F4.1 SSOT/reference package, documentation only. Holds the Gate 0 approval text, scope lock, and the content-traceability requirement satisfied by the new package. All substantive package content lives in `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/`, not here. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/06_REVIEWS/Shared/F41-PHASE-0_CHECKPOINT_001.md` | Checkpoint | Current checkpoint for F41-PHASE-0: the Gate 0 approval record (Section 3), scope lock (Section 4), the instantiated 8-file package inventory (Section 5), and a full content-traceability table (Section 6) mapping every item required by the activation prompt — 42-column HUE contract, 38-column TCT contract, HUE KPI, `531120` treatment, filename date, module scope, delayed-cash reuse, TCT ingest rules, role contract, `Q-6`, test/reconciliation scenarios — to its exact location in the new package. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/` | Reference Package | F4.1 SSOT/reference package (v1.0.0, 2026-08-17), instantiated from `_template_indicator/`: `data_blueprint.md` (42-column HUE + 38-column TCT contracts), `business_rules.md` (`PO-1..PO-10` verbatim, TCT ingest rules, non-blocking `Q-6`), `measurement.md` (`F4_001`/`F4_002`/`F4_003` formulas, full reconciliation baseline, corrected `241/9/1` blank-row split), `testing_scenarios.md` (9 scenario groups), `rca_ai_context.md` (9 guardrails against specific planning-round inference mistakes), `core_knowledge.md`, `changelog.md`, `metadata.yml`. Not yet consumed by any implementation — `fact_f41`/`fact_f41_national` do not exist. | L2/L3 | Conditional Reference | When any future F4.1 phase (implementation, review, or further planning) needs the module's data contract or locked rules. | High |
| `docs/10_TICKETS/F41-MODULE-PLAN_MANIFEST.md` | Ticket Manifest | Closed-for-planning parent ticket F41-MODULE-PLAN (`PLAN COMPLETE`, Gate 0 `APPROVED` 2026-08-17, baseline `c2f4bdd7`): F4.1 module discovery and overall plan, planning/documentation only. Holds the ticket authority, the ten locked Product Owner decisions (Section 5), the delta-only technical context including the remediation round's TCT findings (Section 6), the explicit in/out-of-scope lock (Section 8), and the two remaining escalations — the unreconciled TCT denominator gap and the portal match string that must be discovered rather than guessed (Section 16). All substantive plan content lives in the checkpoint, not here. | L2 | Historical / Last Closed Ticket | When the F4.1 module plan's phasing, risks, or original evidence is needed. | High |
| `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` | Checkpoint | Checkpoint for F41-MODULE-PLAN — the plan itself and the **source of record for every F4.1 figure**: locked PO decisions (Section 3), scope lock (Section 4), delta-only survey of the F1.3 architecture (Section 5, D-1..D-7) and the Import architecture (Section 6, D-8..D-12), read-only inventory of the real F4.1 source file with SHA-256, 42-column list and structural deltas vs the frozen F1.3 mapping (Section 7, D-13..D-18), the per-BCVH reconciliation baseline reproducing `2.863/4.695 = 60,98%` (Section 8), the locked data-contract proposal `DC-1..DC-11` including the total-rows denominator that diverges from F1.3's `sl_bg_ptc` (Section 9), the 5-phase plan (Section 10), UI/nav plan (Section 11), reconciliation plan (Section 12), test plan (Section 13), risk register `R-1..R-8` (Section 14), PO gates 0-4 (Section 15), and the open questions as originally asked (Section 16). Sections 17-22 are the 2026-08-17 planning remediation round: new PO decisions `PO-8..PO-10` (Section 17), the read-only audit of the now-supplied F4.1 TCT workbook `T-1..T-10` — aggregate at reporting-unit level, positional multi-row header, grand-total row that must be skipped, no date and no `Đạt`/`Không đạt` field anywhere (Section 18), the HUE-vs-TCT cross-lane reconciliation `T-11..T-14` proving identical evaluation counts but a differing denominator (`4.684` vs `4.695`) (Section 19), the revised TCT contract `TC-1..TC-10` (Section 20), the exhaustive correction to `D-17` splitting the 251 blank-evaluation rows into `241 / 9 / 1` (Section 21), and the disposition of `Q-1..Q-5` plus one new non-blocking question `Q-6` (Section 22). | L2 | Historical / Last Closed Checkpoint | When the F4.1 module plan's original evidence, figures, or reasoning is needed — cited by the new package throughout. | High |
| `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` | Ticket Manifest | Closed ticket NETWORK-MANAGEMENT-001 (`COMPLETED / PO FINAL PASS / CLOSED`, 2026-08-10): four-phase program (Nền tảng, Ba bản đồ, Import, Nghiệm thu) for Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến phát. Phase 1 PO Gate 1 PASS (Section 16); Phase 2 PO Gate 2 PASS (Section 17, 26); Phase 3 PO Gate 3 PASS (Section 29); Phase 4 — Sơ đồ tuyến phát Import PO PASS (Section 32), manifest §6 checklist Technical PASS (checkpoint Section 23), 2 closed discovery deltas (Sections 34-35), program final closure / PO Gate 4 PASS (Section 36). | L2 | Historical / Last Closed Ticket | Only if the Product Owner's next direction concerns this program. | Reference |
| `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` | Checkpoint | Closed checkpoint for NETWORK-MANAGEMENT-001: program/Phase state, PO-confirmed baseline, allowed/locked scope, reusable architecture notes, Phase 1 implementation evidence (Section 12), Phase 2 implementation evidence (Section 13), Phase 3 Import/Export/History/Rollback implementation evidence (Section 14), PO Gate 3 Runtime Remediation (Section 15), ĐTC2 journey visual + arrow remediation (Sections 16-17), PO Gate 3 PASS closure (Section 18), Phase 4 data contract audit + remediation through two recheck-fail/fix cycles (Sections 19-21), Sơ đồ tuyến phát Import PO PASS (Section 22), manifest §6 checklist Technical PASS (Section 23), 2 closed discovery deltas (Sections 24-25), program final closure — PO FINAL PASS (Section 26). | L2 | Historical / Last Closed Checkpoint | Only if the Product Owner's next direction concerns this program. | Reference |
| `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md` | Ticket Manifest | Closed ticket NETWORK-MANAGEMENT-002 (`COMPLETED / PO PASS / CLOSED`, 2026-08-11): locked scope (Section 5), discovery (Section 7), implementation options (Section 8), implementation record (Section 14), PO runtime fail + remediation (Section 15), PO PASS closure (Section 16). | L2 | Historical / Last Closed Ticket | Only if the Product Owner's next direction concerns this screen. | Reference |
| `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-002_CHECKPOINT_001.md` | Checkpoint | Closed checkpoint for NETWORK-MANAGEMENT-002: ticket state, baseline (`5c0ff1bc`), allowed/locked scope, discovery findings (Section 11), implementation + validation record (Section 12), PO runtime fail + remediation record (Section 13), PO PASS closure (Section 14). | L2 | Historical / Last Closed Checkpoint | Only if the Product Owner's next direction concerns this screen. | Reference |
| `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` | Ticket Manifest | Program F13-STANDARDIZATION-001: locked five-phase F1.3 module standardization plan. Tuyến Ranking (Route Ranking) delta `COMPLETED / PO PASS / CLOSED` (Section 16, 2026-08-04); Phase 0 implemented, not separately closed; Phases 1-4 `PLANNED / NOT ACTIVE`; Evidence/Chi tiết bưu gửi delta `CLOSED / PO RUNTIME CHECK PASS` (Section 19, 2026-08-11, commit `a66fa57d`); Evidence Product-Value Audit (Section 20) PO decision received; Evidence Consolidation plan (Section 21) PO-approved; Evidence Consolidation Phase 1 (Section 22) implemented; Phase 1 Remediation (Section 23, 2026-08-11, commit tracked in `PROJECT_PROGRESS.md`) `IMPLEMENTED / READY FOR PO RECHECK`; PO finding locked into Phase 2 scope (Section 24, 2026-08-12, documentation only, not implemented). | L2 | Conditional Reference | When F13-STANDARDIZATION-001 scope, the Route Ranking delta closure, the Evidence delta closure, the Evidence audit, or the Evidence consolidation plan/Phase 1/remediation/Phase 2 finding is needed. | High |
| `docs/06_REVIEWS/Shared/F13-STANDARDIZATION-001_CHECKPOINT_001.md` | Checkpoint | Program checkpoint: program/Phase state, baseline, allowed/locked scope, required reading, the Route Ranking delta closure record (Section 11), the Evidence discovery delta record (Section 12), the Evidence implementation record (Section 13), the Evidence PO Runtime Check Pass closure record (Section 14), the Evidence Product-Value Audit pointer (Section 15), the Evidence Consolidation plan pointer (Section 16), the Evidence Consolidation Phase 1 pointer (Section 17), the Phase 1 Remediation pointer (Section 18), and the PO finding locked into Phase 2 pointer (Section 19). | L2 | Conditional Reference | When F13-STANDARDIZATION-001 scope, the Route Ranking delta closure, or the Evidence delta/audit/plan/Phase 1/remediation/Phase 2 finding evidence is needed. | High |
| `docs/06_REVIEWS/Shared/F13-EVIDENCE-PRODUCT-VALUE-AUDIT_CHECKPOINT_001.md` | Checkpoint | Full Evidence Product-Value Audit: traces Tuyến Ranking → shipment detail → `/f13/evidence`; central finding that the frozen Evidence Center architecture forbids duplicating Shipment Performance Center or carrying Recommendation content, which the current canonical Evidence screen does; widget-by-widget audit; KEEP/REMOVE/MERGE/REDESIGN classification; proposed target flow; no-code wireframe; 8 acceptance criteria; 5 Product Owner decisions requested. PO decision received — see the consolidation plan. | L2 | Conditional Reference | When Evidence/Tuyến Ranking product-value audit findings or the frozen-architecture conflict are needed. | High |
| `docs/06_REVIEWS/Shared/F13-EVIDENCE-CONSOLIDATION-PLAN_CHECKPOINT_001.md` | Checkpoint | Full Evidence Consolidation plan built on the PO decision: exact URL/data/reconciliation contract for Tuyến Ranking → `/f13/evidence`; no-code wireframe (desktop/mobile/loading/empty/error); per-widget KEEP/REMOVE/MERGE/REDESIGN; handling of the old `RouteViolationEvidencePage` as a translating redirect; 14 acceptance criteria; the list of frozen/architecture documents needing amendment (none edited); 4-phase implementation plan, test plan and file scope. Records three new defects found while planning (F-1 API drops route/BCVH identity, F-2 latent `ReferenceError`, F-3 corrected 256/269 frontend baseline). Section 12 records the Phase 1 implementation (F-1 fixed, backend-only, additive-only, 4 new tests, 20/20 targeted / 111/115 backend / 256/269 frontend). Section 13 records the Phase 1 remediation: DEFECT A (Vietnamese IME search-box corruption, fixed via a shared composition-aware debounced controller + diacritic-insensitive search fallback) and DEFECT B (empty state didn't distinguish "no violations" from "no keyword match"; ground-truth verified via a direct read-only database query — Tuyến 53579015/Hương Phong/A Lưới/2026-08-10 genuinely has zero Không đạt rows — filter correct, empty-state rebuilt into 3 branches). Section 14 records a 2026-08-12 PO finding (search filters correctly but presentation misleads — no result-count summary, no route grouping, `ShipmentExecutiveBrief` auto-selecting one representative row) locked into Phase 2 scope as a 10-point contract and 9 new acceptance criteria (AC-15..AC-23), documentation only, not implemented. Section 15 is a session-continuity checkpoint recording a bounded, read-only cross-module date-filter diagnosis (Operation Dashboard's BCVH table silently discarded `from_date`). Section 16 records the 2026-08-13 PO-authorized bounded fix: `/f13/ranking/bcvh` now genuinely aggregates `ngay_do_kiem BETWEEN from_date AND to_date`, BCVH Ranking keeps its single-day contract explicitly, live-database-verified against the PO's own reported figures, 12 new tests, zero regressions. Section 17 records the Product Owner's live runtime recheck `PASS` (2026-08-13, after a backend restart) and closure of the date-filter finding. Section 18 records the formal closure of Evidence Consolidation Phase 1 (`PHASE 1 CLOSED / PO PASS`). Section 19 records execution of the frozen-document governance delta (all 8 documents amended, each gaining a `## 0. GOVERNANCE AMENDMENT NOTICE` section, original content preserved as historical record). Section 20 records the Phase 2 implementation (2026-08-13, frontend-only): three-region layout, widget disposition, `ShipmentExecutiveBrief` removal, and the AC-15..AC-23 search-result-presentation contract, with a full acceptance-criterion → implementation/test mapping table, live-database proof, and 19 new tests (302/315 full frontend sweep, zero regressions). Section 21 records the Phase 2 runtime recheck FAIL and its search-result remediation (root cause reproduced via a real React render against real data; search now spans every reason group), PO-passed. Section 22 records the full-screen Product Owner acceptance pass over AC-1..AC-23 and the formal closure of Phase 2. `DATE-FILTER REMEDIATION CLOSED / PO PASS; PHASE 1 CLOSED / PO PASS; FROZEN-DOCUMENT DELTA EXECUTED; PHASE 2 CLOSED / PO FULL-SCREEN RUNTIME PASS`. | L2 | Conditional Reference | When the Evidence consolidation contract, wireframe, acceptance criteria, or implementation phasing/status is needed. | High |
| `docs/10_TICKETS/F13-DATA-2098-CLEANUP-IMPL_MANIFEST.md` | Ticket Manifest | Closed F13-DATA-2098-CLEANUP-IMPL: PO-authorized permanent removal of year-2098 test/future data. `COMPLETED / TECHNICAL PASS / CLOSED`. | L2 | Conditional Reference | When 2098 cleanup scope, evidence, or closure is needed. | High |
| `docs/06_REVIEWS/Shared/F13-DATA-2098-CLEANUP-IMPL_CHECKPOINT_001.md` | Checkpoint | Closed cleanup execution evidence: identification across all date fields, backup, transaction, post-delete verification, authoritative-field validation, duplicate revalidation (`DQ-07` retraction), and residuals `RESIDUAL-01`/`RESIDUAL-02`. | L2 | Conditional Reference | When 2098 cleanup evidence or the duplicate retraction is needed. | High |
| `docs/10_TICKETS/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN_MANIFEST.md` | Ticket Manifest | Closed F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT-PLAN: read-only audit of database, API capabilities, and F1.3 surfaces. `CLOSED — PO DECISIONS RECORDED`. | L2 | Conditional Reference | When audit scope or the recorded PO decisions are needed. | High |
| `docs/06_REVIEWS/Shared/F13-DATABASE-PRODUCT-OPPORTUNITY-AUDIT_CHECKPOINT_001.md` | Checkpoint | Database/API/product-surface inventory, data-quality register (`DQ-01`-`DQ-08`; confirmed open now four), BUILD/MERGE/HIDE/REMOVE recommendations, ranked Product Opportunity Matrix (`OPP-01`-`OPP-18`), missing-data register (`MD-01`-`MD-12`), recommended implementation sequence, and recorded PO decisions. | L2 | Conditional Reference | When F1.3 data/product opportunity evidence is needed. | High |
| `docs/10_TICKETS/DOC-GOV-CLEANUP-001_MANIFEST.md` | Ticket Manifest | Current DOC-GOV-CLEANUP-001 scope and authority. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/06_REVIEWS/Governance/DOC-GOV-CLEANUP-001_CHECKPOINT_001.md` | Checkpoint | Current cleanup checkpoint, scope lock, and preservation gates. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/10_TICKETS/AUTO-IMPORT-008_MANIFEST.md` | Ticket Manifest | Current AUTO-IMPORT-008 bounded remediation scope and defect-order authority. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/06_REVIEWS/Import/AUTO-IMPORT-008_CHECKPOINT_001.md` | Import Checkpoint | Current AUTO-IMPORT-008 activation checkpoint and ordered defect register. | L2 | Current Required Reading | Current ticket only. | Mandatory |
| `docs/10_TICKETS/AUTO-IMPORT-011_MANIFEST.md` | Ticket Manifest | Closed. Emergency remediation, 2026-08-05: Symptom A fixed and tested; Symptom B recovered via server restart, no technical root cause, no code fix. COMPLETED / PO RUNTIME PASS. | L2 | Conditional Reference | When Import emergency history, the 2098 fix, or the Symptom B closure disposition is needed. | High |
| `docs/10_TICKETS/AUTO-IMPORT-012_MANIFEST.md` | Ticket Manifest | Closed. Emergency follow-up, 2026-08-05: fixed the confirmed Import test-suite production-isolation defect. COMPLETED / TECHNICAL PASS. | L2 | Conditional Reference | When test-isolation history or the fix's evidence is needed. | High |
| `docs/10_TICKETS/AUTO-IMPORT-010_MANIFEST.md` | Ticket Manifest | Closed HUE browser launch recovery ticket; PO RUNTIME PASS with Dashboard/HUE/TCT acceptance and a recorded non-blocking residual. | L2 | Conditional Reference | When Import authentication history, the HUE first-click residual, or closure evidence is needed. | High |
| `docs/06_REVIEWS/Import/AUTO-IMPORT-010_CHECKPOINT_001.md` | Import Checkpoint | Historical handoff after stale-state remediation and direct Playwright proof, including Product Owner runtime fail and next discovery boundary. | L2 | Conditional Reference | Import authentication history lookup only. | Medium |
| `docs/06_REVIEWS/Import/AUTO-IMPORT-010_CHECKPOINT_002.md` | Import Checkpoint | Historical management checkpoint confirming discovery completion, rejected options, selected one-time setup direction, and the C1 implementation plan. | L2 | Conditional Reference | Import authentication history lookup only. | Medium |
| `docs/06_REVIEWS/Import/AUTO-IMPORT-010_CHECKPOINT_003.md` | Import Checkpoint | Closure checkpoint recording Product Owner runtime acceptance (Dashboard, HUE, TCT) and the known non-blocking HUE first-click residual. | L2 | Conditional Reference | Import authentication closure evidence lookup only. | High |
| `docs/06_REVIEWS/Import/AUTO-IMPORT-011_CHECKPOINT_001.md` | Import Checkpoint | Closed. Full evidence timeline, root cause, fix, self-inflicted-pollution disclosure and cleanup, and Symptom B discovery for the emergency ticket. | L2 | Conditional Reference | Import emergency history lookup only. | Medium |
| `docs/06_REVIEWS/Import/AUTO-IMPORT-011_CHECKPOINT_002.md` | Import Checkpoint | Closed. PO runtime closure evidence: Symptom B recovered via server restart, no technical root cause, no code fix, standing instruction for recurrence. | L2 | Conditional Reference | Import emergency closure evidence lookup only. | High |
| `docs/06_REVIEWS/Import/AUTO-IMPORT-012_CHECKPOINT_001.md` | Import Checkpoint | Closed. Test-isolation fix evidence: guard design, per-suite isolation approach, two-consecutive-run validation, zero-production-impact proof. | L2 | Conditional Reference | When test-isolation history or the fix's evidence is needed. | High |
| `docs/10_TICKETS/F13-SHIPMENT-001_MANIFEST.md` | Ticket Manifest | Deferred F1.3 shipment failure drill-down proposal preserved by Product Owner decision. | L2 | Conditional Reference | Only when shipment work is reactivated or current manifest names it. | Medium |
| `docs/10_TICKETS/F13-DATA-QUALITY-001_MANIFEST.md` | Ticket Manifest | Deferred F1.3 data coverage and quality module proposal preserved by Product Owner decision. | L2 | Conditional Reference | Only when data-quality work is reactivated or current manifest names it. | Medium |
| `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-PLAN_MANIFEST.md` | Ticket Manifest | Current F1.3 BCVH Ranking redesign planning handoff with no implementation authority. | L2 | Active Onboarding | Current planning ticket only. | Mandatory |
| `docs/10_TICKETS/F13-BCVH-RANKING-REDESIGN-IMPL_MANIFEST.md` | Ticket Manifest | Current F1.3 BCVH Ranking redesign implementation scope, authority, validation, and handoff rules. | L2 | Active Onboarding | Current implementation ticket only. | Mandatory |
| `docs/10_TICKETS/QIS-LAN-DEPLOY-001_MANIFEST.md` | Ticket Manifest | Closed F1.3 LAN-only viewer deployment authority and accepted runtime remediation record. | L2 | Conditional Reference | When LAN deployment contract, viewer access boundary, or closure evidence is needed. | High |
| `docs/10_TICKETS/F13-UI-AUDIT-PLAN_MANIFEST.md` | Ticket Manifest | Closed. Phase 1-4 PO PASS (Phase 4 accepted 2026-08-03, commit cdb9eab2). No active ticket; awaiting Product Owner direction. | L2 | Conditional Reference | When Operation Dashboard history or closure evidence is needed. | High |
| `docs/10_TICKETS/F13-INTERNAL-ROUTE-AUDIT_MANIFEST.md` | Ticket Manifest | Completed F1.3 internal route classification and Route Ranking filter scope with Product Owner PO PASS. | L2 | Current Required Reading | Current planning ticket only. | Mandatory |
| `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-PLAN_MANIFEST.md` | Ticket Manifest | Closed F1.3 Route Ranking redesign planning ticket; delta-only implementation inventory, PO-confirmed objective, design plan closure pointer. | L2 | Conditional Reference | When Route Ranking redesign planning history is needed. | High |
| `docs/06_REVIEWS/Route/F13_ROUTE_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md` | Route Checkpoint | Closed. Binding design scope, remediation log (R1-R7), and closure record for the Route Ranking redesign — all 12 items PO PASS. | L2/L3 | Conditional Reference | When Route Ranking/delayed-cash implementation history is needed. | High |
| `docs/10_TICKETS/F13-ROUTE-RANKING-REDESIGN-IMPL_MANIFEST.md` | Ticket Manifest | Closed. F1.3 Route Ranking redesign implementation ticket; PO PASS on all 12 items (Route Ranking redesign, BLACK/Chuyển hoàn correction, delayed-cash metrics via shared RuleF13302/RuleRegistry engine, BCVH Ranking default-date fix). Final commit 43819b9. | L2 | Conditional Reference | When Route Ranking/BCVH delayed-cash/default-date history or closure evidence is needed. | High |
| `docs/F13_ROUTE_RANKING_EVIDENCE_HANDOFF.md` | Evidence Handoff | Antigravity static-code-inspection evidence for Route Ranking redesign (no runtime/visual evidence — browser subagent RESOURCE_EXHAUSTED). | L2 | Conditional Reference | When Route Ranking redesign evidence provenance is needed. | Medium |
| `docs/06_REVIEWS/BCVH/F13_BCVH_RANKING_REDESIGN_PLAN_CHECKPOINT_001.md` | BCVH Checkpoint | Approved BCVH Ranking redesign structure, field-to-contract mapping, gaps, test requirements, and implementation handoff. | L2/L3 | Current Required Reading | Current BCVH implementation ticket only. | Mandatory |
| `docs/06_REVIEWS/Deployment/QIS_LAN_DEPLOY_001_CHECKPOINT_001.md` | Deployment Checkpoint | Closed LAN deployment checkpoint with accepted viewer-auth remediation and preserved access contract. | L2/L3 | Current Required Reading | When the current planning ticket needs the accepted LAN baseline. | Mandatory |
| `docs/06_REVIEWS/UI/F13_UI_AUDIT_PLAN_CHECKPOINT_001.md` | UI Planning Checkpoint | Closed. Full Phase 1-4 implementation record, PO PASS evidence, and protected contracts for F1.3 UI standardization. | L2/L3 | Conditional Reference | When Operation Dashboard implementation history or protected findings are needed. | High |
| `docs/06_REVIEWS/Route/F13_INTERNAL_COUNTER_ROUTE_AUDIT.md` | Route Review | Completed bounded database audit, route catalog handoff, and PO-approved Route Ranking outcome. | L2/L3 | Current Required Reading | Current planning ticket only. | Mandatory |
| `docs/07_REFERENCE/Shared_Business/F13_INTERNAL_ROUTE_CATALOG.md` | Business Reference | Product Owner-confirmed internal-counter route catalog for later F1.3 daily analysis. | L2/L3 | Current Required Reading | Current planning ticket only. | Mandatory |
| `docs/04_TECHNICAL_PLANNING/F13_OPERATIONAL_CAPABILITY_AUDIT.md` | Technical Planning | Data-first F1.3 module capability matrix, gap matrix, target architecture, roadmap, and deferred data-quality proposal basis. | L2/L3 | Current Required Reading | Current planning ticket only. | Mandatory |
| `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` | Governance Index | Inventory and document-status metadata. | L2 | Current Required Reading | Governance cleanup, documentation audit, or authority conflict checks. | High |
| `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md` | Governance | Document governance and authority rules. | L1 | Conditional Reference | Governance-rule conflict or document lifecycle questions. | High |
| `docs/01_GOVERNANCE/DOCUMENT_LIFECYCLE.md` | Governance | Document state transitions. | L2 | Conditional Reference | Only when lifecycle semantics are disputed. | Medium |
| `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md` | Governance | Event-to-document update matrix. | L2 | Conditional Reference | Only when deciding which docs an event must update. | Medium |
| `docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md` | Governance | Documentation workflow standard. | L2 | Conditional Reference | Only when writing or reviewing documentation workflow. | Medium |
| `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md` | Governance | PO UI acceptance and Product Owner validation workflow. | L2 | Conditional Reference | UI-visible change, PO checklist, or acceptance dispute. | Medium |
| `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md` | Governance | AI coordination protocol. | L2 | Conditional Reference | Coordination/protocol conflict only. | Medium |
| `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | Governance | Decision log. | L1 | Conditional Reference | Decision or authority dispute. | High |
| `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` | Handover | Older handover/context material. | L2 | Conditional Reference | Only when current Snapshot/Manifest cannot answer continuity context. | Low |
| `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` | Handover | Older project context material. | L2 | Conditional Reference | Only when requested by active manifest or missing context. | Low |
| `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | Handover | Legacy startup prompt. | L2 | Archive | Historical prompt reference only. | Low |
| `docs/01_GOVERNANCE/GOVERNANCE_V2_DESIGN.md` | Governance | Governance V2 design notes. | L3 | Conditional Reference | Governance redesign work only. | Low |
| `docs/01_GOVERNANCE/DOCUMENT_RESPONSIBILITY_MIGRATION.md` | Governance | Responsibility migration notes. | L3 | Archive | Historical governance migration reference. | Low |
| `docs/PROJECT_SSOT.md` | Business SSOT | Frozen business decisions and SSOT. | L1 | Conditional Reference | Business-rule or SSOT conflict only. | High |
| `PROJECT_STATUS.md` | Project Control | Legacy/live status log outside `docs`. | L2 | Conditional Reference | Explicit status-history lookup only. | Medium |
| `PROJECT_PROGRESS.md` | Project Control | Progress tracker outside `docs`. | L2 | Conditional Reference | Progress/history lookup or mandated update. | Medium |
| `docs/02_ARCHITECTURE/**` | Architecture | Frozen architecture baselines by center/domain. | L2/L3 | Conditional Reference | Architecture-impacting work only. | Medium |
| `docs/03_UX/**` | UX | Frozen UX and design-system baselines. | L3 | Conditional Reference | UX/design-impacting work only. | Medium |
| `docs/04_TECHNICAL_PLANNING/**` | Technical Planning | Implementation plans, registers, backlog, release/epic/feature plans. | L2/L3 | Conditional Reference | Planning or ticket sequencing work only. | Medium |
| `docs/05_DEVELOPMENT/**` | Development Reference | API, database, deployment, and F1.3 technical references. | L3/L4 | Conditional Reference | Implementation planning or technical discovery only. | Medium |
| `docs/06_REVIEWS/Governance/**` | Governance Reviews | Governance cleanup checkpoints and evidence. | L2/L3 | Current Required Reading | Only for active governance cleanup tickets. | High |
| `docs/06_REVIEWS/Import/AUTO-IMPORT-007_CHECKPOINT_001.md` | Import Checkpoint | Queued AUTO-IMPORT-007 plan locks. | L2 | Conditional Reference | Only after DOC-GOV-CLEANUP-001 releases AUTO-IMPORT-007. | High later |
| `docs/06_REVIEWS/Import/AUTO-IMPORT-008_CHECKPOINT_001.md` | Import Checkpoint | Active AUTO-IMPORT-008 bounded remediation checkpoint. | L2 | Current Required Reading | Only when current manifest names it. | High |
| `docs/06_REVIEWS/Import/AUTO-IMPORT-006_CHECKPOINT_009.md` | Import Checkpoint | Final AUTO-IMPORT-006 import cleanup and bulk-selection evidence. | L2 | Conditional Reference | AUTO-IMPORT history or handoff evidence only. | Medium |
| `docs/06_REVIEWS/**` | Reviews and Evidence | Ticket reviews, PO checklists, runtime evidence, screenshots, checkpoints. | L2/L3/L4 | Conditional Reference | Only when current manifest names specific evidence. | Medium |
| `docs/07_REFERENCE/Shared_Business/**` | Business Reference | Shared terminology, KPI framework, notifications, import-center rules. | L4 | Conditional Reference | Business terminology/reference lookup only. | Medium |
| `docs/07_REFERENCE/Domains/**` | Domain Reference | Domain knowledge packs and templates. | L4 | Conditional Reference | Domain-specific analysis only. | Medium |
| `docs/07_REFERENCE/Legacy/**` | Legacy Reference | Legacy v1 design/API/database/spec documents. | L4 | Archive | Historical comparison only. | Low |
| `docs/08_ARCHIVE/**` | Archive | Archived legacy README, rules, and AI context. | L4 | Archive | Historical reference only. | Low |
| `docs/09_REPORTS/**` | Reports Archive | Prior documentation/governance audit and migration reports. | L4 | Archive | Historical report lookup only. | Low |
| `docs/10_TICKETS/DOC-GOV-CLEANUP-001_MANIFEST.md` | Manifest | Current governance cleanup ticket. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/10_TICKETS/AUTO-IMPORT-007_MANIFEST.md` | Manifest | Queued import architecture plan locks. | L2 | Conditional Reference | Only after DOC-GOV-CLEANUP-001 releases AUTO-IMPORT-007. | High later |
| `docs/10_TICKETS/AUTO-IMPORT-008_MANIFEST.md` | Manifest | Active bounded Auto Import remediation manifest. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/10_TICKETS/**` | Manifests | Historical/completed/planned ticket manifests. | L2/L3 | Conditional Reference | Only when current Snapshot/Manifest names that ticket. | Medium |
| `docs/*_WIDGET_SPECIFICATION.md` | Widget Specs | Frozen widget specifications. | L3 | Conditional Reference | Widget-impacting work only. | Medium |
| `docs/*REPORT*.md`, `docs/*VALIDATION*.md`, `docs/*CLASSIFICATION*.md` | Root Reports | Prior cleanup/governance/validation reports. | L4 | Archive | Historical report lookup only. | Low |

## Folder Count Inventory

| Category | File Count | Markdown | Other | Status |
| --- | ---: | ---: | ---: | --- |
| Governance | 15 | 15 | 0 | Active/Conditional Reference/Archive by row above |
| Architecture | 12 | 12 | 0 | Conditional Reference |
| UX | 7 | 7 | 0 | Conditional Reference |
| Technical Planning | 7 | 7 | 0 | Conditional Reference |
| Development Reference | 4 | 4 | 0 | Conditional Reference |
| Reviews and Evidence | 149 | 119 | 30 | Conditional Reference |
| Conditional Reference | 46 | 42 | 4 | Conditional Reference/Archive |
| Archive | 9 | 9 | 0 | Archive |
| Reports Archive | 21 | 21 | 0 | Archive |
| Ticket Manifests | 49 | 49 | 0 | Conditional Reference |
| Root Legacy/Frozen Docs | 21 | 21 | 0 | Conditional Reference/Archive |
| Total under `docs` | 341 | 307 | 34 | Preserved |

## Duplicate Content Notes

Exact duplicate scan found only empty placeholder files:

- `docs/07_REFERENCE/Domains/domain_quality_management/f1.3_chat_luong_phat_lien_tinh/assets/.gitkeep`
- `docs/07_REFERENCE/Domains/_template_indicator/assets/.gitkeep`

Recommendation only: keep both placeholders because they preserve separate directory structures. Do not merge or delete in this ticket.

## Authority Resolution

Fresh onboarding authority is:

`README_AI.md` -> `CODEX_PROMPT_STANDARD.md` -> `PROJECT_SNAPSHOT.md` -> Current Manifest -> Required Reading.

If any old index row, report, manifest, checklist, or archived document conflicts with the current onboarding chain, treat the older document as Conditional Reference or Archive and follow the active chain.

## Current F41 Phase 1 Update - 2026-08-17

`PROJECT_SNAPSHOT.md` is authoritative for the current state. As of the F41 Phase 1 completion update, the current manifest is `docs/10_TICKETS/F41-PHASE-1_MANIFEST.md` and the current checkpoint is `docs/06_REVIEWS/Shared/F41-PHASE-1_CHECKPOINT_001.md`.

| Path / Pattern | Type | Purpose Summary | Authority | New Status | When Read | Importance |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/10_TICKETS/F41-PHASE-1_MANIFEST.md` | Ticket Manifest | F41-PHASE-1 HUE Data Foundation: additive `fact_f41`, dedicated F4.1 HUE parser, filename-derived date, all-row denominator contract, targeted validation, and real-file reconciliation. State: `PHASE 1 COMPLETE / READY FOR PO REVIEW`; Phase 2 not activated. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/06_REVIEWS/Shared/F41-PHASE-1_CHECKPOINT_001.md` | Checkpoint | F41-PHASE-1 activation, Codex authorization, baseline exclusions, implementation evidence, validation proof, live DB proof that `fact_f13` remained unchanged, and final handoff. | L2 | Active Onboarding | Current ticket only. | Mandatory |

## Current AUTO-BACKFILL-PLAN Update - 2026-08-18

This section supersedes older current-ticket rows only for live onboarding. `PROJECT_SNAPSHOT.md` remains the exclusive owner of mutable live state. Historical rows above remain preserved under the append-only workflow.

| Path / Pattern | Type | Purpose Summary | Authority | New Status | When Read | Importance |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/10_TICKETS/AUTO-BACKFILL-PLAN_MANIFEST.md` | Ticket Manifest | Product Owner-authorized shared Auto Backfill planning ticket; documentation-only scope, required reading, platform boundary, seven-ticket sequence, validation and handoff. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/06_REVIEWS/Import/AUTO-BACKFILL-PLAN_CHECKPOINT_001.md` | Checkpoint / Technical Plan | Delta-only survey; indicator registration, completion, coverage, queue, API, retry, circuit, session, isolation and audit contracts; ticket plans; extensibility acceptance suite; risks and PO questions. | L2/L3 | Current Required Reading | When current manifest names it. | Mandatory |

Current state: `PLAN COMPLETE / AWAITING PO APPROVAL`. No successor ticket is activated. `AUTO-BACKFILL-COVERAGE` is a candidate only after a separate explicit Product Owner activation.

## Current AUTO-BACKFILL-COVERAGE Update - 2026-08-18

This section supersedes the prior AUTO-BACKFILL-PLAN current-ticket rows for live onboarding. Historical entries remain preserved. `PROJECT_SNAPSHOT.md` remains the exclusive owner of mutable live state.

| Path / Pattern | Type | Purpose Summary | Authority | New Status | When Read | Importance |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/10_TICKETS/AUTO-BACKFILL-COVERAGE_MANIFEST.md` | Ticket Manifest | PO-authorized coverage-only implementation: shared registry, exact completion, indicator-neutral scan/API, acceptance, scope and Gate 1 handoff. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/06_REVIEWS/Import/AUTO-BACKFILL-COVERAGE_CHECKPOINT_001.md` | Checkpoint / Technical Execution Report | Approved Q-01..Q-10, implementation architecture, AB-EXT/AB-ISO results, regression evidence, safety proof, risks and final state. | L2/L3 | Current Required Reading | When current manifest names it. | Mandatory |
| `docs/10_TICKETS/AUTO-BACKFILL-PLAN_MANIFEST.md` | Approved Predecessor Manifest | Approved shared-platform plan and Product Owner decision handoff; successor Coverage evidence linked in Section 11. | L2 | Conditional Reference | When tracing platform authority. | Mandatory for successor planning |
| `docs/06_REVIEWS/Import/AUTO-BACKFILL-PLAN_CHECKPOINT_001.md` | Approved Predecessor Plan | Original survey/contracts and appended authoritative Q-01..Q-10 successor activation record. | L2/L3 | Conditional Reference | When tracing platform contract. | Mandatory for successor planning |

Current state: `AUTO-BACKFILL-COVERAGE IMPLEMENTED / READY FOR PO GATE 1`. No successor is activated; `AUTO-BACKFILL-QUEUE` remains planned only.

## AUTO-BACKFILL-COVERAGE Gate 1 Remediation Update - 2026-08-18

Append-only update to the current manifest/checkpoint: production coverage no longer accepts caller-controlled `as_of`; backend HCM clock ownership, rejection contract, zero-side-effect tests, and focused regressions are recorded in manifest Section 9 and checkpoint Section 9. Current state remains `AUTO-BACKFILL-COVERAGE IMPLEMENTED / READY FOR PO GATE 1`; no successor is activated.

## Current AUTO-BACKFILL-QUEUE Update - 2026-08-18

This section supersedes Coverage current-ticket rows for live onboarding. Historical entries remain preserved; `PROJECT_SNAPSHOT.md` owns mutable live state.

| Path / Pattern | Type | Purpose Summary | Authority | New Status | When Read | Importance |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/10_TICKETS/AUTO-BACKFILL-QUEUE_MANIFEST.md` | Ticket Manifest | Product Owner-authorized persistent queue foundation: exact jobs, one global lease, idempotency, pause/resume, recovery, APIs, tests and exclusions. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/06_REVIEWS/Import/AUTO-BACKFILL-QUEUE_CHECKPOINT_001.md` | Checkpoint / Technical Execution Report | Gate 1 PASS, Queue activation baseline, locked delivery boundary and mandatory acceptance; implementation evidence appended during execution. | L2/L3 | Current Required Reading | When current manifest names it. | Mandatory |
| `docs/10_TICKETS/AUTO-BACKFILL-COVERAGE_MANIFEST.md` | Closed Predecessor Manifest | Coverage implementation, Gate 1 remediation and explicit PO Gate 1 PASS/Queue handoff. | L2 | Conditional Reference | Required by Queue manifest. | Mandatory |

Current state: `AUTO-BACKFILL-QUEUE ACTIVE / IMPLEMENTATION AUTHORIZED`. No later ticket is activated.

## AUTO-BACKFILL-QUEUE Implementation Handoff - 2026-08-18

Append-only update: the current Queue manifest/checkpoint now contain the implemented schema/state/API contract, AB-QUE/AB-SUC and competing-worker evidence, permission/read-only proof, F1.3/F4.1 regressions, scope safety and Gate 2 notes. Current state is `AUTO-BACKFILL-QUEUE IMPLEMENTED / READY FOR PO GATE 2`; no successor ticket is activated.

## AUTO-BACKFILL-QUEUE Gate 2 Coordinator Remediation - 2026-08-18

Append-only update: manifest Section 13 and checkpoint Section 11 record the missing production worker-coordinator finding and PO-authorized bounded remediation from `20e70d80a8a88438591bbdd63f4f320fab2f3bde`. The ticket remains current; no successor is activated.

## AUTO-BACKFILL-QUEUE Coordinator Remediation Handoff - 2026-08-18

Manifest Section 14 and checkpoint Section 12 now hold coordinator lifecycle, wake/drain, lease-expiry, shutdown and focused validation evidence. Finding `POF-AUTO-BACKFILL-QUEUE-01` is ready for Gate 2 recheck. Current state remains `AUTO-BACKFILL-QUEUE IMPLEMENTED / READY FOR PO GATE 2`; no successor is activated.

## Current AUTO-BACKFILL-F13 Update - 2026-08-18

This section supersedes Queue current-ticket rows for live onboarding. Historical entries remain preserved; `PROJECT_SNAPSHOT.md` owns mutable live state.

| Path / Pattern | Type | Purpose Summary | Authority | New Status | When Read | Importance |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/10_TICKETS/AUTO-BACKFILL-F13_MANIFEST.md` | Ticket Manifest | PO-authorized verified F1.3 HUE/TCT one-date adapters, registration, acceptance and exclusions. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/06_REVIEWS/Import/AUTO-BACKFILL-F13_CHECKPOINT_001.md` | Checkpoint / Technical Execution Report | Queue Gate 2 PASS, F1.3 activation baseline, locked adapter boundary and implementation evidence. | L2/L3 | Current Required Reading | When current manifest names it. | Mandatory |
| `docs/10_TICKETS/AUTO-BACKFILL-QUEUE_MANIFEST.md` | Closed Predecessor Manifest | Persistent queue/coordinator implementation and explicit PO Gate 2 PASS/F1.3 handoff. | L2 | Conditional Reference | Required by F1.3 manifest. | Mandatory |

Current state: `AUTO-BACKFILL-F13 ACTIVE / IMPLEMENTATION AUTHORIZED`. No later ticket is activated.

## AUTO-BACKFILL-F13 Implementation Handoff - 2026-08-18

Append-only update: manifest Sections 9-10 and checkpoint Sections 4-7 record the verified HUE/TCT identity contract, bounded one-date adapters, pre-start runtime registration, authentication stop behavior, acceptance/regression evidence and scope proof. Current state is `AUTO-BACKFILL-F13 IMPLEMENTED / READY FOR PO GATE 3`; no successor is activated.

## Current AUTO-BACKFILL-F41 Update - 2026-08-18

This section supersedes F13 current-ticket rows for live onboarding. Historical entries remain preserved; `PROJECT_SNAPSHOT.md` owns mutable live state.

| Path / Pattern | Type | Purpose Summary | Authority | New Status | When Read | Importance |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/10_TICKETS/AUTO-BACKFILL-F41_MANIFEST.md` | Ticket Manifest | PO-authorized F4.1 discovery-first per-lane Portal verification and evidence-gated adapter scope. | L2 | Active Onboarding | Current ticket only. | Mandatory |
| `docs/06_REVIEWS/Import/AUTO-BACKFILL-F41_CHECKPOINT_001.md` | Checkpoint / Technical Execution Report | F13 Gate 3 PASS, F41 activation baseline, discovery limits, per-lane evidence and implementation disposition. | L2/L3 | Current Required Reading | When current manifest names it. | Mandatory |
| `docs/10_TICKETS/AUTO-BACKFILL-F13_MANIFEST.md` | Closed Predecessor Manifest | Verified F1.3 adapters and explicit PO Gate 3 PASS/F41 handoff. | L2 | Conditional Reference | Required by F41 manifest. | Mandatory |

Current state: `AUTO-BACKFILL-F41 ACTIVE / DISCOVERY AUTHORIZED`. No later ticket is activated.

## AUTO-BACKFILL-F41 Discovery Blocked Handoff - 2026-08-18

Append-only update: the manifest Sections 10-13 and checkpoint Sections 5-10 record the static delta, unavailable authenticated observation handoff, zero-export result, independent HUE/TCT `MANUAL_ONLY` disposition, regression evidence and re-entry gate. Current state is `AUTO-BACKFILL-F41 DISCOVERY BLOCKED`; no successor is activated.

## AUTO-BACKFILL-F41 Authenticated Discovery Re-entry - 2026-08-18

Append-only update: manifest Section 14 and checkpoint Section 11 record Product Owner evidence that HUE/TCT sessions are valid and authorize controlled re-entry from `6bf26eb20835707080d2e8590b3c1c383f155869`. Current state is `ACTIVE / AUTHENTICATED DISCOVERY RE-ENTRY`; both lanes remain `MANUAL_ONLY` pending independent live evidence and no successor is activated.

## AUTO-BACKFILL-F41 Authenticated Runtime Differential - 2026-08-18

Append-only update: manifest Section 15 and checkpoint Section 12 record supported `SESSION_VALID` preflight, exact F1.3 workflow reuse, the HUE `BC / 53 / 2026-08-01` GET receiving DKCL `HTTP 500 application/json`, comparison against the Chrome PO nine-row/`4,695` baseline, the mandated stop before TCT, and zero export/Import/write result. Current state is `DISCOVERY BLOCKED / READY FOR PO REVIEW`; both lanes remain `MANUAL_ONLY` and no successor is activated.

## AUTO-BACKFILL-F41 Validation And Runtime Restore - 2026-08-18

Append-only update: manifest Section 16 and checkpoint Section 13 record 60 focused runner tests passing with zero failures, isolated mutation-test storage, zero discovery artifacts, closed discovery clients and restored normal backend runtime on port 5050. The committed delta remains documentation-only.

## AUTO-BACKFILL-F41 PO Chrome Success Evidence - 2026-08-18

Append-only update: manifest Section 17 and checkpoint Section 14 record the PO-supplied HTTP 200 HUE request, nine-row `4,695 / 2,863 / 60.98%` result, proven report/export/detail identities, the first failed-query delta (`stMaLoaiBCPhat=ALL` versus `NULL`), and authorization for exactly one supported HUE comparison. TCT and all mutating actions remain blocked.

## AUTO-BACKFILL-F41 Exact HUE Comparison Result - 2026-08-18

Append-only update: manifest Section 18 and checkpoint Section 15 record byte-for-byte URL equality, completed cascade waits, the single HTTP 200 submit, proven export/detail identities, the account difference (`tantn.bdtth` versus `tantn.bdth`), and the inadmissible nested-row aggregate. Both lanes remain `MANUAL_ONLY`; no second submit/export/Import/write or TCT action occurred.
