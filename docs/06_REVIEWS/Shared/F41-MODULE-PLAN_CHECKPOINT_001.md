# F41-MODULE-PLAN — Checkpoint 001

Planning and documentation only. No product code, database, schema, or Import behavior was changed by this ticket.

## Table of Contents

- [1. Ticket State](#1-ticket-state)
- [2. Baseline And Workspace](#2-baseline-and-workspace)
- [3. Locked Product Owner Decisions](#3-locked-product-owner-decisions)
- [4. Allowed And Locked Scope](#4-allowed-and-locked-scope)
- [5. Delta-Only Survey — F1.3 Architecture](#5-delta-only-survey--f13-architecture)
- [6. Delta-Only Survey — Import Architecture](#6-delta-only-survey--import-architecture)
- [7. Source File Inventory — F4.1 (read-only)](#7-source-file-inventory--f41-read-only)
- [8. Reconciliation Baseline](#8-reconciliation-baseline)
- [9. Locked Data Contract Proposal](#9-locked-data-contract-proposal)
- [10. Phase Plan](#10-phase-plan)
- [11. UI Plan](#11-ui-plan)
- [12. Reconciliation Plan](#12-reconciliation-plan)
- [13. Test Plan](#13-test-plan)
- [14. Risk Register](#14-risk-register)
- [15. PO Gates](#15-po-gates)
- [16. Open Questions For Product Owner](#16-open-questions-for-product-owner)
- [17. Planning Remediation Round — New PO Decisions](#17-planning-remediation-round--new-po-decisions)
- [18. Source File Inventory — F4.1 TCT (read-only)](#18-source-file-inventory--f41-tct-read-only)
- [19. Cross-Lane Reconciliation — HUE vs TCT](#19-cross-lane-reconciliation--hue-vs-tct)
- [20. Revised TCT Data And Import Contract](#20-revised-tct-data-and-import-contract)
- [21. Correction To D-17](#21-correction-to-d-17)
- [22. Disposition Of Q-1..Q-5 And Remaining Open Item](#22-disposition-of-q-1q-5-and-remaining-open-item)

## 1. Ticket State

- Ticket: `F41-MODULE-PLAN`
- State: `PLAN COMPLETE / AWAITING PO APPROVAL`
- Executor: `Claude Code (Opus)`
- Activation authority: Product Owner authorized activating `F41-MODULE-PLAN` from `NO ACTIVE TICKET`, planning/documentation only.
- Activation date: `2026-08-17`
- Planning remediation round: `2026-08-17`, continued from authoritative `HEAD a0434d7b` under Product Owner authorization for planning remediation only. Sections 17-22 are the delta of that round and **supersede** the earlier text where they say so — specifically `D-10` (Section 6), `D-12` (Section 6), `D-17` (Section 7), risk `R-6`, and open questions `Q-1..Q-5` (Section 16). Sections 1-16 are otherwise unchanged and remain the record of the first round.

## 2. Baseline And Workspace

- Branch: `codex/da-impl-006`
- Baseline commit: `c2f4bdd7730192dbaa2bbe773e6859e0d35ef18b` (verified `HEAD` at activation)
- Working tree at activation: clean except pre-existing untracked `.claude/` and `Data QLML/`, both untouched by this ticket.
- Both pre-existing stashes untouched (not inspected, not applied).
- No file under `Data DKCL/` was created, moved, renamed, or modified. The F4.1 source file was opened read-only for inventory and its SHA-256 recorded (Section 7).

## 3. Locked Product Owner Decisions

Recorded verbatim in effect; not inferred, not extended.

| ID | Decision |
| --- | --- |
| PO-1 | F4.1 uses the source column `Đánh giá (thời gian Có TMS PTC 8 giờ)` as its evaluation metric. |
| PO-2 | Authoritative result: `2.863 / 4.695 = 60,98%`. All `4.695` rows belong to the denominator. |
| PO-3 | Analysis date (`ngày phân tích`) is taken from the file name, exactly as F1.3 does. |
| PO-4 | Module scope: `Dashboard`, `BCVH Ranking`, `Evidence`. No `Tuyến Ranking`. |
| PO-5 | `Chậm nộp tiền` handling and acceptance follow F1.3 unchanged. Nothing further is to be inferred. |
| PO-6 | `531120` is still stored and still counted in the module total, but hidden from `BCVH Ranking`. |
| PO-7 | Import direction is multi-indicator, supporting both `Huế` and `TCT`. |
| PO-8 | A real F4.1 **TCT** source now exists at `Data DKCL/F4.1/Incoming/TCT` (2026-08-17, remediation round). |
| PO-9 | The official DKCL report/module name for F4.1 is `F4.1_Chất lượng phát thành công của bưu cục`, distinct from F1.3's `F1.3_Chất lượng phát bưu gửi liên tỉnh_KPI` (2026-08-17, remediation round). |
| PO-10 | Role contract: `admin` **and** `viewer` may view Dashboard, BCVH Ranking and Evidence; Import remains `admin`-only (2026-08-17, remediation round). |

## 4. Allowed And Locked Scope

Allowed in this ticket:

- Read-only survey of the existing F1.3 and Import implementation.
- Read-only inventory of the F4.1 source file.
- Authoring this checkpoint, the manifest, and the governance sync (`PROJECT_SNAPSHOT.md`, `PROJECT_PROGRESS.md`, `DOCUMENT_INDEX.md`).

Locked out of this ticket:

- Any change to product code, `backend/src/db/schema.sql`, the live database, or the Import pipeline/watcher.
- Any change to F1.3 behavior, `fact_f13`, or the frozen 41-column F1.3 mapping.
- Any move/rename/delete of any file under `Data DKCL/`.
- Any business rule not stated in Section 3.

## 5. Delta-Only Survey — F1.3 Architecture

Verified against baseline `c2f4bdd7`.

**D-1 — F1.3 has no indicator abstraction.** The evaluation column `danh_gia_2026` is hardwired across `20` backend files (`138` occurrences: `backend/src/repositories/FactBuuGuiRepository.js` 23, `backend/src/services/F13DashboardService.js` 3 plus its test files, `timelineService.js`, `messageGenerationService.js`, `ruleEngineService.js`, `engine/rules/RuleF13302.js`, `RuleRegistry.js`, `controllers/kpiController.js`, `schema.sql`, `excelParser.js`, migrations). There is no metric-name parameter, no indicator registry, and no per-indicator table routing anywhere in the backend. Consequence: F4.1 cannot be delivered by parameterizing F1.3 without rewriting F1.3's hot path, which is closed and PO-passed. The plan therefore proposes a **parallel** F4.1 data path plus **shared, additive** presentation components — F1.3 code is read, not edited.

**D-2 — Canonical BCVH list already matches F4.1 exactly.** `backend/src/config/canonicalBcvhUnits.js` freezes 6 units — `535790 A Lưới`, `536250 Hương Thủy`, `535470 Hương Trà`, `537220 Phú Lộc`, `537015 Thuận An`, `533140 Thuận Hóa`. The F4.1 source file contains exactly these 6 plus `531120`. `DashboardController.normalizeDashboardBcvh()` already rejects any code outside that list. PO-6's "hide `531120` from BCVH Ranking" is therefore satisfiable by reusing the existing canonical list, with no new exclusion rule and no hardcoded `531120` literal.

**D-3 — Rate denominator differs from F1.3. Highest-impact delta.** `F13DashboardService.getBcvhRanking()` computes `kpi_2026 = dat_kpi_2026 / sl_bg_ptc`, i.e. the denominator is the count of rows that have a PTC event, not all rows. In the F4.1 source only `4,453` of `4,695` rows carry `Thời gian PTC`. Applying the F1.3 formula unchanged yields `2,863 / 4,453 = 64,29%`, which **contradicts** PO-2's locked `60,98%`. The F4.1 contract must therefore use *total rows* as the denominator (Section 9, DC-6). This is recorded as a locked divergence, not a defect in F1.3.

**D-4 — Reason classification is reusable as-is.** `F13DashboardService._classifyViolationReason()` splits a `Không đạt` row into `Chậm nộp tiền` / `Không đạt khác` / `Chưa xác định nguyên nhân` by delegating the >3h threshold to `RULE_F13_302` and treating a missing/unparseable `thoi_gian_ptc` or `thoi_gian_nop_tien` as "insufficient data". It reads only `danh_gia_2026`, `thoi_gian_ptc`, `thoi_gian_nop_tien`. For F4.1 only the evaluation-column name changes; PO-5 requires no further inference.

**D-5 — Timestamp parsing is already compatible.** `parseF13Timestamp()` (`F13DashboardService.js:37`) parses exactly `dd/MM/yyyy HH:mm:ss`. Every F4.1 time column arrives in that same format (Section 7, D-11), so the helper is reusable verbatim.

**D-6 — Surface inventory.** Backend routes live in `backend/src/routes/f13Routes.js` (`/f13/dashboard/*`, `/f13/ranking/bcvh`, `/f13/ranking/route`, `/f13/evidence-list`, `/f13/rca/pareto`), all behind `requireAuth` + `requireRole`. Frontend: `/f13/dashboard` → `features/dashboard/DashboardPage.jsx`; `/f13/ranking/bcvh` → `features/ranking/BcvhRankingPage.jsx`; `/f13/evidence` → `features/shipment/ShipmentPerformancePage.jsx` (canonical Evidence after the closed consolidation delta). Shared, indicator-neutral building blocks available for reuse: `components/shared/SharedLayout.jsx`, `SharedComponents.jsx`, `searchCommitController.js`, `components/common/Containers.jsx`, `StateLayouts.jsx`, `features/dashboard/dashboardDateRange.js`.

**D-7 — F4.1 shell already exists as a placeholder.** `frontend/src/pages/F41Quality.jsx` renders "Coming Soon"; `App.jsx:101` registers `/f41` as `ROLE_ADMIN`-only; `navigation/appNavigation.jsx:45` lists `F4.1 Quality Management` as a flat admin-only item. F1.3 by contrast is a nav *group* with sub-items. F4.1 will need the same group treatment and an explicit role decision (Section 16, Q-3).

## 6. Delta-Only Survey — Import Architecture

**D-8 — The pipeline is single-indicator by path.** `backend/src/services/importPipeline.js:14` hardcodes `../Data DKCL/F1.3` as `operationalDataRoot` and derives `Incoming/Processing/Processed/Error/Quarantine` from it. Lane selection is a string test on the relative path (`relativePath.startsWith('TCT')`) choosing `parseF13NationalExcel` (TCT, aggregate `fact_f13_national`) vs `parseF13Excel` (HUE, row-level `fact_f13`). The AUTO-IMPORT-012 test-isolation guard (`NODE_ENV=test` requires `QIS_TEST_DATA_ROOT`) is anchored to that same single root and must be preserved per-indicator.

**D-9 — The watcher is single-rooted.** `backend/src/services/importWatcher.js:8` watches only `BASE_INCOMING` from the F1.3 pipeline, with `ignoreInitial: false` — i.e. **every `.xlsx` already present at startup is imported**. See risk R-1.

**D-10 — The portal-sync layer is name-locked to F1.3.** *(Amended by Section 17: the F4.1 report name is now known — PO-9.)* `dkclHueF13SyncService.js:50` builds `F1.3-${date}.xlsx`; line 349 matches the DKCL export named `F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet`. `tctF13BackfillService.js`, `dkclHueF13BackfillService.js`, `dkclHueF13PortalClient.js`, `dkclSessionPreflightService.js` and `DataImportCenter.jsx` all carry the same F1.3 assumption in labels, coverage/scan endpoints, and queue logic. PO-7 (multi-indicator, Huế + TCT) therefore touches the portal layer, not just the file pipeline.

**D-11 — The filename-date rule is regex-locked.** `excelParser.extractDateFromFilename()` accepts only `^F1\.3-(\d{4})\.(\d{2})\.(\d{2})\.xlsx$`. The observed F4.1 file `F4.1-2026.08.01.xlsx` follows the identical convention, so PO-3 is directly implementable with an indicator-aware prefix.

**D-12 — The F4.1 directory tree already exists and is already loaded.** `Data DKCL/F4.1/{Incoming,Processed,Error}/{HUE,TCT}` exists with `.gitkeep` files, and `Data DKCL/F4.1/Incoming/HUE/F4.1-2026.08.01.xlsx` is already staged there. It is currently inert because the watcher never looks at that tree. `Data DKCL/F1.1` and `F1.2` have the same empty scaffolding. `Data DKCL/F4.1/Incoming/TCT` was **empty** at the time of the first round — *superseded by Section 18: a real TCT source now exists there (PO-8) and has been inventoried.*

## 7. Source File Inventory — F4.1 (read-only)

File: `Data DKCL/F4.1/Incoming/HUE/F4.1-2026.08.01.xlsx`
SHA-256: `dcaae8e10370d9ce3661141e3167a0838329591473fdbc961182757d933636a8`
Size: `862,532` bytes · Sheet: `Worksheet` (single) · Header row: row `1` · Columns: `42` · Data rows: `4,695`

Columns, in file order:

| # | Header | # | Header |
| --- | --- | --- | --- |
| 1 | STT | 22 | Thời gian BCP XNĐ BĐ10 |
| 2 | Mã tỉnh phát | 23 | Thời gian BD10 quét xuống tại BCP |
| 3 | Tên tỉnh phát | 24 | Số hiệu BD8 XNĐ BCP |
| 4 | Mã huyện phát | 25 | Thời gian BCP XNĐ BĐ8 |
| 5 | Tên huyện phát | 26 | Thời gian XND BD1 |
| 6 | Địa bàn phát (…) | 27 | Thời gian PTC |
| 7 | Mã BC phát | 28 | Thời gian nộp tiền |
| 8 | Tên BC phát | 29 | Thời gian TMS XNĐ BCP |
| 9 | Loại BCP | 30 | Thời gian ko TMS thực hiện PTC |
| 10 | Dịch vụ | 31 | Thời gian có TMS thực hiện PTC |
| 11 | Loại DV | 32 | Thời gian ko TMS thực hiện PLD |
| 12 | Nhóm SPDV | 33 | Thời gian có TMS thực hiện PLD |
| 13 | Mã SPDV | 34 | Thời gian chuyển hoàn |
| 14 | Số hiệu bưu gửi | 35 | Đánh giá (so sánh thời gian thực hiện với 12,5 giờ) |
| 15 | Số hiệu lô | 36 | Đánh giá (so sánh thời gian thực hiện với 72 giờ) |
| 16 | Số tiền COD | 37 | Thời gian Phát thành công lần đầu |
| 17 | Khối lượng thực tế | 38 | Đánh giá (thời gian Không đo TMS PTC 8 giờ) |
| 18 | Khối lượng quy đổi | 39 | **Đánh giá (thời gian Có TMS PTC 8 giờ)** ← PO-1 metric |
| 19 | Mã KHL | 40 | Đánh giá (thời gian Không đo TMS PTC lần đầu 8 giờ) |
| 20 | Tên KHL | 41 | Đánh giá (thời gian Có TMS PTC lần đầu 8 giờ) |
| 21 | Số hiệu BD10 XNĐ BCP | 42 | (col 6 is the wrapped "Địa bàn phát" header; always empty in this file) |

Structural deltas vs the frozen F1.3 41-column mapping:

- **Different spellings for the same concept** — `Loại BCP` vs F1.3's `Loại BC Phát`; `Mã huyện phát`/`Tên huyện phát` vs `Mã Huyện`/`Tên Huyện`. A shared mapping table cannot be reused by header name.
- **Present only in F4.1** — `Mã KHL`, `Thời gian XND BD1`, `Thời gian TMS XNĐ BCP`, the 4 duration columns (`Thời gian {ko|có} TMS thực hiện {PTC|PLD}`), `Thời gian chuyển hoàn`, `Thời gian Phát thành công lần đầu`, and 6 `Đánh giá (…)` evaluation columns.
- **Present only in F1.3** — `Mã tuyến phát`, `Tên tuyến phát`, `Loại tuyến phát`, `Thời gian chi tiêu`, `Đánh giá 2026 (Đạt/Không đạt)`, `Đánh giá (Đạt/Không đạt)`, all four `Phường Xã` columns, `Địa bàn phát` (populated in F1.3, always NULL here).

Consequence: `backend/src/services/excelParser.js` is not reusable for F4.1; a sibling parser is required, and the F1.3 mapping must not be edited.

**D-13 — There is no route column of any kind in F4.1.** PO-4's "no Tuyến Ranking" is therefore data-enforced, not merely a scope preference. Recorded as confirmation only.

**D-14 — Key integrity.** `Số hiệu bưu gửi`: `4,695` values, `4,695` distinct, zero empty. `UNIQUE(ngay_do_kiem, ma_bg)` — the exact `fact_f13` constraint — holds for this file.

**D-15 — Value types.** Every time column is a **TEXT string** in `dd/MM/yyyy HH:mm:ss`, zero non-conforming values across all 9 datetime columns (`Thời gian XND BD1` 4,695 non-null; `PTC` 4,453; `nộp tiền` 990; `TMS XNĐ BCP` 4,686; `BD10 quét xuống` 4,686; `BCP XNĐ BĐ8` 4,062; `BCP XNĐ BĐ10` 3,833; `Phát thành công lần đầu` 3,795; `chuyển hoàn` 241). None arrive as Excel date serials, so `toSqliteValue()`'s `Date` branch never fires for F4.1.

**D-16 — Duration columns are not fixed-width.** The 4 `Thời gian … thực hiện …` columns are `H:mm`-style strings but the minute part is frequently **not zero-padded** — `46:7`, `6:8`, `13:3`, `1:4` — affecting `900 / 4,695` values in `ko TMS PTC`, `858 / 4,454` in `có TMS PTC`, `573` and `630` in the two PLD columns. Hours also exceed 24 (`107:38`). Any future parser must not assume `\d{2}:\d{2}` and must not coerce these to a time-of-day.

**D-17 — Blank-evaluation rows.** **Superseded — see Section 21 for the corrected, fully-enumerated split.** The original wording generalized a sampled observation to all `251` rows and must not be relied on. What remains valid from it: all `251` are kept in the denominator per PO-2.

**D-18 — `Chậm nộp tiền` feasibility.** `990` rows carry `Thời gian nộp tiền`; `989` carry both PTC and nộp tiền. The F1.3 3-way classifier (D-4) is therefore applicable and will legitimately produce a large `Chưa xác định nguyên nhân` bucket, exactly as in F1.3.

## 8. Reconciliation Baseline

Locked acceptance figures for `2026-08-01`, metric `Đánh giá (thời gian Có TMS PTC 8 giờ)`, denominator = all rows:

| Mã BCVH | Tên BC phát | Tổng | Đạt | Không đạt | Trống | Tỷ lệ |
| --- | --- | --- | --- | --- | --- | --- |
| 533140 | BCVH Thuận Hóa | 2.184 | 1.494 | 539 | 151 | 68,41% |
| 535470 | BCVH Hương Trà | 736 | 390 | 301 | 45 | 52,99% |
| 537220 | BCVH Phú Lộc | 580 | 62 | 489 | 29 | 10,69% |
| 536250 | BCVH Hương Thủy | 509 | 347 | 155 | 7 | 68,17% |
| 535790 | BCVH A Lưới | 346 | 268 | 76 | 2 | 77,46% |
| 537015 | BCVH Thuận An | 339 | 301 | 21 | 17 | 88,79% |
| 531120 | Khách hàng lớn | 1 | 1 | 0 | 0 | 100,00% |
| — | **Tổng toàn tỉnh (module total)** | **4.695** | **2.863** | **1.581** | **251** | **60,98%** |
| — | Cộng 6 BCVH của Ranking (không gồm 531120) | 4.694 | 2.862 | 1.581 | 251 | 60,97% |

`2.863 / 4.695 = 60,98%` matches PO-2 exactly.

## 9. Locked Data Contract Proposal

Requires PO approval before any implementation.

| ID | Contract item |
| --- | --- |
| DC-1 | New table `fact_f41`, additive. `fact_f13` and its indexes are not modified. |
| DC-2 | System fields mirror `fact_f13`: `id`, `ngay_do_kiem DATE NOT NULL`, `import_log_id`, `created_at`. Constraint `UNIQUE(ngay_do_kiem, ma_bg)` (validated by D-14). |
| DC-3 | All 42 source columns are persisted — including columns the UI does not use — so a later indicator change needs no re-import. Column names follow the `fact_f13` snake_case convention. |
| DC-4 | `ngay_do_kiem` comes **only** from the file name `F4.1-YYYY.MM.DD.xlsx`, never from cell content (PO-3, mirroring the F1.3 SSOT rule). |
| DC-5 | The evaluation column is stored as `danh_gia_co_tms_ptc_8h` (source: `Đánh giá (thời gian Có TMS PTC 8 giờ)`). The other 5 `Đánh giá (…)` columns are stored but not used by any KPI in this scope. |
| DC-6 | **Rate = `COUNT(danh_gia_co_tms_ptc_8h = 'Đạt') / COUNT(*)`**, over all stored rows for the period. Rows with an empty evaluation stay in the denominator. The F1.3 `sl_bg_ptc` denominator is explicitly **not** used (D-3). |
| DC-7 | `531120` is stored, is counted in every module-level total, and is excluded from `BCVH Ranking` rows by reusing the frozen canonical 6-unit list (D-2). No `531120` literal is introduced. |
| DC-8 | Timestamps stay TEXT `dd/MM/yyyy HH:mm:ss`, exactly as `fact_f13` stores them, and are read via the existing `parseF13Timestamp` contract (D-5, D-15). |
| DC-9 | Duration columns are stored as raw TEXT, unparsed, in this scope (D-16). No derived duration metric is introduced. |
| DC-10 | Violation reason classification reuses the F1.3 3-way contract with the evaluation column swapped (D-4, PO-5). No new reason category. |
| DC-11 | No route dimension exists or is synthesized (D-13, PO-4). |

## 10. Phase Plan

Each phase requires its own explicit Product Owner authorization. No phase is self-activating.

**Phase 0 — F4.1 SSOT / reference package (documentation only).**
Create `docs/07_REFERENCE/Domains/domain_quality_management/f4.1_.../` from the existing `_template_indicator` skeleton: `metadata.yml`, `data_blueprint.md` (the 42-column mapping from Section 7), `measurement.md` (the DC-6 formula and the Section 8 baseline), `business_rules.md` (PO-1…PO-7), `testing_scenarios.md`, `changelog.md`. Gives F4.1 the same SSOT footing F1.3 has, so no later phase has to infer a rule. Zero code.

**Phase 1 — Nền tảng dữ liệu F4.1.**
Additive migration creating `fact_f41` per Section 9, applied idempotently at startup alongside the existing migrations. New `backend/src/services/f41ExcelParser.js` with its own frozen 42-column mapping, its own required-column guard (`Số hiệu bưu gửi`), and an F4.1 filename-date extractor. `fact_f13` row count verified unchanged before and after. No watcher change, no UI. Ends with the Section 8 baseline reproduced from the database by a one-off read-only query.

**Phase 2 — Import đa chỉ tiêu (PO-7).**
Introduce an indicator registry (`F1.3`, `F4.1`) carrying data root, filename pattern, parser, target table, and HUE/TCT lane behavior; generalize `importPipeline.js` and `importWatcher.js` over it, preserving the `NODE_ENV=test` isolation guard **per indicator**. F1.3 behavior must remain byte-identical — proven by the existing F1.3 import tests passing unchanged. `Data Import Center` gains an indicator selector. The portal-sync/backfill layer (D-10) is addressed only as far as PO answers Q-1/Q-2; the TCT lane for F4.1 stays explicitly unimplemented until a real TCT sample exists.

**Phase 3 — Dashboard F4.1 + BCVH Ranking.**
New backend routes under an `/f41` prefix mirroring the F1.3 shapes (`/f41/dashboard/kpi`, `/f41/dashboard/meta`, `/f41/ranking/bcvh`), a dedicated `F41DashboardService` + repository implementing DC-6 and DC-7, and frontend pages reusing the shared layout/filter/table components. F1.3 services and routes are not edited.

**Phase 4 — Evidence F4.1 + đối soát + nghiệm thu.**
`/f41/evidence-list` and an F4.1 Evidence screen reusing the canonical Evidence structure, with the F1.3 reason classification (DC-10). Full reconciliation against Section 8, regression sweep over F1.3 and Network Management, then PO acceptance.

## 11. UI Plan

- Navigation: `appNavigation.jsx` converts the flat `F4.1 Quality Management` item into a group with exactly three sub-items — `Operation Dashboard` (`/f41/dashboard`), `BCVH Ranking` (`/f41/ranking/bcvh`), `Evidence` (`/f41/evidence`) — matching PO-4. No `Tuyến Ranking` entry, no Pareto, no Message Center in this scope.
- `frontend/src/pages/F41Quality.jsx` ("Coming Soon") is replaced by a redirect to `/f41/dashboard`, mirroring how `/f13` redirects to its dashboard.
- Layout and behavior are inherited from the shared components (D-6) rather than copied from F1.3 page files, so the two modules do not diverge visually.
- The module total (`60,98%`, all rows) and the Ranking subtotal (`60,97%`, 6 units) must be **labelled distinctly** wherever both can appear on one screen, so PO-6's dual treatment can never read as an arithmetic error (see R-3).
- Antigravity owns the responsive/visual pass and the Windows runtime evidence for these screens, per `DEC-020`.

## 12. Reconciliation Plan

1. After Phase 1, query `fact_f41` directly and reproduce every row of the Section 8 table, including the `251` empty-evaluation rows and the single `531120` row.
2. After Phase 3, compare the `/f41/ranking/bcvh` API response against the same table; the 6 ranking rows must sum to `2.862 / 4.694` while the module KPI reports `2.863 / 4.695 = 60,98%`.
3. After Phase 4, compare the Evidence row count for each BCVH against the `Không đạt` column, and the sum of the three reason buckets against `1.581`.
4. Confirm `fact_f13` row count and the `Data QLML/` file checksums are unchanged at every phase boundary.

## 13. Test Plan

- Parser unit tests: 42-column mapping, missing-required-column hard error, filename-date extraction accepting `F4.1-YYYY.MM.DD.xlsx` and rejecting `F1.3-…` and malformed names, TEXT-timestamp passthrough (D-15), non-padded duration passthrough (D-16).
- A real-file test parsing the actual unmodified sample and asserting `4,695` rows and the exact `2,863 / 1,581 / 251` split — the same pattern already used for the Sơ đồ tuyến phát BatchFile parser.
- Repository/service tests: DC-6 denominator (explicitly asserting `60,98%`, not `64,29%`), DC-7 exclusion, reason classification parity with F1.3.
- Import regression: the full existing F1.3 import suite must pass unchanged after Phase 2, plus a test asserting an `F1.3-*.xlsx` file never lands in `fact_f41` and vice versa.
- Sweep at each phase: backend suite, frontend suite, `oxlint`, `vite build`, with pre-existing failures named and compared, not counted.

## 14. Risk Register

| ID | Risk | Mitigation |
| --- | --- | --- |
| R-1 | `importWatcher` uses `ignoreInitial: false` (D-9). The moment it becomes multi-indicator, the already-staged `Data DKCL/F4.1/Incoming/HUE/F4.1-2026.08.01.xlsx` is imported automatically, uncontrolled, possibly before the schema is ready. | Phase 2 must register the F4.1 root only after Phase 1's schema and parser exist; the first F4.1 import must be a deliberate, observed run with the row count verified against Section 8. Flag to PO before Phase 2 starts. |
| R-2 | Denominator divergence (D-3). Reusing F1.3's `sl_bg_ptc` silently produces `64,29%` and would still "look right". | DC-6 locks the denominator; a test asserts `60,98%` explicitly. |
| R-3 | PO-6's dual treatment of `531120` makes the module total and the Ranking subtotal legitimately differ (`4.695` vs `4.694`), which reads as a bug. | Section 8 records both; UI labels them distinctly (Section 11); reconciliation step 2 asserts both. |
| R-4 | Non-padded durations and `>24h` values (D-16) break naive time parsing. | DC-9 stores them as raw TEXT; no duration metric in scope. |
| R-5 | Generalizing `importPipeline`/`importWatcher` (Phase 2) touches code F1.3 depends on, and F1.3 Import is closed and PO-passed. | F1.3 must remain byte-identical in behavior, proven by its existing tests passing unchanged; the AUTO-IMPORT-012 isolation guard is preserved per indicator. |
| R-6 | ~~No F4.1 TCT source exists~~ — **closed** by PO-8; the file exists and is inventoried in Section 18. Replaced by **R-8**. | See R-8. |
| R-7 | Only one F4.1 HUE day (`2026-08-01`) exists, so period comparisons (D-1/D-7 style, month-to-date, same-period) cannot be validated. **Amended by Section 22:** this is non-blocking — multi-day support remains a required capability; only comparison *acceptance* waits for a second HUE day. | Build multi-day support in Phase 3; defer the comparison acceptance criterion to the first gate at which a second HUE day exists. |
| R-8 | The TCT lane publishes its own rate on a denominator that does not equal the PO-locked one (`4.684` vs `4.695` for Huế, Section 19), so a TCT figure and the module KPI will legitimately differ by `0,14` percentage points on the same day. Displaying them side by side without a rule reads as a data error. | Section 20, `TC-8`: the module KPI is always the HUE row-level computation per DC-6; any TCT figure is labelled as the published national report value and never substituted for it. The cause of the `11`-row gap is not inferred — Section 22, `Q-6`. |

## 15. PO Gates

| Gate | Point | PO confirms |
| --- | --- | --- |
| Gate 0 | End of this ticket | The plan, the Section 9 data contract, the Section 10 phasing, and the answers to Section 16. |
| Gate 1 | End of Phase 1 | The Section 8 baseline reproduced from `fact_f41`; `fact_f13` unchanged. |
| Gate 2 | End of Phase 2 | Multi-indicator Import works for F4.1/HUE with no F1.3 regression; TCT status as decided in Q-1. |
| Gate 3 | End of Phase 3 | Dashboard + BCVH Ranking runtime check, including the `60,98%` / `60,97%` distinction. |
| Gate 4 | End of Phase 4 | Evidence runtime check, full reconciliation, module acceptance. |

`PO UI Check Required` is `No` for this planning ticket and `Yes` for Gates 2, 3, and 4.

## 16. Open Questions For Product Owner

**All five questions below are closed or resolved as of the remediation round — see Section 22 for their dispositions. The table is preserved as the record of what was asked.**

| ID | Question | Why it blocks |
| --- | --- | --- |
| Q-1 | Is there a real F4.1 **TCT** source file, and is it row-level (like HUE F1.3) or aggregate-by-province (like the current TCT F1.3 national file)? `Data DKCL/F4.1/Incoming/TCT` is empty. | PO-7 asks for TCT support, but the TCT lane's parser and target table cannot be designed without knowing the file's shape. Nothing will be inferred. |
| Q-2 | What is the F4.1 report name on the DKCL portal? The Huế sync matches the literal export name `F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet` (D-10). | Determines whether automatic Huế download can be extended to F4.1 in Phase 2 or whether F4.1 stays manual-upload initially. |
| Q-3 | Should F4.1 screens be `admin`-only (as `/f41` is today) or `admin` + `viewer` (as the F1.3 screens are)? | Changes the role gating on every new route and page. |
| Q-4 | Confirm that the module total shown to users is the all-rows `4.695 / 60,98%` even on the BCVH Ranking screen, where the visible rows only add to `4.694`. | R-3; determines the ranking screen's summary row. |
| Q-5 | Is a second F4.1 day expected soon? | R-7; decides whether Phase 3 ships period-comparison widgets or a single-day Dashboard first. |

## 17. Planning Remediation Round — New PO Decisions

Round date `2026-08-17`, continued from authoritative `HEAD a0434d7b`. Planning remediation only: no product code, schema, database, watcher, portal sync, or Import was touched, and `F41-PHASE-0` was not activated.

Three new Product Owner decisions were received and are recorded in Section 3 as `PO-8`, `PO-9`, `PO-10`:

- **PO-8** — a real F4.1 TCT source now exists at `Data DKCL/F4.1/Incoming/TCT`. Audited read-only in Section 18.
- **PO-9** — the official DKCL report/module name for F4.1 is `F4.1_Chất lượng phát thành công của bưu cục`. The Product Owner supplied a screenshot distinguishing it from the F1.3 report `F1.3_Chất lượng phát bưu gửi liên tỉnh_KPI`. Note that neither of these two official names is the literal string the current code matches — `dkclHueF13SyncService.js:349` matches `F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet` (D-10). Whether that is a different export within the same report or a stale/normalized match string is **not** inferred here; it is a discovery item for the phase that touches portal sync, recorded in Section 20 as `TC-9`.
- **PO-10** — `admin` and `viewer` may both view Dashboard, BCVH Ranking and Evidence; Import remains `admin`-only. This matches the F1.3 gating pattern already in `f13Routes.js` (`allowViewerRead` vs `allowAdminOnly`) and replaces the `admin`-only placeholder gating currently on `/f41` (D-7).

## 18. Source File Inventory — F4.1 TCT (read-only)

File: `Data DKCL/F4.1/Incoming/TCT/F4.1-2026.08.01.xlsx`
SHA-256: `6256ef56bba40cee7567dfe6b55d6822adb9923c3644c489382cbfd8d9df18e8`
Size: `15.963` bytes · Sheet: `Worksheet` (single) · Sheet range `A1:AL50` · Populated columns: `38` · Merged cells: `32`

The file was opened read-only. It was not imported, moved, renamed, or modified; its checksum was re-verified identical after the audit (Section 18.6).

### 18.1 Grain — aggregate, not row-level

**T-1.** The workbook is an **aggregate report at reporting-unit level**, not a shipment-level detail file. `Mã huyện`, `Mã BC` and `Ma KHL` columns exist in the header but are `NULL` in **every** data row (`0 / 46`). There is no `Số hiệu bưu gửi` column and no per-shipment field of any kind. This is the same shape as the existing TCT F1.3 national file that feeds `fact_f13_national`, and the opposite of the HUE F4.1 file, which is row-level (Section 7).

**T-2.** Row layout is four-part and must be parsed positionally:

| Rows | Content |
| --- | --- |
| `1` | Header level 1 (group headers span merged ranges) |
| `2` | Header level 2 (sub-headers under the merged groups `Đúng thời gian quy định` and `Quá thời gian quy định`) |
| `3` | A column-number legend row (`1`, `2`, … and formula annotations such as `11=10/9`, `27=26/9`) — **not data** |
| `4` | **Grand-total row** — `TT = 1`, `Mã tỉnh` and `Tên tỉnh` both `NULL` |
| `5`-`50` | `46` reporting-unit rows, `TT = 2..47` |

**T-3.** The grand-total row is a true sum, verified across all `17` numeric columns — `376.142`, `362.358`, `302.361`, `355.350`, `59.849`, `9.788`, `17.944`, `41.285`, `13.784`, `254.035`, `236.197`, `9.943`, `6.731`, `26.379`, `22.199`, `246.186`, `229.231` — each exactly equal to the sum of the `46` unit rows. It must therefore be **skipped on ingest**, or every national figure doubles.

**T-4.** `46` distinct `Mã tỉnh`, zero duplicates. Not all units are provinces: `01 Tổng công ty EMS`, `08 Bưu điện Trung Ương`, `11 Bưu điện Trung tâm Hoàn Kiếm`, `12 Bưu điện Trung tâm Hà Đông`, `14 Bưu điện Trung tâm Từ Liêm`, `15 Bưu điện Trung tâm Long Biên` are organisational units carried in the same column. The key is therefore "reporting unit", not "province".

### 18.2 Column inventory

Group headers occupy row 1 and are merged over the row-2 sub-headers. Effective columns, with the report's own legend numbering:

| idx | Column | Legend |
| --- | --- | --- |
| 0-9 | `TT`, `Mã tỉnh`, `Tên tỉnh`, `Mã huyện`, `Tên huyện`, `Mã BC`, `Tên BC`, `Loại BC`, `Ma KHL`, `Ten KHL` | `1`-`10` |
| 10 | `Sản lượng PTC/ Nộp tiền/ CH` | col `9` — the report's denominator |
| 11 | `Sản lượng PTC/ Nộp tiền` | col `10` |
| 12 | `Tỷ lệ PTC/ Nộp tiền` | `11=10/9` |
| 13-14 | `Sản lượng` / `Tỷ` `PTC trong thời gian QĐ 12,5 giờ` | `12`, `13` |
| 15-16 | `Sản lượng` / `Tỷ lệ` `PTC/Nộp tiền/Chuyển hoàn trong thời gian QĐ 72 giờ` | `14`, `15=14/9` |
| 17-18 | `Sản lượng` / `Tỷ lệ` `phát thành công /Nộp tiền > 12,5 giờ và chuyển hoàn` | `16`, `17=16/9` |
| 19-20 | `Sản lượng` / `Tỷ lệ` `phát thành công /Nộp tiền/Chuyển hoàn > 72 giờ` | `18`, `19=18/9` |
| 21 | `Sản lượng chưa đủ thông tin đo kiểm` | `20` |
| 22 | `SL loại trừ không đo kiểm` | `21` |
| 23-24 | `SL Chuyển hoàn`, `Tỷ lệ chuyển hoàn` | `22`, `22/9=23` |
| 25-26 | `Sản lượng` / `Tỷ lệ` `bưu gửi PTC 8 giờ tại bưu cục (XNĐ BD1)` | `24`, `24/9=25` |
| **27-28** | **`Sản lượng` / `Tỷ lệ` `bưu gửi PTC 8 giờ tại bưu cục (có quét TMS)`** | `26`, `27=26/9` — **the aggregate counterpart of the PO-1 metric** |
| 29-33 | Duration buckets `≤ 12 giờ`, `> 12 ≤ 14`, `> 14 ≤ 16`, `> 16 ≤ 36`, `> 36 giờ` | `28`-`31` |
| 34-35 | `Sản lượng` / `Tỷ lệ` `bưu gửi PTC 8 giờ lần đầu tại bưu cục (XNĐ BD1)` | `32`, `33=32/9` |
| 36-37 | `Sản lượng` / `Tỷ lệ` `bưu gửi PTC 8 giờ lần đầu tại bưu cục (có quét TMS)` | `34`, `35=34/9` |

**T-5.** Per the report's own legend, every published rate divides by col `9` = idx `10` = `Sản lượng PTC/ Nộp tiền/ CH`. In particular `27=26/9`: the PO-1-equivalent rate is `Sản lượng bưu gửi PTC 8 giờ (có quét TMS) / Sản lượng PTC/Nộp tiền/CH`.

### 18.3 Value types

**T-6.** All `Sản lượng` / count columns are numeric. All `Tỷ lệ` columns are **TEXT percent strings** — `"96.34%"`, `"0%"`, `"2.72%"` — not numbers and not Excel percent-formatted cells. They must be recomputed from the counts, or stored raw as text; they must not be parsed into floats and then re-rendered as if computed.

**T-7.** `Mã tỉnh` is inconsistently typed: `"01"` and `"08"` arrive as zero-padded **strings**, `10`, `53`, `90` as **numbers**. Any key handling must normalize, exactly as `canonicalBcvhUnits`/`normalizeDashboardBcvh` already do for BCVH codes.

### 18.4 Dates

**T-8.** There is **no date anywhere in the workbook** — zero `Date`-typed cells and zero date-like strings across all `50 × 38` cells. The reporting date is therefore obtainable *only* from the file name `F4.1-2026.08.01.xlsx`. PO-3 is not merely a convention for the TCT lane; it is the sole available source, and a missing/invalid file name must be a hard parse error, as it already is for F1.3.

### 18.5 Evaluation fields

**T-9.** The TCT file carries no `Đạt` / `Không đạt` text field at all. Every evaluation is expressed as a pre-aggregated count plus a published rate. Consequently the F1.3-style per-shipment reason classification (`Chậm nộp tiền` / `Không đạt khác` / `Chưa xác định nguyên nhân`, DC-10) is **not computable** from the TCT lane, and Evidence has no TCT-side source. This is a structural fact, not a scoping choice.

### 18.6 Integrity

**T-10.** SHA-256 re-verified after the audit: `6256ef56bba40cee7567dfe6b55d6822adb9923c3644c489382cbfd8d9df18e8` — unchanged. The HUE F4.1 file was also re-verified unchanged at `dcaae8e10370d9ce3661141e3167a0838329591473fdbc961182757d933636a8`. No Import was run; no file under `Data DKCL/` was created, moved, renamed, or modified.

## 19. Cross-Lane Reconciliation — HUE vs TCT

The TCT workbook contains a `Mã tỉnh = 53` row (`TT = 29`, `Bưu điện Tỉnh Thừa Thiên Huế`) covering the same day as the HUE row-level file, which makes a direct cross-lane check possible.

**T-11 — Every evaluation measure matches exactly.** Each of the six `Đánh giá (…)` columns counted from the HUE row-level file equals its TCT aggregate counterpart, to the unit:

| Measure | HUE row-level count | TCT Huế row | Match |
| --- | --- | --- | --- |
| `PTC 8 giờ (có quét TMS)` = **PO-1 metric**, `Đạt` | **2.863** | idx 27 = **2.863** | exact |
| `PTC 8 giờ (XNĐ BD1 / không đo TMS)`, `Đạt` | 2.889 | idx 25 = 2.889 | exact |
| `PTC lần đầu 8 giờ (XNĐ BD1)`, `Đạt` | 2.855 | idx 34 = 2.855 | exact |
| `PTC lần đầu 8 giờ (có quét TMS)`, `Đạt` | 2.831 | idx 36 = 2.831 | exact |
| `so sánh với 12,5 giờ`, `Đạt` | 3.341 | idx 13 = 3.341 | exact |
| `so sánh với 12,5 giờ`, `Không đạt` | 1.112 | idx 17 = 1.112 | exact |
| `so sánh với 72 giờ`, `Đạt` | 4.194 | idx 15 = 4.194 | exact |

This proves the two lanes measure the same population on the same day, and independently confirms that `Đánh giá (thời gian Có TMS PTC 8 giờ)` (PO-1) is the row-level equivalent of the report's `PTC 8 giờ tại bưu cục (có quét TMS)`.

**T-12 — The denominators do not match, and the published rate therefore differs.**

| Quantity | HUE row-level | TCT Huế row |
| --- | --- | --- |
| Numerator (`Đạt`) | 2.863 | 2.863 |
| Denominator | **4.695** (all rows, PO-2) | **4.684** (`Sản lượng PTC/Nộp tiền/CH`) |
| Rate | **60,98%** (PO-locked) | `61,12%` (published, idx 28) |

Difference: `11` rows in the denominator, `0,14` percentage points in the rate.

**T-13 — Adjacent counters also differ, and the cause is not inferred.** The TCT row reports `Sản lượng chưa đủ thông tin đo kiểm = 248` against `251` blank evaluations in the HUE file, `SL Chuyển hoàn = 230` against `241` rows carrying a `Thời gian chuyển hoàn`, and `SL loại trừ không đo kiểm = 15` — a concept the row-level file exposes as no field at all. The TCT lane clearly applies exclusions that the row-level export does not surface. **No arithmetic reconciling `4.684` to `4.695` is asserted here**; several combinations of these counters land near the gap, and picking one would be inference. This is recorded as `Q-6` in Section 22.

**T-14 — Consequence for the contract.** `PO-2` is authoritative for the module KPI. The module therefore always computes `2.863 / 4.695 = 60,98%` from the HUE row-level data (DC-6); the TCT `61,12%` is a *published national report value*, never a substitute, never an override, and never silently reconciled. See `TC-8`.

## 20. Revised TCT Data And Import Contract

Revised only where Section 18-19 evidence supports it. Items unchanged from Section 9 are not restated. Still requires PO approval.

| ID | Contract item |
| --- | --- |
| TC-1 | The F4.1 TCT lane is **aggregate**, keyed by reporting unit, and lands in its own additive table — proposed `fact_f41_national`, mirroring how `fact_f13_national` serves the F1.3 TCT lane (T-1). It never writes to `fact_f41`, and `fact_f41` never receives an aggregate row. |
| TC-2 | Row key `UNIQUE(ngay_do_kiem, ma_don_vi)`, matching `fact_f13_national`'s `UNIQUE(ngay_do_kiem, ma_tinh_phat)`. `46` units per day for this file; the key is a reporting unit, not strictly a province (T-4). |
| TC-3 | The parser is positional, not header-scanning: two header rows, a legend row, one grand-total row, then unit rows (T-2). The **grand-total row is skipped on ingest** and, if used at all, is used only as a self-check against the sum of unit rows (T-3). `parseF13Excel`'s single-header-row scan and `parseF13NationalExcel` are both unsuitable without change; neither may be edited for F4.1. |
| TC-4 | All `28` measure columns (idx `10`-`37`) are persisted. Counts are stored numeric; published `Tỷ lệ` columns are stored as raw TEXT exactly as they appear and are never parsed into floats (T-6). |
| TC-5 | `Mã tỉnh` is normalized to a zero-padded string on ingest to absorb the mixed string/number typing (T-7). |
| TC-6 | `ngay_do_kiem` comes only from the file name `F4.1-YYYY.MM.DD.xlsx`. A missing or unparseable file name is a hard error — there is no fallback, because the workbook contains no date at all (T-8). |
| TC-7 | The TCT lane produces **no Evidence and no violation-reason classification**: the file has no per-shipment row and no `Đạt`/`Không đạt` field (T-9). Evidence (PO-4) remains HUE-only. |
| TC-8 | The module KPI is always the HUE row-level computation per DC-6 (`2.863/4.695 = 60,98%`). Any TCT figure displayed is labelled as the published national report value and is never substituted for, blended with, or silently reconciled against the module KPI (T-12, T-14, R-8). |
| TC-9 | Portal sync for F4.1 targets the report `F4.1_Chất lượng phát thành công của bưu cục` (PO-9). Before any sync code is written, the phase that touches portal sync must first *discover* the actual export/match string on the portal, because the live F1.3 matcher uses `F1.3_chat_luong_phat_buu_giay_lien_tinh_chi_tiet`, which is not the official F1.3 report name either (Section 17). No match string is guessed. |
| TC-10 | Both lanes remain manual-upload-capable independently of portal sync, so F4.1 is usable before `TC-9`'s discovery completes. |

Effect on the phase plan (Section 10): Phase 1 covers the HUE row-level foundation only; the `fact_f41_national` table and the aggregate parser move into **Phase 2**, where the multi-indicator Import work already lives. No phase is added and no phase is authorized.

Effect on the UI plan (Section 11): per PO-10, the three F4.1 screens are gated `admin` + `viewer` — matching `allowViewerRead` in `f13Routes.js` — and the current `admin`-only gating on `/f41` (`App.jsx:101`, `appNavigation.jsx:45`) is widened accordingly. Import surfaces stay `admin`-only.

## 21. Correction To D-17

D-17 as originally written generalized a sampled observation to all `251` blank-evaluation rows and characterized them as returned / not delivered. That was wrong for `10` of them. All `251` rows were re-audited individually; the corrected split is exhaustive and mutually exclusive:

| Group | Count | Proven field pattern |
| --- | --- | --- |
| A | **241** | `Thời gian chuyển hoàn` present **and** `Thời gian PTC` absent. |
| B | **9** | `Thời gian PTC` present, `Thời gian chuyển hoàn` absent, `Thời gian TMS XNĐ BCP` absent. These rows do carry the non-TMS evaluations (`Đánh giá (thời gian Không đo TMS PTC 8 giờ)` is populated), while the TMS-based evaluation is blank. |
| C | **1** | `Thời gian PTC` absent, `Thời gian chuyển hoàn` absent, `Thời gian TMS XNĐ BCP` present; carries `Thời gian nộp tiền` and `Thời gian Phát thành công lần đầu`. |

`241 + 9 + 1 = 251`. Zero rows have both a return timestamp and a PTC timestamp.

Only group **A** is evidenced as a return. Groups **B** and **C** are recorded as observed field patterns only — **no cause is asserted**. In particular, the co-occurrence in group B between a blank TMS-based evaluation and an absent `Thời gian TMS XNĐ BCP` is stated as an observation, not as a rule about how the source system computes the field; that rule, if it exists, belongs to the Product Owner or to the DKCL report definition, not to this plan.

All `251` remain in the denominator per PO-2, unchanged. Note that this correction does not alter any figure in Section 8 — it corrects the *characterization* of the blank rows, not their count.

## 22. Disposition Of Q-1..Q-5 And Remaining Open Item

| ID | Disposition |
| --- | --- |
| Q-1 | **CLOSED** by PO-8. A real F4.1 TCT source exists and has been audited read-only (Section 18). It is aggregate at reporting-unit level, `46` units plus a grand-total row, with no per-shipment grain. The TCT contract is revised accordingly in Section 20 (`TC-1`..`TC-8`). Risk `R-6` is closed and replaced by `R-8`. |
| Q-2 | **CLOSED** by PO-9. The official report/module name is `F4.1_Chất lượng phát thành công của bưu cục`, distinct from `F1.3_Chất lượng phát bưu gửi liên tỉnh_KPI`. Recorded as `TC-9`, with the explicit note that the live F1.3 matcher string differs from the official F1.3 report name too, so the portal match string must be discovered rather than derived. |
| Q-3 | **CLOSED** by PO-10. `admin` + `viewer` for Dashboard, BCVH Ranking and Evidence; Import `admin`-only. Section 20 records the effect on the UI plan. |
| Q-4 | **RESOLVED — already answered.** The module KPI uses `2.863 / 4.695 = 60,98%`; the six visible BCVH rows reconcile to `2.862 / 4.694 = 60,97%`; the two must carry distinct labels so neither can be read as the other. This was already the content of `DC-6`, `DC-7`, Section 8 and Section 11; it is no longer an open question. Risk `R-3` remains the tracked UI obligation. |
| Q-5 | **NON-BLOCKING.** Multi-day support remains a required capability of the module and is not deferred. Only the *acceptance* of period-comparison behaviour waits for a second HUE day to exist. `R-7` is amended accordingly: Phase 3 builds multi-day support; the comparison acceptance criterion is verified at the first gate at which a second HUE day is available, and its absence does not block Phase 3. |
| **Q-6** | **NEW, OPEN — arising from this round's evidence, not from scope expansion.** The TCT lane reports a denominator of `4.684` for Huế where the row-level file has `4.695`, with the numerator identical at `2.863` (T-12), and its adjacent counters (`chưa đủ thông tin đo kiểm 248` vs `251` blanks; `SL Chuyển hoàn 230` vs `241`; `SL loại trừ không đo kiểm 15`, a field the row-level export does not have) do not reconcile by any single stated rule (T-13). Question for the Product Owner: which exclusion rule does the national report apply that the row-level export does not expose? Not blocking — `TC-8` already fixes the module's behaviour by always computing from the HUE row-level data — but it must be answered before any screen shows a TCT-derived rate next to the module KPI. |
