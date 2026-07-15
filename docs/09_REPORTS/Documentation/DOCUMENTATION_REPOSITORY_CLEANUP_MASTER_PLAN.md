# Documentation Repository Cleanup Master Plan

## Table of Contents
- [1. Purpose](#1-purpose)
- [2. Master Plan Scope](#2-master-plan-scope)
- [3. Repository Structure After Cleanup](#3-repository-structure-after-cleanup)
- [4. Repository Health Target](#4-repository-health-target)
- [5. Target Documents](#5-target-documents)
- [6. Classification Table](#6-classification-table)
- [7. Archive Strategy](#7-archive-strategy)
- [8. Reference Update Strategy](#8-reference-update-strategy)
- [9. Broken Link Validation](#9-broken-link-validation)
- [10. Authority Validation](#10-authority-validation)
- [11. Reading Order Validation](#11-reading-order-validation)
- [12. AI Onboarding Validation](#12-ai-onboarding-validation)
- [13. Repository Health Check](#13-repository-health-check)
- [14. Risk Analysis](#14-risk-analysis)
- [15. Rollback Strategy](#15-rollback-strategy)
- [16. Execution Checklist](#16-execution-checklist)
- [17. Validation Checklist](#17-validation-checklist)
- [18. Freeze Checklist](#18-freeze-checklist)

## 1. Purpose

This master plan defines the final consolidation strategy for the documentation repository cleanup program.

It replaces the need for additional small cleanup waves by establishing a final end-state plan that can absorb remaining cleanup work into one controlled finish line:

- Repository Cleanup Execution
- Repository Final Validation
- Documentation V2 Freeze

This is a planning document only.

## 2. Master Plan Scope

The master plan covers the final cleanup of the repository documentation landscape, with emphasis on:

1. Review Documents Cleanup
2. Reference Documents Cleanup
3. Legacy Documents Cleanup
4. Archive Strategy
5. Reference Update Strategy
6. Broken Link Validation
7. Authority Validation
8. Reading Order Validation
9. AI Onboarding Validation
10. Repository Health Check
11. Final Documentation Freeze

This master plan does not execute moves, renames, deletes, or archives.
It defines the finishing policy for those activities.

## 3. Repository Structure After Cleanup

Proposed end-state structure for the documentation repository:

- `docs/01_GOVERNANCE/`
  - governance, handover, context, decisions, index, lifecycle, update matrix, start prompt
- `docs/02_ARCHITECTURE/`
  - architecture-level contracts
- `docs/03_UX/`
  - UX principles, design system, UX architecture
- `docs/04_TECHNICAL_PLANNING/`
  - release, epic, feature, implementation, backlog
- `docs/05_DEVELOPMENT/`
  - development, runtime, standards, deployment, testing
- `docs/06_REVIEWS/`
  - dashboard, center, runtime, documentation, and quality reviews
- `docs/07_REFERENCE/`
  - stable reference material that is still intentionally kept
- `docs/08_ARCHIVE/`
  - historical and superseded documentation

This structure is the target operating model after cleanup.

## 4. Repository Health Target

Target repository health after cleanup:

- Documentation Health Score: `95+`
- Governance chain: stable
- Reading order: stable
- AI onboarding: stable
- Core path references: no broken links
- Frozen documents: discoverable and consistent
- Legacy material: archived or clearly isolated

Desired classification outcome:

- fewer unknown documents
- no ambiguous ownership of active docs
- clean separation between live SSOT/control docs and historical reference material

## 5. Target Documents

This master plan absorbs the remaining cleanup universe into the following groups:

### Review Documents Cleanup

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

### Reference Documents Cleanup

- legacy reference docs
- design references
- glossary and supportive reference docs
- historical specs still used for context only

### Legacy Documents Cleanup

- superseded docs
- historical docs
- obsolete docs
- duplicate-function docs
- no-longer-referenced docs

### Conditional DELETE Candidates

DELETE is allowed only if all of the following are true:

- the file is explicitly classified as `DELETE`
- the file has no remaining functional reference
- the file is not required for historical traceability
- the file is not required by a governance, onboarding, or validation chain
- the Product Owner has approved deletion

## 6. Classification Table

| Classification | Meaning | Master Plan Action |
|---|---|---|
| KEEP | File remains in place and continues to be used | Preserve |
| MOVE | File is relocated to the target structure | Move in approved execution batch |
| ARCHIVE | File is preserved as history but isolated from active use | Archive in approved execution batch |
| DELETE | File is removable and has no remaining value or reference requirement | Delete only if conditions are met |
| REVIEW | File needs human confirmation before any move decision | Review before execution |
| NO ACTION | File is not part of this cleanup wave or already satisfies the target state | Leave unchanged |

### Master classification guidance

- Governance / control docs: `KEEP`
- Current architecture docs: `KEEP`
- Current UX docs: `KEEP` or `MOVE` depending on whether they are still at root paths
- Technical planning docs: `MOVE` or `KEEP` depending on current placement
- Development docs: `MOVE` or `KEEP` depending on current placement
- Review docs: `MOVE`
- Legacy docs: `ARCHIVE` or `DELETE` based on reference and traceability
- Unknown docs: `REVIEW`

## 7. Archive Strategy

Archive is the preferred outcome for legacy documents that still have historical or traceability value.

Archive rules:

- archive instead of delete whenever historical continuity matters
- isolate archived documents from active paths
- preserve naming and content for traceability
- do not let archive material affect live onboarding or reading order

Archive destination model:

- `docs/08_ARCHIVE/`
  - grouped by source layer or historical epoch

## 8. Reference Update Strategy

Reference updates are required whenever a moved or archived file is still referenced by active documents.

Update checklist:

- update README_AI only if the entry-point path changes
- update MASTER_START_PROMPT only if reading order or path references change
- update DOCUMENT_INDEX when file paths change
- update PROJECT_HANDOVER when path-sensitive references change
- update PROJECT_CONTEXT when path-sensitive references change
- update PROJECT_DECISIONS only if a decision reference needs to reflect a final cleanup rule
- update PROJECT_PROGRESS only if status labels or document paths change

Rules:

- preserve core governance chain first
- update only what is directly affected
- never use cleanup as an excuse to rewrite business or architecture content

## 9. Broken Link Validation

Validation must confirm:

- all entry points resolve
- onboarding chain resolves
- path references in governance documents resolve
- no broken links in moved files
- archived files are not still referenced as active paths unless intentionally preserved

Validation priority:

1. README_AI
2. MASTER_START_PROMPT
3. PROJECT_HANDOVER
4. PROJECT_CONTEXT
5. DOCUMENT_INDEX
6. PROJECT_PROGRESS

## 10. Authority Validation

Authority hierarchy remains:

- L1 Source of Truth
- L2 Project Control
- L3 Planning
- L4 Reference

Validation rule:

- if two documents conflict, higher Authority Level wins
- if same Authority Level conflicts, use lifecycle priority defined in governance

The master plan must never lower the authority of live governance docs.

## 11. Reading Order Validation

The reading order after cleanup must remain stable:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/MASTER_START_PROMPT.md`
3. `docs/01_GOVERNANCE/DOCUMENT_INDEX.md`
4. `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md`
5. `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md`
6. `docs/01_GOVERNANCE/PROJECT_HANDOVER.md`
7. `docs/01_GOVERNANCE/PROJECT_CONTEXT.md`
8. `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md`
9. `docs/01_GOVERNANCE/PROJECT_DECISIONS.md`
10. `PROJECT_STATUS.md`
11. `PROJECT_PROGRESS.md`
12. Current ticket documents

No cleanup step may break this chain.

## 12. AI Onboarding Validation

AI onboarding must remain deterministic after cleanup.

Validation points:

- README_AI must stay as the first entry point
- MASTER_START_PROMPT must remain the handoff controller
- document index must remain discoverable
- onboarding must not require historical chat memory
- current ticket continuation must remain possible from the docs only

## 13. Repository Health Check

The repository should be considered healthy only if:

- active docs are easy to locate
- frozen docs are clearly separated from historical docs
- legacy/reference docs are either archived or clearly labeled
- no duplicate active-purpose docs remain in the main live path
- governance and onboarding docs resolve without conflict
- cleanup artifacts are not mistaken for live SSOT

## 14. Risk Analysis

Key risks in the final cleanup stage:

- broken links from moving the last active legacy references
- authority drift if archived docs are still treated as active
- onboarding confusion if entry-point paths are not revalidated
- accidental delete of historically valuable material
- scope creep into frozen content

## 15. Rollback Strategy

If any cleanup batch violates the approved boundaries:

- stop immediately
- revert only the affected batch
- do not widen the fix into unrelated docs
- return to Product Owner for clarification

Rollback rules:

- prefer archive over delete
- do not rewrite live governance docs as a shortcut
- keep an auditable history of what changed

## 16. Execution Checklist

Before execution:

- confirm classification table
- confirm target folders
- confirm reference update list
- confirm archive and delete conditions
- confirm approval gate

During execution:

- move only approved docs
- archive only approved legacy docs
- delete only if explicitly approved and reference-free
- keep governance and onboarding stable

After execution:

- validate links
- validate reading order
- validate authority hierarchy
- validate AI onboarding
- validate repository health target

## 17. Validation Checklist

- README_AI resolves
- MASTER_START_PROMPT resolves
- DOCUMENT_INDEX resolves
- PROJECT_HANDOVER resolves
- PROJECT_CONTEXT resolves
- no broken links in the governance chain
- no unexpected path drift in frozen docs
- review docs and legacy docs are placed according to the cleanup target structure
- repository health target is measurable and improved

## 18. Freeze Checklist

Final Documentation Freeze requires:

- all approved cleanup batches completed
- final validation passed
- core onboarding chain stable
- authority hierarchy intact
- no open scope gaps in review/reference/legacy cleanup
- Product Owner approval for freeze

Once frozen:

- documentation state is considered final for this phase
- only explicit new cleanup decisions can reopen the process

