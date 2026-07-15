# Documentation Wave 2 Plan

## Table of Contents
- [1. Purpose](#1-purpose)
- [2. Strict Wave 2 Scope](#2-strict-wave-2-scope)
- [3. In Scope](#3-in-scope)
- [4. Explicit Out of Scope](#4-explicit-out-of-scope)
- [5. Target Folder Map](#5-target-folder-map)
- [6. Definitive Classification Table](#6-definitive-classification-table)
- [7. Move Only Boundary](#7-move-only-boundary)
- [8. Reference Update Checklist](#8-reference-update-checklist)
- [9. Rollback and Validation Checklist](#9-rollback-and-validation-checklist)
- [10. Final Approval Gate](#10-final-approval-gate)
- [11. Wave 2 Execution Readiness](#11-wave-2-execution-readiness)

## 1. Purpose

Wave 2 is the first architecture-only execution wave of Documentation Governance Refactoring.
Its purpose is to move the modern frozen architecture layer into a dedicated architecture area in a controlled way, without touching governance, UX, planning, development, or legacy reference materials.

This plan is execution-ready only when Product Owner approval is granted.

## 2. Strict Wave 2 Scope

Wave 2 is strictly limited to modern architecture documents.

Wave 2 does not include governance/core documents, UX documents, technical planning documents, development documents, review documents, or legacy reference documents.

Wave 2 execution boundary:

- architecture docs only
- modern frozen architecture only
- move-only execution
- no content redesign
- no business changes
- no governance changes
- no UX changes
- no planning changes
- no development changes

## 3. In Scope

The following architecture documents are the only intended Wave 2 move candidates:

- `docs/QIS_V2_ARCHITECTURE.md`
- `docs/CROSS_CENTER_INTERACTION_ARCHITECTURE.md`
- `docs/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md`
- `docs/BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md`
- `docs/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md`
- `docs/ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md`
- `docs/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md`
- `docs/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md`
- `docs/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md`
- `docs/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md`
- `docs/ACTION_CENTER_INFORMATION_ARCHITECTURE.md`
- `docs/ACTION_CENTER_SCREEN_ARCHITECTURE.md`

These files are the modern frozen architecture layer and are the only files Wave 2 should move.

## 4. Explicit Out of Scope

The following groups are out of scope for Wave 2:

- governance/core:
  - `README_AI.md`
  - `docs/01_GOVERNANCE/MASTER_START_PROMPT.md`
  - `docs/01_GOVERNANCE/PROJECT_HANDOVER.md`
  - `docs/01_GOVERNANCE/PROJECT_CONTEXT.md`
  - `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md`
  - `docs/01_GOVERNANCE/PROJECT_DECISIONS.md`
  - `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
  - `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md`
  - `docs/01_GOVERNANCE/DOCUMENT_LIFECYCLE.md`
  - `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md`
- UX:
  - all `*_UX_ARCHITECTURE.md` files
  - `docs/QIS_UX_DESIGN_PRINCIPLES.md`
  - `docs/QIS_DESIGN_SYSTEM.md`
- technical planning:
  - `docs/RELEASE_PLANNING.md`
  - `docs/EPIC_PLANNING.md`
  - `docs/FEATURE_PLANNING.md`
  - `docs/DEVELOPMENT_BACKLOG.md`
  - `docs/IMPLEMENTATION_ARCHITECTURE.md`
- development:
  - all runtime code and implementation files
- reviews:
  - all `*_REVIEW.md` files
- legacy / historical / reference-only material

## 5. Target Folder Map

Wave 2 target structure is architecture-only:

- `docs/02_ARCHITECTURE/`
  - `BCVH/`
  - `ROUTE/`
  - `SHIPMENT/`
  - `EVIDENCE/`
  - `ACTION/`
  - `shared/`

Proposed placement:

- `docs/QIS_V2_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/`
- `docs/CROSS_CENTER_INTERACTION_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/`
- `docs/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/BCVH/`
- `docs/BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/BCVH/`
- `docs/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/ROUTE/`
- `docs/ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/ROUTE/`
- `docs/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/SHIPMENT/`
- `docs/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/SHIPMENT/`
- `docs/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/EVIDENCE/`
- `docs/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/EVIDENCE/`
- `docs/ACTION_CENTER_INFORMATION_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/ACTION/`
- `docs/ACTION_CENTER_SCREEN_ARCHITECTURE.md` -> `docs/02_ARCHITECTURE/ACTION/`

## 6. Definitive Classification Table

| File | Current Classification | Wave 2 Action | Reason |
|---|---|---|---|
| `docs/QIS_V2_ARCHITECTURE.md` | MOVE | Move | Modern architecture root document |
| `docs/CROSS_CENTER_INTERACTION_ARCHITECTURE.md` | MOVE | Move | Modern cross-center architecture |
| `docs/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | MOVE | Move | Modern BCVH architecture |
| `docs/BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | MOVE | Move | Modern BCVH architecture |
| `docs/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | MOVE | Move | Modern Route architecture |
| `docs/ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | MOVE | Move | Modern Route architecture |
| `docs/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | MOVE | Move | Modern Shipment architecture |
| `docs/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | MOVE | Move | Modern Shipment architecture |
| `docs/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | MOVE | Move | Modern Evidence architecture |
| `docs/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` | MOVE | Move | Modern Evidence architecture |
| `docs/ACTION_CENTER_INFORMATION_ARCHITECTURE.md` | MOVE | Move | Modern Action architecture |
| `docs/ACTION_CENTER_SCREEN_ARCHITECTURE.md` | MOVE | Move | Modern Action architecture |
| `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` | KEEP | No action | Governance/core layer |
| `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md` | KEEP | No action | Governance/core layer |
| `docs/01_GOVERNANCE/DOCUMENT_LIFECYCLE.md` | KEEP | No action | Governance/core layer |
| `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md` | KEEP | No action | Governance/core layer |
| `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` | KEEP | No action | Governance/core layer |
| `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` | KEEP | No action | Governance/core layer |
| `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md` | KEEP | No action | Governance/core layer |
| `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | KEEP | No action | Governance/core layer |
| `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | KEEP | No action | Governance/core layer |
| `README_AI.md` | KEEP | No action | Entry point must remain stable |
| `docs/QIS_UX_DESIGN_PRINCIPLES.md` | REVIEW | No move | UX layer excluded from Wave 2 |
| `docs/QIS_DESIGN_SYSTEM.md` | REVIEW | No move | UX layer excluded from Wave 2 |
| `docs/RELEASE_PLANNING.md` | REVIEW | No move | Technical planning excluded |
| `docs/EPIC_PLANNING.md` | REVIEW | No move | Technical planning excluded |
| `docs/FEATURE_PLANNING.md` | REVIEW | No move | Technical planning excluded |
| `docs/DEVELOPMENT_BACKLOG.md` | REVIEW | No move | Technical planning excluded |
| `docs/IMPLEMENTATION_ARCHITECTURE.md` | REVIEW | No move | Technical planning excluded |
| legacy docs and reference material | ARCHIVE | No move in Wave 2 | Out of scope for Wave 2 execution |

## 7. Move Only Boundary

Wave 2 must be executed as a move-only wave for the files listed in the in-scope section.

Wave 2 must not:

- move governance/core files
- move UX files
- move planning files
- move development files
- move review files
- rename files outside the approved move set
- archive files outside the approved move set
- delete files
- change content semantics

If a file is not in the in-scope list, Wave 2 execution must treat it as no-action unless Product Owner explicitly approves a separate wave.

## 8. Reference Update Checklist

If Wave 2 is approved and executed, then verify:

- all internal links in moved architecture documents point to the new architecture paths
- `README_AI.md` remains unchanged unless its quick links need path refresh after Wave 2 execution
- `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` remains unchanged unless its reading order references moved architecture paths
- `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` remains unchanged unless its snapshot references moved architecture paths
- `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` remains unchanged unless its quick links reference moved architecture paths
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` remains unchanged in Wave 2 unless a separate governance update is approved
- any architecture cross-reference in architecture docs is updated to the final target path
- no governance/core link is altered unless the new path is required for direct navigation

## 9. Rollback and Validation Checklist

Before any Wave 2 execution:

- confirm the move list exactly matches the in-scope table
- confirm no governance/core file is in the move set
- confirm no UX/planning/development/review file is in the move set
- confirm the target architecture folders exist or are created as part of the same approved wave

After any Wave 2 execution:

- validate all moved files open from their new paths
- validate `README_AI.md` still resolves to the correct start prompt path
- validate `MASTER_START_PROMPT.md` still resolves to the current reading order
- validate no broken links exist in the governance/core chain
- validate no unexpected files changed outside the approved wave
- validate the repository status matches the approved scope

Rollback rule:

- if any file lands outside the approved target map, stop and revert only the approved Wave 2 execution batch
- do not broaden scope to fix unrelated issues without Product Owner approval

## 10. Final Approval Gate

Wave 2 execution requires explicit Product Owner approval.

No execution is allowed before approval.

If Product Owner does not approve:

- Wave 2 remains blocked
- no file move is allowed
- no reference update is allowed
- no cleanup validation is considered final

## 11. Wave 2 Execution Readiness

BLOCKED

Reason:

- the plan is now unambiguous and execution-shaped
- actual execution still requires explicit Product Owner approval
- until approval is granted, Wave 2 cannot be started

