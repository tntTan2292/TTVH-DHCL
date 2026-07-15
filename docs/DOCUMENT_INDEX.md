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
| Authority Level | High / Medium / Low |
| Read Priority | 1 = must read first |
| Update Frequency | Low / Medium / High |

## 1. Core

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/PROJECT_SSOT.md` | Core | Single source of truth for decisions | Frozen | High | 1 | Low | `PROJECT_STATUS.md`, `PROJECT_PROGRESS.md`, all frozen docs |
| `PROJECT_STATUS.md` | Core | Live project status log | Active | High | 1 | Medium | `PROJECT_PROGRESS.md`, `docs/PROJECT_HANDOVER.md` |
| `PROJECT_PROGRESS.md` | Core | Live progress tracker | Active | High | 1 | Medium | `PROJECT_STATUS.md`, `docs/PROJECT_HANDOVER.md` |
| `docs/QIS_V2_ARCHITECTURE.md` | Core | Project architecture baseline | Frozen | High | 2 | Low | cross-center, UX, planning docs |

## 2. Architecture

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/CROSS_CENTER_INTERACTION_ARCHITECTURE.md` | Architecture | Cross-center navigation and context rules | Frozen | High | 2 | Low | center IA docs |
| `docs/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | Architecture | BCVH information structure | Frozen | High | 2 | Low | BCVH widget/screen/UX docs |
| `docs/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | Architecture | Route information structure | Frozen | High | 2 | Low | Route widget/screen/UX docs |
| `docs/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | Architecture | Shipment information structure | Frozen | High | 2 | Low | Shipment widget/screen/UX docs |
| `docs/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | Architecture | Evidence information structure | Frozen | High | 2 | Low | Evidence widget/screen/UX docs |
| `docs/ACTION_CENTER_INFORMATION_ARCHITECTURE.md` | Architecture | Action information structure | Frozen | High | 2 | Low | Action widget/screen/UX docs |
| `docs/IMPLEMENTATION_ARCHITECTURE.md` | Architecture | Implementation bridge to development | Frozen | High | 2 | Low | release/epic/feature/backlog |

## 3. UX

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/QIS_UX_DESIGN_PRINCIPLES.md` | UX | Global UX principles | Frozen | High | 2 | Low | design system, screen docs |
| `docs/QIS_DESIGN_SYSTEM.md` | UX | Shared design system | Frozen | High | 2 | Low | screen docs, widget docs |
| `docs/BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | UX | BCVH UX architecture | Frozen | High | 3 | Low | BCVH IA/screen/widget docs |
| `docs/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | UX | Route UX architecture | Frozen | High | 3 | Low | Route IA/screen/widget docs |
| `docs/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | UX | Shipment UX architecture | Frozen | High | 3 | Low | Shipment IA/screen/widget docs |
| `docs/EVIDENCE_CENTER_UX_ARCHITECTURE.md` | UX | Evidence UX architecture | Frozen | High | 3 | Low | Evidence IA/screen/widget docs |
| `docs/ACTION_CENTER_UX_ARCHITECTURE.md` | UX | Action UX architecture | Frozen | High | 3 | Low | Action IA/screen/widget docs |
| `docs/UX_CONSISTENCY_REVIEW.md` | UX | UX freeze review | Frozen | High | 3 | Low | all UX docs |

## 4. Technical Planning

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/RELEASE_PLANNING.md` | Technical Planning | Release sequencing | Frozen | High | 3 | Low | epic/feature planning |
| `docs/EPIC_PLANNING.md` | Technical Planning | Epic breakdown | Frozen | High | 3 | Medium | release/feature/backlog |
| `docs/FEATURE_PLANNING.md` | Technical Planning | Feature breakdown | Frozen | High | 3 | Medium | epic/backlog |
| `docs/DEVELOPMENT_BACKLOG.md` | Technical Planning | Development ticket queue | Frozen | High | 3 | High | feature/implementation docs |
| `docs/IMPLEMENTATION_ARCHITECTURE.md` | Technical Planning | Implementation structure | Frozen | High | 2 | Low | release/epic/feature/backlog |

## 5. Development

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/PROJECT_HANDOVER.md` | Development | High-level project handover | Active | High | 1 | Medium | context/protocol/decisions |
| `docs/PROJECT_CONTEXT.md` | Development | Project context for new sessions | Active | High | 1 | Medium | handover/protocol/decisions |
| `docs/AI_COLLABORATION_PROTOCOL.md` | Development | Collaboration protocol | Active | High | 1 | Medium | handover/context/decisions |
| `docs/PROJECT_DECISIONS.md` | Development | Immutable decision log | Active | High | 1 | Medium | handover/context/protocol |
| `docs/MASTER_START_PROMPT.md` | Development | Start prompt for new ChatGPT sessions | Active | High | 1 | Medium | handover/context/protocol/decisions |

## 6. Governance

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/DOCUMENT_GOVERNANCE.md` | Governance | Document governance rules | Active | High | 1 | Low | index/lifecycle/matrix |
| `docs/DOCUMENT_LIFECYCLE.md` | Governance | Document state transitions | Active | High | 1 | Low | governance/update matrix |
| `docs/DOCUMENT_UPDATE_MATRIX.md` | Governance | Event-to-document update matrix | Active | High | 1 | Medium | governance/lifecycle |
| `docs/DOCUMENT_INDEX.md` | Governance | Repository TOC | Active | High | 1 | Medium | all docs |

## 7. Handover

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/PROJECT_HANDOVER.md` | Handover | High-level project transfer document | Active | High | 1 | Medium | context/decisions/protocol |
| `docs/PROJECT_CONTEXT.md` | Handover | Full project context | Active | High | 1 | Medium | handover/protocol/decisions |
| `docs/AI_COLLABORATION_PROTOCOL.md` | Handover | AI coordination rules | Active | High | 1 | Medium | handover/context/decisions |
| `docs/PROJECT_DECISIONS.md` | Handover | Frozen decision log | Active | High | 1 | Medium | handover/context/protocol |
| `docs/MASTER_START_PROMPT.md` | Handover | New chat startup prompt | Active | High | 1 | Medium | all handover docs |

## 8. Reviews

| File Name | Category | Purpose | Status | Authority Level | Read Priority | Update Frequency | Related Documents |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `docs/BCVH_PERFORMANCE_CENTER_REVIEW.md` | Reviews | BCVH review result | Frozen | High | 2 | Low | BCVH docs |
| `docs/ROUTE_PERFORMANCE_CENTER_REVIEW.md` | Reviews | Route review result | Frozen | High | 2 | Low | Route docs |
| `docs/ARCHITECTURE_CONSISTENCY_REVIEW.md` | Reviews | Architecture freeze review | Frozen | High | 2 | Low | architecture docs |
| `docs/UX_CONSISTENCY_REVIEW.md` | Reviews | UX freeze review | Frozen | High | 2 | Low | UX docs |

