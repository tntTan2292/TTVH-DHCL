# GOVERNANCE V2 DESIGN

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Design Goals](#2-design-goals)
- [3. Design Principles](#3-design-principles)
- [4. AI Onboarding V2 Flow](#4-ai-onboarding-v2-flow)
- [5. PROJECT_SNAPSHOT SSOT](#5-project_snapshot-ssot)
- [6. Ticket Manifest](#6-ticket-manifest)
- [7. Document Responsibility Matrix](#7-document-responsibility-matrix)
- [8. Codex Reading Workflow](#8-codex-reading-workflow)
- [9. ChatGPT Reading Workflow](#9-chatgpt-reading-workflow)
- [10. Migration Plan](#10-migration-plan)
- [11. Compatibility with Governance V1](#11-compatibility-with-governance-v1)
- [12. Mapping Table](#12-mapping-table)
- [13. Risk Analysis](#13-risk-analysis)
- [14. Validation Evidence](#14-validation-evidence)
- [15. Implementation Boundary](#15-implementation-boundary)

## 1. Purpose

Governance V2 is a design for reducing onboarding context load while preserving:

- 100% of the existing workflow
- project safety
- document traceability
- SSOT discipline
- continuation from a fresh chat
- compatibility across multiple AI assistants

This document is design-only. It does not replace or refactor existing governance artifacts.

## 2. Design Goals

### 2.1 Primary Goals

- Reduce onboarding from a long reading chain to a small, deterministic starting surface.
- Preserve the exact workflow sequence used by Governance V1.
- Keep SSOT, freeze boundaries, and PO approvals intact.
- Allow a new AI session to continue from a single current snapshot without relying on chat history.
- Keep Codex, ChatGPT, Claude, Gemini, and similar assistants on the same reading contract.

### 2.2 Success Criteria

- A new AI can resume the project by reading `README_AI.md` and one V2 snapshot document.
- The current ticket, phase, status, PO gate, and next ticket are available in one canonical record.
- The project safety model does not weaken.
- No document ownership becomes ambiguous.
- No workflow step disappears.
- Governance V1 remains valid until an approved migration phase explicitly supersedes it.

## 3. Design Principles

- Single-entry onboarding with deterministic fallback.
- One document, one responsibility.
- Read-only governance first, implementation second.
- Freeze contracts remain stronger than convenience.
- Every state transition must be traceable to a ticket or review record.
- V2 must be additive before it is substitutive.
- Compatibility must be explicit, not implied.

## 4. AI Onboarding V2 Flow

### 4.1 Target Flow

```text
README_AI.md
↓
PROJECT_SNAPSHOT.md
↓
Ticket Manifest
↓
Current Ticket Documents
↓
Project Control Docs
↓
PO Findings / Review Evidence
```

### 4.2 What Changes in V2

- The AI no longer needs to read the full governance chain every time.
- `PROJECT_SNAPSHOT` becomes the canonical current-state entry for fresh sessions.
- The Ticket Manifest narrows the reading scope to the active ticket and its dependencies.
- The document responsibility matrix prevents multi-purpose documents from accumulating unrelated content.

### 4.3 What Does Not Change

- The current workflow logic remains the same.
- SSOT remains the authority for business facts.
- Frozen governance docs remain frozen.
- PO approvals still control business acceptance.
- Runtime evidence still controls technical closure.

## 5. PROJECT_SNAPSHOT SSOT

### 5.1 Role

`PROJECT_SNAPSHOT.md` is the single current-state SSOT for AI onboarding in Governance V2.

It contains only current-state facts, for example:

- project name
- phase
- current ticket
- current development status
- PO UI check requirement
- PO product status
- next ticket
- current commit
- last validation summary
- current risk flags

### 5.2 Rules

- One current snapshot only.
- No historical narrative.
- No duplicated governance doctrine.
- No implementation walkthrough.
- No freeform discussion content.

### 5.3 Safety Benefit

A fresh AI does not need to infer the current state from many files. The snapshot gives the safest minimal state needed to continue.

## 6. Ticket Manifest

### 6.1 Role

The Ticket Manifest is a compact index that maps each ticket to:

- its business objective
- its required documents
- its runtime evidence
- its review artifact
- its PO finding references
- its completion gate

### 6.2 Required Fields

Each ticket entry should include:

- Ticket ID
- Ticket Name
- Phase
- Status
- PO UI Check Required
- PO Product Status
- Current Commit
- Required Documents
- Required Validation
- Related PO Findings
- Next Ticket

### 6.3 Safety Benefit

The manifest reduces reading load while preserving traceability and preventing accidental omission of a required evidence document.

## 7. Document Responsibility Matrix

Each document must have one primary responsibility. No document should be the primary source for multiple unrelated concerns.

| Document | Primary Responsibility |
| --- | --- |
| `README_AI.md` | AI entry point and minimal onboarding guide |
| `PROJECT_SNAPSHOT.md` | Current project state SSOT |
| `PROJECT_STATUS.md` | Live status summary |
| `PROJECT_PROGRESS.md` | Progress and milestone history |
| `PROJECT_HANDOVER.md` | Handover continuity and next-step context |
| `PROJECT_CONTEXT.md` | Governance context and rules snapshot |
| `DOCUMENT_INDEX.md` | Document inventory and reading authority |
| `DOCUMENT_GOVERNANCE.md` | Document lifecycle and ownership rules |
| `DOCUMENT_UPDATE_MATRIX.md` | Which docs change for which events |
| `PO_FINDINGS_REGISTER.md` | PO finding traceability |
| Review evidence docs | Ticket-specific technical/runtime proof |
| Ticket manifest | Ticket-to-document routing |

### 7.1 Principle

If a document begins to hold two unrelated responsibilities, split it in V2 rather than expanding it indefinitely.

## 8. Codex Reading Workflow

### 8.1 Minimal Flow

1. Read `README_AI.md`.
2. Read `PROJECT_SNAPSHOT.md`.
3. Read the active ticket entry in the Ticket Manifest.
4. Read only the documents listed as required for that ticket.
5. Validate against the review evidence and PO findings.
6. Continue implementation or documentation work.

### 8.2 Codex Rules

- Do not rely on chat history.
- Do not skip the current snapshot.
- Do not read unrelated archives unless the manifest requires them.
- Do not change frozen docs unless an approved governance event requires it.

## 9. ChatGPT Reading Workflow

### 9.1 Minimal Flow

1. Read `README_AI.md`.
2. Read `PROJECT_SNAPSHOT.md`.
3. Read `DOCUMENT_INDEX.md`.
4. Read the active ticket entry from the Ticket Manifest.
5. Read only the mapped governance and review documents.
6. Produce architecture / governance review output.

### 9.2 ChatGPT Rules

- Use the snapshot as the canonical current-state source.
- Use the manifest to avoid over-reading.
- Keep governance recommendations separated from implementation changes.
- Escalate to PO when a business rule or SSOT decision is affected.

## 10. Migration Plan

### Phase 1

- Add `PROJECT_SNAPSHOT.md` as a design target and start populating it in parallel with current status docs.
- Add the Ticket Manifest as a planning concept.
- Keep all V1 docs unchanged.

### Phase 2

- Introduce responsibility splitting for any document that currently mixes unrelated concerns.
- Add cross-links from `README_AI.md` to the snapshot and manifest.
- Preserve the existing reading chain for backwards compatibility.

### Phase 3

- Make the snapshot the first practical continuation surface for new AI sessions.
- Keep V1 as fallback and audit trail.
- Enforce the manifest for current-ticket document discovery.

### Phase 4

- Update onboarding guidance to prefer V2 while keeping V1 readable.
- Keep all status and progress files synchronized.
- Maintain PO gate and review evidence traceability.

### Phase N

- Retire only duplicate onboarding instructions after PO approval.
- Never remove SSOT authority from the core governance chain.
- Keep backward compatibility until no live workflow depends on the V1 path.

## 11. Compatibility with Governance V1

Governance V2 is compatible with V1 because:

- V1 remains the authoritative legacy workflow until migration completes.
- V2 adds a smaller onboarding surface, not a different governance model.
- The current state still lives in current project docs and review evidence.
- Freeze rules, PO approval rules, and SSOT discipline are unchanged.

### 11.1 Compatibility Guarantees

- A V1-only reader can still continue the project.
- A V2-aware reader can continue faster with less context load.
- The project does not lose safety during coexistence.
- Existing governance docs remain valid and discoverable.

## 12. Mapping Table

| V1 Document | V2 Document | Action | Reason |
| --- | --- | --- | --- |
| `README_AI.md` | `README_AI.md` + `PROJECT_SNAPSHOT.md` | Split | Keep the entry point minimal and move current state into the snapshot |
| `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | `PROJECT_SNAPSHOT.md` + `TICKET_MANIFEST.md` | Split | Reduce onboarding payload while keeping continuation state explicit |
| `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` | `DOCUMENT_INDEX.md` + `TICKET_MANIFEST.md` | Split | Separate inventory authority from current-ticket routing |
| `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` | `PROJECT_HANDOVER.md` + `PROJECT_SNAPSHOT.md` | Split | Keep handover narrative, but remove current-state overload |
| `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` | `PROJECT_CONTEXT.md` + `PROJECT_SNAPSHOT.md` | Split | Preserve rules in context, keep live state in snapshot |
| `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md` | `DOCUMENT_GOVERNANCE.md` | Keep | Already serves one responsibility |
| `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md` | `DOCUMENT_UPDATE_MATRIX.md` | Keep | Already serves one responsibility |
| `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md` | `PO_FINDINGS_REGISTER.md` | Keep | Traceability must stay centralized |
| `PROJECT_STATUS.md` | `PROJECT_SNAPSHOT.md` | Split | Status summary stays, but current state should also exist in the snapshot |
| `PROJECT_PROGRESS.md` | `PROJECT_SNAPSHOT.md` | Split | Progress history remains; current state should not be inferred from history |
| `docs/06_REVIEWS/*` review docs | review docs | Keep | Ticket-specific evidence must stay specific |

### 12.1 Mapping Notes

- `Split` means the current V1 document keeps its existing role while V2 introduces a narrower companion document.
- `Keep` means the V1 document already satisfies the one-responsibility rule.
- `Merge` is intentionally unused in this design because merging increases cognitive load and weakens traceability.
- `Remove Duplicate` is reserved for later migration phases after PO approval and only when a duplicate source is proven unnecessary.

## 13. Risk Analysis

### 13.1 Operational Risks

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Snapshot drift | AI may read outdated current state | Make snapshot updates part of the same controlled workflow as status changes |
| Manifest omission | A required evidence doc may be skipped | Validate ticket closure against the manifest before completion |
| Duplicate authority | Two docs may claim the same responsibility | Enforce the one-document, one-responsibility rule |
| Premature V1 removal | Legacy onboarding may break | Keep V1 readable until migration phase N is approved |
| Over-splitting | Too many tiny docs may increase overhead | Split only when the responsibility boundary is real and stable |
| Cross-AI inconsistency | Different AIs may interpret the new flow differently | Publish explicit reading orders and keep the snapshot canonical |

### 13.2 Safety Analysis

Governance V2 does not reduce safety because:

- it does not remove PO control,
- it does not weaken SSOT,
- it does not relax frozen doc rules,
- it does not change runtime contracts,
- it does not change business rules,
- it does not allow the AI to infer current state from memory.

## 14. Validation Evidence

### 14.1 Validation Claim

The following design proof is sufficient for PO review:

- a new AI can start from `README_AI.md`
- the AI can then read `PROJECT_SNAPSHOT.md`
- the AI can identify the current ticket from the manifest
- the AI can continue the workflow without reading the entire governance history

### 14.2 Safety Proof

The design preserves safety because it keeps:

- SSOT first
- frozen docs intact
- PO gate intact
- review evidence intact
- ticket traceability intact

### 14.3 Multi-AI Compatibility Proof

All common AI assistants can follow the same steps because the workflow is document-based and not model-specific:

- ChatGPT can read the snapshot and manifest as structured context.
- Codex can use the snapshot and current-ticket docs to continue implementation safely.
- Claude can follow the same reading order because it is plain Markdown.
- Gemini can follow the same reading order because no proprietary prompt format is required.

## 15. Implementation Boundary

This document is a design artifact only.

It does not:

- rename existing documents
- refactor existing workflows
- change current status files
- change SSOT facts
- change runtime contracts
- change PO approval rules

It only defines how Governance V2 should be introduced in future phases while keeping Governance V1 fully compatible.

