# PERF-LOAD-01 MANIFEST — Dashboard load speed

| Field | Value |
| --- | --- |
| Status | Phase 1 IMPLEMENTED (2026-10-13, Claude Code/Sonnet 5.5); Phases 2-4 not authorized |
| Owner | Claude Code (backend/data); frontend change is three one-line removals |
| PO UI Check Required | No (no layout or number change); PO may confirm the felt speed |
| Validation level | LEVEL 1 + cache-invalidation tests |

## 1. Problem (measured 2026-10-13, 2,3 GB DB)

Dashboards aggregate over raw fact rows on every request: fact_f13 907 k, fact_f41 1,3 M, fact_f11 430 k rows. One SQLite connection serialises concurrent requests, so a page's blocks add up. Measured (ms): F1.3 overview monthly 2 000, weekly trend 12 m 2 400, weeks/months list 800-1 000; F4.1 overview monthly 7 700 (MAX(ten_bc_phat) forces wide-row lookups), weekly trend 2 200. No cache anywhere; frontend added `_ts` to `/dashboard/meta`.

## 2. Phase 1 (delivered)

1. `backend/src/middleware/responseCache.js`: in-memory GET cache mounted after `requireAuth` in f11/f12/f13/f41 routes. Key = original URL. Invalidation: data fingerprint (max rowid of the fact/national/import_log/catalog tables, content of sys_kpi_thresholds and system_config; memoised 1,5 s) plus 10-minute TTL; 400 entries, 2 MB per body; only HTTP 200. F1.3 admin-only reads (`rca`, `messages`, `dashboard/message`) are not cached. Header `X-QIS-Cache: HIT|MISS`.
2. `backend/src/config/db.js`: `cache_size` 256 MB; WAL + `synchronous=NORMAL` (not in tests; `QIS_SQLITE_WAL=off` to disable).
3. Frontend: removed `_ts` cache-busters (DashboardPage, BcvhRankingPage, F12Cumulative12Block). Express ETag now gives 304 on revalidation.
4. `compression` (gzip) in `backend/server.js`; new dependency `compression@1.8.1`.
5. `date(ngay_do_kiem)` removed from 16 WHERE predicates in the four fact repositories (all stored values verified `YYYY-MM-DD`: 2 655 863 rows, 0 exceptions) so the date indexes are usable.

## 3. Evidence

- `responseCache.test.js` 5/5 (hit, different query, invalidation by new import row, 5xx/POST not cached, path exclusion). Existing f41Routes, repository overview/weekly/r4, FactF41Repository, bcvhOverviewService suites pass.
- HTTP check: first response gzip + MISS, second HIT without running the handler, conditional request 304.
- Uncached query times are essentially unchanged (F1.3 overview monthly 1,7-2,9 s, F4.1 monthly 7,8-8,9 s): Phase 1 removes REPEAT cost, not first-load cost. First load is Phase 2 (aggregate tables).

## 4. Operations notes

- Backend restart required. First start switches the file to WAL (needs no other process holding the DB); `-wal`/`-shm` files appear beside `database.sqlite`.
- Any backup that copies only `database.sqlite` while the backend runs may miss un-checkpointed commits; use SQLite backup (`VACUUM INTO`/`.backup`) or stop the backend first.
- Edits to fact rows by in-place UPDATE are invisible to the fingerprint and show after at most 10 minutes.

## 5. Not done / next

Phase 2 aggregate tables (needs PO/CTO approval for new schema), Phase 3 page bundle endpoint + lazy loading + static build, Phase 4 separate read connection.

## 6. Phase 2 design (2026-10-13)

Design Proposal written, awaiting PO/CTO approval before any code: `docs/04_TECHNICAL_PLANNING/Feature/PERF-LOAD-01_PHASE2_DESIGN_PROPOSAL.md` (four `agg_*_day` tables, in-transaction per-date rebuild in importProcessor, per-indicator `off|shadow|on` read switch with a SUM(n_rows) fuse, build/verify tool). PO decision: after implementation an independent Opus review is mandatory (prompt to be written after step P2.5); the same model must not self-approve.

## 7. Phase 2 step P2.0 delivered (2026-10-13)

Foundation only; no read path uses the aggregate yet (numbers and screens unchanged). Delivered: `migrate_perf_load_01_agg_schema.js` (4 `agg_*_day` + `agg_state`, wired into startup migrations and `schema.sql`), `src/services/aggMaintenance.js` (per-day rebuild), hooks inside the import transactions of F1.3 / F4.1 / F1.1 / F1.2(Hue) and legacy `FactF41Repository.overwriteImport`, `scripts/agg_tool.js` (status / build / verify / rebuild), `test_aggMaintenance.js` 10/10. Real DB built and verified (4/4 OK; monthly overview identical to the production queries for all four indicators). Backup before the first build: `backend/src/db/backups/database.pre-perf-load-01-phase2.2026-10-13.sqlite` (VACUUM INTO, 2 266 730 496 bytes; git-ignored). Details: design Section 12. Next: P2.1 (F4.1 read path + fuse + V1 deep comparison).

Operations: restart the backend so imports keep the aggregate current (an old process imports without refreshing it; `agg_tool.js build --missing-only` or `verify` repairs any gap).

## 8. Phase 2 step P2.1 delivered - F4.1 read path (2026-10-13)

F4.1 aggregate reads go through `aggReadPolicy` (`off` default | `shadow` | `on`, env `QIS_AGG_READ_F41`) with a row-count fuse; one SQL per query built from `aggSqlSource` (detail or aggregate). Evidence: `scripts/agg_compare.js` on the real DB 274 calls / 0 differences (64.5 s -> 0.2 s); `test_aggReadF41.js` 6/6; service reconciliation identical in `on`; unchanged behaviour while the mode is `off`. Enable on the server: set `QIS_AGG_READ_F41=shadow` (answers from detail, logs `[agg-shadow]` lines on any difference), watch a working day, then `on`; roll back by unsetting the variable and restarting. Details: design Section 13. Next: P2.2 (F1.3).

## 9. Phase 2 step P2.2 delivered - F1.3 read path (2026-10-13)

Same switch as F4.1, env `QIS_AGG_READ_F13` (`off` default | `shadow` | `on`), row-count fuse; 11 aggregate methods of `FactBuuGuiRepository` converted (route/evidence/rule-engine facts stay on the detail table, Q3). Evidence: real-DB comparison 317 calls / 0 differences (59.3 s -> 1.1 s); `test_aggReadF13.js` 5/5; F4.1 suite still 6/6; no new failures in the existing F1.3 suites (pre-existing failures reproduce identically on HEAD). Enabling: `QIS_AGG_READ_F13=shadow` then `on`, restart to apply. Details: design Section 14. Next: P2.3 (F1.1).

## 10. Phase 2 step P2.3 delivered - F1.1 read path (2026-10-13)

Same switch (`QIS_AGG_READ_F11`, `off` default | `shadow` | `on`, row-count fuse). F1.1 volume = evaluated rows (n_dat + n_khong_dat). 13 aggregate methods of `FactF11Repository` converted incl. the pair grid; reconciliation of one day and latest-import meta stay on the detail table. Evidence: real-DB comparison 297 calls / 0 differences (26.7 s -> 1.3 s); `test_aggReadF11.js` 6/6; F1.1 ranking suites and the real-DB baseline identical in `off` and `on`. Details: design Section 15. Next: P2.4 (F1.2).

## 11. Phase 2 step P2.4 delivered - F1.2 read path (2026-10-13)

Same switch (`QIS_AGG_READ_F12`, `off` default | `shadow` | `on`, fuse). 18 methods of `FactF12Repository` converted incl. office level and the 12-month helpers; large-customer office 531120 handled by the existing key-column predicate. Evidence: real-DB comparison 337 calls / 0 differences; `test_aggReadF12.js` 6/6; F1.2 service/pipeline suites identical in `off` and `on`; all five agg test files green. Details: design Section 16. Implementation of Phase 2 steps P2.0-P2.4 is complete; P2.5 = supervised enablement (shadow one working day, then on) + independent Opus review (prompt to be written).
