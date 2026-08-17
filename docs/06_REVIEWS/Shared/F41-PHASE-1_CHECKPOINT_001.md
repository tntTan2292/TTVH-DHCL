# F41-PHASE-1 - Checkpoint 001

## 1. Ticket State

- Ticket: `F41-PHASE-1`
- State: `ACTIVE / IMPLEMENTATION AUTHORIZED`
- Executor: `Codex`, explicitly authorized by Product Owner for this phase.
- Parent phase: `F41-PHASE-0`, Product Owner `PO PASS`.
- Activation date: `2026-08-17`

## 2. Baseline And Workspace

- Workspace: `D:\Antigravity - Project\TTVH - He thong dieu hanh chat luong`
- Branch: `codex/da-impl-006`
- Baseline commit: `58a052c5`
- Initial worktree status: only two pre-existing untracked baseline exclusions:
  - `.claude/`
  - `Data QLML/`
- These two paths are known from Phase 0 governance and remain excluded from inspection, staging, deletion, movement, restore, and modification.

## 3. Activation Authority

Product Owner decisions for this round:

- `F41-PHASE-0`: `PO PASS`.
- `Codex` is authorized as executor for `F41-PHASE-1`.
- Phase 1 scope is HUE data foundation only: `fact_f41`, frozen 42-column parser, filename date, all-row denominator, targeted tests, real HUE reconciliation.

## 4. Scope Lock

Allowed:

- Additive, idempotent `fact_f41` schema/migration.
- Dedicated F4.1 HUE parser.
- Filename-derived analysis date from `F4.1-YYYY.MM.DD.xlsx`.
- All-row denominator repository contract.
- Targeted parser/schema/repository tests.
- Read-only reconciliation of `Data DKCL/F4.1/Incoming/HUE/F4.1-2026.08.01.xlsx`.

Locked out:

- Import pipeline/watcher.
- TCT lane/table/parser.
- Portal sync.
- Frontend, Dashboard, Ranking, Evidence.
- Auto-import or any move/rename/delete/modification of the HUE source file.
- Any change to `fact_f13`.

## 5. Implementation Evidence

Implemented HUE-only foundation:

- `backend/migrate_f41_phase1_schema.js`: additive, idempotent migration for `fact_f41`; no business data inserted.
- `backend/src/db/schema.sql`: fresh-bootstrap `fact_f41` definition added.
- `backend/src/services/f41HueExcelParser.js`: dedicated F4.1 HUE parser; does not edit or reuse the frozen F1.3 parser.
- `backend/src/repositories/FactF41Repository.js`: HUE fact repository with overwrite helper and read-only KPI/reconciliation queries.
- Targeted tests:
  - `backend/migrate_f41_phase1_schema.test.js`
  - `backend/test_f41HueExcelParser.js`
  - `backend/src/repositories/FactF41Repository.test.js`

Important parser/schema finding during implementation: validation against the real HUE workbook confirmed that the 42-column HUE foundation must persist `Nhóm khách hàng` as `nhom_khach_hang`. The reference package was updated in `data_blueprint.md` and `changelog.md` to record that Phase 1 correction. No KPI numerator, denominator, reconciliation figure, TCT contract, or source file changed.

Out-of-scope surfaces remained untouched: Import pipeline/watcher, TCT, portal sync, frontend, Dashboard, Ranking, Evidence.

## 6. Validation Evidence

Automated tests:

- `node --test migrate_f41_phase1_schema.test.js` -> PASS (`4/4`).
- `node --test test_f41HueExcelParser.js` -> PASS (`5/5`), including read-only reconciliation of the real HUE workbook.
- `node --test src/repositories/FactF41Repository.test.js` -> PASS (`2/2`).

Real HUE reconciliation:

- Source file: `Data DKCL/F4.1/Incoming/HUE/F4.1-2026.08.01.xlsx`
- SHA-256 after validation: `DCAAE8E10370D9CE3661141E3167A0838329591473FDBC961182757D933636A8` (matches Phase 0 baseline, case-insensitive).
- Parser-only count: `4,695` total / `2,863` `Đạt` / `1,581` `Không đạt` / `251` blank / `60.98%`.
- Temp-DB repository reconciliation, no live import: `{"total_rows":4695,"total_passed":2863,"total_failed":1581,"total_blank":251,"rate_percent":60.98}`.

Live database validation:

- Before migration, `fact_f13`: `709,234` rows; min date `2026-01-01`; max date `2026-08-16`.
- Applied only `node migrate_f41_phase1_schema.js`; result: `fact_f41` present.
- After migration, `fact_f13`: `709,234` rows; min date `2026-01-01`; max date `2026-08-16`.
- Live `fact_f41`: `0` rows. No auto-import was run.

## 7. Handoff

State: `PHASE 1 COMPLETE / READY FOR PO REVIEW`.

Phase 2 remains not activated. No Import/watcher, TCT, portal sync, frontend, Dashboard, Ranking or Evidence work was performed.
