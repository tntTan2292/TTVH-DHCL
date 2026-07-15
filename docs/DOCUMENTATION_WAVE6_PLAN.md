# Documentation Wave 6 Plan

## Table of Contents
- [1. Purpose](#1-purpose)
- [2. Wave 6 Scope](#2-wave-6-scope)
- [3. Folder Structure](#3-folder-structure)
- [4. Target Documents](#4-target-documents)
- [5. Classification Table](#5-classification-table)
- [6. Reference Update Strategy](#6-reference-update-strategy)
- [7. Validation Strategy](#7-validation-strategy)
- [8. Rollback Strategy](#8-rollback-strategy)
- [9. Approval Gate](#9-approval-gate)
- [10. Execution Checklist](#10-execution-checklist)

## 1. Purpose

Wave 6 is the planned execution wave for Review Documentation Refactoring.

Its purpose is to move and organize review and validation documents into a dedicated review area in a controlled way, without touching governance, architecture, UX, technical planning, development, reference, or archive material.

## 2. Wave 6 Scope

Wave 6 is strictly Review documentation only.

Wave 6 includes review, validation, and quality review artifacts related to completed or frozen parts of the system.

Wave 6 does not include:

- Governance
- Architecture
- UX
- Technical Planning
- Development
- Reference
- Archive cleanup beyond the approved review move set

Wave 6 execution boundary:

- review docs only
- move-only execution for approved files
- no content redesign
- no business changes
- no SSOT changes
- no architecture changes
- no UX changes
- no planning changes
- no development changes

## 3. Folder Structure

Proposed Review documentation structure:

- `docs/06_REVIEWS/`
  - `Dashboard/`
  - `BCVH/`
  - `Route/`
  - `Shipment/`
  - `Evidence/`
  - `Action/`
  - `Runtime/`
  - `Documentation/`
  - `Shared/`

This structure is a target map only.
No move is executed by this plan.

## 4. Target Documents

The following review documents are the main candidates for Wave 6 move execution:

- `docs/DASHBOARD_FOUNDATION_REVIEW.md`
- `docs/BCVH_PERFORMANCE_CENTER_REVIEW.md`
- `docs/ROUTE_PERFORMANCE_CENTER_REVIEW.md`
- `docs/ARCHITECTURE_CONSISTENCY_REVIEW.md`
- `docs/UX_CONSISTENCY_REVIEW.md`

Additional review / validation / quality review documents may be classified into this wave if they exist in the repository or are introduced later:

- Dashboard Review
- BCVH Review
- Route Review
- Shipment Review
- Evidence Review
- Action Review
- Runtime Review
- Documentation Review
- Validation Report
- Quality Review

## 5. Classification Table

| File / Category | Current Classification | Wave 6 Action | Reason |
|---|---|---|---|
| `docs/DASHBOARD_FOUNDATION_REVIEW.md` | MOVE | Move | Dashboard review artifact |
| `docs/BCVH_PERFORMANCE_CENTER_REVIEW.md` | MOVE | Move | BCVH review artifact |
| `docs/ROUTE_PERFORMANCE_CENTER_REVIEW.md` | MOVE | Move | Route review artifact |
| `docs/ARCHITECTURE_CONSISTENCY_REVIEW.md` | MOVE | Move | Architecture validation review |
| `docs/UX_CONSISTENCY_REVIEW.md` | MOVE | Move | UX validation review |
| `docs/DOCUMENTATION_WAVE5_PLAN.md` | NO ACTION | No move | Planning artifact, not review |
| `docs/DOCUMENTATION_WAVE4_EXECUTION_REPORT.md` | NO ACTION | No move | Execution record, not review target |
| `docs/DOCUMENTATION_WAVE3_EXECUTION_REPORT.md` | NO ACTION | No move | Execution record, not review target |
| `docs/DOCUMENTATION_WAVE2_EXECUTION_REPORT.md` | NO ACTION | No move | Execution record, not review target |
| `docs/DOCUMENTATION_WAVE2_VALIDATION_REPORT.md` | NO ACTION | No move | Validation record, not review target |
| `docs/DOCUMENTATION_WAVE3_PLAN.md` | NO ACTION | No move | Planning artifact, not review |
| `docs/DOCUMENTATION_WAVE4_PLAN.md` | NO ACTION | No move | Planning artifact, not review |
| `docs/DOCUMENTATION_WAVE5_PLAN.md` | NO ACTION | No move | Planning artifact, not review |
| `docs/01_GOVERNANCE/*` | NO ACTION | No move | Governance layer is out of scope |
| `docs/02_ARCHITECTURE/*` | NO ACTION | No move | Architecture layer is out of scope |
| `docs/03_UX/*` | NO ACTION | No move | UX layer is out of scope |
| `docs/04_TECHNICAL_PLANNING/*` | NO ACTION | No move | Technical planning layer is out of scope |
| `docs/05_DEVELOPMENT/*` | NO ACTION | No move | Development layer is out of scope |
| `docs/06_REVIEWS/*` | MOVE | Use as destination | Approved review target structure |

## 6. Reference Update Strategy

If Wave 6 is approved and executed, update only references that point to the moved review files.

Reference update checklist:

- update onboarding documents that link to review contracts if their paths change
- update governance or progress docs only if they directly reference the moved review files
- preserve core governance chain unless a new path must be exposed for navigation
- do not modify SSOT, business rules, architecture, UX, technical planning, or development content
- do not update legacy or unrelated docs unless they directly reference a moved review file

Files that should be reviewed for path sensitivity during execution:

- `README_AI.md`
- `docs/01_GOVERNANCE/MASTER_START_PROMPT.md`
- `docs/01_GOVERNANCE/PROJECT_HANDOVER.md`
- `docs/01_GOVERNANCE/PROJECT_CONTEXT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `PROJECT_PROGRESS.md`

## 7. Validation Strategy

After Wave 6 execution, validate:

- README_AI still resolves
- MASTER_START_PROMPT still resolves
- PROJECT_HANDOVER still resolves
- PROJECT_CONTEXT still resolves
- DOCUMENT_INDEX still resolves
- no broken links in the core governance chain
- moved review files are reachable from their new paths
- folder hierarchy matches the approved review target structure
- no non-review files were changed outside the approved move set

## 8. Rollback Strategy

If any Wave 6 move lands outside the approved review target map:

- stop the execution batch
- revert only the approved Wave 6 move batch
- do not broaden the scope to fix unrelated files
- return to Product Owner for clarification if the boundary is unclear

Rollback rules:

- do not delete files as a cleanup shortcut
- do not rename beyond the approved move operation
- do not archive anything outside the approved wave

## 9. Approval Gate

Wave 6 execution requires explicit Product Owner approval.

No execution is allowed before approval.

If Product Owner does not approve:

- Wave 6 remains blocked
- no file move is allowed
- no reference update is allowed
- no validation is considered final

## 10. Execution Checklist

Before execution:

- confirm the approved Wave 6 review move set
- confirm the folder structure
- confirm the reference update list
- confirm the rollback boundary
- confirm the approval gate is explicit

During execution:

- move only the approved review documents
- update only affected references
- keep governance, architecture, UX, technical planning, and development untouched

After execution:

- validate links
- validate onboarding entry points
- validate scope integrity
- create the Wave 6 execution report

