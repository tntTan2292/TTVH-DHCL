# F13-WHY-AGG-01 Manifest

## 1. Ticket Information

- Ticket ID: `F13-WHY-AGG-01`
- Name: `F1.3 "TẠI SAO": shared cause aggregation layer (per-parcel derived table, freshness, query layer)`
- Programme: F1.3 cause rebuild. Predecessor `F13-WHY-DATA-01` (CLOSED / PO UI PASS, commits `c8b24977`, `7ae159d2`). Next tickets in the agreed order (PO + ChatGPT, 2026-11-05): Hành trình page (cause, flags, hints, filters; UI by Antigravity), Phân tích tuyến phát, Năng lực và chất lượng tuyến (needs a PO definition first), Dữ liệu minh chứng, NARRATIVE, RETIRE.
- Owner: `Claude Code` (backend, data, tests, documentation, Git). Model discipline: Sonnet 5.5 implements; **Opus reviews independently** (high risk: new derived table, background job); the same model does not self-approve.
- Branch: `codex/da-impl-006` (as `PROJECT_SNAPSHOT.md`).
- **Status: `ACTIVE - P1 BUILT, AWAITING OPUS REVIEW` (activated 2026-11-05, section 10; results in section 13).** The Design of Record v2 (with section 6A and Appendix D) was approved by the PO on 2026-11-05; the Opus pre-implementation review (section 12) found no SSOT or PO issue.
- Relation to `PROJECT_SNAPSHOT.md`: Current Ticket is `F13-ROUTE-POSTMAN-IDENTITY-01` (PAUSED by PO decision). This ticket does **not** replace it and does **not** reactivate it (the same arrangement as `F13-WHY-DATA-01`: "does not change Current Ticket"). On activation the snapshot only receives a "Previous update" line; the PAUSED state of the postman-identity ticket is untouched.

## 2. Authority and sources

- Design of Record (approved): `docs/04_TECHNICAL_PLANNING/Feature/F13-WHY-AGG-01_DESIGN_OF_RECORD.md`. It decides: the derived table `f13_cause_parcel` and companions, the formulas (denominator = all F1.3 rows; shortfall in tenths; own shortfall versus net contribution), the three route scopes `POSTMAN` / `NON_POSTMAN` / `OTHER`, the first-handover postman as the analysis dimension (the postman shown on Hành trình is stored beside), BG-day rows as the basis of every headline figure (distinct parcels for information only, section 6A), the refresh rules, the tests (section 11).
- Business rules (locked, not reopened here): `docs/10_TICKETS/F13-WHY-DATA-01_MANIFEST.md` (cause tree, night rule C, limit, `UNLOCATED_TCT_EXCLUSION`, F4.1 key, first handover, Không trọn lô over the whole lot). Official F1.3 results, formulas and verdicts are never changed.
- PO decisions of 2026-11-04 that stay: hot spots rank by parcels missing against 90 %; Chuyên quản and Giám đốc BCVH see the same figures with the postman name; tồn / hoàn is a hint, not a cause; no blame on a person or unit before the ĐTC2 level-2 deadlines exist.

## 3. Required Reading (GitHub Blob, branch `codex/da-impl-006`)

Files committed on the branch:
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/10_TICKETS/F13-WHY-DATA-01_MANIFEST.md
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/04_TECHNICAL_PLANNING/Feature/PERF-LOAD-01_PHASE2_DESIGN_PROPOSAL.md
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/04_TECHNICAL_PLANNING/Feature/F13-V2-STRUCTURE-01_DESIGN.md
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/05_DEVELOPMENT/Implementation/report_block_ui_standard.md (carried by the later UI tickets, not applied here)
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/aggMaintenance.js
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/aggReadPolicy.js
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/f13v2/JourneyService.js
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/services/f13v2/CauseClassifier.js
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/repositories/FactBuuGuiRepository.js
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/src/config/f13RouteClassificationCatalog.js

- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/docs/04_TECHNICAL_PLANNING/Feature/F13-WHY-AGG-01_DESIGN_OF_RECORD.md (committed in `6cde9e5f`)
- https://github.com/tntTan2292/TTVH-DHCL/blob/codex/da-impl-006/backend/migrate_perf_load_01_agg_schema.js (pattern for the additive schema at startup)

## 4. Scope

**In scope.** Backend only, F1.3 only:
1. Table `f13_cause_parcel`, companions `f13_cause_day` (per-day input signature, classifier version, state, error) and `f13_cause_run` (run log); additive creation at startup, like the `agg_*` tables; builder through the existing `JourneyService._parcels` path (no second copy of the rules); tool `scripts/f13_cause_tool.js build | rebuild | verify --from --to`.
2. Query layer `/api/f13/v2/why/{summary,bcvh,routes,postmen,parcels}` with the common filter (`from`/`to`, `week`, `month`, `bcvh`), drill-down BCVH -> route -> postman -> BG, `meta.freshness`, `meta.repeats`, scope rules as Journey.
3. Background refresh after imports with the rules of Design section 8 (single runner, queue, per-day transaction, retry, resume, log, read-time freshness).
4. Tests, reconciliation with the official figures, documentation.

**Out of scope.** Any screen; F4.1 or any other indicator; any change to the cause rules, thresholds or the official F1.3 numbers; the definition of "năng lực tuyến"; a verdict or cause per distinct parcel; narrative sentences; retiring old pages; touching `F13-ROUTE-POSTMAN-IDENTITY-01`.

## 5. Phases (each can be verified alone; stop and report after each)

| Phase | Content | Acceptance criteria | Test evidence |
|---|---|---|---|
| **P1 Table and builder** | tables, builder, signature, `build/rebuild/verify` tool | (a) creation is idempotent and additive; (b) builder rows equal `_parcels` output for every field it stores on 7 sampled days; (c) a day rebuilt twice gives the same rows; (d) a failing day keeps its old rows; (e) `verify` reports 0 differences of rows, Đạt, KĐ, blank per day and BCVH against `fact_f13` and `agg_f13_day`; (f) re-import of a day with changed or removed parcels leaves no orphan row | unit tests with fake repositories; a run on a **copy** of the real database for 22-28/10/2026 (six BCVH: 23 098 rows, 14 027 Đạt, 7 738 KĐ, 1 333 unrated; cause counts equal the Phase 4 figures of F13-WHY-DATA-01, e.g. 449 Không trọn lô, 596 chưa đủ căn cứ) and the time per day |
| **P2 Query layer** | endpoints, scope, formulas | (a) BCVH = POSTMAN + NON_POSTMAN + OTHER routes; BCVH = sum of postmen (first handover) + "Chưa có bưu tá", for N, Đạt, KĐ, unrated and `shortfall_x10`; (b) cause lines + "chưa đủ căn cứ" = KĐ at every level; (c) rows of `parcels` = the figure they were opened from; (d) rate = sum of Đạt / sum of rows; `own_shortfall` / `net_contribution` / shares as Design section 6, no rounding before a sum; (e) `meta.repeats` and `distinct_bg` as section 6A, children not summed for distinct counts; (f) a `bcvh` account never receives a city total; a filter outside its scope is rejected | tests for each item incl. the April fixture (parcels on 09/04 and 10/04); equality with `agg_f13_day`, `getBcvhRanking` and `getRouteRanking` (with the confirmed non-postman list) on the week 43 and October figures of Design Appendix A and D |
| **P3 Refresh** | hook after imports, runner, log, freshness | (a) the window constants are those of `JourneyService` (test fails if they differ) and an import of day X marks `X-5..X+10` (`X-6` for BF Phát); (b) a second request while a run is active joins it, never runs in parallel; (c) crash and restart resume the missing and stale days; (d) a stale or missing day is reported in `meta.freshness`, never as complete; (e) a classifier-version change marks all days stale; (f) shadow comparison against the on-the-fly path on a sample of days: 0 difference | tests; run log extract of an import-triggered refresh on the copy |
| **P4 Verification and handoff** | week 43, October 2026 and April 2026 | the totals equal the official F1.3 for every BCVH, week and month tested; every figure is traceable to its BG list; Opus independent review has no open blocker; documentation synchronised | reconciliation report (Appendix A / D style) for week 43, October and April, SHA-256 of the evidence files; Opus review note |

## 6. Technical, runtime and testing requirements

- Read only against the detail tables; the only writes are to the three derived tables; the official tables are never modified. No change of the import flow except enqueueing a refresh after its commit.
- Node `--experimental-sqlite` for the backend suites; the five f13v2 suites plus the new ones must stay green; run root `test_*.js` files one by one when touched (the default sweep skips them).
- Real-data runs first on a copy of the database (4 GB, shared worktree: no destructive operation, no `checkout`, `reset`, `stash`, `clean`). The first production build and the backend restart are done by Claude Code **only after** P4 passes and the PO agrees (ops steps are done for the PO).
- No UI, no new route in the frontend, no browser. Antigravity is not involved in this ticket.
- Risk register: Design section 13.

## 7. Documentation to update

`PROJECT_PROGRESS.md` (one new line when the ticket closes or is activated), `DOCUMENT_INDEX.md` (this manifest and the Design are registered), `PROJECT_SNAPSHOT.md` ("Previous update" line, Current Ticket unchanged), this manifest (results per phase), the Design of Record (only to record a PO-approved change), memory / skill notes if a business fact changes. `CLAUDE.md` needs no change.

## 8. Completion and handoff

`PO UI Check Required = No` (backend only). Completion: P1-P4 accepted as above, Opus review closed, evidence recorded, one commit per phase or one per ticket by pathspec (files of the ticket only; never `User QIS.xlsx`, `.claude/skills/`, `exports/`), pushed and the remote hash verified, report as a Technical Execution Report. The PO accepts on the reconciliation report (no screen to check). Next ticket: the Hành trình page showing cause, flags, hints and filters from this layer (UI by Antigravity, report-block standard applies).

## 9. Blockers

None.

## 10. Activation

Activated on 2026-11-05 by the PO's instruction in chat: after an Opus review with no SSOT or PO issue, activate F13-WHY-AGG-01 and implement P1; keep the Current Ticket (parallel-ticket rule); no extension to F4.1; report per phase. `PROJECT_SNAPSHOT.md` receives a "Previous update" line only; `F13-ROUTE-POSTMAN-IDENTITY-01` stays PAUSED and Current.

## 11. Change log

- 2026-11-05: manifest prepared after PO approval of the Design of Record v2 (not activated).
- 2026-11-05: Opus pre-implementation review of `6cde9e5f` (section 12); technical clarifications T1-T6 added; ticket activated, P1 started.

## 12. Opus pre-implementation review (2026-11-05, Claude Code / Opus 5.5, read-only checks against code and database)

**Verdict: PASS - no SSOT, formula or PO-decision issue.** Checked: the official denominator (all F1.3 rows) and the 90 % target agree with `FactBuuGuiRepository` and `CLAUDE.md`; the window arithmetic of Design section 8 follows from `DAYS_BEFORE = 10`, `DAYS_AFTER = 5` and the BF Phát read `[D-10, D+6]` in `JourneyService._parcels` (import of X affects D in `[X-5, X+10]`, BF `[X-6, X+10]`); key `(ngay_do_kiem, ma_bg)` is unique in `fact_f13`; the five source tables have `id INTEGER PRIMARY KEY AUTOINCREMENT`, so a `COUNT + MAX(id)` signature changes on every delete-and-reinsert (ids are never reused); hot spots by `max(0, 0.9 N - Đạt)` match the PO rule of 2026-11-04; partitions by route scope and by first-handover postman are exact partitions of a BCVH (one value per row).

Findings (all technical; fixed here or carried as implementation rules, none changes the Design's decisions):

| ID | Level | Finding | Resolution |
|---|---|---|---|
| D1 | Low | Manifest section 3 said the Design was not yet on the branch; it is (`6cde9e5f`). Activation section still pending. | Fixed in this revision. |
| D2 | Low | The Design title still read "proposal for PO approval" and section 12 "Decisions requested", although its status line records the PO approval of all five points. | Title and section 12 heading now record the decisions (no content change). |
| T1 | Medium | `route_scope` stored at build time would go stale if `CONFIRMED_NON_POSTMAN_ROUTES` changes. | The catalog codes are part of the build version (`classifier_version` = SHA-256 of `CauseClassifier.js`, `tctIntervals.js`, `JourneyService.js` and the confirmed non-postman codes); a change marks every day stale (Design 8, P3 (e)). |
| T2 | Medium | `JourneyService._parcels` keeps the six canonical BCVH only, while `fact_f13` / `agg_f13_day` also hold other units (e.g. "Khách hàng lớn"). | `verify` and every equality test compare the six canonical BCVH only and report rows of other units separately, never as a difference. |
| T3 | Medium | The builder must call `_parcels(date)` without a scope (city-wide), otherwise lot volumes depend on the account. | Builder uses no `bcvhId` / `allowedCodes`; test asserts it. |
| T4 | Low | The signature covers inserts and deletes; an in-place `UPDATE` of a source row would not change it. Imports replace rows (delete + insert), so this is accepted; `verify` and the classifier-version check remain the backstop. | Recorded as residual. |
| T5 | Low | P1 asks for a run on a copy of the 4 GB database while the backend writes to it. | The copy is taken with `VACUUM INTO` (one read transaction on the live file, nothing written to it) into the session scratchpad, and used through `NODE_ENV=test` + `QIS_TEST_DB_PATH`. |
| T6 | Low | P1 (b) "builder rows equal `_parcels`" is partly tautological because the builder calls `_parcels`. | Kept as a plumbing test (mapping of every stored field); the independent check is (e) against `fact_f13` / `agg_f13_day` and the F13-WHY-DATA-01 Phase 4 cause counts. |

Nothing requires a PO decision.

## 13. P1 results (2026-11-05, Claude Code / Sonnet 5.5; for Opus review, not self-approved)

**Built (backend only).**
- `backend/migrate_f13_why_agg_01_schema.js`: `CREATE ... IF NOT EXISTS` for `f13_cause_parcel` (Design section 5 columns, unique key `(ngay_do_kiem, ma_bg)`, the four listed indexes plus `(ma_bg)` as listed), `f13_cause_day` (signature, classifier version, state FRESH/STALE/BUILDING, built_at, error, row count) and `f13_cause_run` (`trigger_source` instead of `trigger`, a SQLite keyword). Applied at startup from `ensureStartupSchemaMigrations` in `server.js` (last step, after `applyOpsJournal02Schema`). Not run against the live database.
- `backend/src/services/f13v2/CauseAggBuilder.js`: per day calls `JourneyService._parcels(date)` with no scope (T3), maps every parcel to a row, rewrites the day in one transaction (`BEGIN IMMEDIATE`, delete the day, insert, upsert `f13_cause_day`). Signature = `COUNT` and `MAX(id)` of fact_f13 / f41 / f42 / f11 over `[D-10, D+5]` and fact_bf_phat over `[D-10, D+6]`, taken before the parcels are read. `classifier_version` = SHA-256 of `CauseClassifier.js`, `tctIntervals.js`, `JourneyService.js` (line endings normalised) plus the sorted confirmed non-postman codes (T1). Failing day: old rows kept, state STALE with the error, up to 3 attempts, the run goes on (PARTIAL/FAILED). Run log with heartbeat, RUNNING runs older than 15 min become ABANDONED, an in-process single run (a second request while a run is active adds its days to it; one that arrives after the loop closed starts its own run).
- `backend/scripts/f13_cause_tool.js build | rebuild | verify --from --to [--db]`: `verify` only reads; it compares rows / Đạt / Không đạt / blank per day and BCVH of the table with `fact_f13` and `agg_f13_day` for the six canonical BCVH, reports other units separately (T2), lists days not FRESH, exit 1 on a difference. With `--db` the tool pins `NODE_ENV=test` and `QIS_TEST_DB_PATH` so nothing can reach the operational file.
- Minimal changes to existing code: `JourneyService` exports `DAYS_BEFORE`, `DAYS_AFTER`, new `BF_EXTRA_DAYS` (the former literal `1`), `shiftIsoDate`, and each parcel now carries `ma_buu_ta_first` / `ten_buu_ta_first` (F4.2 first handover by `pickFirstHandover`); `F13JourneyRepository` accepts an optional connection (default: the shared one, required lazily) and exports its class. No cause rule, threshold or official figure changed.

**Tests** (`node --experimental-sqlite --test <file>`, one file at a time, all green): `CauseAggBuilder.test.js` 21/21 (new), `migrate_f13_why_agg_01_schema.test.js` 2/2 (new), `server.startupMigrations.test.js` 1/1 (extended with the three tables), `tctIntervals` 45/45, `CauseClassifier` 27/27, `JourneyService` 19/19, `f13v2Units` 20/20, `f13v2Routes.scope` 13/13. New tests cover (a) idempotent additive schema and unique key, (b) every stored field against `_parcels` with both postmen and the three scopes, (c) rebuild twice identical, (d) failing day keeps rows / STALE / run PARTIAL and FAILED / rollback inside the write, (e) `verify` equal and unequal cases, (f) re-import with a changed BCVH and route, a vanished and a new parcel and a day with no F1.3 rows left, plus signature edges (inside / outside the window, BF D+6, delete-and-reinsert), window constants used by the builder and by the service, classifier version, single run and abandoned runs. Tests use temporary SQLite files only.

**Real-data run on a copy** (`VACUUM INTO` of the live file in 49 s, 4.2 GB, scratchpad `aggcopy.sqlite`; live file untouched): `build --from 2026-10-22 --to 2026-10-28`: 7 days, 0 failed, 11.3 s in total. Time per day: 22/10 4 362 rows 1 843 ms; 23/10 3 577 rows 1 639 ms; 24/10 2 527 rows 1 542 ms; 25/10 2 113 rows 1 466 ms; 26/10 4 616 rows 1 715 ms; 27/10 2 665 rows 1 560 ms; 28/10 3 238 rows 1 543 ms (about 1.5-1.8 s a day including the signature). Result equals the expected figures exactly: six BCVH 23 098 rows, 14 027 Đạt, 7 738 Không đạt, 1 333 blank; over Không đạt: PHAT_MUON 3 375, GIAO_BUU_TA_QUA_GIO 2 778, KHONG_TRON_LO 449, KHAI_THAC 353, VAN_CHUYEN 40, KHAI_THAC_VAN_CHUYEN_CHUA_PHAN_BIET 147, chưa đủ căn cứ 596 (T-A 555, T-G 41) = 7 738; every non-failed row is `KHONG_PHAN_TICH`. `verify`: OK, 0 differences over 42 day x BCVH keys against `fact_f13` and `agg_f13_day`; one row of another unit reported apart. Second `build` built 0 days (0.2 s); `rebuild` of 26/10 gave the same 4 616 rows (content hash equal ignoring `built_at`). Route scope: POSTMAN 21 938, NON_POSTMAN 1 158 (as Appendix A), OTHER 2. First-handover postman missing for 66 rows; it differs from the shown postman on 2 169 rows (Appendix B, which counts parcels, gives 61 and 2 180).

**Not done / open points.** No refresh hook after imports and no API (P3 and P2). The `Hành trình` response now includes `ma_buu_ta_first` / `ten_buu_ta_first` because the controller passes the service output through (same sensitivity as the shown postman name; Opus to confirm or ask for a strip). `verify` needs `agg_f13_day` filled for the range to compare against it (it reports a difference when the aggregate has no row for a day with fact rows). The BUILDING state is not cleaned by itself after a crash: `build` rebuilds any day that is not FRESH. Residual T4 (in-place UPDATE of a source row does not move the signature) is unchanged.

