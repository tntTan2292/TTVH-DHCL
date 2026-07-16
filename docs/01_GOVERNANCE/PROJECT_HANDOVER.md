# PROJECT HANDOVER

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Project Overview](#2-project-overview)
- [3. Architecture Overview](#3-architecture-overview)
- [4. Frozen Architecture](#4-frozen-architecture)
- [5. Development Progress](#5-development-progress)
- [6. Completed Centers](#6-completed-centers)
- [7. Current Position](#7-current-position)
- [8. Technical Debt](#8-technical-debt)
- [9. Known Risks](#9-known-risks)
- [10. Required Reading Order](#10-required-reading-order)
- [11. Open Issues](#11-open-issues)
- [12. Next Development Roadmap](#12-next-development-roadmap)
- [13. Handover Checklist](#13-handover-checklist)
- [14. Quick Start](#14-quick-start)

## 1. Executive Summary

| Field | Value |
| --- | --- |
| Project Name | `TTVH Quality Intelligence System (QIS V2)` |
| Project Vision | `Decision Support System` for quality operations |
| Business Goal | Standardize operational decision making with SSOT, runtime, and evidence-backed flow |
| Current Development Phase | `Leadership Dashboard Delivery` |
| Current Development Status | `In Progress` |
| PO UI Check Required | `Yes` |
| PO Product Status | `NOT READY` |
| Current Architecture Status | `Frozen` |
| Current UX Status | `Frozen` |
| Current Technical Planning Status | `PASS` |

## 2. Project Overview

QIS V2 is a decision support system for TTVH quality operations.

The system is designed to move from visibility to action:

- detect operational issues,
- analyze them by BCVH, route, and shipment,
- validate evidence,
- convert decisions into actions,
- and preserve feedback for the next operating loop.

Compared with a traditional dashboard, QIS V2 is not only a display layer.
It is an operational decision system with frozen business rules, frozen architecture, frozen UX, and runtime as the acceptance standard.

## 3. Architecture Overview

```text
Dashboard
↓
BCVH Performance Center
↓
Route Performance Center
↓
Shipment Performance Center
↓
Evidence Center
↓
Action Center
↓
AI Recommendation
↓
Report Center
```

## 4. Frozen Architecture

The following documents are frozen and should be treated as SSOT/architecture contracts:

- [docs/PROJECT_SSOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/PROJECT_SSOT.md)
- [PROJECT_STATUS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_STATUS.md)
- [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md)
- [docs/02_ARCHITECTURE/QIS_V2_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/QIS_V2_ARCHITECTURE.md)
- [docs/02_ARCHITECTURE/CROSS_CENTER_INTERACTION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/CROSS_CENTER_INTERACTION_ARCHITECTURE.md)
- [docs/03_UX/shared/QIS_DESIGN_SYSTEM.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/shared/QIS_DESIGN_SYSTEM.md)
- [docs/03_UX/shared/QIS_UX_DESIGN_PRINCIPLES.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/shared/QIS_UX_DESIGN_PRINCIPLES.md)
- [docs/04_TECHNICAL_PLANNING/Implementation/IMPLEMENTATION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Implementation/IMPLEMENTATION_ARCHITECTURE.md)
- [docs/04_TECHNICAL_PLANNING/Release/RELEASE_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Release/RELEASE_PLANNING.md)
- [docs/04_TECHNICAL_PLANNING/Epic/EPIC_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Epic/EPIC_PLANNING.md)
- [docs/04_TECHNICAL_PLANNING/Feature/FEATURE_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Feature/FEATURE_PLANNING.md)
- [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)
- [docs/02_ARCHITECTURE/BCVH/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/BCVH/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md)
- [docs/BCVH_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/BCVH_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md)
- [docs/02_ARCHITECTURE/BCVH/BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/BCVH/BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md)
- [docs/03_UX/bcvh/BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/bcvh/BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md)
- [docs/06_REVIEWS/BCVH/BCVH_PERFORMANCE_CENTER_REVIEW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/BCVH/BCVH_PERFORMANCE_CENTER_REVIEW.md)
- [docs/02_ARCHITECTURE/ROUTE/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/ROUTE/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md)
- [docs/ROUTE_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/ROUTE_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md)
- [docs/02_ARCHITECTURE/ROUTE/ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/ROUTE/ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md)
- [docs/03_UX/route/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/route/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md)
- [docs/06_REVIEWS/Route/ROUTE_PERFORMANCE_CENTER_REVIEW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Route/ROUTE_PERFORMANCE_CENTER_REVIEW.md)
- [docs/06_REVIEWS/Shipment/SHIPMENT_PERFORMANCE_CENTER_REVIEW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shipment/SHIPMENT_PERFORMANCE_CENTER_REVIEW.md)
- [docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md)
- [docs/SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/SHIPMENT_PERFORMANCE_CENTER_WIDGET_SPECIFICATION.md)
- [docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/SHIPMENT/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md)
- [docs/03_UX/shipment/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/shipment/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md)
- [docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md)
- [docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/EVIDENCE_CENTER_WIDGET_SPECIFICATION.md)
- [docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/EVIDENCE/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md)
- [docs/03_UX/evidence/EVIDENCE_CENTER_UX_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/evidence/EVIDENCE_CENTER_UX_ARCHITECTURE.md)
- [docs/02_ARCHITECTURE/ACTION/ACTION_CENTER_INFORMATION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/ACTION/ACTION_CENTER_INFORMATION_ARCHITECTURE.md)
- [docs/ACTION_CENTER_WIDGET_SPECIFICATION.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/ACTION_CENTER_WIDGET_SPECIFICATION.md)
- [docs/02_ARCHITECTURE/ACTION/ACTION_CENTER_SCREEN_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/ACTION/ACTION_CENTER_SCREEN_ARCHITECTURE.md)
- [docs/03_UX/action/ACTION_CENTER_UX_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/action/ACTION_CENTER_UX_ARCHITECTURE.md)
- [docs/06_REVIEWS/Shared/UX_CONSISTENCY_REVIEW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/UX_CONSISTENCY_REVIEW.md)
- [docs/06_REVIEWS/Shared/ARCHITECTURE_CONSISTENCY_REVIEW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/ARCHITECTURE_CONSISTENCY_REVIEW.md)

## 5. Development Progress

| Area | Status |
| --- | --- |
| Architecture | `PASS` |
| UX | `PASS` |
| Technical Planning | `PASS` |
| Development | `In Progress` |
| Dashboard | `PASS` |
| BCVH | `PASS` |
| Route | `PASS` |
| Shipment | `Shell implemented` |
| Evidence | `Not started` |
| Action | `Not started` |
| AI | `Not started` |
| Report | `Not started` |

## 6. Completed Centers

| Center | Status | Review |
| --- | --- | --- |
| Dashboard | `PASS` | `Dashboard Foundation Review completed` |
| BCVH | `PASS` | `BCVH Performance Center Review completed` |
| Route | `PASS` | `Route Performance Center Review completed` |
| Shipment | `PASS` | `Shipment Performance Center Review completed` |

## 7. Current Position

| Field | Value |
| --- | --- |
| Current Ticket | `TODAY-001 Import Daily Data Verification` |
| Current Commit | `f3c0d3b279ffed2c4704b953354b45a975834e83` |
| Current Phase | `Leadership Dashboard Delivery` |
| Next Milestone | `TODAY-001 Import Daily Data Verification` |

## 8. Technical Debt

Open technical debt items captured in the current repo state:

1. Route drill-down to Shipment is contract-prepared, and Shipment runtime integration has passed review.
2. Route and BCVH runtime pages use fallback summary surfaces when optional meta fields are missing.
3. Evidence, Action, AI, and Report centers are the next implementation layers.
4. The current active work is governance synchronization for PO UI acceptance and PO findings traceability.
5. Untracked HTML artifacts remain in the working tree and are unrelated to the architecture/development flow.

## 9. Known Risks

1. Optional runtime meta fields can produce fallback values in summary cards.
2. Drill-down chains cannot be fully runtime-verified until Shipment, Evidence, and Action are all implemented.
3. Context propagation must remain stable across Route -> Shipment -> Evidence handoff.
4. The three untracked HTML files may confuse new contributors if they only inspect `git status`.

## 10. Required Reading Order

Recommended reading order for a new ChatGPT/Codex/developer session:

1. [README_AI.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/README_AI.md)
2. [docs/01_GOVERNANCE/PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md)
3. [docs/PROJECT_SSOT.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/PROJECT_SSOT.md)
4. [PROJECT_STATUS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_STATUS.md)
5. [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md)
6. [docs/02_ARCHITECTURE/QIS_V2_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/QIS_V2_ARCHITECTURE.md)
7. [docs/02_ARCHITECTURE/CROSS_CENTER_INTERACTION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/02_ARCHITECTURE/CROSS_CENTER_INTERACTION_ARCHITECTURE.md)
8. [docs/03_UX/shared/QIS_UX_DESIGN_PRINCIPLES.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/shared/QIS_UX_DESIGN_PRINCIPLES.md)
9. [docs/03_UX/shared/QIS_DESIGN_SYSTEM.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/03_UX/shared/QIS_DESIGN_SYSTEM.md)
10. [docs/04_TECHNICAL_PLANNING/Implementation/IMPLEMENTATION_ARCHITECTURE.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Implementation/IMPLEMENTATION_ARCHITECTURE.md)
11. [docs/04_TECHNICAL_PLANNING/Release/RELEASE_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Release/RELEASE_PLANNING.md)
12. [docs/04_TECHNICAL_PLANNING/Epic/EPIC_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Epic/EPIC_PLANNING.md)
13. [docs/04_TECHNICAL_PLANNING/Feature/FEATURE_PLANNING.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Feature/FEATURE_PLANNING.md)
14. [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)
15. [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
16. [docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md)
17. Center-specific IA, Widget, Screen, and UX docs
18. Center review docs

## 11. Open Issues

1. Three untracked HTML files are still in the working tree:
   - `Ban_do_mang_diem_phuc_vu_BDTP_Hue.html`
   - `Ban_do_mang_diem_phuc_vu_tich_hop_Duong_thu_cap_2.html`
   - `ban_do_duong_giao_thong_bcvh_postman_06_2026.html`
2. Shipment executive widgets are complete, and runtime integration is now the active development focus.
3. Evidence, Action, AI, and Report centers are still pending implementation.

## 12. Next Development Roadmap

```text
Shipment
↓
Evidence
↓
Action
↓
AI
↓
Report
```

Current direction is the Leadership Dashboard Delivery queue, with Shipment review completed and the next ticket being TODAY-001 Import Daily Data Verification.

## 13. Handover Checklist

- [ ] Read [docs/01_GOVERNANCE/PROJECT_HANDOVER.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PROJECT_HANDOVER.md)
- [ ] Read [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md)
- [ ] Read [PROJECT_STATUS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_STATUS.md)
- [ ] Read [docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md)
- [ ] Do not change Architecture Freeze
- [ ] Do not change SSOT
- [ ] Do not change EIDAF
- [ ] Continue from the next ticket in [docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/docs/04_TECHNICAL_PLANNING/Backlog/DEVELOPMENT_BACKLOG.md)

## 14. Quick Start

QIS V2 is a Decision Support System for TTVH quality operations.

The architecture is frozen and already delivered through Dashboard, BCVH, Route, and Shipment shell foundations.

Current work is in Leadership Dashboard Delivery, with the Import verification ticket in progress and the next ticket remaining TODAY-002 Daily Trend Data Adapter.

The project uses SSOT-driven documents, not chat history, as the source of truth.

Architecture, UX, and technical planning are all frozen and must not be rewritten casually.

PO UI acceptance must be checked whenever a ticket creates a visible product change.
PO findings must be linked to the responsible ticket or recovery path before closure.

Runtime remains the acceptance standard for development tickets.

Widgets must stay props-only when the ticket says so.

Context preservation across centers is mandatory.

Do not introduce new business rules unless Product Owner approves them.

For a fresh session, start by reading this file, then [PROJECT_STATUS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_STATUS.md), then [PROJECT_PROGRESS.md](https://github.com/tntTan2292/TTVH-DHCL/blob/main/PROJECT_PROGRESS.md).

