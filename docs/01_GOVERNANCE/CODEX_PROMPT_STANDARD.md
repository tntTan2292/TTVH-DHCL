# CODEX PROMPT STANDARD

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Standard Prompt Structure](#2-standard-prompt-structure)
- [3. Prompt Types](#3-prompt-types)
- [4. Prompt Writing Rules](#4-prompt-writing-rules)
- [5. Mandatory Sections](#5-mandatory-sections)
- [6. Ticket Naming Convention](#6-ticket-naming-convention)
- [7. Standard Report Format](#7-standard-report-format)
- [8. Prompt Anti-patterns](#8-prompt-anti-patterns)
- [9. Required Closing Statement](#9-required-closing-statement)

## 1. Purpose

CODEX Prompt Standard defines the canonical prompt structure for QIS V2 so that every new ticket request remains consistent, scoped, and execution-ready.

It is designed to:

- reduce prompt ambiguity
- preserve continuity across chats
- keep scope explicit
- prevent drift from frozen documents and SSOT

## 2. Standard Prompt Structure

Every prompt should include, in order:

1. Project
2. Phase
3. Ticket
4. Objective
5. Required Reading
6. Scope
7. Constraints
8. Output
9. Validation
10. Report Format

Optional additions:

- business context
- approval status
- current runtime state
- open issues

## 3. Prompt Types

### 3.1 Development Ticket

Used for implementation work.

Must include:

- objective
- scope
- acceptance criteria
- runtime acceptance
- reporting format

### 3.2 Planning Ticket

Used for architecture, UX, technical planning, or governance planning.

Must include:

- design scope
- files to create
- files not to change
- approval gate
- report format

### 3.3 Review Ticket

Used for validation and review.

Must include:

- review target
- documents to compare
- verdict options
- issues to report

### 3.4 Documentation Ticket

Used for documentation creation or synchronization.

Must include:

- document target
- required structure
- scope restrictions
- update constraints

### 3.5 Governance Ticket

Used for governance changes, onboarding rules, or project control updates.

Must include:

- governance objective
- affected governance files
- non-goals
- approval requirements

### 3.6 Cleanup Ticket

Used for documentation cleanup, migration, archive, or refactoring.

Must include:

- file classification
- allowed operations
- validation requirements
- rollback assumptions

## 4. Prompt Writing Rules

- Do not repeat frozen SSOT content unless the prompt specifically requires it.
- Do not restate governance rules that already exist in canonical governance docs.
- Do not restate Ticket Completion Protocol inside every ticket prompt.
- Do not duplicate Reading Order when the prompt can reference it.
- Keep prompt instructions direct, scoped, and testable.
- Keep business changes separate from implementation instructions.

## 5. Mandatory Sections

### 5.1 Development Ticket

- Project
- Phase
- Ticket
- Objective
- Scope
- Input documents
- Acceptance criteria
- Runtime acceptance
- Restrictions
- Output format

### 5.2 Planning Ticket

- Project
- Phase
- Ticket
- Objective
- Inputs
- Required structure
- Restrictions
- Output format

### 5.3 Review Ticket

- Project
- Phase
- Review target
- Inputs
- Review checklist
- Verdict
- Output format

## 6. Ticket Naming Convention

Use the approved project naming patterns:

- `TICKET-xxxx` for development tickets
- `TICKET-DOC-xxx` for documentation tickets
- `TICKET-GOV-xxx` for governance tickets

The ticket name must match the current phase and purpose of the work.

## 7. Standard Report Format

Default execution reports should include:

- Files changed
- Business impact
- Execution summary
- Validation result
- Risk
- Commit hash
- GitHub Commit URL
- GitHub Blob URL

For governance or documentation work, the report may also include:

- governance summary
- file classification
- link validation
- reading order validation
- authority validation

## 8. Prompt Anti-patterns

- vague scope
- missing ticket ID
- missing required reading
- mixing multiple tickets in one prompt
- hiding business changes inside implementation tasks
- omitting validation criteria
- omitting report format
- duplicating frozen governance text

## 9. Required Closing Statement

Every future prompt must end with the exact sentence:

`Follow Ticket Completion Protocol defined in docs/01_GOVERNANCE/AI_COLLABORATION_PROTOCOL.md`

## 10. Mandatory Documentation Classification

After completing a Development Ticket, Codex must classify every document affected by the ticket and ensure it is updated according to the approved documentation architecture:

- `docs/01_GOVERNANCE/`
- `docs/02_ARCHITECTURE/`
- `docs/03_UX/`
- `docs/04_TECHNICAL_PLANNING/`
- `docs/05_DEVELOPMENT/`
- `docs/06_REVIEWS/`
- `docs/07_REFERENCE/`
- `docs/08_ARCHIVE/`
- `docs/09_REPORTS/`

Codex must follow `docs/01_GOVERNANCE/DOCUMENT_GOVERNANCE.md` and `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` when placing documents.

Rules:

- do not create Markdown files outside the approved documentation architecture
- do not create new folders unless the Product Owner has approved them
- if a document moves, update all affected references
- if Reading Chain is affected, update the reading chain references as well
- if DOCUMENT_INDEX needs updates, update it
- after documentation synchronization is complete, perform Validation, Commit, and Push according to Ticket Completion Protocol

Future prompts generated from this standard must always include Documentation Requirements:

- Documentation Synchronization
- Mandatory Documentation Classification
- Validation
- Commit
- Push
