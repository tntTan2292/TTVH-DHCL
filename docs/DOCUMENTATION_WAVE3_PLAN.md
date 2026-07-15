# Documentation Wave 3 Plan

## Table of Contents
- [1. Purpose](#1-purpose)
- [2. Wave 3 Scope](#2-wave-3-scope)
- [3. Folder Structure](#3-folder-structure)
- [4. Target Documents](#4-target-documents)
- [5. Classification Table](#5-classification-table)
- [6. Reference Update Strategy](#6-reference-update-strategy)
- [7. Risk Analysis](#7-risk-analysis)
- [8. Validation Strategy](#8-validation-strategy)
- [9. Rollback Strategy](#9-rollback-strategy)
- [10. Approval Gate](#10-approval-gate)
- [11. Execution Checklist](#11-execution-checklist)

## 1. Purpose

Wave 3 is the planned execution wave for UX Documentation Refactoring.

Its purpose is to move the modern UX documentation layer into a dedicated UX area in a controlled, architecture-aligned way, without touching governance, architecture, planning, development, or legacy/reference material.

## 2. Wave 3 Scope

Wave 3 is strictly UX documentation only.

Wave 3 does not include:

- Governance
- Architecture
- Technical Planning
- Development
- Review
- Legacy
- Archive cleanup beyond the approved UX move set

Wave 3 execution boundary:

- UX docs only
- modern frozen UX docs only
- move-only execution for approved files
- no content redesign
- no business changes
- no SSOT changes
- no architecture changes
- no planning changes
- no development changes

## 3. Folder Structure

Proposed UX documentation structure:

- `docs/03_UX/`
  - `shared/`
  - `dashboard/`
  - `bcvh/`
  - `route/`
  - `shipment/`
  - `evidence/`
  - `action/`
  - `report/`

This structure is a target map only.
No move is executed by this plan.

## 4. Target Documents

The following UX documents are the main candidates for Wave 3 move execution:

- `docs/QIS_UX_DESIGN_PRINCIPLES.md`
- `docs/QIS_DESIGN_SYSTEM.md`
- `docs/BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md`
- `docs/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md`
- `docs/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md`
- `docs/EVIDENCE_CENTER_UX_ARCHITECTURE.md`
- `docs/ACTION_CENTER_UX_ARCHITECTURE.md`
- `docs/UX_CONSISTENCY_REVIEW.md`

Additionally, if a future Wave 3 sub-step is approved, the following folder groups may host center-specific UX artifacts:

- shared UX guidance
- Dashboard UX
- BCVH UX
- Route UX
- Shipment UX
- Evidence UX
- Action UX
- Report UX

## 5. Classification Table

| File | Current Classification | Wave 3 Action | Reason |
|---|---|---|---|
| `docs/QIS_UX_DESIGN_PRINCIPLES.md` | MOVE | Move | Modern shared UX principles |
| `docs/QIS_DESIGN_SYSTEM.md` | MOVE | Move | Modern shared design system |
| `docs/BCVH_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | MOVE | Move | Modern BCVH UX architecture |
| `docs/ROUTE_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | MOVE | Move | Modern Route UX architecture |
| `docs/SHIPMENT_PERFORMANCE_CENTER_UX_ARCHITECTURE.md` | MOVE | Move | Modern Shipment UX architecture |
| `docs/EVIDENCE_CENTER_UX_ARCHITECTURE.md` | MOVE | Move | Modern Evidence UX architecture |
| `docs/ACTION_CENTER_UX_ARCHITECTURE.md` | MOVE | Move | Modern Action UX architecture |
| `docs/UX_CONSISTENCY_REVIEW.md` | REVIEW | No move in Wave 3 unless PO approves review layer migration | Review artifact, not UX contract |
| `docs/01_RULES/ui_ux_guidelines.md` | ARCHIVE | No move in Wave 3 | Legacy UX guidance, outside modern UX contract |
| `docs/BCVH_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/ROUTE_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/SHIPMENT_PERFORMANCE_CENTER_INFORMATION_ARCHITECTURE.md` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/EVIDENCE_CENTER_INFORMATION_ARCHITECTURE.md` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/ACTION_CENTER_INFORMATION_ARCHITECTURE.md` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/BCVH_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/ROUTE_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/SHIPMENT_PERFORMANCE_CENTER_SCREEN_ARCHITECTURE.md` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/EVIDENCE_CENTER_SCREEN_ARCHITECTURE.md` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/ACTION_CENTER_SCREEN_ARCHITECTURE.md` | NO ACTION | No move | Architecture layer is out of scope |

## 6. Reference Update Strategy

If Wave 3 is approved and executed, update only references that point to the moved UX files.

Reference update checklist:

- update onboarding documents that link to UX contracts if their paths change
- update architecture or planning docs only if they directly reference the moved UX files
- preserve core governance chain unless a new path must be exposed for navigation
- do not modify SSOT, business rules, or architecture content
- do not update legacy or unrelated docs unless they directly reference a moved UX file

Files that should be reviewed for path sensitivity during execution:

- `README_AI.md`
- `docs/01_GOVERNANCE/MASTER_START_PROMPT.md`
- `docs/01_GOVERNANCE/PROJECT_HANDOVER.md`
- `docs/01_GOVERNANCE/PROJECT_CONTEXT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `PROJECT_PROGRESS.md`

## 7. Risk Analysis

Key risks for Wave 3:

- broken links after moving UX files
- authority confusion if UX docs are mixed with architecture or governance docs
- onboarding drift if `README_AI` or `MASTER_START_PROMPT` paths are not checked
- path overlap between UX and legacy/reference materials
- accidental scope creep into architecture or planning docs

## 8. Validation Strategy

After Wave 3 execution, validate:

- README_AI still resolves
- MASTER_START_PROMPT still resolves
- PROJECT_HANDOVER still resolves
- PROJECT_CONTEXT still resolves
- DOCUMENT_INDEX still resolves
- no broken links in the core governance chain
- moved UX files are reachable from their new paths
- folder hierarchy matches the approved UX target structure
- no non-UX files were changed outside the approved move set

## 9. Rollback Strategy

If any Wave 3 move lands outside the approved UX target map:

- stop the execution batch
- revert only the approved Wave 3 move batch
- do not broaden the scope to fix unrelated files
- return to Product Owner for clarification if the boundary is unclear

Rollback rules:

- do not delete files as a cleanup shortcut
- do not rename beyond the approved move operation
- do not archive anything outside the approved wave

## 10. Approval Gate

Wave 3 execution requires explicit Product Owner approval.

No execution is allowed before approval.

If Product Owner does not approve:

- Wave 3 remains blocked
- no file move is allowed
- no reference update is allowed
- no validation is considered final

## 11. Execution Checklist

Before execution:

- confirm the approved Wave 3 UX move set
- confirm the folder structure
- confirm the reference update list
- confirm the rollback boundary
- confirm the approval gate is explicit

During execution:

- move only the approved UX documents
- update only affected references
- keep governance, architecture, and planning untouched

After execution:

- validate links
- validate onboarding entry points
- validate scope integrity
- create the Wave 3 execution report

