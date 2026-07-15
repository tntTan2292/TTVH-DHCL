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
| `docs/UX_CONSISTENCY_REVIEW.md` | UX | UX freeze review | Frozen | L2 | 3 | Low | all UX docs |

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
| `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md` | Development | Collaboration protocol | Active | L2 | 1 | Medium | handover/context/decisions |
| `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | Development | Immutable decision log | Active | L1 | 1 | Medium | handover/context/protocol |
| `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | Development | Start prompt for new ChatGPT sessions | Active | L2 | 1 | Medium | handover/context/protocol/decisions |

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
| `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | Handover | Frozen decision log | Active | L1 | 1 | Medium | handover/context/protocol |
| `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | Handover | New chat startup prompt | Active | L2 | 1 | Medium | all handover docs |

## 8. Reviews

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/BCVH_PERFORMANCE_CENTER_REVIEW.md` | Reviews | BCVH review result | Frozen | L3 | 2 | Low | BCVH docs |
| `docs/ROUTE_PERFORMANCE_CENTER_REVIEW.md` | Reviews | Route review result | Frozen | L3 | 2 | Low | Route docs |
| `docs/ARCHITECTURE_CONSISTENCY_REVIEW.md` | Reviews | Architecture freeze review | Frozen | L2 | 2 | Low | architecture docs |
| `docs/UX_CONSISTENCY_REVIEW.md` | Reviews | UX freeze review | Frozen | L2 | 2 | Low | UX docs |
