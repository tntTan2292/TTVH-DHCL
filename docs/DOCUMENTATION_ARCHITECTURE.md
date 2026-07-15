# DOCUMENTATION ARCHITECTURE

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Documentation Principles](#2-documentation-principles)
- [3. Repository Documentation Layers](#3-repository-documentation-layers)
- [4. Proposed Folder Architecture](#4-proposed-folder-architecture)
- [5. Naming Convention](#5-naming-convention)
- [6. Folder Responsibility](#6-folder-responsibility)
- [7. Documentation Dependency](#7-documentation-dependency)
- [8. Migration Strategy](#8-migration-strategy)
- [9. Backward Compatibility](#9-backward-compatibility)
- [10. Risk Analysis](#10-risk-analysis)
- [11. Documentation Refactoring Roadmap](#11-documentation-refactoring-roadmap)

## 1. Purpose

Documentation Architecture defines how the repository documentation should be organized conceptually across governance, architecture, UX, planning, development, and reference layers.

Role in QIS V2:

- provide a structured map for the whole documentation landscape
- reduce ambiguity between frozen and legacy documents
- support AI onboarding and documentation governance
- define a safe refactoring direction without changing existing files

## 2. Documentation Principles

- Decision First
- Single Source of Truth
- Governance Driven
- Frozen Before Development
- One Responsibility Per Document
- Archive Instead of Delete
- Backward Compatibility

Additional principles:

- do not let legacy documents override frozen contracts
- use Authority Level to resolve conflicts
- prefer traceability over aggressive cleanup
- preserve onboarding paths for AI and humans

## 3. Repository Documentation Layers

### L1 - Core

Responsibilities:

- project identity
- SSOT
- immutable decisions

Examples:

- `PROJECT_SSOT.md`
- `PROJECT_DECISIONS.md`

### L2 - Governance

Responsibilities:

- project control
- documentation control
- handover
- lifecycle and index management

Examples:

- `DOCUMENT_GOVERNANCE.md`
- `DOCUMENT_INDEX.md`
- `DOCUMENT_LIFECYCLE.md`
- `DOCUMENT_UPDATE_MATRIX.md`
- `PROJECT_HANDOVER.md`
- `PROJECT_CONTEXT.md`
- `AI_COLLABORATION_PROTOCOL.md`
- `MASTER_START_PROMPT.md`

### L3 - Architecture

Responsibilities:

- system architecture
- center architecture
- cross-center contracts
- implementation architecture

Examples:

- `QIS_V2_ARCHITECTURE.md`
- `CROSS_CENTER_INTERACTION_ARCHITECTURE.md`
- center IA / screen / UX architecture docs
- `IMPLEMENTATION_ARCHITECTURE.md`

### L4 - UX

Responsibilities:

- global UX principles
- design system
- UX architecture

Examples:

- `QIS_UX_DESIGN_PRINCIPLES.md`
- `QIS_DESIGN_SYSTEM.md`
- center UX architecture docs

### L5 - Technical Planning

Responsibilities:

- release planning
- epic planning
- feature planning
- backlog planning

Examples:

- `RELEASE_PLANNING.md`
- `EPIC_PLANNING.md`
- `FEATURE_PLANNING.md`
- `DEVELOPMENT_BACKLOG.md`

### L6 - Development

Responsibilities:

- tickets
- runtime evidence
- implementation notes

Examples:

- runtime tickets and development artifacts

### L7 - Review

Responsibilities:

- freeze review
- center review
- architecture/UX consistency review

Examples:

- `ARCHITECTURE_CONSISTENCY_REVIEW.md`
- `UX_CONSISTENCY_REVIEW.md`
- center review docs

### L8 - Reference

Responsibilities:

- legacy support
- historical context
- supporting reference material

Examples:

- legacy rule packs
- legacy technical notes
- reference guides

### L9 - Archive

Responsibilities:

- preserved history
- superseded documentation
- deprecated content that remains for traceability

Examples:

- any archived or superseded document set

## 4. Proposed Folder Architecture

This is design only. No file movement is performed.

Proposed structure:

```text
docs/
  00_README/
  01_GOVERNANCE/
  02_ARCHITECTURE/
    BCVH/
    ROUTE/
    SHIPMENT/
    EVIDENCE/
    ACTION/
  03_UX/
  04_TECHNICAL_PLANNING/
  05_DEVELOPMENT/
  06_REVIEWS/
  07_REFERENCE/
archive/
```

Design intent:

- keep governance documents easy to find first
- group center contracts by functional domain
- isolate legacy/reference content from active contracts
- make archive status explicit

## 5. Naming Convention

Recommended naming pattern:

- `INFORMATION_ARCHITECTURE.md`
- `WIDGET_SPECIFICATION.md`
- `SCREEN_ARCHITECTURE.md`
- `UX_ARCHITECTURE.md`
- `REVIEW.md`
- `PLANNING.md`

Rules:

- use descriptive uppercase names for frozen contract docs
- use consistent suffixes for document type
- keep center names in the filename when the document belongs to a center
- prefer canonical names over ad hoc variants

## 6. Folder Responsibility

### Allowed content by folder

- `00_README/`: onboarding / entry / summary docs
- `01_GOVERNANCE/`: governance, lifecycle, index, update matrix
- `02_ARCHITECTURE/`: architecture and cross-center contracts
- `03_UX/`: UX principles, design system, UX architectures
- `04_TECHNICAL_PLANNING/`: release, epic, feature, backlog, implementation planning
- `05_DEVELOPMENT/`: tickets, runtime notes, implementation artifacts
- `06_REVIEWS/`: PASS/WARNING/FAIL review documents
- `07_REFERENCE/`: legacy and supporting reference docs
- `archive/`: superseded or historical docs only

### Must not contain

- governance folder must not contain experimental runtime notes
- architecture folders must not contain planning backlog items
- UX folders must not contain implementation evidence
- development folders must not contain frozen decision logs
- archive must not be treated as active source of truth

## 7. Documentation Dependency

```text
README_AI
↓
MASTER_START_PROMPT
↓
DOCUMENT_INDEX
↓
Governance
↓
Project Control
↓
Architecture
↓
UX
↓
Planning
↓
Development
↓
Review
```

Dependency intent:

- AI entry points come first
- governance and index define reading order
- project control documents define current state
- architecture and UX define frozen contracts
- planning translates contracts into delivery
- development implements only approved scope
- review closes the loop

## 8. Migration Strategy

Design only, not executed.

### Move Strategy

- move modern active docs into the proposed layered folder structure
- keep legacy docs in a dedicated legacy/reference path

### Rename Strategy

- normalize filenames to consistent uppercase contract suffixes
- preserve meaning and authority when renaming

### Archive Strategy

- superseded docs should be archived instead of deleted
- archive should preserve historical traceability and commit history

### Reference Update Strategy

- update all references after any migration
- keep entry points (`README_AI`, `MASTER_START_PROMPT`, `DOCUMENT_INDEX`) stable during transition
- stage migration in phases to avoid broken links

## 9. Backward Compatibility

To avoid impact on `README_AI.md`, `MASTER_START_PROMPT.md`, and `DOCUMENT_INDEX.md`:

- keep current canonical files valid until migration is complete
- use alias or index mapping during transition if needed
- do not break current reading order
- do not change onboarding behavior until the new structure is fully approved
- keep old paths accessible through redirects or index references if refactoring is later approved

## 10. Risk Analysis

### Broken Links

- medium risk if folder migration happens without reference updates

### Authority Conflict

- medium risk because legacy docs and modern frozen docs currently coexist

### Governance Impact

- high impact if governance docs are moved without preserving authority and reading order

### AI Onboarding Impact

- medium impact if entry points become fragmented or duplicated

## 11. Documentation Refactoring Roadmap

### DOC-003 Migration Plan

Define the exact move/rename/archive sequence and the dependency-safe order of operations.

### DOC-004 Documentation Cleanup

Remove ambiguity, superseded references, and duplicate-function documents after migration approval.

### DOC-005 Post Migration Review

Verify that authority, reading order, onboarding, and references still work after refactoring.

