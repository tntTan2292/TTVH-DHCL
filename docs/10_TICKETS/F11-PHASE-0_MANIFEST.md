# F11-PHASE-0 Manifest

Status: `PHASE 0 COMPLETE / READY FOR PO REVIEW (2026-10-09)`. Documentation only — no product code, database, schema or Import was touched. The audit and the plan are in `docs/06_REVIEWS/Shared/F11-MODULE-PLAN_CHECKPOINT_001.md`; this manifest does not duplicate them.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Scope](#5-scope)
- [6. Deliverable](#6-deliverable)
- [7. Validation](#7-validation)
- [8. Next Ticket](#8-next-ticket)
- [9. PO Acceptance Checklist](#9-po-acceptance-checklist)

## 1. Ticket Information

- Ticket ID: `F11-PHASE-0`
- Ticket Name: `F1.1 SSOT/Reference Package`
- Parent: `F11-MODULE-PLAN` (phase plan, checkpoint Section 13)
- Owner: `Claude Code (Sonnet 5.5)`
- Activation authority: `PO in chat 2026-10-09: "Giờ làm bước 1 và 2 đi"`
- Branch: `codex/da-impl-006`; baseline `9cf7bc6`
- Date: `2026-10-09`

## 2. Objective

Freeze the F1.1 rules, formulas, reference numbers and test scenarios in one package, so that no later phase has to guess or re-derive them.

## 3. Current Status

- State: `PHASE 0 COMPLETE / READY FOR PO REVIEW`
- PO UI Check Required: `No` (documentation only)

## 4. Required Reading

- `docs/06_REVIEWS/Shared/F11-MODULE-PLAN_CHECKPOINT_001.md` Sections 3, 6, 12, 24, 25.
- `docs/07_REFERENCE/Domains/_template_indicator/` (skeleton) and the F4.1 package (precedent).

## 5. Scope

In: the new reference package. Out: any code, schema, Import, UI, any change to the F1.3 or F4.1 packages, any business rule that is not a Product Owner decision (PD-6..PD-15) or a verified file fact.

## 6. Deliverable

`docs/07_REFERENCE/Domains/domain_quality_management/f1.1_chat_luong_toan_trinh_noi_tinh/` — `metadata.yml`, `core_knowledge.md`, `data_blueprint.md` (55-column map and TCT layout), `measurement.md` (F11_001..F11_004, blank-evaluation flag, 2026-10-07 baseline), `business_rules.md`, `testing_scenarios.md`, `rca_ai_context.md` (10 guardrails), `changelog.md`.

## 7. Validation

Documentation only. Every figure in `measurement.md` §6 was reproduced by the Phase 1 real-file test (see `F11-PHASE-1_MANIFEST.md`); the column map in `data_blueprint.md` equals the parser mapping (a test asserts table columns = parser columns). Package traceability: each rule cites a PD number from the checkpoint.

## 8. Next Ticket

`F11-PHASE-1` (data foundation) — done in the same session. Then Phase 2 (Import Huế) and Phase 3 (portal probe), both needing the Product Owner's go-ahead.

## 9. PO Acceptance Checklist

Not a UI ticket. The Product Owner is asked to read `business_rules.md` and `measurement.md` §6 and confirm they say what was decided; open items are listed in `business_rules.md` §12.
