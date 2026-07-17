# CODEX DOCUMENTATION STANDARD

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Scope](#2-scope)
- [3. Codex Reading Order](#3-codex-reading-order)
- [4. Codex Update Order](#4-codex-update-order)
- [5. Codex Stop Conditions](#5-codex-stop-conditions)
- [6. SSOT Rule](#6-ssot-rule)
- [7. Commit and Report Standard](#7-commit-and-report-standard)
- [8. Governance V1 Compatibility](#8-governance-v1-compatibility)

## 1. Purpose

This document standardizes how Codex must read, update, and stop when working in QIS V2.

The goal is to make every Codex session deterministic and safe by forcing the workflow to start from:

`README_AI.md` → `PROJECT_SNAPSHOT.md` → current `MANIFEST.md`

## 2. Scope

This standard applies to every Codex ticket in QIS V2.

It defines:

- which documents Codex reads first
- which documents Codex may update
- when Codex must stop and escalate
- how Codex commits and reports changes

It does not change business rules, frozen architecture, runtime contracts, or PO approval rules.

## 3. Codex Reading Order

Codex must read in this order:

1. `README_AI.md`
2. `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
3. the current manifest referenced by `PROJECT_SNAPSHOT.md`
4. only the Required Reading listed in that manifest

Codex must not:

- search random documents first
- expand reading scope without instruction
- skip the manifest
- infer missing state from memory or chat history

## 4. Codex Update Order

Codex may update only documents explicitly allowed by:

- the current manifest
- `docs/01_GOVERNANCE/DOCUMENT_UPDATE_MATRIX.md`
- the ticket scope

Update order:

1. identify the exact ticket
2. read `PROJECT_SNAPSHOT.md`
3. read the current manifest
4. read only required supporting documents
5. update only the allowed documents
6. validate consistency
7. commit one ticket in one commit
8. push only after validation passes

Codex must not update unrelated documents, even if they appear helpful.

## 5. Codex Stop Conditions

Codex must stop and ask for help or escalate when:

- SSOT conflicts with ticket instructions
- frozen architecture or business rules would need to change
- the manifest and the ticket scope conflict
- a required document is missing or unreadable
- PO approval is required before proceeding
- the update would expand scope beyond the ticket

Codex must not continue by guessing when a stop condition is present.

Codex must also stop and report the conflict when the ticket named in a generated prompt does not match the Current Ticket in `PROJECT_SNAPSHOT.md`.

## 6. SSOT Rule

One source of truth per responsibility:

- `PROJECT_SNAPSHOT.md` owns live project state
- the current manifest owns ticket reading scope
- review evidence owns ticket-specific validation proof
- `PO_FINDINGS_REGISTER.md` owns PO finding traceability

Codex must not copy live status into multiple documents unless the workflow explicitly requires it.

The `Additional PO/User Decision` field may only carry temporary execution clarification.

It must not be used to change business rules, scope, contracts, PO acceptance, SSOT, or frozen behavior.

## 7. Commit and Report Standard

Codex commits must follow:

- one ticket = one commit
- commit message must describe the ticket outcome
- commit scope must match the ticket scope
- no unrelated files should be staged

Codex reports must include:

- files changed
- business impact
- governance summary
- validation result
- Git status
- documentation updated
- commit hash
- GitHub URLs when available

## 8. Governance V1 Compatibility

This standard is V1 compatible.

Governance V1 remains valid as a fallback for:

- authority conflicts
- SSOT interpretation
- frozen architecture or business rule questions
- PO acceptance interpretation

The standard does not replace Governance V1.
It only makes Codex execution deterministic through the new manifest-driven route.
