# PO UI Acceptance Workflow

## Table of Contents

- [1. Purpose](#1-purpose)
- [2. Applicability Decision](#2-applicability-decision)
- [3. Workflow](#3-workflow)
- [4. PO UI Acceptance Notice](#4-po-ui-acceptance-notice)
- [5. PO Result Definitions](#5-po-result-definitions)
- [6. Module Completion Rules](#6-module-completion-rules)
- [7. PO Findings Traceability](#7-po-findings-traceability)
- [8. Blocking Rules](#8-blocking-rules)
- [9. Authority](#9-authority)

## 1. Purpose

This document defines the mandatory Product Owner UI acceptance workflow for QIS V2 tickets that produce visible, independently checkable product changes.

It exists to separate:

- Technical PASS
- Runtime PASS
- PO Product Review PASS
- Module Completed

## 2. Applicability Decision

Every development ticket must explicitly state:

- `PO UI Check Required: Yes`
- or `PO UI Check Required: No`

Decision reason:

- a concise explanation of why the ticket does or does not produce an independently observable UI or product behavior change

Set `Yes` when the ticket affects any visible UI, navigation, screen, chart, table, filter, drill-down, workflow, label, report, runtime data display, or other user-facing behavior.

Set `No` only when the ticket is purely internal and produces no independently checkable user-visible change.

## 3. Workflow

### 3.1 When PO UI Check Required = Yes

Required completion sequence:

Technical PASS

↓

Runtime PASS

↓

Ready for PO Check

↓

PO PASS / WARNING / FAIL

↓

Review

↓

Documentation Synchronization

↓

Module Completed or Recovery

### 3.2 When PO UI Check Required = No

Required completion sequence:

Technical PASS

↓

Runtime PASS or Runtime Not Required

↓

PO UI Check Required: No

↓

Review

↓

Documentation Synchronization

↓

Module Completed

## 4. PO UI Acceptance Notice

When `PO UI Check Required = Yes`, Codex must include a clearly visible section titled:

`PO UI ACCEPTANCE REQUIRED`

The section must include:

- PO Check Status
- Affected Module
- Affected Screen
- Menu Path
- Route / URL
- Required Test Context
- What Changed
- Expected Result
- Business Result
- PO Check Steps
- PO Acceptance Checklist
- Known Warnings
- Blocking Rule
- PO Response Required

## 5. PO Result Definitions

### PO PASS

Use when the visible output is correct, the context is correct, navigation works, and no blocking product defect remains.

### PO WARNING

Use when the core behavior works but non-blocking issues remain.

The warning must be linked to a responsible fix ticket or future ticket.

### PO FAIL

Use when the UI, data, workflow, navigation, or business result does not meet the expected product outcome.

PO FAIL blocks module completion until the approved fix path is closed.

## 6. Module Completion Rules

A module cannot be marked `Module Completed` unless:

- Technical PASS is achieved
- Runtime PASS is achieved when runtime is applicable
- PO PASS is achieved when PO UI Check Required = Yes

Module completion must not be implied by build success alone.

## 7. PO Findings Traceability

Every PO finding must be traceable to:

- affected module
- affected screen
- route / URL
- related ticket
- ticket lifecycle position
- classification
- immediate action
- responsible fix ticket
- blocking status
- PO recheck point
- closure evidence
- final PO result

## 8. Blocking Rules

- A PO FAIL blocks module completion.
- A PO WARNING does not block progress if governance allows continuation and the finding is linked to a responsible ticket.
- A finding cannot be closed by build PASS alone.
- A finding cannot be closed by runtime PASS alone.
- A finding cannot be closed without PO recheck evidence when PO review applies.

## 9. Authority

Product Owner has final authority over PO PASS, PO WARNING, and PO FAIL.

ChatGPT may classify and recommend, but cannot override Product Owner product acceptance.

Codex must report the PO gate status explicitly and must not collapse technical acceptance into product acceptance.

