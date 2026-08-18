# F41-PHASE-2 Manifest

Status: `PHASE 2 IMPLEMENTED / READY FOR PO CHECK (2026-08-17)`.

## 1. Ticket Information

- Ticket ID: `F41-PHASE-2`
- Ticket Name: `F4.1 Multi-Indicator Import`
- Phase: `F4.1 Module - Phase 2 (Import da chi tieu)`
- Owner: `Codex`
- Governance Version: `V2 Active`
- Activation authority: Product Owner confirmed `F41-PHASE-1: PO PASS` and authorized Phase 2 from baseline `8902fc57`.
- Branch: `codex/da-impl-006`
- Baseline commit: `8902fc57`
- Activation date: `2026-08-17`

## 2. Objective

Implement approved Phase 2 only: multi-indicator Import for F1.3/F4.1 across HUE/TCT, additive `fact_f41_national`, dedicated positional F4.1 TCT parser, controlled first F4.1 import, and targeted validation/proof. Stop at `PHASE 2 IMPLEMENTED / READY FOR PO CHECK`.

## 3. Required Reading

- `docs/01_GOVERNANCE/PROJECT_SNAPSHOT.md`
- `docs/06_REVIEWS/Shared/F41-PHASE-2_CHECKPOINT_001.md`
- `docs/06_REVIEWS/Shared/F41-PHASE-1_CHECKPOINT_001.md`
- `docs/06_REVIEWS/Shared/F41-MODULE-PLAN_CHECKPOINT_001.md`
- `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_chat_luong_phat_thanh_cong_buu_cuc/`

## 4. Scope

In scope:

- Additive `fact_f41_national`.
- Dedicated positional TCT parser for the frozen 38-column F4.1 workbook.
- Multi-indicator registry carrying roots, filename rules, parsers, and target tables for F1.3/F4.1 HUE/TCT.
- Generalize pipeline/watcher while preserving F1.3 behavior and test-isolation guards per indicator.
- Admin-only Import selector for indicator and HUE/TCT lane.
- Manual Import works independently of portal automation.
- Controlled first real F4.1 HUE and TCT import after schema/parsers/isolated tests pass.

Out of scope:

- Dashboard, BCVH Ranking, Evidence, Phase 3.
- Guessing or implementing the F4.1 portal export-match string.
- Unrelated UI/module changes.
- Manual source-file movement/modification.

## 5. Validation

Required:

- Isolated tests for registry, parsers, schema, pipeline/watcher safety, UI selector, and F1.3 regression.
- Controlled real F4.1 import proof:
  - HUE: `4,695` rows; `2,863` Đạt; `1,581` Không đạt; `251` blank; `60.98%`.
  - TCT: `46` raw unit rows read; `34` F1.3-parity province/city rows stored; grand total and `12` additional operational/legacy rows excluded.
- Retry/deduplication proof and F1.3 regression safety.
- Governance update, commit, push, remote verification.

## 6. Completion State

Implemented and ready for PO check.

Completion evidence is recorded in `docs/06_REVIEWS/Shared/F41-PHASE-2_CHECKPOINT_001.md`:

- Additive `fact_f41_national` schema/migration and startup migration.
- Dedicated frozen 38-column F4.1 TCT parser.
- Multi-indicator F1.3/F4.1 HUE/TCT registry and generalized Import pipeline/watcher.
- Admin Import selector for indicator and lane.
- Controlled real F4.1 Import:
  - HUE `4,695` rows; `2,863` Đạt; `1,581` Không đạt; `251` blank; `60.98%`.
  - TCT `46` raw unit rows read; `34` F1.3-parity province/city rows stored; grand total and `12` additional operational/legacy rows excluded.
  - `fact_f13` unchanged at `709,234` rows.
- Targeted F4.1, F1.3 regression, and frontend checks passed.
- Remediation 001 fixed TC-4 TCT published-rate storage: all ten `tl_*` columns are TEXT, parser preserves raw percent strings, live `fact_f41_national` was transactionally rebuilt and reloaded from the existing Processed TCT workbook, and Huế TCT now stores numerator `2,863`, denominator `4,684`, published rate `61.12%`.
- Remediation 002 fixed national population parity with F1.3: F4.1 TCT now reuses `NATIONAL_RANKED_PROVINCE_CODES` from `nationalExcelParser.js`, reads `46` raw reporting rows, accepts/stores `34`, excludes `12` with code/name evidence, and keeps all excluded operational/legacy units out of `fact_f41_national`.
- Live Remediation 002 proof: `fact_f41_national` stores `34` rows for `2026-08-01`; Huế `53` remains at `2,863 / 4,684 / 61.12%`; excluded codes `01, 08, 11, 12, 14, 15, 34, 49, 71, 75, 77, 82` are absent; HUE `fact_f41` and `fact_f13` remain unchanged.

Final state: `PHASE 2 IMPLEMENTED / READY FOR PO CHECK`. Phase 3 remains not activated.
