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

- Current ticket: `F13-STANDARDIZATION-001` (existing program group) — Evidence/Chi tiết bưu gửi discovery delta, `DISCOVERY COMPLETE / AWAITING PO DECISION` (2026-08-10). Discovery-only: nav-visible `/f13/evidence` still a `PlaceholderPage`; real shipment-detail implementation (`ShipmentPerformancePage.jsx`) sits orphaned at `/f13/ranking/shipment`; both backed by the same `GET /f13/evidence-list` contract. No product code changed. Most recently closed full ticket: `NETWORK-MANAGEMENT-002` — Bản đồ tích hợp Điểm phục vụ + Đường thư cấp 2, `COMPLETED / PO PASS / CLOSED` (2026-08-11), unaffected.
- Current manifest: `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` (Section 17, discovery delta).
- Current checkpoint: `docs/06_REVIEWS/Shared/F13-STANDARDIZATION-001_CHECKPOINT_001.md` (Section 12, discovery delta).
- Next required action: await explicit Product Owner decision on the Evidence/Chi tiết bưu gửi MERGE question (manifest Section 17) before any implementation. `NETWORK-MANAGEMENT-001` and `NETWORK-MANAGEMENT-002` remain fully closed and must not be reopened without new explicit Product Owner authorization.



## Docs Inventory

Inventory count before cleanup and after metadata cleanup must match unless a future commit creates a new governance metadata file.

| Path / Pattern | Type | Purpose Summary | Authority | New Status | When Read | Importance |
| --- | --- | --- | --- | --- | --- | --- |
| `CLAUDE.md` | Governance | Condensed, auto-loaded onboarding equivalent of `README_AI.md` for Claude Code sessions only; points to `PROJECT_SNAPSHOT.md` for live state. | L2 | Active Onboarding | Auto-loaded by Claude Code at the start of every session in this repo. | Mandatory (Claude Code only) |
| `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md` | Governance | Prompt gate, single-defect remediation, executor selection, and prompt rules. | L2 | Active Onboarding | Every fresh session before first execution prompt. | Mandatory |
| `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` | Governance | Current project/ticket SSOT and manifest/checkpoint pointers. | L2 | Active Onboarding | Every fresh session. | Mandatory |
| `docs/10_TICKETS/NETWORK-MANAGEMENT-001_MANIFEST.md` | Ticket Manifest | Closed ticket NETWORK-MANAGEMENT-001 (`COMPLETED / PO FINAL PASS / CLOSED`, 2026-08-10): four-phase program (Nền tảng, Ba bản đồ, Import, Nghiệm thu) for Mạng điểm phục vụ, Mạng đường thư cấp 2, Sơ đồ tuyến phát. Phase 1 PO Gate 1 PASS (Section 16); Phase 2 PO Gate 2 PASS (Section 17, 26); Phase 3 PO Gate 3 PASS (Section 29); Phase 4 — Sơ đồ tuyến phát Import PO PASS (Section 32), manifest §6 checklist Technical PASS (checkpoint Section 23), 2 closed discovery deltas (Sections 34-35), program final closure / PO Gate 4 PASS (Section 36). | L2 | Historical / Last Closed Ticket | Only if the Product Owner's next direction concerns this program. | Reference |
| `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-001_CHECKPOINT_001.md` | Checkpoint | Closed checkpoint for NETWORK-MANAGEMENT-001: program/Phase state, PO-confirmed baseline, allowed/locked scope, reusable architecture notes, Phase 1 implementation evidence (Section 12), Phase 2 implementation evidence (Section 13), Phase 3 Import/Export/History/Rollback implementation evidence (Section 14), PO Gate 3 Runtime Remediation (Section 15), ĐTC2 journey visual + arrow remediation (Sections 16-17), PO Gate 3 PASS closure (Section 18), Phase 4 data contract audit + remediation through two recheck-fail/fix cycles (Sections 19-21), Sơ đồ tuyến phát Import PO PASS (Section 22), manifest §6 checklist Technical PASS (Section 23), 2 closed discovery deltas (Sections 24-25), program final closure — PO FINAL PASS (Section 26). | L2 | Historical / Last Closed Checkpoint | Only if the Product Owner's next direction concerns this program. | Reference |
| `docs/10_TICKETS/NETWORK-MANAGEMENT-002_MANIFEST.md` | Ticket Manifest | Closed ticket NETWORK-MANAGEMENT-002 (`COMPLETED / PO PASS / CLOSED`, 2026-08-11): locked scope (Section 5), discovery (Section 7), implementation options (Section 8), implementation record (Section 14), PO runtime fail + remediation (Section 15), PO PASS closure (Section 16). | L2 | Historical / Last Closed Ticket | Only if the Product Owner's next direction concerns this screen. | Reference |
| `docs/06_REVIEWS/Shared/NETWORK-MANAGEMENT-002_CHECKPOINT_001.md` | Checkpoint | Closed checkpoint for NETWORK-MANAGEMENT-002: ticket state, baseline (`5c0ff1bc`), allowed/locked scope, discovery findings (Section 11), implementation + validation record (Section 12), PO runtime fail + remediation record (Section 13), PO PASS closure (Section 14). | L2 | Historical / Last Closed Checkpoint | Only if the Product Owner's next direction concerns this screen. | Reference |
| `docs/10_TICKETS/F13-STANDARDIZATION-001_MANIFEST.md` | Ticket Manifest | Program F13-STANDARDIZATION-001: locked five-phase F1.3 module standardization plan. Tuyến Ranking (Route Ranking) delta `COMPLETED / PO PASS / CLOSED` (Section 16, 2026-08-04); Phase 0 implemented, not separately closed; Phases 1-4 `PLANNED / NOT ACTIVE`; Evidence/Chi tiết bưu gửi discovery delta (Section 17, 2026-08-10) `DISCOVERY COMPLETE / AWAITING PO DECISION`. | L2 | Conditional Reference | When F13-STANDARDIZATION-001 scope, the Route Ranking delta closure, the Evidence discovery delta, or Phase 1-4 planning is needed. | High |
| `docs/06_REVIEWS/Shared/F13-STANDARDIZATION-001_CHECKPOINT_001.md` | Checkpoint | Program checkpoint: program/Phase state, baseline, allowed/locked scope, required reading, the Route Ranking delta closure record (Section 11), and the Evidence/Chi tiết bưu gửi discovery delta record (Section 12). | L2 | Conditional Reference | When F13-STANDARDIZATION-001 scope, the Route Ranking delta closure, or the Evidence discovery delta evidence is needed. | High |
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
