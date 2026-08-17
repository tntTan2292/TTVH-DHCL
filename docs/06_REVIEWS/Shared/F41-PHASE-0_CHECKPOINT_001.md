# F41-PHASE-0 — Checkpoint 001

Documentation only. No product code, database, schema, or Import was implemented by this ticket.

## Table of Contents

- [1. Ticket State](#1-ticket-state)
- [2. Baseline And Workspace](#2-baseline-and-workspace)
- [3. Gate 0 Approval](#3-gate-0-approval)
- [4. Scope](#4-scope)
- [5. Package Instantiated](#5-package-instantiated)
- [6. Content Traceability — Approved Plan → Package](#6-content-traceability--approved-plan--package)
- [7. Verification](#7-verification)
- [8. What Was Not Done](#8-what-was-not-done)
- [9. Handoff](#9-handoff)

## 1. Ticket State

- Ticket: `F41-PHASE-0`
- State: `PHASE 0 COMPLETE / READY FOR PO REVIEW`
- Executor: `Claude Code (Sonnet)`
- Parent ticket: `F41-MODULE-PLAN` (`PLAN COMPLETE`, Gate 0 approved — see Section 3)
- Activation date: `2026-08-17`

## 2. Baseline And Workspace

- Branch: `codex/da-impl-006`
- Baseline commit: `94b32885bd7f598a83151a86f9284dd48859b8e4` (verified `HEAD` at activation)
- Working tree at activation: clean except pre-existing untracked `.claude/` and `Data QLML/`, both untouched.
- No file under `Data DKCL/` was created, moved, renamed, or modified — no Import was run and the real source files were not reopened this round; all figures in the package below are drawn from the already-audited, already-verified evidence in `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md` (Sections 7-8, 18-21), re-checked for internal consistency only.

## 3. Gate 0 Approval

Product Owner decision, recorded verbatim in effect:

> "PO APPROVES F41-MODULE-PLAN Gate 0 và cho phép thực hiện F41-PHASE-0 — tạo bộ SSOT/reference F4.1, documentation only, không triển khai product code, database hoặc Import."

This approves `F41-MODULE-PLAN`'s Gate 0 (checkpoint Section 15) and authorizes exactly one further step: the F4.1 SSOT/reference package. It does **not** authorize Phase 1 (`Nền tảng dữ liệu`) or any later phase — those each require their own explicit Product Owner authorization, per the locked phase plan (`F41-MODULE-PLAN_CHECKPOINT_001.md` Section 10).

## 4. Scope

Allowed in this ticket:

- Instantiate a new indicator reference package from `docs/07_REFERENCE/Domains/_template_indicator/`, following the F1.3 package's existing structure and depth as a model.
- Populate that package with the plan already locked and approved in `F41-MODULE-PLAN_CHECKPOINT_001.md` — no new content is invented here; this ticket transcribes and organizes, it does not decide.
- Governance/live-state sync (`PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, `DOCUMENT_INDEX.md`).

Locked out of this ticket:

- Any product code, `backend/src/db/schema.sql`, the live database, the Import pipeline/watcher/portal layer.
- Any change to F1.3 behavior, `fact_f13`, or the frozen 41-column F1.3 mapping.
- Any move/rename/delete of any file under `Data DKCL/`.
- Activating `Phase 1` or any later phase of the F4.1 module plan.
- Any new business rule not already locked in `F41-MODULE-PLAN_CHECKPOINT_001.md` Sections 3 and 17 (`PO-1..PO-10`).

## 5. Package Instantiated

`docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/`

Mirrors the 8-file skeleton of `_template_indicator/` exactly (no extra files added beyond what the template defines; `assets/.gitkeep` preserved as a placeholder, matching the F1.3 package's own pattern):

| File | Content |
| --- | --- |
| `metadata.yml` | `id: F4.1`, official name `Chất lượng phát thành công của bưu cục`, status `Planned`, both data sources named. |
| `core_knowledge.md` | Orientation: what F4.1 is, the two-lane duality, module scope, relationship to F1.3, reading order, authority statement. |
| `data_blueprint.md` | Full 42-column HUE row-level contract + 38-column TCT aggregate contract, system fields, structural deltas vs F1.3, value-type irregularities, filename-date rule, required-column guard, proposed (not-yet-created) target tables. |
| `business_rules.md` | All 10 locked PO decisions (`PO-1..PO-10`) verbatim in effect, TCT ingest rules, and the open non-blocking `Q-6`. |
| `measurement.md` | `F4_001`/`F4_002`/`F4_003` formulas, the full `2026-08-01` per-BCVH reconciliation baseline, the HUE-vs-TCT cross-lane baseline, the corrected 251-row blank-evaluation breakdown, the deferred period-comparison note. |
| `testing_scenarios.md` | 9 scenario groups (parser, KPI/denominator, `531120`, blank-row breakdown, reason classification, TCT parser, cross-lane, role gating, scope boundaries) — none executed, all future acceptance bar. |
| `rca_ai_context.md` | 9 guardrails, each naming a specific inference mistake made and corrected during planning. |
| `changelog.md` | `v1.0.0` creation record, explicit list of F1.3-package files deliberately not created this round. |

## 6. Content Traceability — Approved Plan → Package

Every item the activation prompt required is present and locatable:

| Required item | Package location |
| --- | --- |
| 42-column HUE row-level contract | `data_blueprint.md` §1 |
| 38-column TCT aggregate contract | `data_blueprint.md` §2 |
| HUE KPI `2.863/4.695 = 60,98%` | `measurement.md` §1, §4; `business_rules.md` §2 |
| `531120` module-total vs six-BCVH Ranking treatment | `business_rules.md` §6; `measurement.md` §2, §4 |
| Filename-derived analysis date | `data_blueprint.md` §3; `business_rules.md` §3 |
| Dashboard + BCVH Ranking + HUE Evidence; no Tuyến Ranking | `business_rules.md` §4; `core_knowledge.md` §3 |
| F1.3-identical delayed-cash classification | `business_rules.md` §5; `testing_scenarios.md` §5 |
| TCT grand-total skip, aggregate-table separation, no TCT Evidence | `data_blueprint.md` §2.1, §5; `business_rules.md` §5, §11; `testing_scenarios.md` §6 |
| admin+viewer read, admin-only Import | `business_rules.md` §10; `testing_scenarios.md` §8 |
| `Q-6` explicitly non-blocking and unresolved | `business_rules.md` §12; `rca_ai_context.md` §3 |
| Testing and reconciliation scenarios, both lanes | `testing_scenarios.md` (all 9 sections); `measurement.md` §4-6 |

## 7. Verification

- All figures in the package were cross-checked against `F41-MODULE-PLAN_CHECKPOINT_001.md` (the source of record) for transcription accuracy — same totals (`4.695`, `2.863`, `1.581`, `251`, `60,98%`, `60,97%`, `4.684`, `61,12%`, `241/9/1`) reproduced verbatim, no recomputation performed.
- No file under `Data DKCL/` was touched; nothing was imported.
- `git status` confirms only the new package files, this checkpoint, the manifest, and the governance-sync files as changes — no other file in the repository was modified.

## 8. What Was Not Done

- `fact_f41` and `fact_f41_national` were not created — no schema or database change.
- No parser, service, controller, route, or UI file was created or edited.
- `Phase 1` was not started or self-activated.
- The F1.3-only reference-document types (`acceptance_criteria.md`, `analytical_patterns.md`, `business_glossary.md`, `executive_decision_guide.md`, `executive_scenarios.md`, `faq_troubleshooting.md`) were not added — they belong to an active, implemented module; F4.1 is not one yet.

## 9. Handoff

State: `PHASE 0 COMPLETE / READY FOR PO REVIEW`. No further phase is self-activated. `Phase 1 (Nền tảng dữ liệu)` remains the proposed next step of the `F41-MODULE-PLAN` phase plan and requires its own explicit Product Owner authorization.
