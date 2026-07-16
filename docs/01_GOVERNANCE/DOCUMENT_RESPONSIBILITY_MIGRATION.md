# DOCUMENT RESPONSIBILITY MIGRATION

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Migration Goal](#2-migration-goal)
- [3. Migration Principles](#3-migration-principles)
- [4. Scope Boundary](#4-scope-boundary)
- [5. Responsibility Mapping](#5-responsibility-mapping)
- [6. Keep / Move / Reference / Remove Plan](#6-keep--move--reference--remove-plan)
- [7. Migration Phases](#7-migration-phases)
- [8. Risk Analysis](#8-risk-analysis)
- [9. Governance V1 Protection](#9-governance-v1-protection)
- [10. Validation Criteria](#10-validation-criteria)
- [11. Execution Notes](#11-execution-notes)

## 1. Purpose

This document defines a planned migration from duplicated Governance content to a "Single Responsibility + Reference" model.

It is a planning artifact only.

It does not modify current workflow, current status files, or any frozen document.

## 2. Migration Goal

The goal is to ensure every governance fact has exactly one authoritative source, while all other documents reference that source instead of copying it.

## 3. Migration Principles

- One responsibility per document.
- One SSOT per fact.
- Reference, do not duplicate.
- Keep Governance V1 available as compatibility fallback.
- Migrate incrementally without interrupting active tickets.
- Never move live state away from the canonical current-state document once established.

## 4. Scope Boundary

Included:

- governance and onboarding documents
- current-state and ticket-entry documents
- manifest routing documents
- document inventory and workflow standards

Excluded:

- product status files
- development code
- runtime contracts
- architecture freeze documents
- UX freeze documents
- PO acceptance rules

## 5. Responsibility Mapping

| Document | Current Responsibility | Duplicate Content | New Responsibility | Reference Target |
| --- | --- | --- | --- | --- |
| `README_AI.md` | AI entry point and onboarding summary | Current-state status values, fallback chain, link inventory | Thin entry point only | `PROJECT_SNAPSHOT.md`, current ticket manifest, `CODEX_DOCUMENTATION_STANDARD.md` |
| `docs/01_GOVERNANCE/MASTER_START_PROMPT.md` | Legacy onboarding chain for ChatGPT | Full project snapshot, current ticket routing, repeated status values | Governance V1 fallback prompt | `README_AI.md`, `PROJECT_SNAPSHOT.md`, current manifest |
| `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md` | Live project-state SSOT for Governance V2 | None intended; should not carry history | Single live snapshot source | `TODAY-003-R1_MANIFEST.md` and future current manifests |
| `docs/10_TICKETS/TODAY-003-R1_MANIFEST.md` | Ticket-specific reading scope | Some snapshot-like status fields and ticket context | Ticket entry point for one ticket | `PROJECT_SNAPSHOT.md`, ticket review evidence, PO findings register |
| `docs/10_TICKETS/MANIFEST_TEMPLATE.md` | Manifest creation template | Generic guidance repeated across tickets | Template only | `CODEX_DOCUMENTATION_STANDARD.md`, `DOCUMENT_UPDATE_MATRIX.md` |
| `docs/01_GOVERNANCE/CODEX_DOCUMENTATION_STANDARD.md` | Codex workflow standard | Some operational rules already exist in protocol docs | Codex-specific execution standard | `README_AI.md`, `PROJECT_SNAPSHOT.md`, current manifest |
| `docs/01_GOVERNANCE/GOVERNANCE_V2_DESIGN.md` | Governance V2 design and compatibility plan | High-level onboarding intent, migration rationale | Design reference for V2 rollout | `PROJECT_SNAPSHOT.md`, manifest framework, this migration plan |
| `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` | Document inventory and read priority | Mixed inventory plus governance references | Registry of documents and authority hints | `PROJECT_SNAPSHOT.md`, manifest docs, workflow standards |
| `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md` | Document lifecycle rules | Ownership, update, approval, and naming rules overlap with other governance docs | Canonical document lifecycle rulebook | `DOCUMENT_UPDATE_MATRIX.md`, `DOCUMENT_RESPONSIBILITY_MIGRATION.md` |
| `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md` | Event-to-document update matrix | Some update guidance repeats governance principles | Canonical update trigger matrix | `DOCUMENT_GOVERNANCE.md`, ticket manifests |
| `docs/01_GOVERNANCE/PROJECT_HANDOVER.md` | Handover narrative and continuity | Current-state summary repeated in multiple sections | Continuity and transfer reference | `PROJECT_SNAPSHOT.md`, manifests, progress/state files |
| `docs/01_GOVERNANCE/PROJECT_CONTEXT.md` | Governance context and rules | Current-state summary and read order duplicated from other docs | Context and rule reference | `PROJECT_SNAPSHOT.md`, `DOCUMENT_GOVERNANCE.md`, manifest docs |
| `docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md` | Collaboration workflow and role protocol | Some onboarding and continuation guidance repeated elsewhere | Collaboration protocol reference | `README_AI.md`, `PROJECT_SNAPSHOT.md`, manifests |
| `docs/01_GOVERNANCE/PO_UI_ACCEPTANCE_WORKFLOW.md` | PO UI acceptance workflow | Ticket gate wording duplicated in status and handover docs | PO acceptance authority reference | `PO_FINDINGS_REGISTER.md`, review docs, manifests |
| `docs/01_GOVERNANCE/PROJECT_DECISIONS.md` | Immutable decision log | Decision summaries repeated in narrative docs | Decision authority source | `PROJECT_HANDOVER.md`, `PROJECT_CONTEXT.md`, manifests |
| `docs/06_REVIEWS/Shared/PO_FINDINGS_REGISTER.md` | PO finding traceability | PO finding status echoed in some review and status docs | Single PO finding traceability source | ticket review evidence, closure docs |
| `docs/06_REVIEWS/Import/TODAY-003-R1_QUALITY_TRENDLINE_RUNTIME_ROUTE_RECOVERY.md` | Ticket evidence and validation | Some summary state overlaps with manifest and snapshot | Ticket-specific technical/runtime evidence | `TODAY-003-R1_MANIFEST.md`, `PO_FINDINGS_REGISTER.md` |
| `PROJECT_STATUS.md` | Live project status log | Current-state and progress summaries repeat snapshot data | Current status log only | `PROJECT_SNAPSHOT.md` for live state |
| `PROJECT_PROGRESS.md` | Live progress tracker | Current-state summaries repeat status and snapshot data | Historical progress log | `PROJECT_SNAPSHOT.md` for live state |

## 6. Keep / Move / Reference / Remove Plan

| Document | Keep | Move | Replace by Reference | Remove Duplicate |
| --- | --- | --- | --- | --- |
| `README_AI.md` | Entry point and fallback links | Live status values move out | Yes | Current repository status block |
| `PROJECT_SNAPSHOT.md` | Yes | None | No | No |
| `TODAY-003-R1_MANIFEST.md` | Ticket entry point | Some current-state items move out to snapshot | Yes | Any repeated status narrative |
| `MANIFEST_TEMPLATE.md` | Yes | None | Yes | None |
| `CODEX_DOCUMENTATION_STANDARD.md` | Yes | None | Yes | None |
| `DOCUMENT_INDEX.md` | Inventory authority | None | Yes | Duplicated narrative guidance |
| `DOCUMENT_GOVERNANCE.md` | Governance rules | None | Yes | Workflow explanations duplicated elsewhere |
| `DOCUMENT_UPDATE_MATRIX.md` | Update trigger authority | None | Yes | Repeated update advice |
| `PROJECT_HANDOVER.md` | Handover continuity | Current-state fragments move to snapshot | Yes | Repeated live state lines |
| `PROJECT_CONTEXT.md` | Governance context | Current-state fragments move to snapshot | Yes | Repeated live state lines |
| `AI_COLLABORATION_PROTOCOL.md` | Workflow protocol | Onboarding route details move to README/snapshot/manifest | Yes | Repeated onboarding prose |
| `PO_FINDINGS_REGISTER.md` | PO traceability | None | No | No |
| Review evidence docs | Ticket evidence | None | Partial via manifest links | Repeated summary comments in status docs |
| `PROJECT_STATUS.md` | Status log | None | Yes | None unless duplicate lines become harmful |
| `PROJECT_PROGRESS.md` | Progress log | None | Yes | None unless duplicate lines become harmful |

## 7. Migration Phases

### Phase 1

- Keep V1 workflow intact.
- Add reference-only links from entry docs to the current snapshot and manifest.
- Move live state out of onboarding summary blocks where duplicates exist.

### Phase 2

- Reduce repeated onboarding instructions in V1-compatible docs.
- Ensure every current ticket has exactly one manifest entry point.
- Convert repeated guidance into references.

### Phase 3

- Split any governance doc that still combines multiple responsibilities.
- Preserve V1 as fallback while V2 becomes the default reading path.

### Phase 4

- Remove duplicate narrative blocks only after the snapshot and manifest fully cover the same information.
- Keep the original documents discoverable and valid as references.

### Phase N

- Maintain one SSOT per fact.
- Keep Governance V1 fallback alive for conflicts, escalations, and historical continuity.
- Stop only when every governance fact has one authoritative home and the references are stable.

## 8. Risk Analysis

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Over-removal of duplicated text | A workflow clue may disappear | Migrate by reference first, remove later |
| Authority confusion | AI may read the wrong document first | Keep explicit read order in README and manifest |
| Snapshot drift | Live state may diverge from actual project state | Update snapshot only when state changes |
| Manifest drift | Ticket scope may become stale | Tie manifest updates to ticket closures and scope changes |
| Governance V1 breakage | Legacy sessions may lose a continuation path | Keep V1 docs readable and linkable |
| Hidden duplication | Facts may still exist in narrative docs | Audit the current-state and ticket-entry documents first |

## 9. Governance V1 Protection

Governance V1 must remain intact during migration.

Protected V1 elements:

- `MASTER_START_PROMPT.md`
- `DOCUMENT_GOVERNANCE.md`
- `DOCUMENT_UPDATE_MATRIX.md`
- `PROJECT_HANDOVER.md`
- `PROJECT_CONTEXT.md`
- `AI_COLLABORATION_PROTOCOL.md`
- `PO_UI_ACCEPTANCE_WORKFLOW.md`
- `PROJECT_DECISIONS.md`

Protection rules:

- do not rewrite V1 as part of this plan
- do not rename V1 documents
- do not remove V1 fallback references
- do not force V2 adoption until the migration phase is approved

## 10. Validation Criteria

This migration plan is valid if:

- each governance fact has one authoritative home
- entry-point docs reference, rather than copy, current state
- the current manifest owns ticket reading scope
- V1 remains available as fallback
- no live project behavior changes
- no product ticket state changes
- no frozen document is modified

## 11. Execution Notes

- This plan is advisory and incremental.
- The first migration candidate is always a duplicate current-state block, not a frozen contract.
- Migration should prefer reference replacement over content deletion.
- Any removal of duplicated text must be proven safe by the snapshot and manifest coverage first.
