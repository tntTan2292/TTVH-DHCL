# F41-PHASE-1 Manifest

Status: `PHASE 1 COMPLETE / READY FOR PO REVIEW (2026-08-17)`.

## 1. Ticket Information

- Ticket ID: `F41-PHASE-1`
- Ticket Name: `F4.1 HUE Data Foundation`
- Phase: `F4.1 Module - Phase 1 (Nen tang du lieu)`
- Owner: `Codex` (explicitly authorized by Product Owner for `F41-PHASE-1`)
- Governance Version: `V2 Active`
- Activation authority: Product Owner confirmed `F41-PHASE-0: PO PASS`, authorized Codex for `F41-PHASE-1`, and limited this phase to HUE data foundation only.
- Branch: `codex/da-impl-006`
- Baseline commit: `58a052c5`
- Activation date: `2026-08-17`

## 2. Objective

Implement the additive F4.1 HUE foundation only: `fact_f41`, a dedicated frozen 42-column HUE parser, filename-derived analysis date, all-row denominator repository contract, targeted tests, and read-only reconciliation of the real HUE source file.

## 3. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Shared/F41-PHASE-1_CHECKPOINT_001.md`
- `docs/06_REVIEWS/Shared/F41-PHASE-0_CHECKPOINT_001.md`
- `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md`
- `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/`

## 4. Scope

In scope:

- Additive, idempotent `fact_f41` schema/migration.
- Dedicated HUE F4.1 parser for the frozen 42-column source.
- Filename-derived `ngay_do_kiem` from `F4.1-YYYY.MM.DD.xlsx`.
- Repository methods proving the all-row denominator contract.
- Targeted parser/schema/repository tests and real-file reconciliation.
- Governance/checkpoint updates, commit, push, and remote verification.

Out of scope:

- Import pipeline/watcher, TCT table/parser/lane, portal sync, frontend, Dashboard, Ranking, Evidence.
- Any auto-import, move, rename, delete, or modification of the HUE source file.
- Any change to `fact_f13` data or F1.3 parser behavior.
- Any work under `.claude/`, `Data QLML/`, or `Data DKCL/` except read-only HUE reconciliation.

## 5. Validation

Required evidence before closure:

- `fact_f41` migration is idempotent and inserts no business data.
- Parser rejects non-F4.1 filenames and missing required HUE columns.
- Parser maps all 42 columns and injects the filename-derived date.
- Repository reconciliation proves `4,695` total rows, `2,863` `Dat`, `1,581` `Khong dat`, `251` blank, `60.98%`.
- Direct database proof that `fact_f13` remains unchanged.
- Final diff excludes `.claude/`, `Data QLML/`, `Data DKCL/`, TCT, Import, and frontend.

## 6. Completion State

`PHASE 1 COMPLETE / READY FOR PO REVIEW`. Phase 2 is not activated.

Completion evidence is recorded in `docs/06_REVIEWS/Shared/F41-PHASE-1_CHECKPOINT_001.md` Sections 5-7.

Remediation 001 evidence for the startup migration gap is recorded in checkpoint Section 8. State remains `PHASE 1 COMPLETE / READY FOR PO REVIEW`; Phase 2 is not activated.
