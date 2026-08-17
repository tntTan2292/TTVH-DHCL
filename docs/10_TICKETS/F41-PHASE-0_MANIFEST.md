# F41-PHASE-0 Manifest

Status: `PHASE 0 COMPLETE / READY FOR PO REVIEW (2026-08-17)`. Documentation only — no product code, database, schema, or Import was implemented. Full record in `docs/06_REVIEWS/Shared/F41-PHASE-0_CHECKPOINT_001.md`; this manifest does not duplicate its content.

## Table of Contents

- [1. Ticket Information](#1-ticket-information)
- [2. Objective](#2-objective)
- [3. Current Status](#3-current-status)
- [4. Required Reading](#4-required-reading)
- [5. Business Context](#5-business-context)
- [6. Technical Context](#6-technical-context)
- [7. Runtime Context](#7-runtime-context)
- [8. Scope](#8-scope)
- [9. Related Review](#9-related-review)
- [10. Related PO Findings](#10-related-po-findings)
- [11. Documents To Update](#11-documents-to-update)
- [12. Validation](#12-validation)
- [13. Expected Output](#13-expected-output)
- [14. Next Ticket](#14-next-ticket)
- [15. PO Acceptance Checklist](#15-po-acceptance-checklist)
- [16. Authority Escalation](#16-authority-escalation)

## 1. Ticket Information

- Ticket ID: `F41-PHASE-0`
- Ticket Name: `F4.1 SSOT/Reference Package`
- Phase: `F4.1 Module — Phase 0 (of the F41-MODULE-PLAN phase plan)`
- Owner: `Claude Code (Sonnet)`
- Governance Version: `V2 Active`
- Activation authority: `PO decision: "PO APPROVES F41-MODULE-PLAN Gate 0 và cho phép thực hiện F41-PHASE-0 — tạo bộ SSOT/reference F4.1, documentation only, không triển khai product code, database hoặc Import."`
- Branch: `codex/da-impl-006`
- Baseline commit: `94b32885bd7f598a83151a86f9284dd48859b8e4` (verified `HEAD` at activation; working tree clean except pre-existing untracked `.claude/` and `Data QLML/`)
- Activation date: `2026-08-17`

## 2. Objective

Perform the governed handoff from `F41-MODULE-PLAN` (Gate 0 approved) to `F41-PHASE-0`, and instantiate a faithful F4.1 SSOT/reference package from `docs/07_REFERENCE/Domains/_template_indicator/`, encoding the approved plan without implementing any product code, database, or Import.

## 3. Current Status

- Current state: `PHASE 0 COMPLETE / READY FOR PO REVIEW`
- PO UI Check Required: `No — documentation-only ticket, nothing runtime to check.`
- PO Product Status: `Awaiting Product Owner review of the instantiated package content (Section 15). Phase 1 of the F41-MODULE-PLAN phase plan is not authorized by this closure and requires its own explicit authorization.`

## 4. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Shared/F41-PHASE-0_CHECKPOINT_001.md` — this ticket's full record and traceability table.
- `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` — the approved plan this package encodes; the source of record for every figure.
- `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/` — the package itself.

## 5. Business Context

- Business problem: `F41-MODULE-PLAN` produced an approved plan for F4.1 but no durable reference document a future implementer (human or AI) can read without re-deriving the plan from the checkpoint's narrative sections. F1.3 has such a package; F4.1 did not.
- Business impact: gives F4.1 the same SSOT footing F1.3 has, so Phase 1 (and later phases) can be scoped and executed against a stable reference instead of re-reading planning narrative each time.
- Approved business rule constraints: identical to `F41-MODULE-PLAN`'s locked decisions — `PO-1..PO-10`, transcribed into `business_rules.md` of the new package. This ticket did not add, remove, or reinterpret any of them.

## 6. Technical Context

No product code exists for F4.1 and none was added. The only technical surface of this ticket is documentation:

- New package: `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/` — 8 files (`metadata.yml`, `core_knowledge.md`, `data_blueprint.md`, `business_rules.md`, `measurement.md`, `testing_scenarios.md`, `rca_ai_context.md`, `changelog.md`) plus `assets/.gitkeep`, mirroring `docs/07_REFERENCE/Domains/_template_indicator/`'s skeleton exactly.
- Content traceability from the approved plan to the package is recorded in checkpoint Section 6 — every item named in the activation prompt (42-column HUE contract, 38-column TCT contract, HUE KPI, `531120` treatment, filename date, module scope, delayed-cash reuse, TCT ingest rules, role contract, `Q-6`, test/reconciliation scenarios) is present and located.

## 7. Runtime Context

Not applicable — no runtime change was made, no server was started, and no Import was run. No file under `Data DKCL/` was created, moved, renamed, or modified; the real source files were not reopened this round because the figures needed were already fully audited and recorded in `F41-MODULE-PLAN_CHECKPOINT_001.md`.

## 8. Scope

In scope: instantiating and populating the F4.1 reference package from the template, and governance/live-state sync.

Out of scope, explicitly: any product code, `backend/src/db/schema.sql`, the live database, the Import pipeline/watcher/portal layer, any F1.3 behavior or `fact_f13` data, any file operation under `Data DKCL/`, activating `Phase 1` or any later phase, and any business rule not already locked as `PO-1..PO-10`.

## 9. Related Review

- Review document: `docs/06_REVIEWS/Shared/F41-PHASE-0_CHECKPOINT_001.md`
- Review status: `PHASE 0 COMPLETE / READY FOR PO REVIEW`
- Key evidence: checkpoint Section 6, the content-traceability table mapping every required item from the activation prompt to its exact location in the new package.

## 10. Related PO Findings

None open. This ticket was activated by explicit Gate 0 approval and Phase 0 authorization, not from a finding.

## 11. Documents To Update

- This manifest and the checkpoint, on Product Owner review outcome or on any content correction.
- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, `docs/01_GOVERNANCE/DOCUMENT_INDEX.md` — updated as part of this activation.
- On `Phase 1` authorization: the package's `changelog.md` gains a new version entry when its content is first consumed/extended by implementation.

## 12. Validation

- Technical validation: not applicable — no code changed.
- Runtime, browser, build/lint validation: not applicable — no code changed.
- Documentation validation performed: every figure transcribed into the new package was cross-checked against `F41-MODULE-PLAN_CHECKPOINT_001.md` (the source of record) for exact match, not recomputed; `git status` confirms only the intended files changed.

## 13. Expected Output

- What the ticket must achieve: a complete, internally consistent F4.1 SSOT/reference package instantiated from the standard template, faithfully encoding the approved plan, with no invented content.
- What must remain unchanged: all product code, `fact_f13`, the F1.3 reference package, the live database, the Import pipeline, and every file under `Data DKCL/` and `Data QLML/`.
- What must not be introduced: any product code, any schema/database change, any business rule beyond `PO-1..PO-10`, any activation of `Phase 1` or later.

## 14. Next Ticket

- Next ticket ID: none activated. The proposed successor is `Phase 1 (Nền tảng dữ liệu)` of the `F41-MODULE-PLAN` phase plan — creating `fact_f41` and the HUE parser — which requires its own explicit Product Owner authorization.
- Handoff notes: no phase is self-activated by this closure. The new package (`docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/`) is the Required Reading any future `Phase 1` ticket must cite.

## 15. PO Acceptance Checklist

Not applicable in the runtime-check sense — `PO UI Check Required = No`. What the Product Owner is asked to review is the package content itself:

- Confirm `data_blueprint.md`'s 42-column HUE and 38-column TCT contracts match expectations.
- Confirm `business_rules.md` states all 10 decisions correctly and introduces nothing new.
- Confirm `measurement.md`'s formulas and reconciliation baseline (`60,98%` / `60,97%` / `61,12%`) are acceptable as written.
- Confirm the `Q-6` non-blocking framing in `business_rules.md` §12 and `rca_ai_context.md` §3 is acceptable.
- Authorize (or decline) `Phase 1` as the next step, separately from this review.

## 16. Authority Escalation

None open. This ticket transcribes an already-approved plan into a reference package; it does not make new decisions. The two items still escalated from `F41-MODULE-PLAN` (the TCT denominator gap, `Q-6`; the undiscovered portal match string, `TC-9`) are carried into `business_rules.md` §12 and `rca_ai_context.md` §5 unchanged, not resolved here.
