# Documentation Wave 5 Plan

## Table of Contents
- [1. Purpose](#1-purpose)
- [2. Wave 5 Scope](#2-wave-5-scope)
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

Wave 5 is the planned execution wave for Development Documentation Refactoring.

Its purpose is to move and organize the development documentation layer into a dedicated development area in a controlled way, without touching governance, architecture, UX, technical planning, or review/reference material.

## 2. Wave 5 Scope

Wave 5 is strictly Development documentation only.

Wave 5 does not include:

- Governance
- Architecture
- UX
- Technical Planning
- Review
- Reference
- Archive cleanup beyond the approved development move set

Wave 5 execution boundary:

- development docs only
- runtime docs only when they are part of approved development documentation
- move-only execution for approved files
- no content redesign
- no business changes
- no SSOT changes
- no architecture changes
- no UX changes
- no planning changes

## 3. Folder Structure

Proposed Development documentation structure:

- `docs/05_DEVELOPMENT/`
  - `Runtime/`
  - `Development/`
  - `Standards/`
  - `Testing/`
  - `Deployment/`
  - `Shared/`

This structure is a target map only.
No move is executed by this plan.

## 4. Target Documents

At present, the repository does not expose a dedicated development documentation set in the scanned markdown inventory.

Wave 5 therefore treats the following as candidate document categories if they exist or are added later:

- Runtime documentation
- Development guidelines
- Coding standards
- Development workflow docs
- Build / deployment docs
- Testing docs
- Runtime notes
- Developer notes
- Development specifications

## 5. Classification Table

| File / Category | Current Classification | Wave 5 Action | Reason |
|---|---|---|---|
| existing development docs in repo, if any | REVIEW | Review before move | Must be identified before any execution batch |
| runtime documentation, if any | MOVE | Move if approved | Fits the approved development scope |
| development guidelines, if any | MOVE | Move if approved | Fits the approved development scope |
| coding standards, if any | MOVE | Move if approved | Fits the approved development scope |
| development workflow docs, if any | MOVE | Move if approved | Fits the approved development scope |
| build / deployment docs, if any | MOVE | Move if approved | Fits the approved development scope |
| testing docs, if any | MOVE | Move if approved | Fits the approved development scope |
| runtime notes, if any | MOVE | Move if approved | Fits the approved development scope |
| developer notes, if any | MOVE | Move if approved | Fits the approved development scope |
| development specifications, if any | MOVE | Move if approved | Fits the approved development scope |
| governance docs | NO ACTION | No move | Out of scope |
| architecture docs | NO ACTION | No move | Out of scope |
| UX docs | NO ACTION | No move | Out of scope |
| technical planning docs | NO ACTION | No move | Out of scope |
| review docs | NO ACTION | No move | Out of scope |
| reference / archive docs | NO ACTION | No move | Out of scope |

## 6. Reference Update Strategy

If Wave 5 is approved and executed, update only references that point to the moved development files.

Reference update checklist:

- update onboarding documents that link to development contracts if their paths change
- update governance or progress docs only if they directly reference the moved development files
- preserve core governance chain unless a new path must be exposed for navigation
- do not modify SSOT, business rules, architecture, UX, or technical planning content
- do not update legacy or unrelated docs unless they directly reference a moved development file

Files that should be reviewed for path sensitivity during execution:

- `README_AI.md`
- `docs/01_GOVERNANCE/MASTER_START_PROMPT.md`
- `docs/01_GOVERNANCE/PROJECT_HANDOVER.md`
- `docs/01_GOVERNANCE/PROJECT_CONTEXT.md`
- `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
- `PROJECT_PROGRESS.md`

## 7. Risk Analysis

Key risks for Wave 5:

- broken links after moving development files
- authority confusion if development docs are mixed with governance or planning docs
- onboarding drift if `README_AI` or `MASTER_START_PROMPT` paths are not checked
- path overlap between development, runtime, and deployment references
- accidental scope creep into architecture, UX, or technical planning docs

## 8. Validation Strategy

After Wave 5 execution, validate:

- README_AI still resolves
- MASTER_START_PROMPT still resolves
- PROJECT_HANDOVER still resolves
- PROJECT_CONTEXT still resolves
- DOCUMENT_INDEX still resolves
- no broken links in the core governance chain
- moved development files are reachable from their new paths
- folder hierarchy matches the approved development target structure
- no non-development files were changed outside the approved move set

## 9. Rollback Strategy

If any Wave 5 move lands outside the approved development target map:

- stop the execution batch
- revert only the approved Wave 5 move batch
- do not broaden the scope to fix unrelated files
- return to Product Owner for clarification if the boundary is unclear

Rollback rules:

- do not delete files as a cleanup shortcut
- do not rename beyond the approved move operation
- do not archive anything outside the approved wave

## 10. Approval Gate

Wave 5 execution requires explicit Product Owner approval.

No execution is allowed before approval.

If Product Owner does not approve:

- Wave 5 remains blocked
- no file move is allowed
- no reference update is allowed
- no validation is considered final

## 11. Execution Checklist

Before execution:

- confirm the approved Wave 5 development move set
- confirm the folder structure
- confirm the reference update list
- confirm the rollback boundary
- confirm the approval gate is explicit

During execution:

- move only the approved development documents
- update only affected references
- keep governance, architecture, UX, and technical planning untouched

After execution:

- validate links
- validate onboarding entry points
- validate scope integrity
- create the Wave 5 execution report

