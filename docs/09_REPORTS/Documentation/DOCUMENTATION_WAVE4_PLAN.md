# Documentation Wave 4 Plan

## Table of Contents
- [1. Purpose](#1-purpose)
- [2. Wave 4 Scope](#2-wave-4-scope)
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

Wave 4 is the planned execution wave for Technical Planning Documentation Refactoring.

Its purpose is to move and organize the technical planning layer into a dedicated technical planning area in a controlled way, without touching governance, architecture, UX, development, review, or legacy/reference material.

## 2. Wave 4 Scope

Wave 4 is strictly Technical Planning documentation only.

Wave 4 does not include:

- Governance
- Architecture
- UX
- Development
- Review
- Reference
- Archive cleanup beyond the approved technical planning move set

Wave 4 execution boundary:

- technical planning docs only
- move-only execution for approved files
- no content redesign
- no business changes
- no SSOT changes
- no architecture changes
- no UX changes
- no development changes

## 3. Folder Structure

Proposed Technical Planning documentation structure:

- `docs/04_TECHNICAL_PLANNING/`
  - `Release/`
  - `Epic/`
  - `Feature/`
  - `Implementation/`
  - `Roadmap/`
  - `Backlog/`
  - `Runtime/`
  - `Shared/`

This structure is a target map only.
No move is executed by this plan.

## 4. Target Documents

The following technical planning documents are the main candidates for Wave 4 move execution:

- `docs/RELEASE_PLANNING.md`
- `docs/EPIC_PLANNING.md`
- `docs/FEATURE_PLANNING.md`
- `docs/IMPLEMENTATION_ARCHITECTURE.md`
- `docs/DEVELOPMENT_BACKLOG.md`

Additionally, if future Wave 4 sub-steps are approved, the following planning areas may be included:

- release planning artifacts
- epic planning artifacts
- feature planning artifacts
- implementation planning artifacts
- roadmap artifacts
- backlog artifacts
- runtime planning artifacts
- shared planning reference artifacts

## 5. Classification Table

| File | Current Classification | Wave 4 Action | Reason |
|---|---|---|---|
| `docs/RELEASE_PLANNING.md` | MOVE | Move | Core technical planning document |
| `docs/EPIC_PLANNING.md` | MOVE | Move | Core technical planning document |
| `docs/FEATURE_PLANNING.md` | MOVE | Move | Core technical planning document |
| `docs/IMPLEMENTATION_ARCHITECTURE.md` | MOVE | Move | Bridge from UX to technical planning |
| `docs/DEVELOPMENT_BACKLOG.md` | MOVE | Move | Core execution planning document |
| `docs/09_REPORTS/Documentation/DOCUMENTATION_WAVE3_EXECUTION_REPORT.md` | NO ACTION | No move | Governance execution record, not technical planning |
| `docs/09_REPORTS/Documentation/DOCUMENTATION_WAVE2_EXECUTION_REPORT.md` | NO ACTION | No move | Governance execution record, not technical planning |
| `docs/09_REPORTS/Documentation/DOCUMENTATION_WAVE2_VALIDATION_REPORT.md` | NO ACTION | No move | Governance validation record, not technical planning |
| `docs/09_REPORTS/Documentation/DOCUMENTATION_WAVE3_PLAN.md` | NO ACTION | No move | Governance planning record, not technical planning |
| `docs/01_GOVERNANCE/*` | NO ACTION | No move | Governance layer is out of scope |
| `docs/02_ARCHITECTURE/*` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/03_UX/*` | NO ACTION | No move | UX layer is out of scope |
| any future `SPRINT_PLANNING.md` or `ROADMAP.md` found in repo | REVIEW | Review before move | May belong to Wave 4 only if explicitly approved |
| any future `RUNTIME_PLANNING.md` found in repo | REVIEW | Review before move | May belong to Wave 4 only if explicitly approved |

## 6. Reference Update Strategy

If Wave 4 is approved and executed, update only references that point to the moved technical planning files.

Reference update checklist:

- update onboarding documents that link to planning contracts if their paths change
- update governance or progress docs only if they directly reference the moved planning files
- preserve core governance chain unless a new path must be exposed for navigation
- do not modify SSOT, business rules, architecture, or UX content
- do not update legacy or unrelated docs unless they directly reference a moved planning file

Files that should be reviewed for path sensitivity during execution:

- `README_AI.md`
- `docs/01_GOVERNANCE/MASTER_START_PROMPT.md`
- `docs/01_GOVERNANCE/PROJECT_HANDOVER.md`
- `docs/01_GOVERNANCE/PROJECT_CONTEXT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `PROJECT_PROGRESS.md`

## 7. Risk Analysis

Key risks for Wave 4:

- broken links after moving planning files
- authority confusion if planning docs are mixed with governance or architecture docs
- onboarding drift if `README_AI` or `MASTER_START_PROMPT` paths are not checked
- path overlap between technical planning and runtime/implementation references
- accidental scope creep into architecture, UX, or development docs

## 8. Validation Strategy

After Wave 4 execution, validate:

- README_AI still resolves
- MASTER_START_PROMPT still resolves
- PROJECT_HANDOVER still resolves
- PROJECT_CONTEXT still resolves
- DOCUMENT_INDEX still resolves
- no broken links in the core governance chain
- moved planning files are reachable from their new paths
- folder hierarchy matches the approved technical planning target structure
- no non-planning files were changed outside the approved move set

## 9. Rollback Strategy

If any Wave 4 move lands outside the approved technical planning target map:

- stop the execution batch
- revert only the approved Wave 4 move batch
- do not broaden the scope to fix unrelated files
- return to Product Owner for clarification if the boundary is unclear

Rollback rules:

- do not delete files as a cleanup shortcut
- do not rename beyond the approved move operation
- do not archive anything outside the approved wave

## 10. Approval Gate

Wave 4 execution requires explicit Product Owner approval.

No execution is allowed before approval.

If Product Owner does not approve:

- Wave 4 remains blocked
- no file move is allowed
- no reference update is allowed
- no validation is considered final

## 11. Execution Checklist

Before execution:

- confirm the approved Wave 4 technical planning move set
- confirm the folder structure
- confirm the reference update list
- confirm the rollback boundary
- confirm the approval gate is explicit

During execution:

- move only the approved technical planning documents
- update only affected references
- keep governance, architecture, UX, and development untouched

After execution:

- validate links
- validate onboarding entry points
- validate scope integrity
- create the Wave 4 execution report

