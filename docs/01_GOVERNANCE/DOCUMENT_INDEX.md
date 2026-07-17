# DOCUMENT INDEX

## Table of Contents

- [1. Core](#1-core)
- [2. Architecture](#2-architecture)
- [3. UX](#3-ux)
- [4. Technical Planning](#4-technical-planning)
- [5. Development](#5-development)
- [6. Governance](#6-governance)
- [7. Handover](#7-handover)
- [8. Reviews](#8-reviews)
- [9. Reference](#9-reference)
- [10. Archive](#10-archive)
- [11. Reports](#11-reports)

## Index Legend

| Field | Meaning |
| --- | --- |
| Status | Draft / Active / Frozen / Deprecated / Archived |
| Authority Level | L1 = Source of Truth, L2 = Project Control, L3 = Planning, L4 = Reference |
| Read Priority | 1 = must read first |
| Update Frequency | Low / Medium / High |

### Authority Resolution Rule

If two documents conflict, always prefer the document with the higher Authority Level.
If Authority Level is the same, use the lifecycle priority defined in `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md`.

## 1. Core

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/PROJECT_SSOT.md` | Core | Single source of truth for decisions | Frozen | L1 | 1 | Low | `PROJECT_STATUS.md`, `PROJECT_PROGRESS.md`, all frozen docs |
| `PROJECT_STATUS.md` | Core | Live project status log | Active | L2 | 1 | Medium | `PROJECT_PROGRESS.md`, `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` |
| `PROJECT_PROGRESS.md` | Core | Live progress tracker | Active | L2 | 1 | Medium | `PROJECT_STATUS.md`, `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` |
| `docs/02_ARCHITECTURE/QIS_V2_ARCHITECTURE.md` | Core | Project architecture baseline | Frozen | L2 | 2 | Low | cross-center, UX, planning docs |

## 2. Architecture

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/02_ARCHITECTURE/CROSS_CENTER_INTERACTION_ARCHITECTURE.md` | Architecture | Cross-center navigation and context rules | Frozen | L3 | 2 | Low | center IA docs |
| `docs/02_ARCHITECTURE/BCVH/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | Architecture | BCVH information structure | Frozen | L3 | 2 | Low | BCVH widget/screen/UX docs |
| `docs/02_ARCHITECTURE/ROUTE/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | Architecture | Route information structure | Frozen | L3 | 2 | Low | Route widget/screen/UX docs |
| `docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | Architecture | Shipment information structure | Frozen | L3 | 2 | Low | Shipment widget/screen/UX docs |
| `docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | Architecture | Evidence information structure | Frozen | L3 | 2 | Low | Evidence widget/screen/UX docs |
| `docs/02_ARCHITECTURE/ACTION/ACTION_CENTER_INFORMATION_ARCHITECTURE.md` | Architecture | Action information structure | Frozen | L3 | 2 | Low | Action widget/screen/UX docs |
| `docs/04_TECHNICAL_PLANNING/Implementation/IMPLEMENTATION_ARCHITECTURE.md` | Architecture | Implementation bridge to development | Frozen | L2 | 2 | Low | release/epic/feature/backlog |

## 3. UX

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/03_UX/shared/QIS_UX_DESIGN_PRINCIPLES.md` | UX | Global UX principles | Frozen | L3 | 2 | Low | design system, screen docs |
| `docs/03_UX/shared/QIS_DESIGN_SYSTEM.md` | UX | Shared design system | Frozen | L3 | 2 | Low | screen docs, widget docs |
| `docs/03_UX/bcvh/BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | UX | BCVH UX architecture | Frozen | L3 | 3 | Low | BCVH IA/screen/widget docs |
| `docs/03_UX/route/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | UX | Route UX architecture | Frozen | L3 | 3 | Low | Route IA/screen/widget docs |
| `docs/03_UX/shipment/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | UX | Shipment UX architecture | Frozen | L3 | 3 | Low | Shipment IA/screen/widget docs |
| `docs/03_UX/evidence/EVIDENCE_CENTER_UX_ARCHITECTURE.md` | UX | Evidence UX architecture | Frozen | L3 | 3 | Low | Evidence IA/screen/widget docs |
| `docs/03_UX/action/ACTION_CENTER_UX_ARCHITECTURE.md` | UX | Action UX architecture | Frozen | L3 | 3 | Low | Action IA/screen/widget docs |
| `docs/06_REVIEWS/Shared/UX_CONSISTENCY_REVIEW.md` | UX | UX freeze review | Frozen | L2 | 3 | Low | all UX docs |

## 4. Technical Planning

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/04_TECHNICAL_PLANNING/Release/RELEASE_PLANNING.md` | Technical Planning | Release sequencing | Frozen | L3 | 3 | Low | epic/feature planning |
| `docs/04_TECHNICAL_PLANNING/Epic/EPIC_PLANNING.md` | Technical Planning | Epic breakdown | Frozen | L3 | 3 | Medium | release/feature/backlog |
| `docs/04_TECHNICAL_PLANNING/Feature/FEATURE_PLANNING.md` | Technical Planning | Feature breakdown | Frozen | L3 | 3 | Medium | epic/backlog |
| `docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md` | Technical Planning | Development ticket queue | Frozen | L3 | 3 | High | feature/implementation docs |
| `docs/04_TECHNICAL_PLANNING/Implementation/IMPLEMENTATION_ARCHITECTURE.md` | Technical Planning | Implementation structure | Frozen | L2 | 2 | Low | release/epic/feature/backlog |

## 5. Development

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` | Development | High-level project handover | Active | L2 | 1 | Medium | context/protocol/decisions |
| `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` | Development | Project context for new sessions | Active | L2 | 1 | Medium | handover/protocol/decisions |
| `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` | Governance | Live project-state SSOT for Governance V2 onboarding | Active | L2 | 1 | High | README_AI.md, ticket manifests |
| `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md` | Development | Collaboration protocol | Active | L2 | 1 | Medium | handover/context/decisions |
| `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md` | Governance | PO UI acceptance workflow | Active | L2 | 1 | Medium | prompt standard, findings register |
| `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | Development | Immutable decision log | Active | L1 | 1 | Medium | handover/context/protocol |
| `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | Development | Start prompt for new ChatGPT sessions | Active | L2 | 1 | Medium | handover/context/protocol/decisions |
| `docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md` | Governance | Codex documentation workflow standard | Active | L2 | 1 | Medium | README_AI.md, PROJECT_SNAPSHOT.md, manifests |
| `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md` | Governance | Canonical Codex ticket lifecycle and handoff standard | Active | L2 | 1 | High | README_AI.md, PROJECT_SNAPSHOT.md, manifests |
| `docs/01_GOVERNANCE/GOVERNANCE_V2_DESIGN.md` | Governance | Governance V2 onboarding design and compatibility plan | Active | L2 | 2 | Medium | PROJECT_SNAPSHOT.md, ticket manifests, onboarding docs |

## 6. Governance

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md` | Governance | Document governance rules | Active | L1 | 1 | Low | index/lifecycle/matrix |
| `docs/01_GOVERNANCE/DOCUMENT_LIFECYCLE.md` | Governance | Document state transitions | Active | L2 | 1 | Low | governance/update matrix |
| `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md` | Governance | Event-to-document update matrix | Active | L2 | 1 | Medium | governance/lifecycle |
| `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` | Governance | Repository TOC | Active | L2 | 1 | Medium | all docs |

## 7. Handover

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` | Handover | High-level project transfer document | Active | L2 | 1 | Medium | context/decisions/protocol |
| `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` | Handover | Full project context | Active | L2 | 1 | Medium | handover/protocol/decisions |
| `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md` | Handover | AI coordination rules | Active | L2 | 1 | Medium | handover/context/decisions |
| `docs/01_GOVERNANCE/CODEX_PROMPT_STANDARD.md` | Handover | Standard prompt structure for future AI tickets | Active | L2 | 1 | Medium | handover/context/protocol |
| `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | Handover | Frozen decision log | Active | L1 | 1 | Medium | handover/context/protocol |
| `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | Handover | New chat startup prompt | Active | L2 | 1 | Medium | all handover docs |

## 8. Reviews

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/06_REVIEWS/Dashboard/DASHBOARD_FOUNDATION_REVIEW.md` | Reviews | Dashboard review result | Frozen | L3 | 2 | Low | Dashboard docs |
| `docs/06_REVIEWS/BCVH/BCVH_PERFORMANCE_CENTER_REVIEW.md` | Reviews | BCVH review result | Frozen | L3 | 2 | Low | BCVH docs |
| `docs/06_REVIEWS/Route/ROUTE_PERFORMANCE_CENTER_REVIEW.md` | Reviews | Route review result | Frozen | L3 | 2 | Low | Route docs |
| `docs/06_REVIEWS/Shipment/SHIPMENT_PERFORMANCE_CENTER_REVIEW.md` | Reviews | Shipment review result | Frozen | L3 | 2 | Low | Shipment docs |
| `docs/06_REVIEWS/Import/TODAY-001_PO_ACCEPTANCE_CLOSURE.md` | Reviews | Import PO acceptance closure evidence | Active | L2 | 1 | Low | PO findings register, Import recovery evidence |
| `docs/06_REVIEWS/Import/TODAY-001-R1_IMPORT_RUNTIME_ROUTE_AND_REIMPORT_RECOVERY.md` | Reviews | Import runtime route and reimport recovery evidence | Active | L3 | 2 | Low | PO findings register |
| `docs/06_REVIEWS/Import/TODAY-001-R2_IMPORT_HISTORY_PAGINATION_AND_VIETNAM_TIMEZONE_RECOVERY.md` | Reviews | Import history pagination and Vietnam timezone recovery evidence | Active | L3 | 2 | Low | PO findings register |
| `docs/06_REVIEWS/Import/TODAY-002_DAILY_TREND_DATA_ADAPTER_REVIEW.md` | Reviews | TODAY-002 daily trend data adapter review evidence | Active | L2 | 1 | Low | PO findings register, project control docs |
| `docs/06_REVIEWS/Import/TODAY-002-R1_KPI_2026_SOURCE_COLUMN_RECOVERY.md` | Reviews | TODAY-002-R1 KPI 2026 source column recovery evidence | Active | L2 | 1 | Low | PO findings register, project control docs |
| `docs/06_REVIEWS/Import/TODAY-002-R2_KPI_2026_DASHBOARD_CONSISTENCY_RECOVERY.md` | Reviews | TODAY-002-R2 KPI 2026 dashboard consistency recovery evidence | Active | L2 | 1 | Low | PO findings register, project control docs |
| `docs/06_REVIEWS/Import/TODAY-003-R1_QUALITY_TRENDLINE_RUNTIME_ROUTE_RECOVERY.md` | Reviews | TODAY-003-R1 quality trendline runtime route recovery evidence | Active | L2 | 1 | Low | PO findings register, project control docs |
| `docs/06_REVIEWS/Import/TODAY-003-R1_PO_ACCEPTANCE_CHECKLIST.md` | Reviews | TODAY-003-R1 PO acceptance checklist | Active | L2 | 1 | Low | PO acceptance workflow, review evidence |
| `docs/06_REVIEWS/Import/TODAY-003-R2_QUALITY_TRENDLINE_30_DAY_WINDOW_RECOVERY.md` | Reviews | TODAY-003-R2 quality trendline 30-day window recovery evidence | Active | L2 | 1 | Low | PO findings register, project control docs |
| `docs/06_REVIEWS/Import/TODAY-003-R2_PO_ACCEPTANCE_CHECKLIST.md` | Reviews | TODAY-003-R2 PO acceptance checklist | Active | L2 | 1 | Low | PO acceptance workflow, review evidence |
| `docs/06_REVIEWS/Shared/PO_ACCEPTANCE_CHECKLIST_TEMPLATE.md` | Reviews | Shared PO acceptance checklist template | Active | L2 | 2 | Low | PO acceptance workflow, ticket checklists |
| `docs/10_TICKETS/MANIFEST_TEMPLATE.md` | Reviews | Ticket manifest template for V2 onboarding | Active | L2 | 2 | Medium | PROJECT_SNAPSHOT.md, ticket manifests |
| `docs/10_TICKETS/TODAY-003-R1_MANIFEST.md` | Reviews | Current ticket manifest for TODAY-003-R1 | Active | L2 | 1 | High | README_AI.md, PROJECT_SNAPSHOT.md, review docs |
| `docs/10_TICKETS/TODAY-003-R2_MANIFEST.md` | Reviews | Current ticket manifest for TODAY-003-R2 | Active | L2 | 1 | High | README_AI.md, PROJECT_SNAPSHOT.md, review docs |
| `docs/10_TICKETS/TODAY-004_MANIFEST.md` | Reviews | Current ticket manifest for TODAY-004 | Active | L2 | 1 | High | README_AI.md, PROJECT_SNAPSHOT.md, review docs |
| `docs/10_TICKETS/GOV-V2-014_MANIFEST.md` | Reviews | Current ticket manifest for GOV-V2-014 | Active | L2 | 1 | High | README_AI.md, PROJECT_SNAPSHOT.md, review docs |
| `docs/06_REVIEWS/Import/TODAY-004_PO_ACCEPTANCE_CHECKLIST.md` | Reviews | TODAY-004 PO acceptance checklist | Active | L2 | 1 | High | PO acceptance workflow, manifest, remediation report |
| `docs/06_REVIEWS/Import/TODAY-004_ACTIVE_MANIFEST_REMEDIATION.md` | Reviews | TODAY-004 active manifest remediation report | Active | L2 | 1 | High | README_AI.md, PROJECT_SNAPSHOT.md, manifest |
| `docs/06_REVIEWS/Shared/PO_REVIEW_TEMPLATE.md` | Reviews | PO review template | Active | L2 | 1 | Medium | PO findings register, product review docs |
| `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md` | Reviews | PO findings traceability register | Active | L2 | 1 | Medium | PO acceptance workflow, review docs |
| `docs/06_REVIEWS/Shared/ARCHITECTURE_CONSISTENCY_REVIEW.md` | Reviews | Architecture freeze review | Frozen | L2 | 2 | Low | architecture docs |
| `docs/06_REVIEWS/Shared/UX_CONSISTENCY_REVIEW.md` | Reviews | UX freeze review | Frozen | L2 | 2 | Low | UX docs |

## 9. Reference

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/07_REFERENCE/Shared_Business/business_dictionary.md` | Reference | Shared business terminology | Active | L4 | 4 | Low | business glossary, KPI docs |
| `docs/07_REFERENCE/Shared_Business/global_kpi_framework.md` | Reference | Shared KPI framework | Active | L4 | 4 | Low | KPI decisions, dashboard docs |
| `docs/07_REFERENCE/Shared_Business/import_center_rules.md` | Reference | Import center rules | Active | L4 | 4 | Low | import workflow docs |
| `docs/07_REFERENCE/Legacy/API_DESIGN_v1.0.md` | Reference | Legacy API design reference | Deprecated | L4 | 4 | Low | legacy architecture docs |
| `docs/07_REFERENCE/Legacy/F1.3/F13_303_DEFINITION.md` | Reference | Legacy F13.303 definition | Deprecated | L4 | 4 | Low | F1.3 domain reference |

## 10. Archive

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/08_ARCHIVE/Legacy/00_README/PROJECT_CONTEXT.md` | Archive | Archived project context | Archived | L4 | 5 | Low | legacy onboarding docs |
| `docs/08_ARCHIVE/Legacy/01_RULES/constitution.md` | Archive | Archived governance rules | Archived | L4 | 5 | Low | legacy governance docs |
| `docs/08_ARCHIVE/Legacy/02_AI_CONTEXT/system_prompt.md` | Archive | Archived system prompt | Archived | L4 | 5 | Low | legacy AI context docs |

## 11. Reports

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/09_REPORTS/Documentation/DOCUMENTATION_AUDIT_REPORT.md` | Reports | Documentation audit report | Active | L4 | 4 | Low | documentation governance docs |
| `docs/09_REPORTS/Documentation/DOCUMENTATION_VALIDATION_REPORT.md` | Reports | Documentation validation report | Active | L4 | 4 | Low | documentation governance docs |
| `docs/09_REPORTS/Documentation/GOVERNANCE_V2_ONBOARDING_VALIDATION.md` | Reports | Governance V2 onboarding validation report | Active | L4 | 4 | Low | README_AI.md, PROJECT_SNAPSHOT.md, current manifest |
| `docs/GOVERNANCE_UPDATE_REPORT.md` | Reports | Governance update report | Active | L4 | 4 | Low | governance changes |
| `docs/09_REPORTS/Documentation/AI_ONBOARDING_VALIDATION_REPORT.md` | Reports | AI onboarding validation report | Active | L4 | 4 | Low | onboarding docs |
| `docs/09_REPORTS/Documentation/CODEX_PROMPT_STANDARD_REPORT.md` | Reports | Codex prompt standard report | Active | L4 | 4 | Low | governance/prompt docs |
